'use strict';

const Config = require('./config.js');
const Hastebin = require('./hastebin.js');
const Triggers = require('./triggers.js');
const Util = require('./util.js');

const GestiGame = class {
  constructor(host, players, assigned, choices) {
    this.host = host;
    this.players = players;
    this.assigned = assigned;
    this.choices = choices;
  }
}

const Choice = class {
  constructor(choice, discard) {
    this.choice = choice;
    this.discard = discard;
  }
}

const Role = class {
  constructor(alignment, roleType) {
    this.alignment = alignment;
    this.roleType = roleType;
  }
  
  toString() {
    return this.alignment + ' ' + this.roleType;
  }
}

const Alignment = {
  TOWN: 'Town',
  MAFIA: 'Mafia',
  WEREWOLF: 'Werewolf',
  SURVIVOR: 'Survivor',
  CULT: 'Cult',
  CULTOSRECRUITER: 'Cult OS Recruiter',
  ALIEN: 'Alien',
  LYNCHER: 'Lyncher',
  SERIALKILLER: 'Serial Killer',
  JUDAS: 'Judas',
  SAULUS: 'Saulus',
  WILDCARDALIGNMENT: 'Wild Card'
}

const RoleType = {
  VANILLA: '(vanilla)',
  WATCHER: 'Watcher',
  TRACKER: 'Tracker',
  COP: 'Cop',
  COPLOVER: 'Cop Lover',
  SEER: 'Seer',
  FBIAGENT: 'FBI Agent',
  DOCTOR: 'Doctor',
  ROLEBLOCKER: 'Roleblocker',
  JAILKEEPER: 'Jailkeeper',
  BODYGUARD: 'Bodyguard',
  VIGILANTE: 'Vigilante',
  OSVIGILANTE: 'One-shot Vigilante',
  OSDAYVIG: 'One-shot Dayvig',
  COMPULSIVECHILDKILLER: 'Compulsive Childkiller (If any Innocent Child is revealed, the Childkiller must immediately dayvig that player)',
  BULLETPROOF: '(bulletproof)',
  SUPERSAINT: 'Supersaint',
  OSPGO: 'One-shot Paranoid Gun Owner',
  MASON: 'Mason',
  MASONDOCTOR: 'Mason Doctor',
  MASONLOVER: 'Mason Lover',
  LOVER: 'Lover',
  JOAT: 'Jack-of-all-trades (One Roleblock, One Cop, One Doctor)',
  VENGEFUL: '(vengeful)',
  RETIREDWEREWOLFHUNTER: 'Retired Werewolf Hunter (Named Townie/Goon)',
  RETIREDMARINE: 'Retired Marine (Immune to Serial Killer kills)',
  MILLER: 'Miller',
  HIRSUTE: 'Hirsute (Investigates as Werewolf)',
  EVANGELISTIC: 'Evangelistic (Investigates as Cult)',
  TENTACLED: 'Tentacled (Investigates as Alien)',
  WATCHLISTED: 'Watchlisted (Investigates as Serial Killer)',
  UNIMILLER: 'Universal Miller',
  BLACKGOO: 'Black Goo (Anyone who targets it with an action becomes Cult)',
  ASCETIC: '(ascetic)',
  PRIVATEINVESTIGATOR: 'Private Investigator (Gets result "Cult" or "Not Cult")',
  GRAVEDIGGER: 'Gravedigger (Shows up as targeting all nightkilled players to Trackers and Watchers on night of said players\' deaths)',
  NYMPHOMANIAC: 'Nymphomaniac (Compulsively chooses a Lover on Night 1; NOT part of pre-existing Lover groups unless united by N1 choice)',
  OSGOVERNOR: 'One-shot Governor',
  OSUL: 'One-shot Unlynchable',
  GODFATHER: 'Godfather',
  INNOCENTCHILD: 'Innocent Child',
  HIDER: 'Hider',
  ENABLER: 'Enabler',
  TREESTUMP: 'Treestump',
  CONSPIRACYTHEORIST: 'Conspiracy Theorist (Gets result "Alien" or "Not Alien"; investigates as "Alien")',
  OSKINGMAKER: 'One-shot Kingmaker',
  WEAKJAILKEEPER: 'Weak Jailkeeper',
  BLOODHOUND: 'Bloodhound (Gets result "Town" or "Not Town")',
  VANILLACOP: 'Vanilla Cop (Only VTs, basic Werewolves, and Mafia Goons are Vanilla)',
  HERO: 'Hero (If a King tries to execute you, the King dies instead)',
  TOURIST: 'Tourist (Compulsively targets someone every night. No effect.)',
  NURSE: 'Nurse (If a Town Doctor dies, you inherit their power)',
  OSCOMMUTER: 'One-shot Commuter',
  COAT: 'Cop-of-all-Trades (One-shot Cop, One-shot Seer, One-shot FBI Agent, One-shot Conspiracy Theorist, One-shot Private Investigator)',
  OSGLADIATOR: 'One-shot Gladiator (Target two players at night; if both alive at daybreak, they are the only two lynch candidates that day)',
  LYNCHBAIT: 'Lynchbait (If you are lynched, any and all Lynchers immediately win)',
  PSYCHIATRIST: 'Psychiatrist (Target someone each night; if they are an SK, they will become a Vanilla Townie)',
  RELOADER: 'Reloader (Target someone each night; if they have previously used a One-shot ability, they regain their shot)',
  FRUITVENDOR: 'Fruit Vendor (Target someone each night. They will be told that they have received fruit.)',
  PARROT: 'Parrot (Target someone each night. If they have an active ability, you use that ability on them)',
  OS: '(One-shot)',
  UNDERDOG: 'Underdog (Does not know any scum partners before adopting Alignment. Adopts the Alignment of the first Day death.)',
  STRONGMAN: 'Strongman',
  REFLEXIVEDOCTOR: 'Reflexive Doctor (Protects anyone who targets them)',
  CUPID: 'Cupid (Targets player Night 1; all OTHER players who targeted same player become lovers with target)',
  ALPHA: '(alpha)',
  COMPULSIVEHIDER: 'Compulsive Hider',
  OSBULLETPROOF: 'One-shot Bulletproof',
  NINJA: '(ninja)',
  PROBER: 'Prober (Targets one player; target is roleblocked and Prober gets investigation result of "Werewolf" or "Not Werewolf")',
  VANILLAISER: 'Vanillaiser',
  SILENCER: 'Silencer',
  BULLETPROOFLOVER: '(bulletproof) Lover',
  PSYCHOTROOPER: 'Psychotrooper (While alive, all cops with "Guilty/Not Guilty" format results are Insane)',
  MASSREDIRECTOR: 'Mass Redirector (Once per game, choose a player at Night. All actions are redirected to that player that night.)',
  BLOODSUCKER: 'Bloodsucker (Treestump someone at Night. No Scum partner may perform the factional nightkill on the same night that you do this)',
  SYMPATHISER: 'Sympathiser (If there are other scum of your faction, you are a Goon of that faction. Otherwise, you are a VT.)',
  COMPULSIVEBODYGUARD: '(compulsive bodyguard)',
  TSBULLETPROOF: '(two-shot bulletproof)',
  MAFIAKILLIMMUNE: '(Immune to Mafia kills)',
  WEREWOLFKILLIMMUNE: '(Immune to Werewolf kills)',
  ALIENKILLIMMUNE: '(Immune to Alien & Replicant kills)',
  OSGOOMAKER: 'One-shot Goomaker (Once per game, at night, target someone to make them take on Black Goo ability)',
  WILDCARDROLE: 'Wild Card (After discards are revealed, you get a random Alignment/Role from the remaining cards)'
}

