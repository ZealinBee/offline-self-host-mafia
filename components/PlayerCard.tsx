'use client';

interface Player {
  id: string;
  name: string;
  role?: string;
  isAlive: boolean;
  isReady: boolean;
  voteImmune: boolean;
}

interface PlayerCardProps {
  player: Player;
  isMe?: boolean;
  showRole?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  voteCount?: number;
  showVoteCount?: boolean;
  disabled?: boolean;
}

const ROLE_COLORS: Record<string, string> = {
  mafia: 'text-red-500',
  escort: 'text-pink-400',
  doctor: 'text-green-400',
  detective: 'text-blue-400',
  citizen: 'text-gray-400',
};

const ROLE_ICONS: Record<string, string> = {
  mafia: '🔫',
  escort: '💋',
  doctor: '💊',
  detective: '🔍',
  citizen: '👤',
};

export default function PlayerCard({
  player,
  isMe = false,
  showRole = false,
  isSelected = false,
  onClick,
  voteCount = 0,
  showVoteCount = false,
  disabled = false,
}: PlayerCardProps) {
  const cardClasses = [
    'player-card',
    'relative',
    'cursor-pointer',
    'transition-all',
    'duration-300',
    player.isAlive ? 'alive' : 'dead',
    isSelected ? 'selected' : '',
    player.voteImmune ? 'immune' : '',
    disabled ? 'opacity-50 cursor-not-allowed' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={cardClasses}
      onClick={!disabled && player.isAlive ? onClick : undefined}
    >
      {/* Status indicators */}
      <div className="absolute top-2 right-2 flex gap-1">
        {isMe && (
          <span className="text-xs bg-[#d4a017] text-black px-2 py-0.5 rounded">
            YOU
          </span>
        )}
        {player.voteImmune && (
          <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded" title="Cannot be voted">
            IMMUNE
          </span>
        )}
      </div>

      {/* Player info */}
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
          player.isAlive ? 'bg-[#2a2a2a]' : 'bg-[#1a1a1a]'
        }`}>
          {!player.isAlive ? '💀' : (showRole && player.role ? ROLE_ICONS[player.role] : '🎭')}
        </div>

        {/* Name and role */}
        <div className="flex-1 min-w-0">
          <p className={`font-semibold truncate ${!player.isAlive ? 'line-through text-gray-500' : ''}`}>
            {player.name}
          </p>
          {showRole && player.role && (
            <p className={`text-sm ${ROLE_COLORS[player.role]}`}>
              {player.role.charAt(0).toUpperCase() + player.role.slice(1)}
            </p>
          )}
          {!player.isAlive && (
            <p className="text-xs text-gray-500">Eliminated</p>
          )}
        </div>

        {/* Vote count */}
        {showVoteCount && voteCount > 0 && (
          <div className="vote-count">
            {voteCount}
          </div>
        )}

        {/* Ready status (lobby only) */}
        {player.isReady !== undefined && player.isAlive && !showRole && (
          <div className={`text-xs ${player.isReady ? 'text-green-400' : 'text-gray-500'}`}>
            {player.isReady ? 'READY' : 'NOT READY'}
          </div>
        )}
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute inset-0 border-2 border-[#8b0000] rounded-lg pointer-events-none animate-pulse" />
      )}
    </div>
  );
}
