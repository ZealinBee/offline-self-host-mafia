'use client';

import PlayerCard from './PlayerCard';

interface Player {
  id: string;
  name: string;
  role?: string;
  isAlive: boolean;
  isReady: boolean;
  voteImmune: boolean;
}

interface LobbyProps {
  roomCode: string;
  players: Player[];
  myPlayerId: string;
  isReady: boolean;
  onToggleReady: () => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
}

const REQUIRED_PLAYERS = 7;

export default function Lobby({
  roomCode,
  players,
  myPlayerId,
  isReady,
  onToggleReady,
  onStartGame,
  onLeaveRoom,
}: LobbyProps) {
  const allReady = players.length === REQUIRED_PLAYERS && players.every(p => p.isReady);
  const waitingFor = REQUIRED_PLAYERS - players.length;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="card-mafia w-full max-w-2xl animate-scaleIn">
        {/* Room code display */}
        <div className="text-center mb-8">
          <p className="text-gray-400 text-sm uppercase tracking-widest mb-2">Room Code</p>
          <h2 className="text-4xl font-bold text-[#d4a017] tracking-[0.3em] font-mono">
            {roomCode}
          </h2>
          <p className="text-gray-500 text-sm mt-2">
            Share this code with your friends
          </p>
        </div>

        {/* Players count */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Players</h3>
          <span className={`text-sm ${players.length === REQUIRED_PLAYERS ? 'text-green-400' : 'text-[#d4a017]'}`}>
            {players.length} / {REQUIRED_PLAYERS}
          </span>
        </div>

        {/* Player list */}
        <div className="grid gap-3 mb-6">
          {players.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              isMe={player.id === myPlayerId}
            />
          ))}

          {/* Empty slots */}
          {Array.from({ length: waitingFor }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="player-card border-dashed opacity-50 flex items-center justify-center"
            >
              <span className="text-gray-500">Waiting for player...</span>
            </div>
          ))}
        </div>

        {/* Ready status */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-4">
            <span className="text-gray-400">
              {players.filter(p => p.isReady).length} / {players.length} Ready
            </span>
            <div className="w-32 h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${(players.filter(p => p.isReady).length / players.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-4">
          <button
            onClick={onLeaveRoom}
            className="btn-secondary flex-1"
          >
            Leave
          </button>
          <button
            onClick={onToggleReady}
            className={`flex-1 ${isReady ? 'btn-secondary' : 'btn-mafia'}`}
          >
            {isReady ? 'Not Ready' : 'Ready'}
          </button>
        </div>

        {/* Start game button (only shown when all ready) */}
        {allReady && (
          <button
            onClick={onStartGame}
            className="btn-mafia w-full mt-4 animate-pulse"
          >
            Start Game
          </button>
        )}

        {/* Game rules hint */}
        <div className="mt-8 pt-6 border-t border-gray-800">
          <h4 className="text-sm font-semibold text-[#d4a017] mb-3">Roles Distribution</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span>🔫</span>
              <span className="text-red-500">2 Mafia</span>
              <span className="text-gray-500 text-xs">- Kill at night</span>
            </div>
            <div className="flex items-center gap-2">
              <span>💋</span>
              <span className="text-pink-400">1 Escort</span>
              <span className="text-gray-500 text-xs">- Give immunity</span>
            </div>
            <div className="flex items-center gap-2">
              <span>💊</span>
              <span className="text-green-400">1 Doctor</span>
              <span className="text-gray-500 text-xs">- Save lives</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🔍</span>
              <span className="text-blue-400">1 Detective</span>
              <span className="text-gray-500 text-xs">- Investigate</span>
            </div>
            <div className="flex items-center gap-2 col-span-2">
              <span>👤</span>
              <span className="text-gray-400">2 Citizens</span>
              <span className="text-gray-500 text-xs">- Vote wisely</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
