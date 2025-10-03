import { useState, useEffect } from 'react';

interface TimerProps {
  seconds: number;
  onComplete?: () => void;
  className?: string;
}

export default function Timer({ seconds: initialSeconds, onComplete, className = '' }: TimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    setSeconds(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (seconds <= 0) {
      onComplete?.();
      return;
    }

    const interval = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          onComplete?.();
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [seconds, onComplete]);

  const isLow = seconds <= 5;
  const percentage = (seconds / initialSeconds) * 100;

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
