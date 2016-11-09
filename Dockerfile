FROM node:latest
MAINTAINER Travis Holton <wtholton at gmail dot com>

WORKDIR /opt/project/node-epp
COPY . /opt/project/node-epp
RUN npm install

CMD ["npm", "test"]
