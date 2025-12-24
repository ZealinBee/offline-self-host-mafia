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

interface Vote {
  voterId: string;
  targetId: string | null;
}

interface DayPhaseProps {
  phase: 'day-discussion' | 'day-voting';
  players: Player[];
  myPlayerId: string;
  myRole: string | null;
  phaseEndTime: number | null;
  dayChat: ChatMessage[];
  votes: Vote[];
  lastNightKilled: string | null;
  savedByDoctor: boolean;
  escortedPlayerId: string | null;
  onSendChat: (content: string) => void;
  onVote: (targetId: string | null) => void;
  hasVoted: boolean;
  currentVote: string | null;
}

export default function DayPhase({
  phase,
  players,
  myPlayerId,
  myRole,
  phaseEndTime,
  dayChat,
  votes,
  lastNightKilled,
  savedByDoctor,
  escortedPlayerId,
  onSendChat,
  onVote,
  hasVoted,
  currentVote,
}: DayPhaseProps) {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(currentVote);
  const isVotingPhase = phase === 'day-voting';
  const alivePlayers = players.filter(p => p.isAlive);
  const myPlayer = players.find(p => p.id === myPlayerId);
  const canVote = myPlayer?.isAlive && isVotingPhase;

  // Calculate vote counts
  const voteCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    votes.forEach(vote => {
      if (vote.targetId) {
        counts[vote.targetId] = (counts[vote.targetId] || 0) + 1;
      }
    });
    return counts;
  }, [votes]);

  const handleVote = () => {
    onVote(selectedTarget);
  };

  const handleSkipVote = () => {
    setSelectedTarget(null);
    onVote(null);
  };

  // Get killed player info
  const killedPlayer = lastNightKilled ? players.find(p => p.id === lastNightKilled) : null;
  const escortedPlayer = escortedPlayerId ? players.find(p => p.id === escortedPlayerId) : null;

  return (
    <div className="min-h-screen day-overlay">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#d4a017] mb-2">
            {isVotingPhase ? 'Town Vote' : 'Day Discussion'}
          </h1>
          <p className="text-gray-400">
            {isVotingPhase
              ? 'Vote to eliminate a suspect. Majority required.'
              : 'Discuss who might be the mafia'}
          </p>
          <div className="mt-4 max-w-md mx-auto">
            <Timer
              endTime={phaseEndTime}
              label={isVotingPhase ? 'Voting ends in' : 'Discussion ends in'}
            />
          </div>
        </div>

        {/* Night result announcement */}
        {phase === 'day-discussion' && (
          <div className="card-mafia max-w-2xl mx-auto mb-8 text-center">
            <h3 className="text-lg font-semibold text-gray-400 mb-4">Last Night&apos;s Events</h3>

            {killedPlayer ? (
              <div className="animate-fadeIn">
                <p className="text-2xl mb-2">💀</p>
                <p className="text-red-500 text-xl font-bold mb-2">
                  {killedPlayer.name} was killed!
                </p>
                <p className="text-gray-500">
                  They were a <span className={`role-${killedPlayer.role}`}>
                    {killedPlayer.role?.charAt(0).toUpperCase()}{killedPlayer.role?.slice(1)}
                  </span>
                </p>
              </div>
            ) : savedByDoctor ? (
              <div className="animate-fadeIn">
                <p className="text-2xl mb-2">💊</p>
                <p className="text-green-500 text-xl font-bold">
                  The doctor saved someone tonight!
                </p>
                <p className="text-gray-500">No one was killed</p>
              </div>
            ) : (
              <div className="animate-fadeIn">
                <p className="text-2xl mb-2">🌅</p>
                <p className="text-gray-400 text-xl">
                  The night passed peacefully
                </p>
              </div>
            )}

            {escortedPlayer && (
              <div className="mt-4 pt-4 border-t border-gray-800">
                <p className="text-purple-400">
                  💋 <span className="font-semibold">{escortedPlayer.name}</span> was visited by the escort
                </p>
                <p className="text-gray-500 text-sm">They cannot be voted out today</p>
              </div>
            )}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Players / Voting panel */}
          <div className="card-mafia">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-[#d4a017]">
                {isVotingPhase ? 'Cast Your Vote' : 'Alive Players'}
              </h3>
              <span className="text-sm text-gray-500">
                {alivePlayers.length} alive
              </span>
            </div>

            <div className="grid gap-3 mb-6 max-h-[400px] overflow-y-auto">
              {alivePlayers.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  isMe={player.id === myPlayerId}
                  isSelected={selectedTarget === player.id}
                  onClick={isVotingPhase && canVote && !hasVoted ? () => setSelectedTarget(player.id) : undefined}
                  voteCount={voteCounts[player.id] || 0}
                  showVoteCount={isVotingPhase}
                  disabled={isVotingPhase && (player.voteImmune || hasVoted || !canVote)}
                />
              ))}
            </div>

            {isVotingPhase && canVote && (
              <div className="space-y-3">
                {hasVoted ? (
                  <div className="text-center py-4">
                    <p className="text-green-400 font-semibold">Vote submitted!</p>
                    <p className="text-gray-500 text-sm">
                      {currentVote
                        ? `You voted for ${players.find(p => p.id === currentVote)?.name}`
                        : 'You chose to skip'}
                    </p>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={handleVote}
                      disabled={!selectedTarget}
                      className="btn-mafia w-full"
                    >
                      Vote to Eliminate
                    </button>
                    <button
                      onClick={handleSkipVote}
                      className="btn-secondary w-full"
                    >
                      Skip Vote
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Vote tally */}
            {isVotingPhase && Object.keys(voteCounts).length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-800">
                <h4 className="text-sm text-gray-400 mb-2">Current Votes</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(voteCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([playerId, count]) => {
                      const player = players.find(p => p.id === playerId);
                      return (
                        <div key={playerId} className="bg-[#1a1a1a] px-3 py-1 rounded flex items-center gap-2">
                          <span className="text-sm">{player?.name}</span>
                          <span className="vote-count text-xs">{count}</span>
                        </div>
                      );
                    })}
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Majority needed: {Math.floor(alivePlayers.length / 2) + 1} votes
                </p>
              </div>
            )}
          </div>

          {/* Chat */}
          <div className="h-[500px]">
            <ChatBox
              messages={dayChat}
              onSendMessage={onSendChat}
              placeholder="Discuss with the town..."
              disabled={!myPlayer?.isAlive}
            />
          </div>
        </div>

        {/* Dead players */}
        {players.filter(p => !p.isAlive).length > 0 && (
          <div className="mt-8 max-w-5xl mx-auto">
            <h3 className="text-lg font-semibold text-gray-500 mb-4">Eliminated Players</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {players.filter(p => !p.isAlive).map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  showRole
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
