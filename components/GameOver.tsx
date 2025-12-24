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

interface GameOverProps {
  winner: 'mafia' | 'town';
  players: Player[];
  myPlayerId: string;
  myRole: string | null;
  onPlayAgain: () => void;
  onLeaveRoom: () => void;
}

export default function GameOver({
  winner,
  players,
  myPlayerId,
  myRole,
  onPlayAgain,
  onLeaveRoom,
}: GameOverProps) {
  const isMafia = myRole === 'mafia';
  const didWin = (winner === 'mafia' && isMafia) || (winner === 'town' && !isMafia);

  const mafiaPlayers = players.filter(p => p.role === 'mafia');
  const townPlayers = players.filter(p => p.role !== 'mafia');

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 ${
      winner === 'mafia' ? 'bg-gradient-to-b from-black via-red-950 to-black' : 'bg-gradient-to-b from-black via-green-950 to-black'
    }`}>
      {/* Victory/Defeat banner */}
      <div className="text-center mb-8 animate-scaleIn">
        <div className="text-8xl mb-4">
          {winner === 'mafia' ? '🔫' : '⚖️'}
        </div>

        <h1 className={`text-5xl font-bold mb-2 ${winner === 'mafia' ? 'text-red-500' : 'text-green-500'}`}>
          {winner === 'mafia' ? 'MAFIA WINS' : 'TOWN WINS'}
        </h1>

        <p className="text-2xl text-gray-400 mb-4">
          {didWin ? '🎉 Victory!' : '💀 Defeat'}
        </p>

        <p className="text-gray-500">
          {winner === 'mafia'
            ? 'The mafia has taken over the town...'
            : 'Justice has prevailed! All mafia members have been eliminated.'}
        </p>
      </div>

      {/* Player results */}
      <div className="card-mafia max-w-3xl w-full mb-8">
        <h2 className="text-xl font-semibold text-[#d4a017] mb-4 text-center">
          Final Results
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Mafia team */}
          <div>
            <h3 className="text-red-500 font-semibold mb-3 flex items-center gap-2">
              <span>🔴</span> Mafia Team
              {winner === 'mafia' && <span className="text-xs bg-red-900 px-2 py-0.5 rounded">WINNERS</span>}
            </h3>
            <div className="space-y-2">
              {mafiaPlayers.map(player => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  isMe={player.id === myPlayerId}
                  showRole
                />
              ))}
            </div>
          </div>

          {/* Town team */}
          <div>
            <h3 className="text-green-500 font-semibold mb-3 flex items-center gap-2">
              <span>🟢</span> Town Team
              {winner === 'town' && <span className="text-xs bg-green-900 px-2 py-0.5 rounded">WINNERS</span>}
            </h3>
            <div className="space-y-2">
              {townPlayers.map(player => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  isMe={player.id === myPlayerId}
                  showRole
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button onClick={onLeaveRoom} className="btn-secondary">
          Leave Room
        </button>
        <button onClick={onPlayAgain} className="btn-mafia">
          Play Again
        </button>
      </div>
    </div>
  );
}
