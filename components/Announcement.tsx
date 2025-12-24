'use client';

import { useEffect, useState } from 'react';
import Timer from './Timer';

interface Player {
  id: string;
  name: string;
  role?: string;
  isAlive: boolean;
  isReady: boolean;
  voteImmune: boolean;
}

interface AnnouncementProps {
  type: 'night-result' | 'vote-result';
  killedPlayer: Player | null;
  savedByDoctor: boolean;
  escortedPlayer: Player | null;
  phaseEndTime: number | null;
}

export default function Announcement({
  type,
  killedPlayer,
  savedByDoctor,
  escortedPlayer,
  phaseEndTime,
}: AnnouncementProps) {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const isNightResult = type === 'night-result';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 day-overlay">
      <div className="max-w-lg w-full text-center">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#d4a017] mb-2">
            {isNightResult ? 'Dawn Breaks...' : 'The Town Has Decided'}
          </h1>
          <Timer endTime={phaseEndTime} label="" />
        </div>

        {/* Content */}
        {showContent && (
          <div className="card-mafia animate-scaleIn">
            {killedPlayer ? (
              <>
                <div className="text-7xl mb-4 animate-pulse">💀</div>
                <p className="text-2xl text-red-500 font-bold mb-2">
                  {killedPlayer.name} has been {isNightResult ? 'killed' : 'eliminated'}!
                </p>
                <div className="bg-[#0d0d0d] rounded-lg p-4 mt-4">
                  <p className="text-gray-500 text-sm mb-1">They were</p>
                  <p className={`text-xl font-semibold role-${killedPlayer.role}`}>
                    {killedPlayer.role
                      ? killedPlayer.role.charAt(0).toUpperCase() + killedPlayer.role.slice(1)
                      : 'Unknown'}
                  </p>
                </div>
              </>
            ) : savedByDoctor ? (
              <>
                <div className="text-7xl mb-4">💊</div>
                <p className="text-2xl text-green-500 font-bold mb-2">
                  Someone was saved!
                </p>
                <p className="text-gray-400">
                  The doctor successfully protected a target tonight.
                </p>
              </>
            ) : (
              <>
                <div className="text-7xl mb-4">
                  {isNightResult ? '🌅' : '🤷'}
                </div>
                <p className="text-2xl text-gray-400 font-bold mb-2">
                  {isNightResult ? 'No one died tonight' : 'No one was eliminated'}
                </p>
                <p className="text-gray-500">
                  {isNightResult
                    ? 'The town remains intact... for now.'
                    : 'The town could not reach a majority.'}
                </p>
              </>
            )}

            {/* Escort effect */}
            {escortedPlayer && (
              <div className="mt-6 pt-4 border-t border-gray-800">
                <p className="text-purple-400">
                  💋 <span className="font-semibold">{escortedPlayer.name}</span> was visited last night
                </p>
                <p className="text-gray-500 text-sm">They are immune to voting today</p>
              </div>
            )}
          </div>
        )}

        <p className="text-gray-600 text-sm mt-8">
          {isNightResult
            ? 'The day phase will begin shortly...'
            : 'The night will fall soon...'}
        </p>
      </div>
    </div>
  );
}
