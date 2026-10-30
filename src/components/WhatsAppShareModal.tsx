import React, { useState, useEffect } from 'react';
import {
  Share2,
  Copy,
  CheckCircle2,
  X,
  Flame,
  Trophy,
  Send,
  MessageCircle,
  ExternalLink,
} from 'lucide-react';
import { Poll } from '../types';
import { generatePollShareUrls } from '../utils/urlHelper';
import { getOrGenerateShortUrl } from '../utils/shortUrlHelper';
import { savePollShortUrl } from '../services/pollService';

interface WhatsAppShareModalProps {
  poll: Poll;
  onClose: () => void;
}

export const WhatsAppShareModal: React.FC<WhatsAppShareModalProps> = ({ poll, onClose }) => {
  const [template, setTemplate] = useState<'live' | 'lead' | 'result'>('live');
  const [copied, setCopied] = useState(false);

  // Synchronous initial link (checks poll.shortUrl first)
  const [shareUrl, setShareUrl] = useState<string>(() => {
    if (poll.shortUrl && !poll.shortUrl.includes('ais-') && poll.shortUrl.startsWith('http')) {
      return poll.shortUrl;
    }
    return generatePollShareUrls(poll.id, poll.title, poll).shareUrl;
  });

  // Asynchronously ensure we have a clean shortened URL without 'ais-'
  useEffect(() => {
    let active = true;
    getOrGenerateShortUrl(poll.id, poll.title, poll.shortUrl, poll).then((clean) => {
      if (active && clean && !clean.includes('ais-')) {
        setShareUrl(clean);
        savePollShortUrl(poll.id, clean);
      }
    });
    return () => {
      active = false;
    };
  }, [poll.id, poll.title, poll.shortUrl]);

  const c1Votes = Number(poll.candidate1Votes || 0);
  const c2Votes = Number(poll.candidate2Votes || 0);
  const total = c1Votes + c2Votes || 1;
  const c1Pct = Math.round((c1Votes / total) * 100);
  const c2Pct = Math.round((c2Votes / total) * 100);

  const leaderName = c1Votes >= c2Votes ? poll.candidate1Name : poll.candidate2Name;
  const leaderPct = Math.max(c1Pct, c2Pct);
  const runnerName = c1Votes >= c2Votes ? poll.candidate2Name : poll.candidate1Name;
  const runnerPct = Math.min(c1Pct, c2Pct);

  const templates = {
    live: `🗳️ *Croex Voting Center* 🗳️
*Hanzla Croex Technology*

Contest: *${poll.title}*

👉 *Cast Your Vote Instantly (1-Tap Live):*
${shareUrl}

🟢 *Candidate A:* ${poll.candidate1Name}
🔵 *Candidate B:* ${poll.candidate2Name}

🔒 Certified 1-Device-1-Vote • Live & Offline Ready`,

    lead: `🔥 *LIVE POLL UPDATE - Croex Voting Center* 🔥
Contest: *${poll.title}*

👑 *Current Leader:* *${leaderName}* (${leaderPct}% • ${Math.max(c1Votes, c2Votes).toLocaleString()} votes)
🥈 *Runner-Up:* *${runnerName}* (${runnerPct}% • ${Math.min(c1Votes, c2Votes).toLocaleString()} votes)
📊 *Total Votes Cast:* ${total.toLocaleString()} votes

⚡ Every Vote Counts! Cast Yours Now:
👉 ${shareUrl}`,

    result: `🏆 *OFFICIAL RESULT OUT - Croex Voting Center* 🏆
Contest: *${poll.title}*

🎉 *WINNER DECLARED:* *${leaderName}*!
📈 Total Votes Won: *${Math.max(c1Votes, c2Votes).toLocaleString()}* (${leaderPct}%)
📊 Total Votes Cast: *${total.toLocaleString()}*

👉 View Official Result & Certified Winner:
${shareUrl}`,
  };

  const activeMessage = templates[template];

  const handleCopy = () => {
    navigator.clipboard.writeText(activeMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsApp = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(activeMessage)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 p-6 my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900">Share on WhatsApp</h3>
            <p className="text-xs text-slate-500">Pick an auto-formatted message template</p>
          </div>
        </div>

        {/* Template Selector Tabs */}
        <div className="mt-4 grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl">
          <button
            onClick={() => setTemplate('live')}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
              template === 'live' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Live Invite</span>
          </button>

          <button
            onClick={() => setTemplate('lead')}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
              template === 'lead' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>Live Lead</span>
          </button>

          <button
            onClick={() => setTemplate('result')}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
              template === 'result' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-indigo-500" />
            <span>Result Out</span>
          </button>
        </div>

        {/* Formatted Text Box */}
        <div className="mt-4 relative">
          <textarea
            readOnly
            value={activeMessage}
            rows={7}
            className="w-full p-3.5 bg-slate-900 text-slate-100 rounded-2xl font-mono text-xs leading-relaxed border border-slate-800 resize-none focus:outline-hidden selection:bg-emerald-500/30"
          />
        </div>

        {/* Buttons */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleSendWhatsApp}
            className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition active:scale-98"
          >
            <Share2 className="w-4 h-4" />
            <span>Open in WhatsApp</span>
          </button>

          <button
            onClick={handleCopy}
            className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition"
          >
            {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied!' : 'Copy Text'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
