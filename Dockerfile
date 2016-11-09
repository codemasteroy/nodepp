FROM node:latest
MAINTAINER Travis Holton <wtholton at gmail dot com>

WORKDIR /opt/project
COPY package.json /opt/project/

RUN npm install

WORKDIR /opt/project/node-epp
COPY . /opt/project/node-epp

CMD ["npm", "test"]
