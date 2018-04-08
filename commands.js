'use strict';

const Config = require('./config.js');
const Gesti = require('./gesti.js');
const Hastebin = require('./hastebin.js');
const Mafia = require('./mafia.js');
const Triggers = require('./triggers.js');
const Util = require('./util.js');

const fs = require('fs');

const simpleCommands = [
  new Triggers.Command(new Triggers.Trigger(/github please/i), (conn, room, username, target) =>
    Util.pm(conn, Config.commandColor, username, "https://github.com/JavaIsTheWorst/Pokemon-Showdown-NodeJS-Bot")),
  new Triggers.Command(new Triggers.Trigger(/^\/invite /, Triggers.PermConfig.OWNERONLY), (conn, room, username, target) => {
    if (room === 'pm') {
      Util.useGlobalCommand(conn, Config.commandColor, '/j ' + target);
    }
  })
];

const generalCommands = [
  new Triggers.Command(new Triggers.Trigger(/^sayraw /i), (conn, room, username, target) =>
    Util.send(conn, Config.commandColor, target)),
  new Triggers.Command(new Triggers.Trigger(/^eval /, Triggers.PermConfig.OWNERONLY), (conn, room, username, target) => {
    try {
      console.log(eval(target));
    } catch (e) {
      console.log('EVAL ERROR: ' + e.toString());
    }
  }),
  new Triggers.Command(new Triggers.Trigger(/in this room, /i, Triggers.PermConfig.OWNERONLY), (conn, room, username, target) => {
    const partsList = parts.split(' -> ');
    if (partsList.length >= 2) {
      fs.readFile('./roomcommands.txt', 'utf8', function(err, data) {
        const filteredCommandList = data.split('\n').filter(s => !(s.indexOf(room + ' -> ' + partsList[0] + ' -> ') === 0));
        const updatedCommands = [room + ' -> ' + partsList[0] + ' -> ' + partsList.slice(1).join(' -> '), ...filteredCommandList].join('\n');
        fs.writeFile('./roomcommands.txt', updatedCommands);
      });
    }
  }),
  new Triggers.Command(new Triggers.Trigger(/delete relation /i, Triggers.PermConfig.OWNERONLY), (conn, room, username, target) => {
    const partsList = parts.split(' -> ');
    if (partsList.length >= 1) {
      fs.readFile('./roomcommands.txt', 'utf8', function(err, data) {
        const filteredCommandList = data.split('\n').filter(s => !(s.indexOf(room + ' -> ' + partsList[0] + ' -> ') === 0));
        const updatedCommands = filteredCommandList.join('\n');
        fs.writeFile('./roomcommands.txt', updatedCommands);
      });
    }
  })
];

const completeCommandsList = [...simpleCommands, ...generalCommands, ...Gesti.gestiCommands, ...Mafia.mafiaCommands];

module.exports.parseMessage = function(conn, room, username, message) {
  const matchedCommands = completeCommandsList.reduce((acc, command) => {
    const triggerResults = command.trigger.onTrigger(username, message);
    return triggerResults.matched ? [{command: command, matchedText: triggerResults.matchedText, after: triggerResults.after}, ...acc] : acc;}, []);
  if (matchedCommands.length > 0) {
    matchedCommands.forEach(function (commandObj) {
      Util.logText(Config.commandColor, 'COMMAND TRIGGERED BY ' + message + ', SPECIFICALLY THE ' + commandObj.command.trigger.triggerRegex.toString() + ' PATTERN, CAUSED BY ' + commandObj.matchedText + ', COMMAND CALLED WITH ARGUMENT ' + commandObj.after);
      commandObj.command.action(conn, room, username, commandObj.after);
    });
  } else {
    if (room === "pm") {
      if (Util.toId(username) !== Util.toId(Config.username)) {
        Util.pm(conn, Config.commandColor, username, 'Hello, I am just a bot. Please PM a staff member for assistance.');
      }
    } else {
      fs.readFile('./roomcommands.txt', 'utf8', function(err, data) {
        const searchedCommand = data.split('\n').filter(line => {
          const parts = line.split(' -> ');
          return (parts[0] == room || parts[0] == "all") && (parts[1] == message);
        });
        if (searchedCommand.length > 0) {
          const responses = searchedCommand.split(' -> ').slice(-1)[0].replace('$(user)', username).split(' $(pick) ');
          Util.send(conn, Config.commandColor, responses[Math.floor(Math.random()*responses.length)]);
        }
      })
    }
  }
};

module.exports.startUpActions = function(conn) {
  Util.useGlobalCommand(conn, Config.startUpColor, '/avatar 120');
  const joins = function(rooms) {
    return function () {
      if (rooms.length > 0) {
        Util.useGlobalCommand(conn, Config.startUpColor, '/j ' + rooms[0]);
        setTimeout(joins(rooms.slice(1)), 600);
      }
    };
  }
  setTimeout(joins(Config.rooms), 600);
};