const roleList = [
  new Role(Alignment.TOWN, RoleType.VANILLA),
  new Role(Alignment.TOWN, RoleType.VANILLA),
  new Role(Alignment.TOWN, RoleType.VANILLA),
  new Role(Alignment.TOWN, RoleType.VANILLA),
  new Role(Alignment.TOWN, RoleType.VANILLA),
  new Role(Alignment.TOWN, RoleType.VANILLA),
  new Role(Alignment.TOWN, RoleType.VANILLA),
  new Role(Alignment.TOWN, RoleType.VANILLA),
  new Role(Alignment.TOWN, RoleType.VANILLA),
  new Role(Alignment.TOWN, RoleType.VANILLA),
  new Role(Alignment.TOWN, RoleType.VANILLA),
  new Role(Alignment.TOWN, RoleType.VANILLA),
  new Role(Alignment.TOWN, RoleType.WATCHER),
  new Role(Alignment.TOWN, RoleType.TRACKER),
  new Role(Alignment.TOWN, RoleType.TRACKER),
  new Role(Alignment.TOWN, RoleType.COP),
  new Role(Alignment.TOWN, RoleType.COP),
  new Role(Alignment.TOWN, RoleType.COPLOVER),
  new Role(Alignment.TOWN, RoleType.SEER),
  new Role(Alignment.TOWN, RoleType.SEER),
  new Role(Alignment.TOWN, RoleType.FBIAGENT),
  new Role(Alignment.TOWN, RoleType.DOCTOR),
  new Role(Alignment.TOWN, RoleType.DOCTOR),
  new Role(Alignment.TOWN, RoleType.ROLEBLOCKER),
  new Role(Alignment.TOWN, RoleType.JAILKEEPER),
  new Role(Alignment.TOWN, RoleType.BODYGUARD),
  new Role(Alignment.TOWN, RoleType.VIGILANTE),
  new Role(Alignment.TOWN, RoleType.OSVIGILANTE),
  new Role(Alignment.TOWN, RoleType.OSDAYVIG),
  new Role(Alignment.TOWN, RoleType.COMPULSIVECHILDKILLER),
  new Role(Alignment.TOWN, RoleType.BULLETPROOF),
  new Role(Alignment.TOWN, RoleType.SUPERSAINT),
  new Role(Alignment.TOWN, RoleType.OSPGO),
  new Role(Alignment.TOWN, RoleType.MASON),
  new Role(Alignment.TOWN, RoleType.MASON),
  new Role(Alignment.TOWN, RoleType.MASON),
  new Role(Alignment.TOWN, RoleType.MASON),
  new Role(Alignment.TOWN, RoleType.MASONDOCTOR),
  new Role(Alignment.TOWN, RoleType.MASONLOVER),
  new Role(Alignment.TOWN, RoleType.LOVER),
  new Role(Alignment.TOWN, RoleType.LOVER),
  new Role(Alignment.TOWN, RoleType.LOVER),
  new Role(Alignment.TOWN, RoleType.JOAT),
  new Role(Alignment.TOWN, RoleType.VENGEFUL),
  new Role(Alignment.TOWN, RoleType.RETIREDWEREWOLFHUNTER),
  new Role(Alignment.TOWN, RoleType.RETIREDMARINE),
  new Role(Alignment.TOWN, RoleType.MILLER),
  new Role(Alignment.TOWN, RoleType.HIRSUTE),
  new Role(Alignment.TOWN, RoleType.EVANGELISTIC),
  new Role(Alignment.TOWN, RoleType.TENTACLED),
  new Role(Alignment.TOWN, RoleType.WATCHLISTED),
  new Role(Alignment.TOWN, RoleType.UNIMILLER),
  new Role(Alignment.TOWN, RoleType.BLACKGOO),
  new Role(Alignment.TOWN, RoleType.ASCETIC),
  new Role(Alignment.TOWN, RoleType.PRIVATEINVESTIGATOR),
  new Role(Alignment.TOWN, RoleType.GRAVEDIGGER),
  new Role(Alignment.TOWN, RoleType.NYMPHOMANIAC),
  new Role(Alignment.TOWN, RoleType.OSGOVERNOR),
  new Role(Alignment.TOWN, RoleType.OSUL),
  new Role(Alignment.TOWN, RoleType.GODFATHER),
  new Role(Alignment.TOWN, RoleType.INNOCENTCHILD),
  new Role(Alignment.TOWN, RoleType.HIDER),
  new Role(Alignment.TOWN, RoleType.ENABLER),
  new Role(Alignment.TOWN, RoleType.TREESTUMP),
  new Role(Alignment.TOWN, RoleType.CONSPIRACYTHEORIST),
  new Role(Alignment.TOWN, RoleType.CONSPIRACYTHEORIST),
  new Role(Alignment.TOWN, RoleType.CONSPIRACYTHEORIST),
  new Role(Alignment.TOWN, RoleType.OSKINGMAKER),
  new Role(Alignment.TOWN, RoleType.WEAKJAILKEEPER),
  new Role(Alignment.TOWN, RoleType.BLOODHOUND),
  new Role(Alignment.TOWN, RoleType.VANILLACOP),
  new Role(Alignment.TOWN, RoleType.HERO),
  new Role(Alignment.TOWN, RoleType.TOURIST),
  new Role(Alignment.TOWN, RoleType.NURSE),
  new Role(Alignment.TOWN, RoleType.OSCOMMUTER),
  new Role(Alignment.TOWN, RoleType.COAT),
  new Role(Alignment.TOWN, RoleType.OSGLADIATOR),
  new Role(Alignment.TOWN, RoleType.LYNCHBAIT),
  new Role(Alignment.TOWN, RoleType.PSYCHIATRIST),
  new Role(Alignment.TOWN, RoleType.RELOADER),
  new Role(Alignment.TOWN, RoleType.FRUITVENDOR),
  new Role(Alignment.TOWN, RoleType.PARROT),
  new Role(Alignment.JUDAS, RoleType.VANILLA),
  new Role(Alignment.SAULUS, RoleType.VANILLA),
  new Role(Alignment.TOWN, RoleType.OS),
  new Role(Alignment.SURVIVOR, RoleType.UNDERDOG),
  new Role(Alignment.MAFIA, RoleType.VANILLA),
  new Role(Alignment.MAFIA, RoleType.VANILLA),
  new Role(Alignment.MAFIA, RoleType.VANILLA),
  new Role(Alignment.MAFIA, RoleType.VANILLA),
  new Role(Alignment.MAFIA, RoleType.VANILLA),
  new Role(Alignment.MAFIA, RoleType.GODFATHER),
  new Role(Alignment.MAFIA, RoleType.TRACKER),
  new Role(Alignment.MAFIA, RoleType.DOCTOR),
  new Role(Alignment.MAFIA, RoleType.ROLEBLOCKER),
  new Role(Alignment.MAFIA, RoleType.LOVER),
  new Role(Alignment.MAFIA, RoleType.SEER),
  new Role(Alignment.MAFIA, RoleType.OSDAYVIG),
  new Role(Alignment.MAFIA, RoleType.OSGOVERNOR),
  new Role(Alignment.MAFIA, RoleType.STRONGMAN),
  new Role(Alignment.MAFIA, RoleType.REFLEXIVEDOCTOR),
  new Role(Alignment.MAFIA, RoleType.HIRSUTE),
  new Role(Alignment.MAFIA, RoleType.CUPID),
  new Role(Alignment.MAFIA, RoleType.ALPHA),
  new Role(Alignment.MAFIA, RoleType.COMPULSIVEHIDER),
  new Role(Alignment.MAFIA, RoleType.FRUITVENDOR),
  new Role(Alignment.WEREWOLF, RoleType.VANILLA),
  new Role(Alignment.WEREWOLF, RoleType.VANILLA),
  new Role(Alignment.WEREWOLF, RoleType.VANILLA),
  new Role(Alignment.WEREWOLF, RoleType.VANILLA),
  new Role(Alignment.WEREWOLF, RoleType.ALPHA),
  new Role(Alignment.WEREWOLF, RoleType.ROLEBLOCKER),
  new Role(Alignment.WEREWOLF, RoleType.OSBULLETPROOF),
  new Role(Alignment.WEREWOLF, RoleType.COP),
  new Role(Alignment.WEREWOLF, RoleType.MASON),
  new Role(Alignment.WEREWOLF, RoleType.WATCHER),
  new Role(Alignment.WEREWOLF, RoleType.FBIAGENT),
  new Role(Alignment.WEREWOLF, RoleType.NINJA),
  new Role(Alignment.WEREWOLF, RoleType.OSPGO),
  new Role(Alignment.WEREWOLF, RoleType.MILLER),
  new Role(Alignment.WEREWOLF, RoleType.SUPERSAINT),
  new Role(Alignment.WEREWOLF, RoleType.GODFATHER),
  new Role(Alignment.WEREWOLF, RoleType.GRAVEDIGGER),
  new Role(Alignment.WEREWOLF, RoleType.PARROT),
  new Role(Alignment.ALIEN, RoleType.OSUL),
  new Role(Alignment.ALIEN, RoleType.PROBER),
  new Role(Alignment.ALIEN, RoleType.VANILLAISER),
  new Role(Alignment.ALIEN, RoleType.SILENCER),
  new Role(Alignment.ALIEN, RoleType.BULLETPROOFLOVER),
  new Role(Alignment.ALIEN, RoleType.PSYCHOTROOPER),
  new Role(Alignment.ALIEN, RoleType.MASSREDIRECTOR),
  new Role(Alignment.ALIEN, RoleType.BLOODSUCKER),
  new Role(Alignment.ALIEN, RoleType.SYMPATHISER),
  new Role(Alignment.SURVIVOR, RoleType.VANILLA),
  new Role(Alignment.SURVIVOR, RoleType.COMPULSIVEBODYGUARD),
  new Role(Alignment.SURVIVOR, RoleType.MASON),
  new Role(Alignment.LYNCHER, RoleType.VANILLA),
  new Role(Alignment.LYNCHER, RoleType.VANILLA),
  new Role(Alignment.SERIALKILLER, RoleType.TSBULLETPROOF),
  new Role(Alignment.SERIALKILLER, RoleType.MAFIAKILLIMMUNE),
  new Role(Alignment.SERIALKILLER, RoleType.WEREWOLFKILLIMMUNE),
  new Role(Alignment.SERIALKILLER, RoleType.ALIENKILLIMMUNE),
  new Role(Alignment.CULTOSRECRUITER, RoleType.VANILLA),
  new Role(Alignment.CULT, RoleType.OSGOOMAKER),
  new Role(Alignment.WILDCARDALIGNMENT, RoleType.WILDCARDROLE)];

