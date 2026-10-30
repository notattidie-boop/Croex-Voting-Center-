import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle, CheckCircle2 } from 'lucide-react';

interface CountdownTimerProps {
  expiresAt: string;
  onExpire?: () => void;
  compact?: boolean;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

export function calculateTimeRemaining(expiresAt: string): TimeRemaining {
  const targetTime = new Date(expiresAt).getTime();
  const now = Date.now();
  const diff = targetTime - now;

  if (diff <= 0 || isNaN(diff)) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
    };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return {
    days,
    hours,
    minutes,
    seconds,
    isExpired: false,
  };
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  expiresAt,
  onExpire,
  compact = false,
}) => {
  const [timeLeft, setTimeLeft] = useState<TimeRemaining>(() =>
    calculateTimeRemaining(expiresAt)
  );

  useEffect(() => {
    const update = () => {
      const remaining = calculateTimeRemaining(expiresAt);
      setTimeLeft(remaining);
      if (remaining.isExpired && onExpire) {
        onExpire();
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  if (timeLeft.isExpired) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold shadow-xs">
        <AlertCircle className="w-4 h-4 text-rose-600 animate-pulse" />
        <span>Voting Expired (Time Khatam)</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-800 text-xs font-medium">
        <Clock className="w-3.5 h-3.5 text-indigo-600 animate-spin" style={{ animationDuration: '6s' }} />
        <span>
          {timeLeft.days > 0 ? `${timeLeft.days}d ` : ''}
          {String(timeLeft.hours).padStart(2, '0')}:
          {String(timeLeft.minutes).padStart(2, '0')}:
          {String(timeLeft.seconds).padStart(2, '0')}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        <Clock className="w-4 h-4 text-indigo-600 animate-pulse" />
        <span>Live Voting Countdown (Baqi Waqt)</span>
      </div>
      <div className="grid grid-cols-4 gap-2 sm:gap-3 text-center">
        <div className="bg-white border border-slate-200 shadow-xs rounded-xl px-2.5 sm:px-4 py-2 min-w-[60px] sm:min-w-[72px]">
          <span className="block text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono">
            {String(timeLeft.days).padStart(2, '0')}
          </span>
          <span className="text-[10px] sm:text-xs text-slate-400 font-medium">Days (Din)</span>
        </div>
        <div className="bg-white border border-slate-200 shadow-xs rounded-xl px-2.5 sm:px-4 py-2 min-w-[60px] sm:min-w-[72px]">
          <span className="block text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono">
            {String(timeLeft.hours).padStart(2, '0')}
          </span>
          <span className="text-[10px] sm:text-xs text-slate-400 font-medium">Hours</span>
        </div>
        <div className="bg-white border border-slate-200 shadow-xs rounded-xl px-2.5 sm:px-4 py-2 min-w-[60px] sm:min-w-[72px]">
          <span className="block text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono">
            {String(timeLeft.minutes).padStart(2, '0')}
          </span>
          <span className="text-[10px] sm:text-xs text-slate-400 font-medium">Mins</span>
        </div>
        <div className="bg-white border border-rose-100 bg-rose-50/30 shadow-xs rounded-xl px-2.5 sm:px-4 py-2 min-w-[60px] sm:min-w-[72px]">
          <span className="block text-xl sm:text-2xl font-black text-rose-600 tracking-tight font-mono">
            {String(timeLeft.seconds).padStart(2, '0')}
          </span>
          <span className="text-[10px] sm:text-xs text-rose-500 font-medium">Secs</span>
        </div>
      </div>
    </div>
  );
};
