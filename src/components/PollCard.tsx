import React, { useState, useEffect } from 'react';
import {
  Vote,
  Clock,
  Copy,
  Check,
  Trophy,
  ChevronRight,
  Flame,
  Award,
  MessageCircle,
  MessageSquare,
} from 'lucide-react';
import { Poll } from '../types';
import { CountdownTimer, calculateTimeRemaining } from './CountdownTimer';
import { generatePollShareUrls } from '../utils/urlHelper';
import {
  getOrGenerateShortUrl,
  formatPollWhatsAppMessage,
  formatPollSmsMessage,
  getSmsIntentUrl,
} from '../utils/shortUrlHelper';
import { savePollShortUrl } from '../services/pollService';
import {
  isVotingEnded,
  isPostResultExpired,
  calculateGraceRemaining,
} from '../utils/pollExpiry';
import { ResultCertificateModal } from './ResultCertificateModal';

interface PollCardProps {
  poll: Poll;
  onOpenVote: (pollId: string) => void;
  userVotedChoice?: number | null;
}

export const PollCard: React.FC<PollCardProps> = ({
  poll,
  onOpenVote,
  userVotedChoice,
}) => {
  const [copied, setCopied] = useState(false);
  const [showCertModal, setShowCertModal] = useState(false);

  const isExpired = isVotingEnded(poll);
  const isPostResultLimit = isPostResultExpired(poll);
  const grace = calculateGraceRemaining(poll.expiresAt);

  const total = poll.candidate1Votes + poll.candidate2Votes;
  const c1Pct = total > 0 ? Math.round((poll.candidate1Votes / total) * 100) : 50;
  const c2Pct = total > 0 ? 100 - c1Pct : 50;

  const { shareUrl } = generatePollShareUrls(poll.id, poll.title, poll);
  const [cleanLink, setCleanLink] = useState<string>(() => {
    if (poll?.shortUrl && !poll.shortUrl.includes('ais-')) return poll.shortUrl;
    return shareUrl;
  });

  useEffect(() => {
    if (poll?.shortUrl && !poll.shortUrl.includes('ais-')) {
      setCleanLink(poll.shortUrl);
      return;
    }
    getOrGenerateShortUrl(poll.id, poll.title, poll.shortUrl, poll).then((short) => {
      if (short && !short.includes('ais-')) {
        setCleanLink(short);
        savePollShortUrl(poll.id, short);
      }
    });
  }, [poll.id, poll.shortUrl, poll.title]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(cleanLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const whatsappText = formatPollWhatsAppMessage(poll.title, cleanLink, poll.id);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappText)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleSms = (e: React.MouseEvent) => {
    e.stopPropagation();
    const smsMessage = formatPollSmsMessage(poll.title, cleanLink, poll.id);
    window.location.href = getSmsIntentUrl(smsMessage);
  };

  return (
    <div className="bg-white border border-slate-200 hover:border-slate-300 rounded-3xl p-5 sm:p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group">
      <div>
        {/* Top Header Tag */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-[11px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
            {poll.category || 'Contest'}
          </span>
          <div className="flex items-center gap-1.5">
            {isPostResultLimit ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold">
                <span>📜 History (Expired)</span>
              </span>
            ) : isExpired ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold" title="Auto-deletes from dashboard after 5 hours">
                <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                <span>Result Out: {grace.formatted}</span>
              </span>
            ) : (
              <CountdownTimer expiresAt={poll.expiresAt} compact />
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-snug mb-2 group-hover:text-indigo-600 transition-colors">
          {poll.title}
        </h3>
        {poll.description && (
          <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
            {poll.description}
          </p>
        )}

        {/* Main Banner Photo from Gallery (Tora Chota Banner) */}
        {poll.bannerPhoto && (
          <div className="w-full h-28 sm:h-36 rounded-xl overflow-hidden border border-slate-200 mb-3 shadow-xs bg-slate-950 flex items-center justify-center">
            <img
              src={poll.bannerPhoto}
              alt={poll.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* 2 Candidates Face-Off with Large Wazeh Photos, A/B Badges & Center VS */}
        <div className="relative my-3">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 bg-slate-50/90 p-3 sm:p-4 rounded-2xl border border-slate-200/80">
            {/* Candidate A */}
            <div className="flex flex-col items-center text-center">
              {/* Prominent Large Photo A */}
              <div className="relative w-full h-44 sm:h-52 md:h-56 rounded-2xl overflow-hidden bg-slate-900 border-2 border-slate-200 mb-2.5 shadow-sm group-hover:border-emerald-300 transition-colors">
                <img
                  src={poll.candidate1Photo}
                  alt={poll.candidate1Name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';
                  }}
                />
                {/* Large Emerald Badge A */}
                <div className="absolute top-2 left-2 w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-600 text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-md border border-white/50">
                  A
                </div>
              </div>
              <strong className="text-xs sm:text-sm font-black text-slate-900 line-clamp-1">
                {poll.candidate1Name}
              </strong>
              <span className="text-xs font-mono font-black text-emerald-600 mt-0.5">
                {poll.candidate1Votes} votes
              </span>
              <span className="text-[10px] text-slate-400 font-bold">{c1Pct}%</span>
            </div>

            {/* Candidate B */}
            <div className="flex flex-col items-center text-center">
              {/* Prominent Large Photo B */}
              <div className="relative w-full h-44 sm:h-52 md:h-56 rounded-2xl overflow-hidden bg-slate-900 border-2 border-slate-200 mb-2.5 shadow-sm group-hover:border-indigo-300 transition-colors">
                <img
                  src={poll.candidate2Photo}
                  alt={poll.candidate2Name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80';
                  }}
                />
                {/* Large Indigo Badge B */}
                <div className="absolute top-2 left-2 w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-indigo-600 text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-md border border-white/50">
                  B
                </div>
              </div>
              <strong className="text-xs sm:text-sm font-black text-slate-900 line-clamp-1">
                {poll.candidate2Name}
              </strong>
              <span className="text-xs font-mono font-black text-slate-800 mt-0.5">
                {poll.candidate2Votes} votes
              </span>
              <span className="text-[10px] text-slate-400 font-bold">{c2Pct}%</span>
            </div>
          </div>

          {/* VS Center Marker */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-950 text-white font-black text-xs flex items-center justify-center border-2 border-white shadow-lg z-10 pointer-events-none">
            VS
          </div>
        </div>

        {/* 2 Comparison Strips (Candidate A & Candidate B) */}
        <div className="space-y-1.5 mb-3">
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden p-0.5 shadow-inner">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.max(c1Pct, poll.candidate1Votes > 0 ? 5 : 0)}%` }}
            />
          </div>
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden p-0.5 shadow-inner">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.max(c2Pct, poll.candidate2Votes > 0 ? 5 : 0)}%` }}
            />
          </div>
        </div>

        {userVotedChoice && (
          <div className="mb-3 px-2.5 py-1 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-[11px] font-bold text-center">
            ✓ Your Vote Has Been Recorded
          </div>
        )}
      </div>

      {/* Action Buttons: Prominent Select & Vote Button */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition"
            title="Copy Direct Link"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={handleWhatsApp}
            className="p-2 rounded-xl text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border border-emerald-200 transition"
            title="Share on WhatsApp"
          >
            <MessageCircle className="w-4 h-4" />
          </button>
          <button
            onClick={handleSms}
            className="p-2 rounded-xl text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-200 transition"
            title="Share via SMS (Mobile Messaging)"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          {isExpired && (
            <button
              onClick={() => setShowCertModal(true)}
              className="p-2 rounded-xl text-amber-600 hover:text-amber-700 hover:bg-amber-50 border border-amber-300 transition"
              title="Official Result Certificate"
            >
              <Award className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          onClick={() => onOpenVote(poll.id)}
          className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs ${
            isPostResultLimit
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              : isExpired
              ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20 ring-2 ring-amber-300'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white ring-2 ring-indigo-200'
          }`}
        >
          {isExpired ? <Trophy className="w-3.5 h-3.5" /> : <Vote className="w-3.5 h-3.5" />}
          <span>{isPostResultLimit ? 'View History' : isExpired ? 'Result Out' : 'Vote A or B (Live)'}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Official Result Certificate Modal */}
      {showCertModal && (
        <ResultCertificateModal poll={poll} onClose={() => setShowCertModal(false)} />
      )}
    </div>
  );
};
