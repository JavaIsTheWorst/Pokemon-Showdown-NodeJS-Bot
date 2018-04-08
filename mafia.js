'use strict';

const Config = require('./config.js');
const Hastebin = require('./hastebin.js');
const Triggers = require('./triggers.js');
const Util = require('./util.js');

const LynchVote = {
  UNDECIDED: '0',
  NOLYNCH: '1'
} //the actual values are unimportant as long as they are not valid PS! usernames

const GamePhase = {
  DAY: 'Day',
  TWILIGHT: 'Twilight',
  NIGHT: 'Night'
}

const OpenGame = class {
  constructor(players, theme) {
    this.players = players;
    this.theme = theme;
  }
}

const ClosedGame = class {
  constructor(players, theme, playerRoles, day, gamePhase, lynches, miscInfo) {
    this.players = players;
    this.theme = theme;
    this.playerRoles = playerRoles;
    this.day = day;
    this.gamePhase = gamePhase;
    this.lynches = lynches;
    this.miscInfo = miscInfo;
  }
}

const operateOnMafiaGame = function(game, onOpen, onClosed) {
  if (game.players && game.theme && game.playerRoles && game.day && game.gamePhase && game.lynches && game.miscInfo) {
    return onClosed();
  } else if (game.players && game.theme) {
    return onOpen();
  }
}

const ifClosedGame = function(game, onClosed) {
  operateOnMafiaGame(game, () => void 0, onClosed);
}

const voteOptions = game => [...game.players, LynchVote.NOLYNCH, LynchVote.UNDECIDED];

const invertMap = game => lynchesMap => Array.from(lynchesMap).reduce((acc, kvPair) =>
  acc.set(kvPair[1], acc.get(kvPair[1]).add(kvPair[0].toString())), new Map(voteOptions(game).map(v => [v, new Set([])])));

const gameSize = game => game.players.size;

const majority = n => Math.floor(n/2) + 1;

const placeLynchVote = (user, vote, game) =>
  operateOnMafiaGame(game, () => ({newGame: game, hammered: LynchVote.UNDECIDED}), () => {
    const checkForHammer = newLynches => {
      const lynchObj = Array.from(invertMap(game)(newLynches)).reduce((acc, kvPair) =>
        acc.reachedMajority ? acc : {possibleVote: kvPair[0], reachedMajority: kvPair[1].size >= majority(game.players.size)}, {possibleVote: LynchVote.UNDECIDED, reachedMajority: false});
      if (lynchObj.reachedMajority && lynchObj.possibleVote !== LynchVote.UNDECIDED) {
        return {newGame: game, possibleVote: lynchObj.possibleVote};
      } else {
        game.lynches = newLynches;
        return {newGame: game, possibleVote: LynchVote.UNDECIDED};
      }
    };
    return checkForHammer(game.lynches.set(user, vote));
  });

const emptyLynches = gamePlayers => new Map(Array.from(gamePlayers).map(player => [player, LynchVote.UNDECIDED]));

const GameEffect = class {
  constructor(messages, game) {
    this.messages = messages;
    this.game = game;
  }

  then(f) {
    if (this.game) {
      const newGameEffect = f(this.game);
      return new GameEffect([...this.messages, ...newGameEffect.messages], newGameEffect.game);
    } else {
      return this;
    }
  }
}

const messagesEffect = messages => game => new GameEffect(messages, game);

const endGameEffect = messages => new GameEffect(messages, null);

const noMsgGameEffect = game => new GameEffect([], game);

const Theme = class {
  constructor(roleList, validPlayerNumbers, allowedToNoLynch, hasReveal, onStart, onLynch, onHammer, onTarget) {
    this.roleList = roleList;
    this.validPlayerNumbers = validPlayerNumbers;
    this.allowedToNoLynch = allowedToNoLynch;
    this.hasReveal = hasReveal;
    this.onStart = onStart;
    this.onLynch = onLynch;
    this.onHammer = onHammer;
    this.onTarget = onTarget;
  }
}

const defaultTheme = new Theme(
  () => [],
  new Set([]),
  true,
  true,
  (r, g) => pmMafiaPartners(g).then(messagesEffect(["**Day 1 Start!**"])),
  (lyncher, lynchee, r, g) => noMsgGameEffect(g),
  (hammerer, hammeree, r, g) => noMsgGameEffect(g),
  (targeter, targets, r, g) => noMsgGameEffect(g));

const toRoleListFunction = assocList => n =>
  assocList.reduce((acc, entry) => entry[0] === n ? entry[1] : acc, []);

const playersWithRole = role => game =>
  Array.from(game.playerRoles).reduce((acc, entry) => entry[1].indexOf(role) === -1 ? acc : [entry[0], ...acc], []);

const pmMafiaPartners = game => {
  const mafiaMembers = playersWithRole('Mafia')(game);
  if (mafiaMembers.length == 2) {
    return messagesEffect([
      `/w ${mafiaMembers[0]},Fellow Mafioso: ${mafiaMembers[1]}`,
      `/w ${mafiaMembers[1]},Fellow Mafioso: ${mafiaMembers[0]}`])(game);
  } else if (mafiaMembers.length > 2) {
    const otherMafiaMembers = mafiaMember => mafiaMembers.filter(p => p !== mafiaMember).join(', ');
    return messagesEffect(mafiaMembers.map(mafiaMember => `/w ${mafiaMember},Fellow Mafiosi: ${otherMafiaMembers(mafiaMember)}`))(game);
  } else {
    return noMsgGameEffect(game);
  }
}

const maybeRoomMafiaGame = function(room, defaultValue, f) {
  if (global.env.mafiaGames.get(room)) {
    return f(global.env.mafiaGames.get(room));
  } else {
    return defaultValue();
  }
}

const ifRoomMafiaGame = function(room, f) {
  maybeRoomMafiaGame(room, () => void 0, f);
}

const setRoomMafiaGame = function(room, game) {
  global.env.mafiaGames.set(room, game);
}

const deleteRoomMafiaGame = function(room) {
  global.env.mafiaGames.delete(room);
}

