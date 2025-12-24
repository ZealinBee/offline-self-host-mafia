'use client';

import { useState, useEffect } from 'react';
import Timer from './Timer';

interface RoleRevealProps {
  role: string | null;
  phaseEndTime: number | null;
  teammates?: string[]; // Names of mafia teammates (only for mafia)
}

const ROLE_INFO: Record<string, { icon: string; color: string; description: string; objective: string }> = {
  mafia: {
    icon: '🔫',
    color: 'text-red-500',
    description: 'You are part of the Mafia',
    objective: 'Eliminate all town members to win.',
  },
  escort: {
    icon: '💋',
    color: 'text-pink-400',
    description: 'You are the Escort',
    objective: 'Visit someone each night to make them immune to voting the next day.',
  },
  doctor: {
    icon: '💊',
    color: 'text-green-400',
    description: 'You are the Doctor',
    objective: 'Save players from mafia kills at night.',
  },
  detective: {
    icon: '🔍',
    color: 'text-blue-400',
    description: 'You are the Detective',
    objective: 'Investigate players to discover their alignment.',
  },
  citizen: {
    icon: '👤',
    color: 'text-gray-400',
    description: 'You are a Citizen',
    objective: 'Help the town identify and eliminate the mafia through voting.',
  },
};

export default function RoleReveal({ role, phaseEndTime, teammates }: RoleRevealProps) {
  const [revealed, setRevealed] = useState(false);
  const roleInfo = role ? ROLE_INFO[role] : null;

  useEffect(() => {
    // Dramatic reveal after a short delay
    const timer = setTimeout(() => setRevealed(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-black">
      {/* Dramatic background */}
      <div className="fixed inset-0 bg-gradient-to-b from-black via-[#0a0a0a] to-black" />

      {/* Spotlight effect */}
      <div className="fixed inset-0 bg-radial-gradient pointer-events-none opacity-30" />

      <div className="relative z-10 text-center">
        {!revealed ? (
          <div className="animate-pulse">
            <div className="text-6xl mb-4">🎭</div>
            <p className="text-xl text-gray-400">Revealing your role...</p>
          </div>
        ) : (
          <div className="animate-scaleIn">
            {/* Role card */}
            <div className="card-mafia max-w-md mx-auto mb-8">
              <div className="text-8xl mb-4">
                {roleInfo?.icon || '❓'}
              </div>

              <h1 className={`text-4xl font-bold mb-2 ${roleInfo?.color || 'text-white'}`}>
                {role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Unknown'}
              </h1>

              <p className="text-gray-400 mb-4">
                {roleInfo?.description}
              </p>

              <div className="bg-[#0d0d0d] rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-500 uppercase tracking-wider mb-2">Objective</p>
                <p className="text-gray-300">{roleInfo?.objective}</p>
              </div>

              {/* Mafia teammates */}
              {role === 'mafia' && teammates && teammates.length > 0 && (
                <div className="bg-red-900/20 rounded-lg p-4 border border-red-900">
                  <p className="text-sm text-red-400 uppercase tracking-wider mb-2">
                    Your Fellow Mafia
                  </p>
                  <div className="flex justify-center gap-4">
                    {teammates.map((name, i) => (
                      <span key={i} className="text-red-300 font-semibold">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Team indicator */}
              <div className={`mt-4 py-2 px-4 rounded-full inline-block ${
                role === 'mafia' ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400'
              }`}>
                {role === 'mafia' ? '🔴 Mafia Team' : '🟢 Town Team'}
              </div>
            </div>

            <div className="max-w-md mx-auto">
              <Timer endTime={phaseEndTime} label="Memorize your role" />
              <p className="text-gray-500 text-sm mt-4">
                The night will begin shortly...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
