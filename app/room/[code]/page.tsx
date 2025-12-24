'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';
import Lobby from '@/components/Lobby';
import RoleReveal from '@/components/RoleReveal';
import NightPhase from '@/components/NightPhase';
import DayPhase from '@/components/DayPhase';
import Announcement from '@/components/Announcement';
import GameOver from '@/components/GameOver';

export default function RoomPage() {
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;

  const {
    connected,
    roomState,
    myRole,
    myPlayerId,
    detectiveResults,
    leaveRoom,
    setReady,
    startGame,
    submitNightAction,
    submitVote,
    sendChat,
    sendMafiaChat,
  } = useSocket();

  const [isReady, setIsReady] = useState(false);
  const [nightActionSubmitted, setNightActionSubmitted] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [currentVote, setCurrentVote] = useState<string | null>(null);

  // Sync ready state from room state
  useEffect(() => {
    if (roomState && myPlayerId) {
      const player = roomState.game.players.find(p => p.id === myPlayerId);
      if (player) {
        setIsReady(player.isReady);
      }
    }
  }, [roomState, myPlayerId]);

  // Reset action states on phase change
  useEffect(() => {
    if (roomState?.game.phase === 'night') {
      setNightActionSubmitted(false);
    }
    if (roomState?.game.phase === 'day-voting') {
      setHasVoted(false);
      setCurrentVote(null);
    }
  }, [roomState?.game.phase]);

  // Redirect if not connected or no room state after timeout
  useEffect(() => {
    if (!connected) return;

    const timeout = setTimeout(() => {
      if (!roomState || !myPlayerId) {
        router.push('/');
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [connected, roomState, myPlayerId, router]);

  const handleToggleReady = useCallback(() => {
    const newReady = !isReady;
    setIsReady(newReady);
    setReady(newReady);
  }, [isReady, setReady]);

  const handleStartGame = useCallback(() => {
    startGame();
  }, [startGame]);

  const handleLeaveRoom = useCallback(() => {
    leaveRoom();
    router.push('/');
  }, [leaveRoom, router]);

  const handleNightAction = useCallback((action: string, targetId: string) => {
    submitNightAction(action, targetId);
    setNightActionSubmitted(true);
  }, [submitNightAction]);

  const handleVote = useCallback((targetId: string | null) => {
    submitVote(targetId);
    setHasVoted(true);
    setCurrentVote(targetId);
  }, [submitVote]);

  const handlePlayAgain = useCallback(() => {
    window.location.reload();
  }, []);

  // Loading state
  if (!connected || !roomState || !myPlayerId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="spinner mb-4" />
        <p className="text-gray-400">
          {!connected ? 'Connecting...' : 'Loading room...'}
        </p>
      </div>
    );
  }

  const { game } = roomState;

  // Get mafia teammates for role reveal
  const mafiaTeammates = myRole === 'mafia'
    ? game.players
        .filter(p => p.role === 'mafia' && p.id !== myPlayerId)
        .map(p => p.name)
    : [];

  // Get killed player for announcements
  const killedPlayerId = game.lastNightResult?.killedPlayerId || game.lastDayResult?.eliminatedPlayerId;
  const killedPlayer = killedPlayerId ? game.players.find(p => p.id === killedPlayerId) : null;
  const escortedPlayer = game.lastNightResult?.escortedPlayerId
    ? game.players.find(p => p.id === game.lastNightResult?.escortedPlayerId)
    : null;

  // Render based on phase
  switch (game.phase) {
    case 'lobby':
      return (
        <Lobby
          roomCode={code}
          players={game.players}
          myPlayerId={myPlayerId}
          isReady={isReady}
          onToggleReady={handleToggleReady}
          onStartGame={handleStartGame}
          onLeaveRoom={handleLeaveRoom}
        />
      );

    case 'role-reveal':
      return (
        <RoleReveal
          role={myRole}
          phaseEndTime={game.phaseEndTime}
          teammates={mafiaTeammates}
        />
      );

    case 'night':
      return (
        <NightPhase
          players={game.players}
          myPlayerId={myPlayerId}
          myRole={myRole}
          phaseEndTime={game.phaseEndTime}
          mafiaChat={game.mafiaChat}
          detectiveResults={detectiveResults}
          onNightAction={handleNightAction}
          onMafiaChat={sendMafiaChat}
          actionSubmitted={nightActionSubmitted}
        />
      );

    case 'day-announcement':
      return (
        <Announcement
          type="night-result"
          killedPlayer={killedPlayer || null}
          savedByDoctor={game.lastNightResult?.savedByDoctor || false}
          escortedPlayer={escortedPlayer || null}
          phaseEndTime={game.phaseEndTime}
        />
      );

    case 'day-discussion':
    case 'day-voting':
      return (
        <DayPhase
          phase={game.phase}
          players={game.players}
          myPlayerId={myPlayerId}
          myRole={myRole}
          phaseEndTime={game.phaseEndTime}
          dayChat={game.dayChat}
          votes={game.votes}
          lastNightKilled={game.lastNightResult?.killedPlayerId || null}
          savedByDoctor={game.lastNightResult?.savedByDoctor || false}
          escortedPlayerId={game.lastNightResult?.escortedPlayerId || null}
          onSendChat={sendChat}
          onVote={handleVote}
          hasVoted={hasVoted}
          currentVote={currentVote}
        />
      );

    case 'game-over':
      return (
        <GameOver
          winner={game.winner as 'mafia' | 'town'}
          players={game.players}
          myPlayerId={myPlayerId}
          myRole={myRole}
          onPlayAgain={handlePlayAgain}
          onLeaveRoom={handleLeaveRoom}
        />
      );

    default:
      return (
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-gray-400">Unknown game phase: {game.phase}</p>
        </div>
      );
  }
}
