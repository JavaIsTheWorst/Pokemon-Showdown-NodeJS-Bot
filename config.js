'use strict';

const colors = require('colors');

module.exports.server = 'sim.smogon.com';
module.exports.port = 8000;
module.exports.serverId = 'showdown';
module.exports.actionUrlHost = 'play.pokemonshowdown.com'
module.exports.actionUrlPath = '/~~' + this.serverId + '/action.php';
module.exports.path = '/' + this.serverId + '/websocket';
module.exports.username = '';
module.exports.password = '';
module.exports.owner = '';
module.exports.rooms = ['mafia'];
module.exports.defaultRoom = 'mafia';
module.exports.sendColor = colors.white;
module.exports.logColor = colors.dim.green;
module.exports.gestiColor = colors.yellow;
module.exports.mafiaColor = colors.cyan;
module.exports.commandColor = colors.white;
module.exports.connectedColor = colors.white;
module.exports.loginColor = colors.white;
module.exports.startUpColor = colors.white;
module.exports.errorColor = colors.red;
