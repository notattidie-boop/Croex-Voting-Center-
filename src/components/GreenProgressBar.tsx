import React from 'react';
import { Flame, TrendingUp, Sparkles, Scale } from 'lucide-react';

interface GreenProgressBarProps {
  c1Name: string;
  c1Votes: number;
  c2Name: string;
  c2Votes: number;
  isExpired?: boolean;
}

export const GreenProgressBar: React.FC<GreenProgressBarProps> = ({
  c1Name,
  c1Votes,
  c2Name,
  c2Votes,
  isExpired = false,
}) => {
  const total = c1Votes + c2Votes;
  const c1Percent = total > 0 ? Math.round((c1Votes / total) * 100) : 50;
  const c2Percent = total > 0 ? 100 - c1Percent : 50;

  const leadDifference = Math.abs(c1Votes - c2Votes);
  const isC1Leading = c1Votes > c2Votes;
  const isC2Leading = c2Votes > c1Votes;
  const isTied = c1Votes === c2Votes;

  return (
    <div className="w-full my-6 bg-slate-50 border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
      {/* Header status of the green comparison strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-black uppercase tracking-wider text-slate-800">
            Real-Time Vote Comparison
          </span>
        </div>

        <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
          {isTied ? (
            <span className="inline-flex items-center gap-1 text-slate-700 bg-slate-200/70 px-2.5 py-0.5 rounded-full font-bold">
              <Scale className="w-3.5 h-3.5 text-slate-600" />
              Equal Tie (50% - 50%)
            </span>
          ) : isC1Leading ? (
            <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full font-bold">
              <Flame className="w-3.5 h-3.5 text-emerald-600" />
              {c1Name} is leading by {leadDifference} votes ({c1Percent}%)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full font-bold">
              <Flame className="w-3.5 h-3.5 text-emerald-600" />
              {c2Name} is leading by {leadDifference} votes ({c2Percent}%)
            </span>
          )}
        </div>
      </div>

      {/* 2 Separate Comparison Bars (2 Patiyan - One for Candidate 1, One for Candidate 2) */}
      <div className="space-y-4">
        {/* Bar 1: Candidate 1 (Pehla Umeedwar) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-5 h-5 rounded-md bg-emerald-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 shadow-2xs">
                A
              </span>
              <strong className="text-slate-900 truncate font-black text-xs sm:text-sm">
                {c1Name}
              </strong>
              <span className="font-mono font-bold text-emerald-700 text-xs shrink-0">
                ({c1Votes} {c1Votes === 1 ? 'vote' : 'votes'})
              </span>
            </div>
            <span className="font-mono font-black text-xs sm:text-sm text-emerald-600 shrink-0 ml-2">
              {c1Percent}%
            </span>
          </div>

          <div className="relative w-full h-7 sm:h-8 bg-slate-200/90 rounded-full overflow-hidden p-1 shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-500 transition-all duration-700 ease-out relative flex items-center justify-end px-3 overflow-hidden shadow-xs"
              style={{ width: `${Math.max(c1Percent, c1Votes > 0 ? 5 : 0)}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
              {c1Percent >= 12 && (
                <span className="text-[11px] font-black text-white font-mono drop-shadow-xs z-10">
                  {c1Percent}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bar 2: Candidate 2 (Doosra Umeedwar) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-5 h-5 rounded-md bg-indigo-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 shadow-2xs">
                B
              </span>
              <strong className="text-slate-900 truncate font-black text-xs sm:text-sm">
                {c2Name}
              </strong>
              <span className="font-mono font-bold text-indigo-700 text-xs shrink-0">
                ({c2Votes} {c2Votes === 1 ? 'vote' : 'votes'})
              </span>
            </div>
            <span className="font-mono font-black text-xs sm:text-sm text-indigo-600 shrink-0 ml-2">
              {c2Percent}%
            </span>
          </div>

          <div className="relative w-full h-7 sm:h-8 bg-slate-200/90 rounded-full overflow-hidden p-1 shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 transition-all duration-700 ease-out relative flex items-center justify-end px-3 overflow-hidden shadow-xs"
              style={{ width: `${Math.max(c2Percent, c2Votes > 0 ? 5 : 0)}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
              {c2Percent >= 12 && (
                <span className="text-[11px] font-black text-white font-mono drop-shadow-xs z-10">
                  {c2Percent}%
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
