'use strict';

const Config = require('./config.js');
const Util = require('./util.js');

module.exports = {
  PermConfig: {
    OWNERONLY: 'Owner only',
    ALLUSERS: 'All users'
  },
  Trigger: class {
    constructor(triggerRegex, permConfig = module.exports.PermConfig.ALLUSERS) {
      this.triggerRegex = triggerRegex;
      this.permConfig = permConfig;
    }
    
    onTrigger(username, message) {
      const fitsPerms = (this.permConfig === module.exports.PermConfig.ALLUSERS || Util.toId(username) === Util.toId(Config.owner)) && Util.toId(username) !== Util.toId(Config.username);
      const regexMatch = this.triggerRegex.exec(message);
      return regexMatch === null ? {matched: false, matchedText: "", after: ""}
                                 : {matched: fitsPerms, matchedText: regexMatch[0], after: message.slice(regexMatch.index + regexMatch[0].length)}
    }
  },
  Command: class {
    constructor(trigger, action) {
      this.trigger = trigger;
      this.action = action;
    }
  }
}