const parseGameEffect = function(conn, room, gameEffect) {
  const sayMessages = function(messages, cont) {
    if (messages[0]) {
      Util.say(conn, Config.mafiaColor, room, messages[0]);
      setTimeout(() => sayMessages(messages.slice(1), cont), 600);
    } else {
      if (cont) {
        cont();
      }
    }
  }
  if (gameEffect.game) {
    setRoomMafiaGame(room, gameEffect.game);
    sayMessages(gameEffect.messages);
  } else {
    sayMessages(gameEffect.messages, () => onMafiaEndMessage(conn, room));
  }
}

const onMafiaInitiateMessage = function(conn, gameTheme, room) {
  const startGame = function() {
    Util.say(conn, Config.mafiaColor, room, '**A new Mafia game is starting! Use** ``**@j**`` **to join!**');
    setRoomMafiaGame(room, new OpenGame(new Set([]), gameTheme));
  }
  maybeRoomMafiaGame(room, startGame, () => Util.say(conn, Config.mafiaColor, room, 'There is already a Mafia game going on!'));
}

const onMafiaJoinMessage = function(conn, room, user) {
  const joinGame = function(game) {
    game.players.add(user);
    Util.pm(conn, Config.mafiaColor, user, 'You have joined the game of Mafia.');
    if (game.players.size === Math.max(...game.theme.validPlayerNumbers)) {
      onMafiaStartMessage(conn, room);
    }
  }
  ifRoomMafiaGame(room, mafiaGame =>
    operateOnMafiaGame(mafiaGame, () => joinGame(mafiaGame), () =>
      Util.pm(conn, Config.mafiaColor, user, 'The Mafia game has already started.')));
}

const onMafiaLeaveMessage = function(conn, room, user) {
  const leaveGame = function(game) {
    game.players.delete(user);
    Util.pm(conn, Config.mafiaColor, user, 'You have left the game of Mafia.');
    if (game.players.size === Math.max(...game.theme.validPlayerNumbers)) {
      onMafiaStartMessage(conn, room);
    }
  }
  ifRoomMafiaGame(room, mafiaGame =>
    operateOnMafiaGame(mafiaGame, () => leaveGame(mafiaGame), () =>
      Util.pm(conn, Config.mafiaColor, user, 'The Mafia game has already started.')));
}

const onMafiaAddPlayersMessage = function(conn, room, users) {
  const addToGame = function(game) {
    game.players = new Set([...game.players, ...users]);
    Util.say(conn, Config.mafiaColor, room, 'Following players added: ' + users.join(', '));
    if (game.players.size === Math.max(...game.theme.validPlayerNumbers)) {
      onMafiaStartMessage(conn, room);
    }
  }
  ifRoomMafiaGame(room, mafiaGame =>
    operateOnMafiaGame(mafiaGame, () => addToGame(mafiaGame), () =>
      Util.say(conn, Config.mafiaColor, room, 'The Mafia game has already started.')));
}

const onMafiaKickPlayersMessage = function(conn, room, users) {
  const kickFromGame = function(game) {
    game.players = new Set([...game.players].filter(p => !users.includes(p)));
    Util.say(conn, Config.mafiaColor, room, 'Following players kicked: ' + users.join(', '));
    if (game.players.size === Math.max(...game.theme.validPlayerNumbers)) {
      onMafiaStartMessage(conn, room);
    }
  }
  ifRoomMafiaGame(room, mafiaGame =>
    operateOnMafiaGame(mafiaGame, () => kickFromGame(mafiaGame), () =>
      Util.say(conn, Config.mafiaColor, room, 'The Mafia game has already started.')));
}

const onMafiaStartMessage = function(conn, room) {
  const distrib = function(mafiaGame) {
    const possibleRoleLists = mafiaGame.theme.roleList(gameSize(mafiaGame));
    const gameRoleList = possibleRoleLists[Math.floor(Math.random()*possibleRoleLists.length)];
    Util.say(conn, Config.mafiaColor, room,
      possibleRoleLists.length === 1 ?
        'Distributing roles: ' + gameRoleList.join(', ') :
        'Distributing roles');

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

    const randomRoles = shuffleArray(gameRoleList);
    const rolesMap = new Map(Array.from(mafiaGame.players).map((player, index) =>
      [player, randomRoles[index]]));
    const newGame = new ClosedGame(mafiaGame.players, mafiaGame.theme, rolesMap, 1, GamePhase.DAY, emptyLynches(mafiaGame.players), new Map([]));
    const gameEffect = mafiaGame.theme.onStart(room, newGame);
    const pmRoles = function(playerList) {
      if (playerList[0]) {
        Util.pm(conn, Config.mafiaColor, playerList[0], 'Your role is: ' + rolesMap.get(playerList[0]));
        setTimeout(() => pmRoles(playerList.slice(1)), 600);
      } else {
        Util.say(conn, Config.mafiaColor, room, 'The Mafia game has started!');
        parseGameEffect(conn, room, gameEffect);
      }
    }
    pmRoles(Array.from(mafiaGame.players));
  }
  const distributeRoles = function(mafiaGame) {
    if (mafiaGame.theme.validPlayerNumbers.has(gameSize(mafiaGame))) {
      distrib(mafiaGame);
    } else {
      Util.say(conn, Config.mafiaColor, room, 'You have not provided the right number of players for this theme.');
    }
  }
  ifRoomMafiaGame(room, mafiaGame =>
    operateOnMafiaGame(mafiaGame, () => distributeRoles(mafiaGame), () =>
      Util.say(conn, Config.mafiaColor, room, 'The Mafia game has already started.')));
};

