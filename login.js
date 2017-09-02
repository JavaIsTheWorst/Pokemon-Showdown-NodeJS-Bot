'user strict';

const Config = require('./config.js');
const Util = require('./util.js');

const http = require('http');

module.exports.onChallstrMessage = function(conn, msg, continuation) {
  const msgChallstr = msg.slice("|challstr|".length);
  if (Config.password) {
    const postData = require('querystring').stringify({
      act: 'login',
      name: Config.username,
      pass: Config.password,
      challstr: msgChallstr
    });
    const options = {
      hostname: Config.actionUrlHost,
      path: Config.actionUrlPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    const req = http.request(options, function(res) {
      res.setEncoding('utf8');
      var responseBody = '';
      res.on('data', function(chunk) {
        responseBody += chunk;
      });
      res.on('end', function() {
        const assertionStr = responseBody.slice(1);
        const assertion = JSON.parse(assertionStr).assertion;
        const loginCommand = '/trn ' + Config.username + ',0,' + assertion;
        Util.useGlobalCommand(conn, Config.loginColor, loginCommand);
        continuation(conn);
      });
    });
    req.end(postData);
  } else {
    const options = {
      hostname: Config.actionUrlHost,
      path: Config.actionUrlPath + `?act=getassertion&challstr=${msgChallstr}&userid=${Config.username}`,
      method: 'GET',
    }
    const req = http.request(options, function(res) {
      res.setEncoding('utf8');
      var responseBody = '';
      res.on('data', function(chunk) {
        responseBody += chunk;
      });
      res.on('end', function() {
        const assertion = responseBody;
        const loginCommand = '/trn ' + Config.username + ',0,' + assertion;
        Util.useGlobalCommand(conn, Config.loginColor, loginCommand);
        continuation(conn);
      });
    });
    req.end();
  }
};