const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// In-memory storage for rooms and games
const rooms = new Map();
const playerRooms = new Map();

// Phase durations
const PHASE_DURATIONS = {
  'role-reveal': 8000,
  'night': 30000,
  'day-announcement': 5000,
  'day-discussion': 60000,
  'day-voting': 30000,
};

const REQUIRED_PLAYERS = 7;

const ROLES_CONFIG = {
  mafia: { alignment: 'mafia', nightAction: true },
  escort: { alignment: 'town', nightAction: true },
  doctor: { alignment: 'town', nightAction: true },
  detective: { alignment: 'town', nightAction: true },
  citizen: { alignment: 'town', nightAction: false },
};

const ROLE_DISTRIBUTION = ['mafia', 'mafia', 'escort', 'doctor', 'detective', 'citizen', 'citizen'];

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function createRoom() {
  let code;
  do {
    code = generateRoomCode();
  } while (rooms.has(code));

  const room = {
    code,
    createdAt: Date.now(),
    game: {
      phase: 'lobby',
      round: 0,
      players: [],
      nightActions: [],
      votes: [],
      dayChat: [],
      mafiaChat: [],
      lastNightResult: null,
      lastDayResult: null,
      winner: null,
      phaseEndTime: null,
    },
    phaseTimer: null,
  };

  rooms.set(code, room);
  return room;
}

function getPublicGameState(room, playerId) {
  const game = room.game;
  const player = game.players.find(p => p.id === playerId);

  // Hide roles of other players unless game is over or they're dead
  const players = game.players.map(p => {
    const publicPlayer = { ...p };
    if (game.phase !== 'game-over' && p.isAlive && p.id !== playerId) {
      // Only show role to mafia teammates during the game
      const isMafia = player?.role && ROLES_CONFIG[player.role]?.alignment === 'mafia';
      const targetIsMafia = p.role && ROLES_CONFIG[p.role]?.alignment === 'mafia';
      if (!(isMafia && targetIsMafia)) {
        delete publicPlayer.role;
      }
    }
    delete publicPlayer.socketId;
    return publicPlayer;
  });

  return {
    code: room.code,
    createdAt: room.createdAt,
    game: {
      ...game,
      players,
      nightActions: [], // Don't send to client
      mafiaChat: player?.role && ROLES_CONFIG[player.role]?.alignment === 'mafia' ? game.mafiaChat : [],
    },
  };
}

function transitionToPhase(io, room, phase) {
  if (room.phaseTimer) {
    clearTimeout(room.phaseTimer);
    room.phaseTimer = null;
  }

  room.game.phase = phase;
  const duration = PHASE_DURATIONS[phase];

  if (duration) {
    room.game.phaseEndTime = Date.now() + duration;
    room.phaseTimer = setTimeout(() => handlePhaseEnd(io, room), duration);
  } else {
    room.game.phaseEndTime = null;
  }

  // Reset phase-specific data
  if (phase === 'night') {
    room.game.nightActions = [];
    room.game.players.forEach(p => p.voteImmune = false);
  } else if (phase === 'day-voting') {
    room.game.votes = [];
  }

  broadcastRoomState(io, room);
  io.to(room.code).emit('game:phase-change', phase, room.game.phaseEndTime);
}

function handlePhaseEnd(io, room) {
  const currentPhase = room.game.phase;

  switch (currentPhase) {
    case 'role-reveal':
      // Send roles to each player
      room.game.players.forEach(player => {
        const socket = io.sockets.sockets.get(player.socketId);
        if (socket && player.role) {
          socket.emit('game:role-assigned', player.role);
        }
      });
      transitionToPhase(io, room, 'night');
      break;

    case 'night':
      resolveNight(io, room);
      break;

    case 'day-announcement':
      if (room.game.winner) {
        transitionToPhase(io, room, 'game-over');
      } else {
        transitionToPhase(io, room, 'day-discussion');
      }
      break;

    case 'day-discussion':
      transitionToPhase(io, room, 'day-voting');
      break;

    case 'day-voting':
      resolveVoting(io, room);
      break;
  }
}