const onInitiateMessage = function(conn, hostParam, playersParam) {
  global.env.gestiGame = new GestiGame(hostParam, playersParam, new Map([]), playersParam.reduce((acc, p) => acc.set(p, null), new Map([])));
  
  //Stolen off Stack Overflow
  const shuffleArray = function(array) {
    var newArray = array.slice();
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = newArray[i];
        newArray[i] = newArray[j];
        newArray[j] = temp;
    }
    return newArray;
  }
  
  const randomRoleList = shuffleArray(roleList);
  const sendRoles = function (roleList, userList) {
    return function() {
      if (roleList[0] && roleList[1] && roleList[2] && userList[0]) {
        global.env.gestiGame.assigned.set(userList[0], roleList.slice(0,3));
        Util.pm(conn, Config.gestiColor, userList[0], `Options: 1) ${roleList[0].toString()}; 2) ${roleList[1].toString()}; 3) ${roleList[2].toString()}`);
        setTimeout(function() {
          Util.pm(conn, Config.gestiColor, userList[0], 'Choose your role with ``gestipick: <alignment#(from 1-3)>, <role#(from 1-3)>``, e.g. ``gestipick: 2, 1``.');
          setTimeout(sendRoles(roleList.slice(3), userList.slice(1)));
        }, 600);
      }
    }
  };
  sendRoles(randomRoleList, playersParam)();
}