const onMafiaSubMessage = function(conn, room, user1, user2) {
  const changePlayerList = mafiaGame => {
    mafiaGame.players.add(user2);
    mafiaGame.players.delete(user1);
    return mafiaGame;
  };
  const replaceUser = val => user1 === val ? user2 : val;
  const changePlayerRoles = mafiaGame => {
    mafiaGame.playerRoles = new Map(Array.from(mafiaGame.playerRoles).map(kvPair => [replaceUser(kvPair[0]), kvPair[1]]));
    return mafiaGame;
  }
  const changeLynches = mafiaGame => {
    mafiaGame.lynches = new Map(Array.from(mafiaGame.lynches).map(kvPair => [replaceUser(kvPair[0]), replaceUser(kvPair[1])]));
    return mafiaGame;
  }
  const changeMiscInfo = mafiaGame => {
    mafiaGame.miscInfo = new Map(Array.from(mafiaGame.lynches).map(kvPair => [replaceUser(kvPair[0]), replaceUser(kvPair[1])]));
    return mafiaGame;
  }
  const subInGame = mafiaGame => setRoomMafiaGame(room, changeMiscInfo(changeLynches(changePlayerRoles(changePlayerList(mafiaGame)))));
  ifRoomMafiaGame(room, mafiaGame => {
    if (mafiaGame.players.has(user1) && !mafiaGame.players.has(user2)) {
      operateOnMafiaGame(mafiaGame, () => setRoomMafiaGame(room, changePlayerList(mafiaGame)), () => subInGame(mafiaGame));
      Util.say(conn, Config.mafiaColor, room, `Player ${user1} replaced with ${user2}.`);
      Util.pm(conn, Config.mafiaColor, user2, 'Your role is: ' + mafiaGame.playerRoles.get(user1));
    }
  });
};

const onMafiaLynchMessage = function(conn, room, user, vote) {
  const canLynchIn = mafiaGame =>
    mafiaGame.players.has(user) &&
    (vote === LynchVote.UNDECIDED || vote === LynchVote.NOLYNCH || mafiaGame.players.has(vote)) &&
    (!(vote === LynchVote.NOLYNCH) || mafiaGame.theme.allowedToNoLynch) &&
    mafiaGame.gamePhase === GamePhase.DAY
  const lynchIn = mafiaGame => {
    if (canLynchIn(mafiaGame)) {
      const lynchObj = placeLynchVote(user, vote, mafiaGame);
      if (lynchObj.possibleVote === LynchVote.UNDECIDED) {
        if (vote !== LynchVote.UNDECIDED) {
          parseGameEffect(conn, room, mafiaGame.theme.onLynch(user, vote, room, lynchObj.newGame));
        }
      } else {
        if (lynchObj.possibleVote === LynchVote.NOLYNCH) {
          parseGameEffect(conn, room, mafiaGame.theme.onHammer(user, vote, room, lynchObj.newGame));
        } else {
          if (lynchObj.newGame.theme.hasReveal) {
            Util.say(conn, Config.mafiaColor, room, `**${vote} the ${lynchObj.newGame.playerRoles.get(vote)} was lynched!**`);
          } else {
            Util.say(conn, Config.mafiaColor, room, `**${vote} was lynched!**`)
          }
          let newPlayers = new Set(lynchObj.newGame.players);
          newPlayers.delete(vote);
          lynchObj.newGame.players = newPlayers;
          lynchObj.newGame.lynches = emptyLynches(newPlayers);
          parseGameEffect(conn, room, lynchObj.newGame.theme.onHammer(user, vote, room, lynchObj.newGame));
        }
      }
    }
  }
  ifRoomMafiaGame(room, mafiaGame =>
    ifClosedGame(mafiaGame, () => lynchIn(mafiaGame)));
};

const onMafiaDisplayLynchesMessage = function(conn, room, user) {
  const displayPlayers = playersSet =>
    Array.from(playersSet).reduce((acc, player) => acc.length > 0 ? acc + ', ' + player : player, '');
  const voteStr = vote =>
    vote === LynchVote.UNDECIDED ?
      'Und' :
      vote === LynchVote.NOLYNCH ?
        'NL':
        vote;
  const votesForPlayer = (vote, users) =>
    `${voteStr(vote)} (${users.size.toString()}): ${displayPlayers(users)}`;
  const lynchesText = mafiaGame => {
    return Array.from(invertMap(mafiaGame)(mafiaGame.lynches)).reduce((acc, kvPair) =>
      kvPair[1].size > 0 ?
        (acc.length > 0 ?
          acc + ' | ' + votesForPlayer(...kvPair) :
          votesForPlayer(...kvPair)) :
      acc, '');
  };
  const displayLynchesIn = mafiaGame =>
    Util.say(conn, Config.mafiaColor, room, `**Majority: ${majority(gameSize(mafiaGame))} | ${lynchesText(mafiaGame)}**`);
  ifRoomMafiaGame(room, mafiaGame =>
    ifClosedGame(mafiaGame, () => mafiaGame.players.has(user) ? displayLynchesIn(mafiaGame) : void 0));
};

const onMafiaTargetMessage = function(conn, room, user, parts) {
  ifRoomMafiaGame(room, mafiaGame =>
    parseGameEffect(conn, room, mafiaGame.theme.onTarget(user, parts, room, mafiaGame)));
};

const onMafiaEliminatePlayersMessage = function(conn, room, users) {
  const eliminateFromGame = mafiaGame => {
    Util.say(conn, Config.mafiaColor, room, '**Following players eliminated: ' + users.reduce((acc, user) =>
      acc.length > 0 ?
        (mafiaGame.playerRoles.get(user) === undefined ?
          acc + '; ' + user + ' is not in the game' :
          acc + '; ' + user + ' the ' + mafiaGame.playerRoles.get(user)) :
        (mafiaGame.playerRoles.get(user) === undefined ?
          user + ' is not in the game' :
          user + ' the ' + mafiaGame.playerRoles.get(user)), '') + '**');
    mafiaGame.players = new Set(Array.from(mafiaGame.players).filter(p => users.indexOf(p) === -1));
    mafiaGame.lynches = emptyLynches(mafiaGame.players);
  };
  ifRoomMafiaGame(room, mafiaGame =>
    operateOnMafiaGame(mafiaGame, () => Util.say(conn, Config.mafiaColor, room, 'The Mafia game has not started yet.'), () => eliminateFromGame(mafiaGame)));
};

