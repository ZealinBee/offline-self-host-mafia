'use client';

import { useState, useMemo } from 'react';
import PlayerCard from './PlayerCard';
import ChatBox from './ChatBox';
import Timer from './Timer';

interface Player {
  id: string;
  name: string;
  role?: string;
  isAlive: boolean;
  isReady: boolean;
  voteImmune: boolean;
}

interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  content: string;
  timestamp: number;
  isMafiaChat: boolean;
}

interface NightPhaseProps {
  players: Player[];
  myPlayerId: string;
  myRole: string | null;
  phaseEndTime: number | null;
  mafiaChat: ChatMessage[];
  detectiveResults: Record<string, string>;
  onNightAction: (action: string, targetId: string) => void;
  onMafiaChat: (content: string) => void;
  actionSubmitted: boolean;
}

const ROLE_ACTIONS: Record<string, { action: string; label: string; description: string }> = {
  mafia: {
    action: 'kill',
    label: 'Choose Target to Kill',
    description: 'Select a player to eliminate tonight. Other mafia members must agree.',
  },
  escort: {
    action: 'escort',
    label: 'Choose Player to Visit',
    description: 'The player you visit will be immune to voting tomorrow.',
  },
  doctor: {
    action: 'heal',
    label: 'Choose Player to Save',
    description: 'If mafia targets this player tonight, they will survive.',
  },
  detective: {
    action: 'investigate',
    label: 'Choose Player to Investigate',
    description: 'Learn if this player is aligned with the Town or Mafia.',
  },
};

export default function NightPhase({
  players,
  myPlayerId,
  myRole,
  phaseEndTime,
  mafiaChat,
  detectiveResults,
  onNightAction,
  onMafiaChat,
  actionSubmitted,
}: NightPhaseProps) {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const isMafia = myRole === 'mafia';
  const hasNightAction = myRole && ROLE_ACTIONS[myRole];
  const alivePlayers = players.filter(p => p.isAlive && p.id !== myPlayerId);

  // Generate stars for night sky effect
  const stars = useMemo(() => {
    return Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 60}%`,
      delay: `${Math.random() * 2}s`,
    }));
  }, []);

  const handleConfirmAction = () => {
    if (selectedTarget && myRole && ROLE_ACTIONS[myRole]) {
      onNightAction(ROLE_ACTIONS[myRole].action, selectedTarget);
    }
  };

  const roleConfig = myRole ? ROLE_ACTIONS[myRole] : null;

  return (
    <div className="min-h-screen night-overlay relative overflow-hidden">
      {/* Stars background */}
      <div className="absolute inset-0 pointer-events-none">
        {stars.map((star) => (
          <div
            key={star.id}
            className="star"
            style={{
              left: star.left,
              top: star.top,
              animationDelay: star.delay,
            }}
          />
        ))}
      </div>

      {/* Moon */}
      <div className="absolute top-8 right-8 moon opacity-80" />

      {/* Main content */}
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-200 mb-2">Night Falls...</h1>
          <p className="text-gray-400">The town sleeps while evil lurks</p>
          <div className="mt-4 max-w-md mx-auto">
            <Timer endTime={phaseEndTime} label="Time remaining" />
          </div>
        </div>

        {/* Role info */}
        <div className="card-mafia max-w-md mx-auto mb-8 text-center">
          <p className="text-gray-400 text-sm mb-1">Your Role</p>
          <h2 className={`text-2xl font-bold role-${myRole}`}>
            {myRole ? myRole.charAt(0).toUpperCase() + myRole.slice(1) : 'Unknown'}
          </h2>
          {roleConfig && (
            <p className="text-gray-500 text-sm mt-2">{roleConfig.description}</p>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Action panel */}
          <div className="card-mafia">
            {hasNightAction ? (
              <>
                <h3 className="text-lg font-semibold text-[#d4a017] mb-4">
                  {roleConfig?.label}
                </h3>

                {actionSubmitted ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">✓</div>
                    <p className="text-green-400 font-semibold">Action Submitted</p>
                    <p className="text-gray-500 text-sm mt-2">Waiting for night to end...</p>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-3 mb-6 max-h-[300px] overflow-y-auto">
                      {alivePlayers.map((player) => (
                        <PlayerCard
                          key={player.id}
                          player={player}
                          isSelected={selectedTarget === player.id}
                          onClick={() => setSelectedTarget(player.id)}
                          showRole={isMafia && player.role === 'mafia'}
                        />
                      ))}
                    </div>

                    <button
                      onClick={handleConfirmAction}
                      disabled={!selectedTarget}
                      className="btn-mafia w-full"
                    >
                      Confirm Action
                    </button>
                  </>
                )}

                {/* Detective results */}
                {myRole === 'detective' && Object.keys(detectiveResults).length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-800">
                    <h4 className="text-sm font-semibold text-blue-400 mb-3">
                      🔍 Investigation Results
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(detectiveResults).map(([playerId, alignment]) => {
                        const player = players.find(p => p.id === playerId);
                        return (
                          <div key={playerId} className="flex justify-between items-center text-sm">
                            <span>{player?.name || 'Unknown'}</span>
                            <span className={alignment === 'mafia' ? 'text-red-500' : 'text-green-500'}>
                              {alignment === 'mafia' ? 'GUILTY' : 'INNOCENT'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">😴</div>
                <p className="text-gray-400">You have no night action</p>
                <p className="text-gray-500 text-sm mt-2">Wait for the night to end...</p>
              </div>
            )}
          </div>

          {/* Mafia chat (only for mafia) */}
          {isMafia ? (
            <div className="h-[400px]">
              <ChatBox
                messages={mafiaChat}
                onSendMessage={onMafiaChat}
                placeholder="Discuss with your fellow mafia..."
                isMafiaChat
              />
            </div>
          ) : (
            <div className="card-mafia flex flex-col items-center justify-center text-center">
              <div className="text-6xl mb-4">🌙</div>
              <p className="text-gray-400 mb-2">The night is quiet...</p>
              <p className="text-gray-600 text-sm">
                Wait patiently while others make their moves
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