function resolveNight(io, room) {
  const game = room.game;
  const result = {
    killedPlayerId: null,
    savedByDoctor: false,
    detectiveResult: null,
    escortedPlayerId: null,
  };

  const escortAction = game.nightActions.find(a => a.action === 'escort');
  const healAction = game.nightActions.find(a => a.action === 'heal');
  const investigateAction = game.nightActions.find(a => a.action === 'investigate');
  const killActions = game.nightActions.filter(a => a.action === 'kill');

  // 1. Escort visits target - they gain vote immunity
  if (escortAction) {
    const target = game.players.find(p => p.id === escortAction.targetId);
    if (target && target.isAlive) {
      target.voteImmune = true;
      result.escortedPlayerId = target.id;
    }
  }

  // 2. Detective investigates
  if (investigateAction) {
    const target = game.players.find(p => p.id === investigateAction.targetId);
    if (target && target.role) {
      result.detectiveResult = {
        targetId: target.id,
        alignment: ROLES_CONFIG[target.role].alignment,
      };
      // Send result privately to detective
      const detective = game.players.find(p => p.role === 'detective');
      if (detective) {
        const socket = io.sockets.sockets.get(detective.socketId);
        if (socket) {
          socket.emit('detective:result', target.id, ROLES_CONFIG[target.role].alignment);
        }
      }
    }
  }

  // 3. Mafia kills
  if (killActions.length > 0) {
    const killVotes = {};
    killActions.forEach(action => {
      killVotes[action.targetId] = (killVotes[action.targetId] || 0) + 1;
    });

    let maxVotes = 0;
    let killTarget = null;
    Object.entries(killVotes).forEach(([targetId, votes]) => {
      if (votes > maxVotes) {
        maxVotes = votes;
        killTarget = targetId;
      }
    });

    if (killTarget) {
      const wasSaved = healAction && healAction.targetId === killTarget;

      if (wasSaved) {
        result.savedByDoctor = true;
      } else {
        const target = game.players.find(p => p.id === killTarget);
        if (target) {
          target.isAlive = false;
          result.killedPlayerId = target.id;

          io.to(room.code).emit('game:player-died', target.id, target.role);
        }
      }
    }
  }

  game.lastNightResult = result;
  game.round++;

  checkWinCondition(room);
  io.to(room.code).emit('game:night-result', result);

  transitionToPhase(io, room, 'day-announcement');
}

function resolveVoting(io, room) {
  const game = room.game;
  const result = {
    eliminatedPlayerId: null,
    votes: {},
  };

  const alivePlayers = game.players.filter(p => p.isAlive);
  const voteCount = {};

  game.votes.forEach(vote => {
    result.votes[vote.voterId] = vote.targetId;
    if (vote.targetId) {
      voteCount[vote.targetId] = (voteCount[vote.targetId] || 0) + 1;
    }
  });

  const majority = Math.floor(alivePlayers.length / 2) + 1;
  let maxVotes = 0;
  let eliminatedId = null;

  Object.entries(voteCount).forEach(([targetId, votes]) => {
    if (votes >= majority && votes > maxVotes) {
      maxVotes = votes;
      eliminatedId = targetId;
    }
  });

  if (eliminatedId) {
    const target = game.players.find(p => p.id === eliminatedId);
    if (target) {
      target.isAlive = false;
      result.eliminatedPlayerId = target.id;
      io.to(room.code).emit('game:player-died', target.id, target.role);
    }
  }

  game.lastDayResult = result;
  io.to(room.code).emit('game:day-result', result);

  checkWinCondition(room);

  if (game.winner) {
    io.to(room.code).emit('game:winner', game.winner);
    transitionToPhase(io, room, 'game-over');
  } else {
    transitionToPhase(io, room, 'night');
  }
}

function checkWinCondition(room) {
  const alivePlayers = room.game.players.filter(p => p.isAlive);
  const aliveMafia = alivePlayers.filter(p => p.role && ROLES_CONFIG[p.role].alignment === 'mafia');
  const aliveTown = alivePlayers.filter(p => p.role && ROLES_CONFIG[p.role].alignment === 'town');

  if (aliveMafia.length === 0) {
    room.game.winner = 'town';
  } else if (aliveMafia.length >= aliveTown.length) {
    room.game.winner = 'mafia';
  }
}