const onPickMessage = function(conn, user, alignmentNumber, roleNumber) {
  if (global.env.gestiGame && global.env.gestiGame.assigned) {
    if (global.env.gestiGame.players.indexOf(user) !== -1) {
      var chosenAlignment = null;
      var chosenRoleType = null;
      var chosenDiscard = null;
      switch (alignmentNumber) {
        case '1':
          chosenAlignment = global.env.gestiGame.assigned.get(user)[0];
          break;
        case '2':
          chosenAlignment = global.env.gestiGame.assigned.get(user)[1];
          break;
        case '3':
          chosenAlignment = global.env.gestiGame.assigned.get(user)[2];
          break;
      }
      switch (roleNumber) {
        case '1':
          chosenRoleType = global.env.gestiGame.assigned.get(user)[0];
          break;
        case '2':
          chosenRoleType = global.env.gestiGame.assigned.get(user)[1];
          break;
        case '3':
          chosenRoleType = global.env.gestiGame.assigned.get(user)[2];
          break;
      }
      if (chosenAlignment && chosenRoleType) {
        var chosenDiscard = null;
        switch (alignmentNumber + roleNumber) {
          case '12':
            chosenDiscard = global.env.gestiGame.assigned.get(user)[2];
            break;
          case '13':
            chosenDiscard = global.env.gestiGame.assigned.get(user)[1];
            break;
          case '21':
            chosenDiscard = global.env.gestiGame.assigned.get(user)[2];
            break;
          case '23':
            chosenDiscard = global.env.gestiGame.assigned.get(user)[0];
            break;
          case '31':
            chosenDiscard = global.env.gestiGame.assigned.get(user)[1];
            break;
          case '32':
            chosenDiscard = global.env.gestiGame.assigned.get(user)[2];
            break;
        }
        if (chosenDiscard) {
          const chosenRole = new Role(chosenAlignment.alignment, chosenRoleType.roleType);
          Util.pm(conn, Config.gestiColor, user, 'You have chosen the role: ' + chosenRole.toString());
          global.env.gestiGame.choices.set(user, new Choice(chosenRole, chosenDiscard));
        } else {
          Util.pm(conn, Config.gestiColor, user, 'You may not choose the same Role for Alignment and Role.');
        }
      } else {
        Util.pm(conn, Config.gestiColor, user, 'Choose your role with ``gestipick: <alignment#(from 1-3)>, <role#(from 1-3)>``, e.g. ``gestipick: 2, 1``.');
      }
    }
  }
}

