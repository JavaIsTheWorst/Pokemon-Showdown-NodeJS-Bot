'use strict';

const Config = require('./config.js');
const Triggers = require('./triggers.js');
const Util = require('./util.js');

module.exports.gestiCommands = [
  new Triggers.Command(new Triggers.Trigger(/initiate gesti: /i, Triggers.PermConfig.OWNERONLY), function(conn, room, username, target) {
    if (room === 'pm') {
      Util.pm(conn, Config.gestiColor, username, 'Not yet.');
    } else {
      Util.say(conn, Config.gestiColor, room, 'Not yet.');
    }
  })];