import React from 'react';
import {
  CheckSquare,
  Vote,
  Share2,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  Clock,
  Layers,
  MessageSquare,
} from 'lucide-react';
import { Poll, UserSession } from '../types';
import { generatePollShareUrls } from '../utils/urlHelper';
import { formatPollSmsMessage, getSmsIntentUrl } from '../utils/shortUrlHelper';
import { calculateTimeRemaining } from './CountdownTimer';
import { isVotingEnded, isPostResultExpired } from '../utils/pollExpiry';

interface MyActivityViewProps {
  polls: Poll[];
  userVotedMap: Record<string, number>;
  currentUser: UserSession | null;
  onOpenVotePage: (pollId: string) => void;
  onSwitchToCreate: () => void;
}

export const MyActivityView: React.FC<MyActivityViewProps> = ({
  polls,
  userVotedMap,
  currentUser,
  onOpenVotePage,
  onSwitchToCreate,
}) => {
  const [copyMap, setCopyMap] = React.useState<Record<string, boolean>>({});

  const handleCopy = (pollId: string, title: string) => {
    const { shareUrl } = generatePollShareUrls(pollId, title);
    navigator.clipboard.writeText(shareUrl);
    setCopyMap((prev) => ({ ...prev, [pollId]: true }));
    setTimeout(() => {
      setCopyMap((prev) => ({ ...prev, [pollId]: false }));
    }, 2000);
  };

  // Polls the user has cast a vote in
  const votedPolls = polls.filter((p) => userVotedMap[p.id]);

  // Polls created strictly by this user
  const createdByMe = polls.filter((p) => {
    if (!currentUser) return false;
    const myEmail = (currentUser.email || '').toLowerCase().trim();
    const myId = currentUser.id || '';
    const myName = (currentUser.name || '').toLowerCase().trim();

    return Boolean(
      (p.creatorEmail && p.creatorEmail.toLowerCase().trim() === myEmail) ||
      (p.creatorId && p.creatorId === myId) ||
      (p.createdBy && p.createdBy.toLowerCase().trim() === myName)
    );
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-8">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              My Voting Activity
            </h2>
            <p className="text-xs text-slate-500">
              Review contests you have participated in and contests you created.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl">
            Votes Cast: <strong className="text-indigo-600">{Object.keys(userVotedMap).length}</strong>
          </span>
        </div>
      </div>

      {/* Contests Voted In */}
      <div className="space-y-4">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <Vote className="w-4 h-4 text-indigo-600" />
          <span>Contests You Voted In ({votedPolls.length})</span>
        </h3>

        {votedPolls.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
            <p className="text-sm text-slate-500">
              You haven't cast any votes yet. Explore live contests to vote!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {votedPolls.map((poll) => {
              const myChoice = userVotedMap[poll.id];
              const chosenCandidateName =
                myChoice === 1 ? poll.candidate1Name : poll.candidate2Name;
              const timeState = calculateTimeRemaining(poll.expiresAt);

              return (
                <div
                  key={poll.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-bold text-slate-500">{poll.category}</span>
                      <span
                        className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                          isPostResultExpired(poll)
                            ? 'bg-slate-100 text-slate-700 border border-slate-200'
                            : isVotingEnded(poll)
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {isPostResultExpired(poll)
                          ? '📜 In History'
                          : isVotingEnded(poll)
                          ? '🏆 Results Out'
                          : 'Live Active'}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-slate-900 mb-2">{poll.title}</h4>

                    <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-900 font-semibold mb-3">
                      ✓ Your Vote: <strong>{chosenCandidateName}</strong>
                    </div>
                  </div>

                  <button
                    onClick={() => onOpenVotePage(poll.id)}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                  >
                    <span>View Live Standings</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Contests Created by User */}
      <div className="space-y-4">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600" />
          <span>Contests Created By You ({createdByMe.length})</span>
        </h3>

        {createdByMe.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
            <p className="text-sm text-slate-500 mb-3">
              You haven't created any contests yet. You can launch one with your gallery photos!
            </p>
            <button
              onClick={onSwitchToCreate}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              Create a Contest
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {createdByMe.map((poll) => {
              const { shareUrl, whatsappUrl } = generatePollShareUrls(poll.id, poll.title);
              const total = poll.candidate1Votes + poll.candidate2Votes;

              return (
                <div
                  key={poll.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block mb-1">
                      Total Votes: {total}
                    </span>
                    <h4 className="text-base font-bold text-slate-900 mb-3">{poll.title}</h4>
                    <p className="text-xs text-slate-500 mb-4 line-clamp-1">
                      {poll.candidate1Name} vs {poll.candidate2Name}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleCopy(poll.id, poll.title)}
                      className="flex-1 py-2 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1"
                    >
                      {copyMap[poll.id] ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copyMap[poll.id] ? 'Copied' : 'Copy'}</span>
                    </button>

                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>

                    <button
                      onClick={() => onOpenVotePage(poll.id)}
                      className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl transition"
                      title="View"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