const onMafiaDisplayPlayersMessage = function(conn, room) {
  const playersStr = mafiaGame => Array.from(mafiaGame.players).join(', ');
  const playersInGameStr = mafiaGame => `Players (${gameSize(mafiaGame).toString()}): ${playersStr(mafiaGame)}`;
  const displayPlayersInGame = mafiaGame => Util.say(conn, Config.mafiaColor, room, `**${playersInGameStr(mafiaGame).trim()}**`);
  ifRoomMafiaGame(room, displayPlayersInGame)
};

const onMafiaEndMessage = function(conn, room) {
  const hastebinRolesInGame = function(mafiaGame) {
    const rolesText = Array.from(mafiaGame.playerRoles).reduce((acc, kvPair) =>
      acc.length > 0 ?
        `${acc};
${kvPair[0]}: ${kvPair[1]}` :
        `${kvPair[0]}: ${kvPair[1]}`, '');
    Hastebin.upload(rolesText, url => {
      Util.say(conn, Config.mafiaColor, room, 'Mafia game ended. Roles: ' + url);
      deleteRoomMafiaGame(room);
    });
  }
  ifRoomMafiaGame(room, mafiaGame => 
    operateOnMafiaGame(mafiaGame, () => {
      Util.say(conn, Config.mafiaColor, room, 'Mafia game ended.');
      deleteRoomMafiaGame(room);
    }, () => hastebinRolesInGame(mafiaGame)));
}

const rangeSet = (lo, hi) => new Set(Array.from(new Array(hi-lo+1), (x,i) => i+lo));

var ss2Template = Object.assign({}, defaultTheme);
ss2Template.roleList = toRoleListFunction([[2, [['Hated Mafia', 'Hated Supersaint'], ['Hated Mafia', 'Hated Supersaint', 'Hated Supersaint']]]]);
ss2Template.validPlayerNumbers = new Set([2]);
ss2Template.onLynch = (lyncher, lynchee, r, g) =>
  lynchee === LynchVote.NOLYNCH ?
    noMsgGameEffect(g) :
    Array.from(g.playerRoles.values()).every(role => role === 'Hated Supersaint') ?
      (lyncher === lynchee ?
        endGameEffect(['**Both players were Hated Supersaint! The Town has won!**']) :
        endGameEffect(['**Both players were Hated Supersaint! No one has won!**'])) :
      (lyncher === lynchee ?
        (g.playerRoles.get(lyncher) === 'Hated Supersaint' ?
          endGameEffect(['**The Hated Supersaint has selfhammered! The Mafia has won!**']) :
          endGameEffect(['**Ths Hated Mafia has selfhammered! The Town has won!**'])) :
        (g.playerRoles.get(lyncher) === 'Hated Supersaint' ?
          endGameEffect(['**The Hated Mafia has been lynched! The Town has won!**']) :
          endGameEffect(['**The Hated Mafia has hammered the Hated Supersaint! The Town has won!**'])));
ss2Template.onHammer = (hammerer, hammeree, r, g) =>
  hammeree === LynchVote.NOLYNCH ?
    (Array.from(g.playerRoles.values()).every(role => role === 'Hated Supersaint') ?
      endGameEffect(['**The Town has won!**']) :
      endGameEffect(['**The Mafia has won!**'])) :
    noMsgGameEffect(g);
const ss2 = Object.assign({}, ss2Template);

var ss3Template = Object.assign({}, defaultTheme);
ss3Template.roleList = toRoleListFunction([[3, [['Mafia', 'Supersaint', 'Vanilla Townie']]]]);
ss3Template.validPlayerNumbers = new Set([3]);
ss3Template.allowedToNoLynch = false;
ss3Template.onHammer = (hammerer, hammeree, r, g) => {
  switch (g.playerRoles.get(hammeree)) {
    case 'Mafia':
      return endGameEffect(['**The Town has won!**']);
    case 'Supersaint':
      switch (g.playerRoles.get(hammerer)) {
        case 'Mafia':
          return endGameEffect(['**The Supersaint kills ' + hammerer + ', the Mafia! The Town has won!**']);
        case 'Vanilla Townie':
          return endGameEffect(['**The Supersaint kills ' + hammerer + ', the Vanilla Townie! The Mafia has won!**']);
      }
    case 'Vanilla Townie':
      return endGameEffect(['**The Mafia has won!**']);
  }
}
const ss3 = Object.assign({}, ss3Template);

var aitcTemplate = Object.assign({}, defaultTheme);
aitcTemplate.roleList = toRoleListFunction([
  [4, [['Assassin', 'King', ...new Array(2).fill('Guard')]]],
  [5, [['Assassin', 'King', ...new Array(3).fill('Guard')]]]
]);
aitcTemplate.validPlayerNumbers = rangeSet(4, 5);
aitcTemplate.allowedToNoLynch = false;
aitcTemplate.onStart = (r, g) => (function() {
    const guards = playersWithRole('Guard')(g);
    const king = playersWithRole('King')(g)[0];
    return messagesEffect(guards.map(guard => `/w ${guard},Your Majesty, the King, is ${king}`))(g);
  }()).then(g1 => defaultTheme.onStart(r, g1)).then(messagesEffect(['**Assassin, shoot using** ``**@target ' + r + ', user**``**!**']));
aitcTemplate.onHammer = (hammerer, hammeree, r, g) =>
  g.playerRoles.get(hammeree) === 'King' ?
    endGameEffect(['The Assassin has won!']) :
    (g.playerRoles.get(hammeree) === 'Assassin' ?
      endGameEffect(['The Kingdom has won!']) :
      new GameEffect(['**Day ' + (g.day+1).toString() + ' Start!**'], Object.assign({}, g, {day: g.day+1, lynches: emptyLynches(g.players)})));
aitcTemplate.onTarget = (targeter, targets, r, g) =>
  g.playerRoles.get(targeter) === 'Assassin' && targets[0] !== targeter && g.playerRoles.get(targets[0]) ?
    (g.playerRoles.get(targets[0]) === 'King' ?
      endGameEffect([`**The Assassin has shot ${targets[0]}, the King, and won!**`]) :
      endGameEffect([`**The Assassin has shot ${targets[0]}, the Guard, and lost!**`])) :
    noMsgGameEffect(g);