const onGestiEndMessage = function(conn) {
  if (global.env.gestiGame) {
    const discardsText = global.env.gestiGame.players.map(player =>
      global.env.gestiGame.choices === null || global.env.gestiGame.choices.get(player) === null ?
        player + ' did not choose' :
        player + ' discarded ' + global.env.gestiGame.choices.get(player).discard).join(';\n');
    const rolesText = global.env.gestiGame.players.map(player =>
      global.env.gestiGame.choices === null || global.env.gestiGame.choices.get(player) === null ?
        `${player} did not choose. Options were: ${global.env.gestiGame.assigned.get(player)[0].toString()}, ${global.env.gestiGame.assigned.get(player)[1].toString()}, and ${global.env.gestiGame.assigned.get(player)[2].toString()}` :
        `${player} chose: ${global.env.gestiGame.choices.get(player).choice.toString()}`).join(';\n');
    Hastebin.upload(rolesText, function(rolesUrl) {
      Util.pm(conn, Config.gestiColor, global.env.gestiGame.host, 'Roles: ' + rolesUrl);
      Hastebin.upload(discardsText, function(discardsUrl) {
        Util.pm(conn, Config.gestiColor, global.env.gestiGame.host, 'Discards: ' + discardsUrl);
        global.env.gestiGame = void 0;
      });
    });
  }
}

module.exports.gestiCommands = [
  new Triggers.Command(new Triggers.Trigger(/initiategesti: /i, Triggers.PermConfig.OWNERONLY), (conn, room, username, target) => {
    console.log(typeof target);
    const partsList = target.split(',');
    if (partsList.length >= 2) {
      onInitiateMessage(conn, Util.toId(partsList[0]), partsList.slice(1).map(s => Util.toId(s)));
    }
  }),
  new Triggers.Command(new Triggers.Trigger(/gestipick:/i), (conn, room, username, target) => {
    const partsList = target.split(',');
    if (partsList.length === 2) {
      onPickMessage(conn, Util.toId(username), partsList[0].trim(), partsList[1].trim());
    }
  }),
  new Triggers.Command(new Triggers.Trigger(/end gesti choosing period/i, Triggers.PermConfig.OWNERONLY), (conn, room, username, target) => {
    onGestiEndMessage(conn);
  })
];