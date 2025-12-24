'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';

export default function Home() {
  const router = useRouter();
  const { connected, createRoom, joinRoom, error, clearError } = useSocket();
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (error) {
      setLocalError(error);
      clearError();
    }
  }, [error, clearError]);

  const handleCreate = async () => {
    if (!name.trim()) {
      setLocalError('Please enter your name');
      return;
    }
    if (name.length > 15) {
      setLocalError('Name must be 15 characters or less');
      return;
    }

    setLoading(true);
    setLocalError(null);

    try {
      const result = await createRoom(name.trim());
      router.push(`/room/${result.code}`);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to create room');
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!name.trim()) {
      setLocalError('Please enter your name');
      return;
    }
    if (name.length > 15) {
      setLocalError('Name must be 15 characters or less');
      return;
    }
    if (!roomCode.trim() || roomCode.length !== 4) {
      setLocalError('Please enter a valid 4-letter room code');
      return;
    }

    setLoading(true);
    setLocalError(null);

    try {
      await joinRoom(roomCode.toUpperCase(), name.trim());
      router.push(`/room/${roomCode.toUpperCase()}`);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to join room');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#8b0000] to-transparent opacity-50" />
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#8b0000] to-transparent opacity-50" />
      </div>

      {/* Main content */}
      <div className="card-mafia w-full max-w-md animate-scaleIn">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-[#d4a017] mb-2 tracking-wider">
            MAFIA
          </h1>
          <p className="text-gray-400 text-sm tracking-widest uppercase">
            The Game of Deception
          </p>
        </div>

        {/* Connection status */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs text-gray-500">
            {connected ? 'Connected' : 'Connecting...'}
          </span>
        </div>

        {mode === 'menu' && (
          <div className="space-y-4 animate-fadeIn">
            <button
              onClick={() => setMode('create')}
              disabled={!connected}
              className="btn-mafia w-full"
            >
              Create Room
            </button>
            <button
              onClick={() => setMode('join')}
              disabled={!connected}
              className="btn-secondary w-full"
            >
              Join Room
            </button>
          </div>
        )}

        {mode === 'create' && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                maxLength={15}
                className="input-mafia w-full"
                disabled={loading}
              />
            </div>

            {localError && (
              <div className="text-red-500 text-sm text-center">{localError}</div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setMode('menu');
                  setLocalError(null);
                }}
                className="btn-secondary flex-1"
                disabled={loading}
              >
                Back
              </button>
              <button
                onClick={handleCreate}
                disabled={!connected || loading}
                className="btn-mafia flex-1"
              >
                {loading ? (
                  <span className="spinner mx-auto w-5 h-5" />
                ) : (
                  'Create'
                )}
              </button>
            </div>
          </div>
        )}

        {mode === 'join' && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                maxLength={15}
                className="input-mafia w-full"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Room Code</label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="XXXX"
                maxLength={4}
                className="input-mafia w-full text-center text-2xl tracking-[0.5em] font-mono"
                disabled={loading}
              />
            </div>

            {localError && (
              <div className="text-red-500 text-sm text-center">{localError}</div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setMode('menu');
                  setLocalError(null);
                }}
                className="btn-secondary flex-1"
                disabled={loading}
              >
                Back
              </button>
              <button
                onClick={handleJoin}
                disabled={!connected || loading}
                className="btn-mafia flex-1"
              >
                {loading ? (
                  <span className="spinner mx-auto w-5 h-5" />
                ) : (
                  'Join'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Game info */}
        <div className="mt-8 pt-6 border-t border-gray-800">
          <p className="text-xs text-gray-500 text-center">
            7 Players Required
          </p>
          <div className="flex justify-center gap-4 mt-3 text-xs">
            <span className="role-mafia">2 Mafia</span>
            <span className="role-escort">1 Escort</span>
            <span className="role-doctor">1 Doctor</span>
            <span className="role-detective">1 Detective</span>
            <span className="role-citizen">2 Citizens</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 text-center text-xs text-gray-600">
        <p>Self-Hosted Mafia Game</p>
      </footer>
    </main>
  );
}
