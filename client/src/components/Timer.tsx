import { useState, useEffect } from 'react';

interface TimerProps {
  seconds?: number;  // Optional: for backwards compatibility
  deadline?: Date | string;  // NEW: Server deadline timestamp
  onComplete?: () => void;
  className?: string;
}

export default function Timer({ seconds: initialSeconds, deadline, onComplete, className = '' }: TimerProps) {
  // Calculate initial seconds from deadline if provided
  const getSecondsFromDeadline = () => {
    if (!deadline) return initialSeconds || 0;
    const deadlineTime = typeof deadline === 'string' ? new Date(deadline).getTime() : deadline.getTime();
    const remaining = Math.max(0, Math.ceil((deadlineTime - Date.now()) / 1000));
    return remaining;
  };

  const [seconds, setSeconds] = useState(getSecondsFromDeadline());
  const totalSeconds = initialSeconds || 50;  // For percentage calculation

  // Update when deadline changes
  useEffect(() => {
    setSeconds(getSecondsFromDeadline());
  }, [deadline, initialSeconds]);

  useEffect(() => {
    if (seconds <= 0) {
      onComplete?.();
      return;
    }

    const interval = setInterval(() => {
      const newSeconds = deadline ? getSecondsFromDeadline() : seconds - 1;
      setSeconds(newSeconds);

      if (newSeconds <= 0) {
        onComplete?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [seconds, deadline, onComplete]);

  const isLow = seconds <= 10;
  const percentage = (seconds / totalSeconds) * 100;

  return (
    <div className={`text-center ${className}`}>
      <div
        className={`text-6xl font-bold tabular-nums transition-colors ${
          isLow ? 'text-red-500 animate-pulse' : 'text-white'
        }`}
      >
        {seconds}s
      </div>

      {/* Progress bar */}
      <div className="mt-4 w-full bg-white/20 rounded-full h-3 overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ${
            isLow ? 'bg-red-500' : 'bg-green-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <p className="text-purple-200 mt-2 text-sm">
        {isLow ? '⏰ Hurry up!' : 'Time remaining'}
      </p>
    </div>
  );
}
