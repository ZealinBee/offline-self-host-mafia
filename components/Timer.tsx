'use client';

import { useState, useEffect } from 'react';

interface TimerProps {
  endTime: number | null;
  label?: string;
}

export default function Timer({ endTime, label }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [totalTime, setTotalTime] = useState<number>(0);

  useEffect(() => {
    if (!endTime) {
      setTimeLeft(0);
      return;
    }

    const initialTimeLeft = Math.max(0, endTime - Date.now());
    setTotalTime(initialTimeLeft);
    setTimeLeft(initialTimeLeft);

    const interval = setInterval(() => {
      const remaining = Math.max(0, endTime - Date.now());
      setTimeLeft(remaining);
      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [endTime]);

  const seconds = Math.ceil(timeLeft / 1000);
  const percentage = totalTime > 0 ? (timeLeft / totalTime) * 100 : 0;

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-400">{label}</span>
          <span className={`text-lg font-mono font-bold ${seconds <= 10 ? 'text-red-500 animate-pulse' : 'text-[#d4a017]'}`}>
            {seconds}s
          </span>
        </div>
      )}
      <div className="timer-bar">
        <div
          className="timer-bar-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
