'use strict';

const https = require('https');

module.exports.upload = function(text, callback) {
  const options = {
    hostname: 'hastebin.com',
    path: '/documents',
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
      'Content-Length': Buffer.byteLength(text)
    }
  };
  const req = https.request(options, function(res) {
    res.setEncoding('utf8');
    var responseBody = '';
    res.on('data', function(chunk) {
      responseBody += chunk;
    });
    res.on('end', function() {
      callback('https://hastebin.com/raw/' + JSON.parse(responseBody).key);
    });
  });
  req.end(text);
}