const aitc = Object.assign({}, aitcTemplate);

var aitpTemplate = Object.assign({}, defaultTheme);
aitpTemplate.roleList = toRoleListFunction([
  [4, [['Assassin', 'King', ...new Array(2).fill('Guard')]]],
  [5, [['Assassin', 'King', ...new Array(3).fill('Guard')]]],
  [6, [['Assassin', 'King', ...new Array(4).fill('Guard')]]],
  [7, [['Assassin', 'King', ...new Array(5).fill('Guard')]]]
]);
aitpTemplate.validPlayerNumbers = rangeSet(4, 7);
aitpTemplate.allowedToNoLynch = false;
aitpTemplate.onStart = (r, g) => (function() {
    const guards = playersWithRole('Guard')(g);
    const king = playersWithRole('King')(g)[0];
    return messagesEffect(guards.map(guard => `/w ${guard},Your Majesty, the King, is ${king}`))(g);
  }()).then(g1 => defaultTheme.onStart(r, g1)).then(messagesEffect(['**Assassin, shoot using** ``**@target ' + r + ', user**``**!**']));
aitpTemplate.onHammer = (hammerer, hammeree, r, g) =>
  g.playerRoles.get(hammeree) === 'King' ?
    endGameEffect(['The Assassin has won!']) :
    (g.playerRoles.get(hammeree) === 'Assassin' ?
      new GameEffect(['**Assassin, shoot using** ``**@target ' + r + ', user**``**!**'], Object.assign({}, g, {gamePhase: GamePhase.TWILIGHT})) :
      new GameEffect(['**Day ' + (g.day+1).toString() + ' Start!**'], Object.assign({}, g, {day: g.day+1, lynches: emptyLynches(g.players)})));
aitpTemplate.onTarget = (targeter, targets, r, g) =>
  g.playerRoles.get(targeter) === 'Assassin' && targets[0] !== targeter && g.playerRoles.get(targets[0]) ?
    (g.playerRoles.get(targets[0]) === 'King' ?
      endGameEffect([`**The Assassin has shot ${targets[0]}, the King, and won!**`]) :
      endGameEffect([`**The Assassin has shot ${targets[0]}, the Guard, and lost!**`])) :
    noMsgGameEffect(g);
const aitp = Object.assign({}, aitpTemplate);

Set.prototype.customDelete = function(item) {
  let arr = Array.from(this);
  if (arr.indexOf(item) > -1) {
    arr.splice(arr.indexOf(item), 1);
    return new Set(arr);
  } else {
    return this;
  }
}

var wnafTemplate = Object.assign({}, defaultTheme);
wnafTemplate.roleList = toRoleListFunction([[4, [['Mafia Goon', 'Mafia Goon', 'Vanilla Townie', 'Vanilla Townie']]]]);
wnafTemplate.validPlayerNumbers = new Set([4]);
wnafTemplate.allowedToNoLynch = false;
wnafTemplate.onHammer = (hammerer, hammeree, r, g) =>
  g.day === 1 ?
    (g.playerRoles.get(hammeree) === 'Vanilla Townie' ?
      new GameEffect(['**' + hammeree + ' has been added back to the game! Take your shot with** ``**@target ' + r + ', player**``**!**'], Object.assign({}, g, {players: g.players.add(hammeree), gamePhase: GamePhase.TWILIGHT, miscInfo: new Map([[hammeree, 'Vanilla Townie']])})) :
      new GameEffect(['**' + hammeree + ', confirm a Town player with** ``**@target ' + r + ', player**``**!**'], Object.assign({}, g, {gamePhase: GamePhase.TWILIGHT, miscInfo: new Map([[hammeree, 'Mafia Goon']])}))) :
    (g.playerRoles.get(hammeree) === 'Vanilla Townie' ?
      endGameEffect(['**The Mafia has won!**']) :
      endGameEffect(['**The Town has won!**']));
wnafTemplate.onTarget = (targeter, targets, r, g) =>
  g.miscInfo.has(targeter) && g.players.has(targets[0]) ?
    (g.miscInfo.get(targeter) === 'Vanilla Townie' ?
      (g.playerRoles.get(targets[0]) === 'Vanilla Townie' ?
        endGameEffect(['**' + targets[0] + ' was Vanilla Townie!**', '**The Mafia have won!**']) :
        new GameEffect(['**' + targets[0] + ' was Mafia Goon!**', '**Day 2 Start!**'], Object.assign({}, g, {day: 2, gamePhase: GamePhase.DAY, players: g.players.customDelete(targets[0]), lynches: emptyLynches(g.players.customDelete(targets[0])), miscInfo: new Map([])}))) :
      (g.playerRoles.get(targets[0]) === 'Vanilla Townie' ?
        new GameEffect(['**' + targets[0] + ' has been confirmed as Vanilla Townie!**', '**Day 2 Start!**'], Object.assign({}, g, {day: 2, gamePhase: GamePhase.DAY, lynches: emptyLynches(g.players), miscInfo: new Map([])})) :
        noMsgGameEffect(g))) :
    noMsgGameEffect(g);
const wnaf = Object.assign({}, wnafTemplate);

var jobTemplate = Object.assign({}, defaultTheme);
jobTemplate.roleList = toRoleListFunction([[5, [['Mafia Goon', 'Mafia Goon', 'Mafia Goon', 'Vanilla Townie', 'Vanilla Townie']]]]);
jobTemplate.validPlayerNumbers = new Set([5]);
jobTemplate.allowedToNoLynch = false;
jobTemplate.onHammer = (hammerer, hammeree, r, g) =>
  g.day === 1 ?
    (g.playerRoles.get(hammeree) === 'Vanilla Townie' ?
      new GameEffect(['**' + hammeree + ' has been added back to the game! Take your shots with** ``**@target ' + r + ', player1, player2**``**!**'], Object.assign({}, g, {players: g.players.add(hammeree), gamePhase: GamePhase.TWILIGHT, miscInfo: new Map([[hammeree, 'Vanilla Townie']])})) :
      new GameEffect(['**' + hammeree + ', confirm a Town player and kill a Mafia player with** ``**@target ' + r + ', townplayer, mafiaplayer**``**!**'], Object.assign({}, g, {gamePhase: GamePhase.TWILIGHT, miscInfo: new Map([[hammeree, 'Mafia Goon']])}))) :
    (g.playerRoles.get(hammeree) === 'Vanilla Townie' ?
      endGameEffect(['**The Mafia has won!**']) :
      endGameEffect(['**The Town has won!**']));
