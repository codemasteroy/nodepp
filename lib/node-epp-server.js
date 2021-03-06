var express = require("express");
var bodyParser = require("body-parser");
var cp = require('child_process');
var program = require('commander');
var ipfilter =  require('ipfilter');
var moment = require('moment');
var Listener = require('./listener.js');
var EventDispatcher = require('./event-dispatcher.js');
var path = require('path');
var nconf = require('nconf');
var winston = require('winston');

nconf.env().file({
    "file": path.resolve(__dirname, '..', 'config/epp-config.json')
});
var log_level = (nconf.get('LOG_LEVEL') || 'debug').toLowerCase();
var logger = winston.createLogger({
    transports: [
      new (winston.transports.Console)({ level: log_level })
    ]
});

function collectRegistries(val, registryArgs) {
    registryArgs.push(val);
    return registryArgs;
}

// Read command-line arguments.
program.version('0.0.1').usage('[options]').option('-r, --registries <registry>', 'Registry', collectRegistries, []).option('-l, --listen <n>', 'Listen on port', parseInt, 3000);
program.parse(process.argv);

var registries = program.registries;
logger.info("Initialised with registries: " + registries);

var availableProcesses = {};
for (var accred in registries) {
    var registry = registries[accred];
    var eppProcess = cp.fork(__dirname + '/worker.js');
    eppProcess.send({
        "registry": registry
    });
    availableProcesses[registry] = eppProcess;
}
process.on('SIGINT', function() {
    var logoutResponse = function(data) {
        logger.info("Got reply from logout: " + data);
    };
    for (var registry in availableProcesses) {
        var childProc = availableProcesses[registry];
        childProc.send({
            "command": "logout",
            "data": {"kill": true}
        });
        childProc.once('message', logoutResponse);
    }
    process.exit(0);
});


// Wire up event/listener to keep track of available worker process. This is
// to avoid individual connection workers from getting swamped.
var eventDispatch =  new EventDispatcher();
var listener = new Listener(eventDispatch, availableProcesses);
eventDispatch.on('queueChild', listener.queueChild);
eventDispatch.on('childFree', listener.childFree);


var app = express();
app.use(bodyParser.json());
var ips = nconf.get('whitelisted_ips');
app.use(ipfilter(ips, {"mode": "allow"}));

app.post('/command/:registry/:command', function(req, res) {
    var registry = req.params.registry;
    if (! (registry in availableProcesses)) {
        res.send(400, {
            "error": "Unknown registry"
        });
        return;
    }
    var queryData = req.body;

    var a = moment();
    var processChild = function (childProcess) {
        childProcess.once('message', function(m) {
            var b = moment();
            var diff = b.diff(a, 'milliseconds');
            logger.info('Request elapsed time: '+ diff.toString() + ' ms');
            res.send(m);
            eventDispatch.childFree(registry);
        });
        childProcess.send({
            "registry": registry,
            "command": req.params.command,
            "data": queryData
        });
    };
    listener.pushChildQueue(processChild);
    eventDispatch.queueChild(registry);
});

app.listen(program.listen);
