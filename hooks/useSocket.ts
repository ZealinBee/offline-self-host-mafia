'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { getSocket, connectSocket } from '@/lib/socket';
import type { Socket } from 'socket.io-client';

interface RoomState {
  code: string;
  createdAt: number;
  game: GameState;
}

interface GameState {
  phase: string;
  round: number;
  players: Player[];
  nightActions: never[];
  votes: Vote[];
  dayChat: ChatMessage[];
  mafiaChat: ChatMessage[];
  lastNightResult: NightResult | null;
  lastDayResult: DayResult | null;
  winner: string | null;
  phaseEndTime: number | null;
}

interface Player {
  id: string;
  name: string;
  role?: string;
  isAlive: boolean;
  isReady: boolean;
  voteImmune: boolean;
}

interface Vote {
  voterId: string;
  targetId: string | null;
}

interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  content: string;
  timestamp: number;
  isMafiaChat: boolean;
}

interface NightResult {
  killedPlayerId: string | null;
  savedByDoctor: boolean;
  detectiveResult: { targetId: string; alignment: string } | null;
  escortedPlayerId: string | null;
}

interface DayResult {
  eliminatedPlayerId: string | null;
  votes: Record<string, string | null>;
}

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [detectiveResults, setDetectiveResults] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [deathAnnouncement, setDeathAnnouncement] = useState<{ playerId: string; role: string } | null>(null);
  const playerIdRef = useRef<string | null>(null);

  useEffect(() => {
    const s = getSocket();
    setSocket(s);

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onRoomState = (state: RoomState) => setRoomState(state);
    const onRoomError = (msg: string) => setError(msg);
    const onRoleAssigned = (role: string) => setMyRole(role);
    const onDetectiveResult = (targetId: string, alignment: string) => {
      setDetectiveResults(prev => ({ ...prev, [targetId]: alignment }));
    };
    const onPlayerDied = (playerId: string, role: string) => {
      setDeathAnnouncement({ playerId, role });
    };
    const onChatMessage = (message: ChatMessage) => {
      setRoomState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          game: {
            ...prev.game,
            dayChat: [...prev.game.dayChat, message],
          },
        };
      });
    };
    const onMafiaChatMessage = (message: ChatMessage) => {
      setRoomState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          game: {
            ...prev.game,
            mafiaChat: [...prev.game.mafiaChat, message],
          },
        };
      });
    };

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('room:state', onRoomState);
    s.on('room:error', onRoomError);
    s.on('game:role-assigned', onRoleAssigned);
    s.on('detective:result', onDetectiveResult);
    s.on('game:player-died', onPlayerDied);
    s.on('chat:message', onChatMessage);
    s.on('chat:mafia-message', onMafiaChatMessage);

    connectSocket();

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off('room:state', onRoomState);
      s.off('room:error', onRoomError);
      s.off('game:role-assigned', onRoleAssigned);
      s.off('detective:result', onDetectiveResult);
      s.off('game:player-died', onPlayerDied);
      s.off('chat:message', onChatMessage);
      s.off('chat:mafia-message', onMafiaChatMessage);
    };
  }, []);

  const createRoom = useCallback((playerName: string): Promise<{ code: string; playerId: string }> => {
    return new Promise((resolve, reject) => {
      if (!socket) {
        reject(new Error('Socket not connected'));
        return;
      }
      socket.emit('room:create', playerName, (result: { code: string; playerId: string } | null, error?: string) => {
        if (error || !result) {
          reject(new Error(error || 'Failed to create room'));
        } else {
          setMyPlayerId(result.playerId);
          playerIdRef.current = result.playerId;
          resolve(result);
        }
      });
    });
  }, [socket]);

  const joinRoom = useCallback((code: string, playerName: string): Promise<{ playerId: string }> => {
    return new Promise((resolve, reject) => {
      if (!socket) {
        reject(new Error('Socket not connected'));
        return;
      }
      socket.emit('room:join', code, playerName, (result: { success: boolean; playerId: string } | boolean, error?: string) => {
        if (typeof result === 'boolean') {
          if (!result) {
            reject(new Error(error || 'Failed to join room'));
          } else {
            resolve({ playerId: '' });
          }
        } else if (!result.success) {
          reject(new Error(error || 'Failed to join room'));
        } else {
          setMyPlayerId(result.playerId);
          playerIdRef.current = result.playerId;
          resolve({ playerId: result.playerId });
        }
      });
    });
  }, [socket]);

  const leaveRoom = useCallback(() => {
    socket?.emit('room:leave');
    setRoomState(null);
    setMyRole(null);
    setMyPlayerId(null);
    playerIdRef.current = null;
    setDetectiveResults({});
  }, [socket]);

  const setReady = useCallback((isReady: boolean) => {
    socket?.emit('player:ready', isReady);
  }, [socket]);

  const startGame = useCallback(() => {
    socket?.emit('game:start');
  }, [socket]);

  const submitNightAction = useCallback((action: string, targetId: string) => {
    socket?.emit('game:night-action', { action, targetId });
  }, [socket]);

  const submitVote = useCallback((targetId: string | null) => {
    socket?.emit('game:vote', targetId);
  }, [socket]);

  const sendChat = useCallback((content: string) => {
    socket?.emit('chat:send', content);
  }, [socket]);

  const sendMafiaChat = useCallback((content: string) => {
    socket?.emit('chat:mafia-send', content);
  }, [socket]);

  const clearDeathAnnouncement = useCallback(() => {
    setDeathAnnouncement(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    connected,
    roomState,
    myRole,
    myPlayerId,
    detectiveResults,
    error,
    deathAnnouncement,
    createRoom,
    joinRoom,
    leaveRoom,
    setReady,
    startGame,
    submitNightAction,
    submitVote,
    sendChat,
    sendMafiaChat,
    clearDeathAnnouncement,
    clearError,
  };
}