jobTemplate.onTarget = (targeter, targets, r, g) =>
  g.miscInfo.has(targeter) && g.players.has(targets[0]) && g.players.has(targets[1]) ?
    g.miscInfo.get(targeter) === 'Vanilla Townie' ?
      (g.playerRoles.get(targets[0]) === 'Mafia Goon' && g.playerRoles.get(targets[1]) === 'Mafia Goon' ?
        new GameEffect(['**' + targets[0] + ' and ' + targets[1] + ' were Mafia Goons!**', '**Day 2 Start!**'], Object.assign({}, g, {players: g.players.customDelete(targets[0]).customDelete(targets[1]), day: 2, gamePhase: GamePhase.DAY, lynches: emptyLynches(game.players.customDelete(targets[0]).customDelete(targets[1]))})) :
        (g.playerRoles.get(targets[0]) === 'Vanilla Townie' ?
          endGameEffect(['**' + targets[0] + ' was Vanilla Townie!**', '**The Mafia has won!**']) :
          endGameEffect(['**' + targets[1] + ' was Vanilla Townie!**', '**The Mafia has won!**']))) :
      (g.playerRoles.get(targets[0]) === 'Vanilla Townie' && g.playerRoles.get(targets[1]) === 'Mafia Goon' ?
        new GameEffect(['**' + targets[0] + ' has been confirmed as Vanilla Townie!**', '**' + targets[1] + ' the Mafia Goon has been killed!**', '**Day 2 Start!**'], Object.assign({}, g, {players: g.players.customDelete(targets[1]), day: 2, gamePhase: GamePhase.DAY, lynches: emptyLynches(g.players.customDelete(targets[1])), miscInfo: new Map([])})) :
        noMsgGameEffect(g)) :
    noMsgGameEffect(g);
const job = Object.assign({}, jobTemplate);

var backup6Template = Object.assign({}, defaultTheme);
backup6Template.roleList = toRoleListFunction([
  [9, [
    [...new Array(5).fill('Vanilla Townie'), 'Town Jailkeeper', 'Town Universal Backup', 'Mafia Goon', 'Mafia Roleblocker'],
    [...new Array(5).fill('Vanilla Townie'), 'Vanilla Townie', 'Town Cop', 'Mafia Goon', 'Mafia Goon'],
    [...new Array(5).fill('Vanilla Townie'), 'Town Doctor', 'Town Tracker', 'Mafia Goon', 'Mafia Goon'],
    [...new Array(5).fill('Vanilla Townie'), 'Town Jailkeeper', 'Vanilla Townie', 'Mafia Goon', 'Mafia Goon'],
    [...new Array(5).fill('Vanilla Townie'), 'Town Cop', 'Town Doctor', 'Mafia Goon', 'Mafia Roleblocker'],
    [...new Array(5).fill('Vanilla Townie'), 'Town Universal Backup', 'Town Tracker', 'Mafia Goon', 'Mafia Goon']]]
]);
backup6Template.validPlayerNumbers = new Set([9]);
const backup6CheckForWin = g =>
  playersWithRole('Mafia')(g).filter(p => g.players.has(p)).length === 0 ?
    endGameEffect(['**The Town has won!**']) :
    (playersWithRole('Mafia')(g).filter(p => g.player.has(p)).length * 2 >= gameSize(g) ?
      endGameEffect(['**The Mafia has won!**']) :
      noMsgGameEffect(g));
backup6Template.onHammer = (hammerer, hammeree, r, g) =>
  backup6CheckForMafiaWin(g).then(g1 =>
    new GameEffect(['**Power Roles, use your actions with** ``**@target ' + r + ', user**``** **or** `**@target ' + r + ', idle**`**! (If there is a Mafia Roleblocker, use** ``**@target ' + r + ', user, mafiakill**`` **or** ``**@target ' + r + ', user, roleblock**``**)**'], Object.assign({}, g1, {gamePhase: GamePhase.NIGHT})));
const backup6CheckEndOfNight = g =>
  backup6IsAllSent(g) ?
    backup6ProcessActions(g) :
    noMsgGameEffect(g);
const backup6 = Object.assign({}, backup6Template);

