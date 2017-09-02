'use strict';

const Config = require('./config.js');

module.exports = {
  logText: function(color, str) {
    console.log(color(str));
  },
  send: function (conn, color, str) {
    console.log(color('SENDING TO SERVER: ' + str));
    conn.sendUTF(str);
  },
  pm: function(conn, color, user, str) {
    this.send(conn, color, '|/w ' + user + ',' + str);
  },
  say: function(conn, color, room, str) {
    this.send(conn, color, room + '|' + str);
  },
  sayInDefault: function(conn, color, str) {
    this.say(conn, color, Config.defaultRoom, str);
  },
  useGlobalCommand: function(conn, color, str) {
    this.say(conn, color, 'global', str);
  },
  toId: str => str.toLowerCase().replace(/[^0-9a-z]/g, '')
};