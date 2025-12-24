import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { Game } from './Game';
import {
  RoomState,
  GameState,
  GamePhase,
  NightAction,
  ChatMessage,
  ServerToClientEvents,
  ClientToServerEvents,
  Player,
  Alignment,
} from './types';
import { ROLES } from './roles';

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export class Room {
  code: string;
  createdAt: number;
  private game: Game;
  private io: Server<ClientToServerEvents, ServerToClientEvents>;
  private playerSockets: Map<string, string> = new Map(); // playerId -> socketId

  constructor(io: Server<ClientToServerEvents, ServerToClientEvents>) {
    this.code = generateRoomCode();
    this.createdAt = Date.now();
    this.io = io;
    this.game = new Game(
      this.onGameStateChange.bind(this),
      this.onPhaseEnd.bind(this)
    );
  }

  getState(): RoomState {
    return {
      code: this.code,
      createdAt: this.createdAt,
      game: this.game.getState(),
    };
  }

  joinPlayer(playerId: string, name: string, socketId: string): Player | null {
    const player = this.game.addPlayer(playerId, name, socketId);
    if (player) {
      this.playerSockets.set(playerId, socketId);
    }
    return player;
  }

  leavePlayer(playerId: string): void {
    this.game.removePlayer(playerId);
    this.playerSockets.delete(playerId);
  }

  reconnectPlayer(playerId: string, socketId: string): boolean {
    const player = this.game.getPlayer(playerId);
    if (player) {
      this.game.updatePlayerSocket(playerId, socketId);
      this.playerSockets.set(playerId, socketId);
      return true;
    }
    return false;
  }

  setReady(playerId: string, isReady: boolean): void {
    this.game.setPlayerReady(playerId, isReady);
  }

  startGame(): boolean {
    return this.game.start();
  }

  submitNightAction(action: NightAction): boolean {
    return this.game.submitNightAction(action);
  }

  submitVote(playerId: string, targetId: string | null): boolean {
    return this.game.submitVote({ voterId: playerId, targetId });
  }

  sendChat(playerId: string, content: string): void {
    const message = this.game.addChatMessage(playerId, content, false);
    if (message) {
      this.broadcastToRoom('chat:message', message);
    }
  }

  sendMafiaChat(playerId: string, content: string): void {
    const message = this.game.addChatMessage(playerId, content, true);
    if (message) {
      this.broadcastToMafia('chat:mafia-message', message);
    }
  }

  private onGameStateChange(state: GameState): void {
    this.broadcastToRoom('room:state', this.getState());
  }

  private onPhaseEnd(phase: GamePhase): void {
    const state = this.game.getState();

    // Send role assignments when role-reveal phase ends
    if (phase === 'role-reveal') {
      state.players.forEach(player => {
        if (player.role) {
          const socket = this.io.sockets.sockets.get(player.socketId);
          if (socket) {
            socket.emit('game:role-assigned', player.role);
          }
        }
      });
    }

    // Send night results to all, detective result to detective only
    if (phase === 'night' && state.lastNightResult) {
      const result = state.lastNightResult;
      this.broadcastToRoom('game:night-result', result);

      // Send detective result privately
      if (result.detectiveResult) {
        const detective = state.players.find(p => p.role === 'detective');
        if (detective) {
          const socket = this.io.sockets.sockets.get(detective.socketId);
          if (socket) {
            socket.emit('detective:result', result.detectiveResult.targetId, result.detectiveResult.alignment);
          }
        }
      }

      // Announce death
      if (result.killedPlayerId) {
        const killed = state.players.find(p => p.id === result.killedPlayerId);
        if (killed && killed.role) {
          this.broadcastToRoom('game:player-died', killed.id, killed.role);
        }
      }
    }

    // Send day results
    if (phase === 'day-voting' && state.lastDayResult) {
      this.broadcastToRoom('game:day-result', state.lastDayResult);

      if (state.lastDayResult.eliminatedPlayerId) {
        const eliminated = state.players.find(p => p.id === state.lastDayResult?.eliminatedPlayerId);
        if (eliminated && eliminated.role) {
          this.broadcastToRoom('game:player-died', eliminated.id, eliminated.role);
        }
      }
    }

    // Send winner
    if (state.winner) {
      this.broadcastToRoom('game:winner', state.winner);
    }

    // Broadcast phase change
    this.broadcastToRoom('game:phase-change', state.phase, state.phaseEndTime);
  }

  private broadcastToRoom<T extends keyof ServerToClientEvents>(
    event: T,
    ...args: Parameters<ServerToClientEvents[T]>
  ): void {
    this.io.to(this.code).emit(event, ...args as any);
  }

  private broadcastToMafia<T extends keyof ServerToClientEvents>(
    event: T,
    ...args: Parameters<ServerToClientEvents[T]>
  ): void {
    const mafiaPlayers = this.game.getMafiaPlayers();
    mafiaPlayers.forEach(player => {
      const socket = this.io.sockets.sockets.get(player.socketId);
      if (socket) {
        socket.emit(event, ...args as any);
      }
    });
  }

  isEmpty(): boolean {
    return this.game.getState().players.length === 0;
  }

  destroy(): void {
    this.game.destroy();
  }
}

// Room manager
class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private playerRooms: Map<string, string> = new Map(); // playerId -> roomCode

  createRoom(io: Server<ClientToServerEvents, ServerToClientEvents>): Room {
    let room: Room;
    do {
      room = new Room(io);
    } while (this.rooms.has(room.code));

    this.rooms.set(room.code, room);
    return room;
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  deleteRoom(code: string): void {
    const room = this.rooms.get(code);
    if (room) {
      room.destroy();
      this.rooms.delete(code);
    }
  }

  setPlayerRoom(playerId: string, roomCode: string): void {
    this.playerRooms.set(playerId, roomCode);
  }

  getPlayerRoom(playerId: string): string | undefined {
    return this.playerRooms.get(playerId);
  }

  removePlayerFromRoom(playerId: string): void {
    const roomCode = this.playerRooms.get(playerId);
    if (roomCode) {
      const room = this.rooms.get(roomCode);
      if (room) {
        room.leavePlayer(playerId);
        if (room.isEmpty()) {
          this.deleteRoom(roomCode);
        }
      }
      this.playerRooms.delete(playerId);
    }
  }

  cleanupEmptyRooms(): void {
    for (const [code, room] of this.rooms) {
      // Remove rooms older than 1 hour that are empty
      if (room.isEmpty() && Date.now() - room.createdAt > 3600000) {
        this.deleteRoom(code);
      }
    }
  }
}

export const roomManager = new RoomManager();