var vanillaTemplate = Object.assign({}, defaultTheme);
vanillaTemplate.roleList = toRoleListFunction([
  [4, [[...new Array(1).fill('Mafia (no kill)'), ...new Array(3).fill('VT')]]],
  [5, [[...new Array(1).fill('Mafia'), ...new Array(4).fill('VT')]]],
  [6, [[...new Array(2).fill('Mafia Lover (no kill)'), ...new Array(4).fill('VT')]]],
  [7, [[...new Array(2).fill('Mafia (no kill)'), ...new Array(5).fill('VT')]]],
  [8, [[...new Array(2).fill('Mafia Lover'), ...new Array(6).fill('VT')]]],
  [9, [[...new Array(2).fill('Mafia'), ...new Array(7).fill('VT')]]],
  [10, [[...new Array(2).fill('Mafia'), ...new Array(8).fill('VT')]]],
  [11, [[...new Array(2).fill('Mafia'), ...new Array(9).fill('VT')]]],
  [12, [[...new Array(2).fill('Mafia'), ...new Array(10).fill('VT')]]],
  [13, [[...new Array(2).fill('Mafia'), ...new Array(11).fill('VT')]]],
  [14, [[...new Array(3).fill('Mafia (white flag)'), ...new Array(11).fill('VT')]]],
  [15, [[...new Array(3).fill('Mafia'), ...new Array(12).fill('VT')]]],
  [16, [[...new Array(3).fill('Mafia'), ...new Array(13).fill('VT')]]],
  [17, [[...new Array(3).fill('Mafia'), ...new Array(14).fill('VT')]]],
  [18, [[...new Array(3).fill('Mafia'), ...new Array(15).fill('VT')]]],
  [19, [[...new Array(3).fill('Mafia'), ...new Array(16).fill('VT')]]],
  [20, [[...new Array(4).fill('Mafia (white flag)'), ...new Array(16).fill('VT')]]]
]);
vanillaTemplate.validPlayerNumbers = rangeSet(4, 20);
const vanillaCheckForMafiaWin = g =>
  playersWithRole('Mafia')(g).filter(p => g.players.has(p)).length === 0 ?
    endGameEffect(['**The Town has won!**']) :
    (playersWithRole('Mafia')(g).filter(p => g.players.has(p)).length * 2 >= gameSize(g) ?
      endGameEffect(['**The Mafia has won!**']) :
      (playersWithRole('Mafia Lover')(g).filter(p => g.players.has(p)).length === 1 ?
        endGameEffect(['**In despair, his Lover ' + playersWithRole('Mafia')(g).filter(p => g.players.has(p))[0] + ' suicides!**', '**The Town has won!**']) :
        (playersWithRole('(white flag)')(g).filter(p => g.players.has(p)).length === 1 ?
          endGameEffect(['**In despair, the last Mafioso ' + playersWithRole('Mafia')(g).filter(p => g.players.has(p))[0] + ' suicides!**', '**The Town has won!**']) :
          noMsgGameEffect(g))));
vanillaTemplate.onHammer = (hammerer, hammeree, r, g) =>
  vanillaCheckForMafiaWin(g).then(g1 =>
    playersWithRole('(no kill)')(g1).length > 0 ?
      new GameEffect(['**Day ' + (g1.day+1).toString() + ' Start!**'], Object.assign({}, g1, {day: g1.day+1, lynches: emptyLynches(g1.players)})) :
      new GameEffect(['**Night ' + g1.day.toString() + ' Start! Mafia, send your kill target with** ``**@target ' + r + ', user**``**!**'], Object.assign({}, g1, {gamePhase: GamePhase.NIGHT})));
vanillaTemplate.onTarget = (targeter, targets, r, g) =>
  playersWithRole('Mafia')(g).filter(p => g.players.has(p)).indexOf(targeter) > -1 && g.playerRoles.get(targets[0]) === 'VT' ?
    new GameEffect(['**' + targets[0] + ' the VT was killed by the Mafia!**', '**Day ' + (g.day+1).toString() + ' Start**!'], Object.assign({}, g, {players: g.players.customDelete(targets[0]), day: g.day+1, gamePhase: GamePhase.DAY, lynches: emptyLynches(g.players.customDelete(targets[0]))})).then(vanillaCheckForMafiaWin) :
    noMsgGameEffect(g);
const vanilla = Object.assign({}, vanillaTemplate);

var modexeTemplate = Object.assign({}, defaultTheme);
modexeTemplate.roleList = toRoleListFunction([
  [7, [[...new Array(2).fill('Mafia Lover'), ...new Array(5).fill('VT')]]],
  [8, [[...new Array(2).fill('Mafia'), ...new Array(6).fill('VT')]]],
  [9, [[...new Array(2).fill('Mafia'), ...new Array(7).fill('VT')]]],
  [10, [[...new Array(2).fill('Mafia'), ...new Array(8).fill('VT')]]],
  [11, [[...new Array(3).fill('Mafia'), ...new Array(8).fill('VT')]]],
  [12, [[...new Array(3).fill('Mafia'), ...new Array(9).fill('VT')]]],
  [13, [[...new Array(3).fill('Mafia'), ...new Array(10).fill('VT')]]],
  [14, [[...new Array(3).fill('Mafia'), ...new Array(11).fill('VT')]]],
  [15, [[...new Array(3).fill('Mafia'), ...new Array(12).fill('VT')]]],
  [16, [[...new Array(4).fill('Mafia'), ...new Array(12).fill('VT')]]],
  [17, [[...new Array(4).fill('Mafia'), ...new Array(13).fill('VT')]]],
  [18, [[...new Array(4).fill('Mafia'), ...new Array(14).fill('VT')]]],
  [19, [[...new Array(4).fill('Mafia'), ...new Array(15).fill('VT')]]],
  [20, [[...new Array(5).fill('Mafia'), ...new Array(15).fill('VT')]]]
]);
modexeTemplate.validPlayerNumbers = rangeSet(7, 20);
modexeTemplate.allowedToNoLynch = false;
modexeTemplate.hasReveal = false;
const modexeCorruptPhase = r => g =>
  g.playerRoles.size === 7 && playersWithRole('Mafia')(g).filter(p => g.players.has(p)).length < 2 ?
    endGameEffect(['**In despair, his Lover ' + playersWithRole('Mafia')(g).filter(p => g.players.has(p))[0] + ' suicides!**', '**The Town has won!**']) :
    (playersWithRole('Mafia')(g).filter(p => g.players.has(p)).length * 2 >= gameSize(g) ?
      endGameEffect(['**The Mafia has won!**']) :
      (playersWithRole('Mafia')(g).filter(p => g.players.has(p)).length * 2 === gameSize(g) - 1 ?
        new GameEffect(['**LYLO: No corruption.**', '**Day ' + (g.day+1).toString() + ' Start!**'], Object.assign({}, g, {day: g.day+1, gamePhase: GamePhase.DAY, lynches: emptyLynches(g.players)})) :
        (playersWithRole('Mafia')(g).filter(p => g.players.has(p)).length === 0 ?
          endGameEffect(['**The Town has won!**']) :
          messagesEffect(['**Mafia, send your corruption with** ``**@target ' + r + ', user**``**!**'])(g))));
