import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Heart,
  Sparkles,
  Shield,
  Trash2,
  Users,
  Flame,
} from 'lucide-react';
import { Poll, CheerMessage, UserSession } from '../types';

interface LiveCheerWallProps {
  poll: Poll;
  currentUser: UserSession | null;
  isAdmin?: boolean;
}

export const LiveCheerWall: React.FC<LiveCheerWallProps> = ({
  poll,
  currentUser,
  isAdmin = false,
}) => {
  const [cheers, setCheers] = useState<CheerMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<1 | 2>(1);
  const [voterName, setVoterName] = useState('');
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});

  const storageKey = `croex_cheers_${poll.id}`;

  // Default initial starter cheers if empty
  const defaultCheers: CheerMessage[] = [
    {
      id: 'cheer_1',
      pollId: poll.id,
      voterName: 'Muhammad Hamza',
      candidateChoice: 1,
      message: `${poll.candidate1Name} zindabad! InshaAllah kamyabi hogi.`,
      city: 'Lahore',
      likes: 18,
      createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    },
    {
      id: 'cheer_2',
      pollId: poll.id,
      voterName: 'Ali Raza',
      candidateChoice: 2,
      message: `Full support to ${poll.candidate2Name}! Sachai aur imaandari ki jeet.`,
      city: 'Karachi',
      likes: 14,
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
    {
      id: 'cheer_3',
      pollId: poll.id,
      voterName: 'Usman Tariq',
      candidateChoice: 1,
      message: 'Best candidate for the future. Humara vote Alpha ko!',
      city: 'Islamabad',
      likes: 9,
      createdAt: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
    },
  ];

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setCheers(JSON.parse(saved));
      } else {
        setCheers(defaultCheers);
        localStorage.setItem(storageKey, JSON.stringify(defaultCheers));
      }
    } catch {
      setCheers(defaultCheers);
    }
  }, [poll.id]);

  const handlePostCheer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    const authorName =
      currentUser?.name ||
      voterName.trim() ||
      localStorage.getItem('mvc_voter_name') ||
      `Voter-${Math.floor(100 + Math.random() * 900)}`;

    const newCheer: CheerMessage = {
      id: `cheer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      pollId: poll.id,
      voterName: authorName,
      candidateChoice: selectedCandidate,
      message: messageInput.trim(),
      city: currentUser?.city || 'Pakistan',
      likes: 1,
      createdAt: new Date().toISOString(),
    };

    const updated = [newCheer, ...cheers];
    setCheers(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {}

    setMessageInput('');
  };

  const handleLikeCheer = (id: string) => {
    if (likedMap[id]) return;
    setLikedMap((prev) => ({ ...prev, [id]: true }));

    const updated = cheers.map((c) => (c.id === id ? { ...c, likes: c.likes + 1 } : c));
    setCheers(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {}
  };

  const handleDeleteCheer = (id: string) => {
    const updated = cheers.filter((c) => c.id !== id);
    setCheers(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {}
  };

  const quickChips = [
    'Zindabad! 🎉',
    'Full Support! 💯',
    'Future Leader! 👑',
    'Clean & Honest 🛡️',
    'Best Candidate ⭐',
  ];

  return (
    <div className="mt-5 bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900">Live Voter Cheer Wall</h3>
            <p className="text-[11px] text-slate-500">Public support & slogans in real-time</p>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
          {cheers.length} Cheers
        </span>
      </div>

      {/* Cheer Input Form */}
      <form onSubmit={handlePostCheer} className="mt-3 space-y-2">
        {/* Choose Candidate to Support */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-600 shrink-0">Cheering for:</span>
          <div className="flex gap-1.5 flex-1">
            <button
              type="button"
              onClick={() => setSelectedCandidate(1)}
              className={`flex-1 py-1 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                selectedCandidate === 1
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-300" />
              <span className="truncate">{poll.candidate1Name}</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedCandidate(2)}
              className={`flex-1 py-1 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                selectedCandidate === 2
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-indigo-300" />
              <span className="truncate">{poll.candidate2Name}</span>
            </button>
          </div>
        </div>

        {/* Quick Slogan Chips */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {quickChips.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => setMessageInput(chip)}
              className="text-[10px] font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg text-slate-700 shrink-0 transition"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Text Input & Submit */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={`Leave a cheer for ${selectedCandidate === 1 ? poll.candidate1Name : poll.candidate2Name}...`}
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <button
            type="submit"
            disabled={!messageInput.trim()}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-slate-950 font-black text-xs flex items-center gap-1 shadow-xs transition"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Post</span>
          </button>
        </div>
      </form>

      {/* Cheer Feed */}
      <div className="mt-3.5 space-y-2 max-h-60 overflow-y-auto pr-1">
        {cheers.map((cheer) => {
          const isCandidate1 = cheer.candidateChoice === 1;
          const isLiked = likedMap[cheer.id];

          return (
            <div
              key={cheer.id}
              className={`p-2.5 rounded-2xl border text-xs transition ${
                isCandidate1
                  ? 'bg-emerald-50/40 border-emerald-100'
                  : 'bg-indigo-50/40 border-indigo-100'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={`px-1.5 py-0.2 rounded-md font-black text-[9px] uppercase ${
                      isCandidate1 ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white'
                    }`}
                  >
                    {isCandidate1 ? 'A' : 'B'}
                  </span>
                  <span className="font-bold text-slate-800 truncate">{cheer.voterName}</span>
                  {cheer.city && (
                    <span className="text-[10px] text-slate-400">({cheer.city})</span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleLikeCheer(cheer.id)}
                    className={`flex items-center gap-1 text-[11px] font-semibold transition ${
                      isLiked ? 'text-rose-600 font-bold' : 'text-slate-400 hover:text-rose-500'
                    }`}
                  >
                    <Heart className={`w-3 h-3 ${isLiked ? 'fill-rose-600 text-rose-600' : ''}`} />
                    <span>{cheer.likes}</span>
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteCheer(cheer.id)}
                      className="text-slate-300 hover:text-rose-600 p-0.5 transition"
                      title="Admin: Delete Comment"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              <p className="text-slate-700 font-medium leading-relaxed pl-5">{cheer.message}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
