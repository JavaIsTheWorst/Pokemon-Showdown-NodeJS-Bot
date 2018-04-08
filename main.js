'use strict';

const Commands = require('./commands.js');
const Config = require('./config.js');
const Login = require('./login.js');
const Util = require('./util.js');

const WebSocketClient = require('websocket').client;

global.env = {
  gestiGame: void 0,
  mafiaGames: new Map()
};

const parse = function(conn, s) {
  Util.logText(Config.logColor, s);
  const messageList = s.split('|');
  if (s.charAt(0) === '>') {
    if (messageList.length > 1) {
      const room = messageList[0].slice(1,-1);
      switch (messageList[1]) {
        case "c":
          Commands.parseMessage(conn, room, messageList[2], messageList.slice(3).join('|'));
          break;
        case "c:":
          Commands.parseMessage(conn, room, messageList[3], messageList.slice(4).join('|'));
          break;
      }
    }
  } else if (s.indexOf('|challstr|') == 0) {
    Login.onChallstrMessage(conn, s, Commands.startUpActions);
  } else if (s.indexOf('|pm|') == 0) {
    Commands.parseMessage(conn, 'pm', messageList[2], messageList.slice(4).join('|'));
  }
}

const pokemonShowdownClient = new WebSocketClient();

pokemonShowdownClient.on('connect', function(connection) {
  Util.logText(Config.connectedColor, 'Successfully connected to ws://sim.smogon.com:8000/showdown/websocket');
  connection.on('error', function(error) {
    Util.logText(Config.errorColor, 'Connection Error: ' + error.toString());
  });
  connection.on('close', function(reasonCode, description) {
    Util.logText(Config.errorColor, 'Connection Closed: ' + description.toString());
  });
  connection.on('message', function(message) {
    if (message.type === 'utf8') {
      parse(connection, message.utf8Data);
    }
  });
});

pokemonShowdownClient.on('connectFailed', function(error) {
  Util.logText(Config.errorColor, 'Connect Error: ' + error.toString());
});

pokemonShowdownClient.connect('ws://sim.smogon.com:8000/showdown/websocket', []);