modexeTemplate.onHammer = (hammerer, hammeree, r, g) =>
  g.miscInfo.get('Corrupt') === hammeree ?
    new GameEffect(['**' + hammeree + ' was corrupted!**'], Object.assign({}, g, {gamePhase: GamePhase.NIGHT, miscInfo: new Map([])})).then(modexeCorruptPhase(r)) :
    new GameEffect(['**' + hammeree + ', send your shot with** ``**@target ' + r + ', user**``**!**'], Object.assign({}, g, {players: g.players.add(hammeree), gamePhase: GamePhase.TWILIGHT, miscInfo: new Map([['Shot', hammeree]])}));
modexeTemplate.onTarget = (targeter, targets, r, g) =>
  g.miscInfo.get('Shot') === targeter && g.players.has(targets[0]) ?
    new GameEffect(['**' + targeter + ' has shot ' + targets[0] + ', the ' + g.playerRoles.get(targets[0]) + '!**'], Object.assign({}, g, {players: g.players.customDelete(targets[0]), gamePhase: GamePhase.NIGHT, miscInfo: new Map([])})).then(modexeCorruptPhase(r)) :
    (playersWithRole('Mafia')(g).filter(p => g.players.has(p)).indexOf(targeter) > -1 && g.playerRoles.get(targets[0]) === 'VT' ?
      new GameEffect(['**Day ' + (g.day+1).toString() + ' Start**!'], Object.assign({}, g, {day: g.day+1, gamePhase: GamePhase.DAY, lynches: emptyLynches(g.players), miscInfo: new Map([['Corrupt', targets[0]]])})) :
      noMsgGameEffect(g));
const modexe = Object.assign({}, modexeTemplate);

const themes = {
  SS2: ss2,
  SS3: ss3,
  AITP: aitp,
  WNAF: wnaf,
  JOB: job,
  VANILLA: vanilla,
  MODEXE: modexe
};

module.exports.mafiaCommands = [
  new Triggers.Command(new Triggers.Trigger(/initiatemafia /i, Triggers.PermConfig.OWNERONLY), (conn, room, username, target) => {
    const targetTheme = themes[Util.toId(target).toUpperCase()];
    if (targetTheme) {
      onMafiaInitiateMessage(conn, targetTheme, room);
    } else {
      Util.say(conn, Config.mafiaColor, room, 'That is not a valid theme.');
    }
  }),
  new Triggers.Command(new Triggers.Trigger(/^(@|\.|%)(join|j)\b/i), (conn, room, username, target) =>
    onMafiaJoinMessage(conn, room, Util.toId(username))),
  new Triggers.Command(new Triggers.Trigger(/^(@|\.|%)leave\b/i), (conn, room, username, target) =>
    onMafiaLeaveMessage(conn, room, Util.toId(username))),
  new Triggers.Command(new Triggers.Trigger(/^(@|\.|%)add /i, Triggers.PermConfig.OWNERONLY), (conn, room, username, target) =>
    onMafiaAddPlayersMessage(conn, room, target.split(',').map(Util.toId))),
  new Triggers.Command(new Triggers.Trigger(/^(@|\.|%)kick /i, Triggers.PermConfig.OWNERONLY), (conn, room, username, target) =>
    onMafiaKickPlayersMessage(conn, room, target.split(',').map(Util.toId))),
  new Triggers.Command(new Triggers.Trigger(/^(@|\.|%)start\b/i, Triggers.PermConfig.OWNERONLY), (conn, room, username, target) =>
    onMafiaStartMessage(conn, room)),
  new Triggers.Command(new Triggers.Trigger(/^(@|\.|%)(replace|sub) /i, Triggers.PermConfig.OWNERONLY), (conn, room, username, target) => {
    if (target.split(',').length >= 2) {
      onMafiaSubMessage(conn, room, Util.toId(target.split(',')[0]), Util.toId(target.split(',')[1]));
    }
  }),
  new Triggers.Command(new Triggers.Trigger(/^(@|\.|%)(lynch|l) /i), (conn, room, username, target) =>
    onMafiaLynchMessage(conn, room, Util.toId(username), Util.toId(target))),
  new Triggers.Command(new Triggers.Trigger(/^(@|\.|%)(nolynch|nl)\b/i), (conn, room, username, target) =>
    onMafiaLynchMessage(conn, room, Util.toId(username), LynchVote.NOLYNCH)),
  new Triggers.Command(new Triggers.Trigger(/^(@|\.|%)(unlynch|ul)\b/i), (conn, room, username, target) =>
    onMafiaLynchMessage(conn, room, Util.toId(username), LynchVote.UNDECIDED)),
  new Triggers.Command(new Triggers.Trigger(/^(@|\.|%)(lynches|0)\b/i), (conn, room, username, target) =>
    onMafiaDisplayLynchesMessage(conn, room, Util.toId(username))),
  new Triggers.Command(new Triggers.Trigger(/^(@|\.|%)target /), (conn, room, username, target) => {
    if (target.split(',').length >= 2) {
      onMafiaTargetMessage(conn, target.split(',')[0], Util.toId(username), target.split(',').slice(1).map(Util.toId));
    }
  }),
  new Triggers.Command(new Triggers.Trigger(/^(@|\.|%)kill /, Triggers.PermConfig.OWNERONLY), (conn, room, username, target) =>
    onMafiaEliminatePlayersMessage(conn, room, target.split(',').map(Util.toId))),
  new Triggers.Command(new Triggers.Trigger(/^(@|\.|%)(players|pl)\b/i, Triggers.PermConfig.OWNERONLY), (conn, room, username, target) =>
    onMafiaDisplayPlayersMessage(conn, room)),
  new Triggers.Command(new Triggers.Trigger(/^(@|\.|%)end\b/i, Triggers.PermConfig.OWNERONLY), (conn, room, username, target) =>
    onMafiaEndMessage(conn, room)),
  new Triggers.Command(new Triggers.Trigger(/^mafiaeval /i, Triggers.PermConfig.OWNERONLY), (conn, room, username, target) => {
    try {
      console.log(eval(target));
    } catch (e) {
      console.log('EVAL ERROR: ' + e.toString());
    }
  })
];