function broadcastRoomState(io, room) {
  room.game.players.forEach(player => {
    const socket = io.sockets.sockets.get(player.socketId);
    if (socket) {
      socket.emit('room:state', getPublicGameState(room, player.id));
    }
  });
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    let currentPlayerId = null;

    socket.on('room:create', (playerName, callback) => {
      try {
        const room = createRoom();
        const playerId = uuidv4();
        currentPlayerId = playerId;

        const player = {
          id: playerId,
          name: playerName,
          socketId: socket.id,
          isAlive: true,
          isReady: false,
          voteImmune: false,
        };

        room.game.players.push(player);
        playerRooms.set(playerId, room.code);
        socket.join(room.code);

        socket.emit('room:state', getPublicGameState(room, playerId));
        callback({ code: room.code, playerId }, null);
        console.log(`Room ${room.code} created by ${playerName}`);
      } catch (error) {
        callback(null, error.message);
      }
    });

    socket.on('room:join', (code, playerName, callback) => {
      try {
        const room = rooms.get(code.toUpperCase());
        if (!room) {
          callback(false, 'Room not found');
          return;
        }

        if (room.game.phase !== 'lobby') {
          callback(false, 'Game already in progress');
          return;
        }

        if (room.game.players.length >= REQUIRED_PLAYERS) {
          callback(false, 'Room is full');
          return;
        }

        if (room.game.players.some(p => p.name.toLowerCase() === playerName.toLowerCase())) {
          callback(false, 'Name already taken');
          return;
        }

        const playerId = uuidv4();
        currentPlayerId = playerId;

        const player = {
          id: playerId,
          name: playerName,
          socketId: socket.id,
          isAlive: true,
          isReady: false,
          voteImmune: false,
        };

        room.game.players.push(player);
        playerRooms.set(playerId, room.code);
        socket.join(room.code);

        broadcastRoomState(io, room);
        callback({ success: true, playerId }, null);
        console.log(`${playerName} joined room ${room.code}`);
      } catch (error) {
        callback(false, error.message);
      }
    });

    socket.on('room:leave', () => {
      if (currentPlayerId) {
        const roomCode = playerRooms.get(currentPlayerId);
        if (roomCode) {
          const room = rooms.get(roomCode);
          if (room) {
            room.game.players = room.game.players.filter(p => p.id !== currentPlayerId);
            socket.leave(roomCode);
            broadcastRoomState(io, room);

            if (room.game.players.length === 0) {
              if (room.phaseTimer) clearTimeout(room.phaseTimer);
              rooms.delete(roomCode);
              console.log(`Room ${roomCode} deleted`);
            }
          }
          playerRooms.delete(currentPlayerId);
        }
        currentPlayerId = null;
      }
    });

    socket.on('player:ready', (isReady) => {
      if (!currentPlayerId) return;
      const roomCode = playerRooms.get(currentPlayerId);
      if (!roomCode) return;

      const room = rooms.get(roomCode);
      if (!room || room.game.phase !== 'lobby') return;

      const player = room.game.players.find(p => p.id === currentPlayerId);
      if (player) {
        player.isReady = isReady;
        broadcastRoomState(io, room);
      }
    });

    socket.on('game:start', () => {
      if (!currentPlayerId) return;
      const roomCode = playerRooms.get(currentPlayerId);
      if (!roomCode) return;

      const room = rooms.get(roomCode);
      if (!room) return;

      if (room.game.phase !== 'lobby') return;
      if (room.game.players.length !== REQUIRED_PLAYERS) return;
      if (!room.game.players.every(p => p.isReady)) return;

      // Assign roles
      const shuffledRoles = shuffleArray(ROLE_DISTRIBUTION);
      room.game.players.forEach((player, index) => {
        player.role = shuffledRoles[index];
      });

      room.game.round = 1;
      transitionToPhase(io, room, 'role-reveal');
      console.log(`Game started in room ${roomCode}`);
    });

    socket.on('game:night-action', (action) => {
      if (!currentPlayerId) return;
      const roomCode = playerRooms.get(currentPlayerId);
      if (!roomCode) return;

      const room = rooms.get(roomCode);
      if (!room || room.game.phase !== 'night') return;

      const player = room.game.players.find(p => p.id === currentPlayerId);
      if (!player || !player.isAlive || !player.role) return;

      const role = ROLES_CONFIG[player.role];
      if (!role.nightAction) return;

      const validActions = {
        mafia: 'kill',
        escort: 'escort',
        doctor: 'heal',
        detective: 'investigate',
      };

      if (validActions[player.role] !== action.action) return;

      // Validate target
      const target = room.game.players.find(p => p.id === action.targetId);
      if (!target || !target.isAlive) return;

      // Remove existing action and add new one
      room.game.nightActions = room.game.nightActions.filter(a => a.playerId !== currentPlayerId);
      room.game.nightActions.push({
        playerId: currentPlayerId,
        action: action.action,
        targetId: action.targetId,
      });

      // Notify player action was recorded
      socket.emit('room:state', getPublicGameState(room, currentPlayerId));
    });

    socket.on('game:vote', (targetId) => {
      if (!currentPlayerId) return;
      const roomCode = playerRooms.get(currentPlayerId);
      if (!roomCode) return;

      const room = rooms.get(roomCode);
      if (!room || room.game.phase !== 'day-voting') return;

      const player = room.game.players.find(p => p.id === currentPlayerId);
      if (!player || !player.isAlive) return;

      // Validate target
      if (targetId) {
        const target = room.game.players.find(p => p.id === targetId);
        if (!target || !target.isAlive || target.voteImmune) return;
      }

      // Remove existing vote and add new one
      room.game.votes = room.game.votes.filter(v => v.voterId !== currentPlayerId);
      room.game.votes.push({
        voterId: currentPlayerId,
        targetId,
      });

      broadcastRoomState(io, room);
    });

    socket.on('chat:send', (content) => {
      if (!currentPlayerId) return;
      const roomCode = playerRooms.get(currentPlayerId);
      if (!roomCode) return;

      const room = rooms.get(roomCode);
      if (!room) return;
      if (!['day-discussion', 'day-voting'].includes(room.game.phase)) return;

      const player = room.game.players.find(p => p.id === currentPlayerId);
      if (!player || !player.isAlive) return;

      const message = {
        id: uuidv4(),
        playerId: currentPlayerId,
        playerName: player.name,
        content: content.slice(0, 500),
        timestamp: Date.now(),
        isMafiaChat: false,
      };

      room.game.dayChat.push(message);
      io.to(roomCode).emit('chat:message', message);
    });

    socket.on('chat:mafia-send', (content) => {
      if (!currentPlayerId) return;
      const roomCode = playerRooms.get(currentPlayerId);
      if (!roomCode) return;

      const room = rooms.get(roomCode);
      if (!room || room.game.phase !== 'night') return;

      const player = room.game.players.find(p => p.id === currentPlayerId);
      if (!player || !player.isAlive || !player.role) return;
      if (ROLES_CONFIG[player.role].alignment !== 'mafia') return;

      const message = {
        id: uuidv4(),
        playerId: currentPlayerId,
        playerName: player.name,
        content: content.slice(0, 500),
        timestamp: Date.now(),
        isMafiaChat: true,
      };

      room.game.mafiaChat.push(message);

      // Send only to mafia players
      room.game.players.forEach(p => {
        if (p.role && ROLES_CONFIG[p.role].alignment === 'mafia') {
          const s = io.sockets.sockets.get(p.socketId);
          if (s) s.emit('chat:mafia-message', message);
        }
      });
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      // Keep player in room for potential reconnection
      // They will be removed when room is cleaned up
    });
  });

  // Cleanup old empty rooms every 5 minutes
  setInterval(() => {
    for (const [code, room] of rooms) {
      if (room.game.players.length === 0 && Date.now() - room.createdAt > 3600000) {
        if (room.phaseTimer) clearTimeout(room.phaseTimer);
        rooms.delete(code);
        console.log(`Cleaned up empty room ${code}`);
      }
    }
  }, 300000);

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
