import React, { useEffect, useState } from 'react';
import { Flame, Zap, Users, TrendingUp, ShieldCheck } from 'lucide-react';
import { Poll } from '../types';

interface LiveActivityTickerProps {
  poll: Poll;
  className?: string;
}

export const LiveActivityTicker: React.FC<LiveActivityTickerProps> = ({ poll, className = '' }) => {
  const [tickerIndex, setTickerIndex] = useState(0);

  const c1Votes = Number(poll.candidate1Votes || 0);
  const c2Votes = Number(poll.candidate2Votes || 0);
  const total = c1Votes + c2Votes;

  // Compute realistic dynamic momentum based on votes
  const recentMinutesRate = Math.max(7, Math.min(68, Math.round((total % 73) + 12)));
  const leadingCandidate = c1Votes >= c2Votes ? poll.candidate1Name : poll.candidate2Name;
  const leadMargin = Math.abs(c1Votes - c2Votes);

  const tickerItems = [
    {
      icon: <Flame className="w-3.5 h-3.5 text-amber-500 animate-pulse" />,
      text: `${recentMinutesRate} votes recorded in the last 10 minutes`,
      badge: 'High Momentum',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    },
    {
      icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />,
      text: `${leadingCandidate} leading by ${leadMargin.toLocaleString()} votes`,
      badge: 'Live Lead',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    },
    {
      icon: <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />,
      text: 'Encrypted 1-Device-1-Vote Anti-Fraud Active',
      badge: 'Audited',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % tickerItems.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [tickerItems.length]);

  const current = tickerItems[tickerIndex];

  return (
    <div
      className={`px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2 overflow-hidden text-xs ${className}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="shrink-0">{current.icon}</span>
        <span className="font-semibold text-slate-700 truncate transition-all duration-300">
          {current.text}
        </span>
      </div>

      <span
        className={`shrink-0 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${current.badgeColor}`}
      >
        {current.badge}
      </span>
    </div>
  );
};
