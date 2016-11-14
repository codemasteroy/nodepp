var commandMapping = [{
    "renewDomain": "renewDomainExtension"
}];
function FicoraExtension() {}

FicoraExtension.prototype.renewDomainExtension = function(data) {
    console.log(data);
    var config = this.config;
    var namespace = config.namespaces.FICORA.xmlns;
    var ficoraRenew = {
        "_attr": {
            "xmlns:domain": namespace
        }
    };
    ficoraRenew["domain:autorenew"] = data.autorenew;
    var processedExtension = {
        "domain": ficoraRenew
    };
    return processedExtension;
};

FicoraExtension.mixinMapper = function(destObj) {
    return commandMapping;
};

module.exports = FicoraExtension;

