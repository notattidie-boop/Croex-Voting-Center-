import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Vote as VoteIcon,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  AlertCircle,
  Trophy,
  ShieldCheck,
  MessageCircle,
  Flame,
  ArrowLeft,
  User,
  Lock,
  Award,
  FileCheck,
  Volume2,
  X,
  MessageSquare,
  Bell,
  BellRing,
} from 'lucide-react';
import { Poll, UserSession, ContestInsightResult } from '../types';
import { fetchPollInsights } from '../services/intelligenceService';
import {
  getNotificationSupport,
  getNotificationPermission,
  requestNotificationPermission,
  sendPushNotification,
} from '../services/notificationService';

import { CroexLogo } from './CroexLogo';
import {
  castVote,
  checkIfUserHasVoted,
  subscribeToSinglePoll,
  savePollShortUrl,
  INITIAL_DEMO_POLLS,
} from '../services/pollService';
import { CountdownTimer, calculateTimeRemaining } from './CountdownTimer';
import { GreenProgressBar } from './GreenProgressBar';
import { generatePollShareUrls, getEmbeddedPollDataFromUrl, getCachedShortUrl } from '../utils/urlHelper';
import {
  formatPollWhatsAppMessage,
  formatPollSmsMessage,
  getSmsIntentUrl,
  getOrGenerateShortUrl,
} from '../utils/shortUrlHelper';
import {
  isVotingEnded,
  isPostResultExpired,
  calculateGraceRemaining,
} from '../utils/pollExpiry';
import { ResultCertificateModal } from './ResultCertificateModal';
import { VoterReceiptModal } from './VoterReceiptModal';
import { WhatsAppShareModal } from './WhatsAppShareModal';
import { LiveActivityTicker } from './LiveActivityTicker';
import { soundFx, fireCroexConfetti } from '../utils/audioConfetti';
import { LiveCheerWall } from './LiveCheerWall';
import { CityVoteBreakdown } from './CityVoteBreakdown';

interface StandaloneVoteViewProps {
  pollId: string;
  initialPoll?: Poll | null;
  currentUser: UserSession | null;
  onOpenAuth: () => void;
  onBackToPortal: () => void;
}

export const StandaloneVoteView: React.FC<StandaloneVoteViewProps> = ({
  pollId,
  initialPoll,
  currentUser,
  onOpenAuth,
  onBackToPortal,
}) => {
  // 0s Instantaneous Initialization: Check props -> Embedded URL Payload -> Local Cache -> Initial Demo
  const [poll, setPoll] = useState<Poll | null>(() => {
    if (initialPoll) return initialPoll;
    const embedded = getEmbeddedPollDataFromUrl(pollId);
    if (embedded) return embedded;
    try {
      const cached = localStorage.getItem(`mvc_poll_${pollId}`);
      if (cached) return JSON.parse(cached);
    } catch {}
    const demoMatch = INITIAL_DEMO_POLLS.find((p) => p.id === pollId);
    if (demoMatch) return demoMatch as Poll;
    return null;
  });

  const [loading, setLoading] = useState<boolean>(!poll);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [userVotedChoice, setUserVotedChoice] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [voterNameInput, setVoterNameInput] = useState<string>('');
  const [showNameModal, setShowNameModal] = useState<boolean>(false);
  const [pendingChoice, setPendingChoice] = useState<1 | 2 | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);
  const [showCertModal, setShowCertModal] = useState<boolean>(false);
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState<boolean>(false);
  const [voteSuccessBanner, setVoteSuccessBanner] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<1 | 2 | null>(null);
  const [voterCity, setVoterCity] = useState<string>(() => currentUser?.city || 'Lahore');
  const [insights, setInsights] = useState<ContestInsightResult | null>(null);
  const [loadingInsights, setLoadingInsights] = useState<boolean>(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(() => getNotificationPermission());
  const [, setTick] = useState<number>(0);

  // Fetch AI Insights (Momentum Analysis)
  useEffect(() => {
    if (poll && !insights && !loadingInsights) {
      setLoadingInsights(true);
      fetchPollInsights(poll).then((data) => {
        setInsights(data);
        setLoadingInsights(false);
      });
    }
  }, [poll?.id, poll?.candidate1Votes, poll?.candidate2Votes]);

  // 1-second live ticker for expiration & grace window calculation
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getEffectiveVoterId = (): string => {
    if (currentUser?.id) return currentUser.id;
    let localVoterId = localStorage.getItem('mvc_voter_device_id');
    if (!localVoterId) {
      localVoterId = 'voter_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      localStorage.setItem('mvc_voter_device_id', localVoterId);
    }
    return localVoterId;
  };

  useEffect(() => {
    let isMounted = true;
    if (!poll) {
      setLoading(true);
    }

    // 1. Maintain a single, continuous stream listener - never tear down every 2.5s
    const unsubscribe = subscribeToSinglePoll(
      pollId,
      (updatedPoll) => {
        if (!isMounted) return;
        if (updatedPoll) {
          setPoll(updatedPoll);
          setLoading(false);
          setNotFound(false);
        }
      },
      () => {
        // Network warning - keep stream alive
      }
    );

    // 2. Fallback check for local storage / embedded / demo after 8 seconds
    const fallbackTimer = setTimeout(() => {
      if (!isMounted) return;
      setPoll((current) => {
        if (current) return current;
        try {
          const cached = localStorage.getItem(`mvc_poll_${pollId}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed) {
              setLoading(false);
              setNotFound(false);
              return parsed;
            }
          }
        } catch {}
        const demo = INITIAL_DEMO_POLLS.find((p) => p.id === pollId);
        if (demo) {
          setLoading(false);
          setNotFound(false);
          return demo as Poll;
        }
        return null;
      });
    }, 8000);

    // 3. Generous 40-second timeout before displaying not found on slow 3G/4G connections
    const notFoundTimer = setTimeout(() => {
      if (!isMounted) return;
      setPoll((current) => {
        if (!current) {
          setNotFound(true);
          setLoading(false);
        }
        return current;
      });
    }, 40000);

    return () => {
      isMounted = false;
      clearTimeout(fallbackTimer);
      clearTimeout(notFoundTimer);
      unsubscribe();
    };
  }, [pollId]);

  useEffect(() => {
    // 1. Instant synchronous check from device storage
    if (typeof localStorage !== 'undefined') {
      const localVote = localStorage.getItem(`mvc_poll_voted_${pollId}`);
      if (localVote) {
        setUserVotedChoice(Number(localVote));
      }
    }
    const voterId = getEffectiveVoterId();
    checkIfUserHasVoted(pollId, voterId, currentUser?.email).then((choice) => {
      if (choice) {
        setUserVotedChoice(choice);
      }
    });
  }, [pollId, currentUser]);

  const timeRemaining = poll ? calculateTimeRemaining(poll.expiresAt) : { isExpired: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  const isExpired = poll ? (timeRemaining.isExpired || poll.status === 'expired' || poll.status === 'closed' || poll.status === 'archived') : false;
  const isLinkFullyExpired = poll ? isPostResultExpired(poll) : false;
  const graceRemaining = poll ? calculateGraceRemaining(poll.expiresAt) : { isExpired: true, formatted: '00:00:00', hours: 0, minutes: 0, seconds: 0 };

  const total = poll ? poll.candidate1Votes + poll.candidate2Votes : 0;
  const c1Percent = total > 0 && poll ? Math.round((poll.candidate1Votes / total) * 100) : 50;
  const c2Percent = total > 0 ? 100 - c1Percent : 50;

  const candidate1Winning = poll ? poll.candidate1Votes > poll.candidate2Votes : false;
  const candidate2Winning = poll ? poll.candidate2Votes > poll.candidate1Votes : false;

  // Clean Share URL state without 'ais-'
  const [cleanShareUrl, setCleanShareUrl] = useState<string>(() => {
    if (poll?.shortUrl && !poll.shortUrl.includes('ais-') && poll.shortUrl.startsWith('http')) {
      return poll.shortUrl;
    }
    const cached = getCachedShortUrl(pollId);
    if (cached) return cached;
    return poll ? generatePollShareUrls(poll.id, poll.title, poll).shareUrl : '';
  });

  useEffect(() => {
    if (poll) {
      if (poll.shortUrl && !poll.shortUrl.includes('ais-')) {
        setCleanShareUrl(poll.shortUrl);
        return;
      }
      getOrGenerateShortUrl(poll.id, poll.title, poll.shortUrl, poll).then((clean) => {
        if (clean && !clean.includes('ais-')) {
          setCleanShareUrl(clean);
          savePollShortUrl(poll.id, clean);
        }
      });
    }
  }, [poll?.id, poll?.shortUrl, poll?.title]);

  const effectiveShareUrl = cleanShareUrl || (poll?.shortUrl && !poll.shortUrl.includes('ais-') ? poll.shortUrl : generatePollShareUrls(poll?.id || pollId, poll?.title || 'Contest', poll || undefined).shareUrl);

  const whatsappShareText = poll ? formatPollWhatsAppMessage(poll.title, effectiveShareUrl, poll.id) : '';
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappShareText)}`;

  const smsShareText = poll ? formatPollSmsMessage(poll.title, effectiveShareUrl, poll.id) : '';
  const smsUrl = getSmsIntentUrl(smsShareText);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(effectiveShareUrl);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleVoteClick = (choice: 1 | 2) => {
    const localVote = typeof localStorage !== 'undefined' ? localStorage.getItem(`mvc_poll_voted_${pollId}`) : null;
    if (userVotedChoice || localVote) {
      setErrorMessage('Aap pehle hi is poll mai vote de chuke hain! Aik user sirf aik vote cast kar sakta hai.');
      return;
    }

    if (isExpired) {
      setErrorMessage('Voting ka waqt khatam ho chuka hai! Live results neeche mojood hain.');
      return;
    }

    const storedName = localStorage.getItem('mvc_voter_name');
    const effectiveName =
      currentUser?.name || voterNameInput?.trim() || storedName || `Voter-${Math.floor(1000 + Math.random() * 9000)}`;

    executeVote(choice, effectiveName);
  };

  const executeVote = (choice: 1 | 2, voterName: string) => {
    if (isSubmitting || userVotedChoice) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    setShowNameModal(false);
    setPendingChoice(null);

    // 1. INSTANT 0ms OPTIMISTIC UPDATE:
    // User sees their vote registered and tallies incremented with ZERO latency!
    setUserVotedChoice(choice);

    setPoll((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        candidate1Votes: choice === 1 ? prev.candidate1Votes + 1 : prev.candidate1Votes,
        candidate2Votes: choice === 2 ? prev.candidate2Votes + 1 : prev.candidate2Votes,
        totalVotes: prev.totalVotes + 1,
      };
      try {
        localStorage.setItem(`mvc_poll_${pollId}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setVoteSuccessBanner('✓ Shukriya! Aapka certified vote kamyabi se record ho gaya hai!');
    soundFx.playVoteDing();
    fireCroexConfetti();
    setShowReceiptModal(true);

    // Send immediate push notification to device status bar
    const candName = choice === 1 ? poll?.candidate1Name : poll?.candidate2Name;
    sendPushNotification({
      title: '🗳️ آپ کا ووٹ درج ہو گیا! (Vote Recorded)',
      body: `آپ کا ووٹ "${candName}" کے لیے کامیابی سے درج کر لیا گیا ہے۔`,
      icon: '/croex-logo-hd.png',
    });

    // 2. BACKGROUND RELIABLE SYNC:
    // Fires atomic write to Firestore and broadcast channel so creator's dashboard updates immediately!
    const voterId = getEffectiveVoterId();
    castVote(pollId, voterId, voterName, choice, currentUser?.email)
      .then((result) => {
        if (!result.success) {
          setErrorMessage(result.message);
          setUserVotedChoice(null);
        } else {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(`mvc_poll_voted_${pollId}`, String(choice));
          }
          if (result.isOffline) {
            setVoteSuccessBanner(
              '✓ Aapka vote baghir internet (offline) darj ho gaya hai! (Internet aate hi automatic sync ho jayega)'
            );
          }
        }
      })
      .catch((err) => {
        console.warn('Background vote sync notice:', err);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = voterNameInput.trim() || 'Voter';
    localStorage.setItem('mvc_voter_name', finalName);
    if (pendingChoice) {
      executeVote(pendingChoice, finalName);
    }
  };

  if (!poll) {
    if (notFound) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
          <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center mb-3">
            <AlertCircle className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-black text-slate-900">Contest Not Found</h2>
          <p className="text-slate-600 max-w-sm mt-1 text-xs">
            This voting link may be invalid or has expired.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={() => {
                setLoading(true);
                setNotFound(false);
                subscribeToSinglePoll(pollId, (p) => {
                  if (p) {
                    setPoll(p);
                    setLoading(false);
                    setNotFound(false);
                  }
                });
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#C4932C] hover:bg-[#AC7E1F] text-white rounded-xl font-bold text-xs shadow-xs transition active:scale-95"
            >
              <span>🔄 Retry Loading</span>
            </button>
            <button
              onClick={onBackToPortal}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs shadow-xs transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{currentUser ? 'Go to Dashboard' : 'Open Portal'}</span>
            </button>
          </div>
        </div>
      );
    }

    // Snappy instantaneous voting layout skeleton (<0.2s)
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between py-4 px-3 sm:px-6 font-sans">
        <div className="max-w-xl mx-auto w-full">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs mb-4">
            <div className="flex items-center gap-2.5">
              <CroexLogo size={32} />
              <div>
                <h1 className="text-xs sm:text-sm font-black text-slate-900 leading-tight">Croex Voting Center</h1>
                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  Voting Screen Opening Fast (Live)...
                </span>
              </div>
            </div>
            <div className="h-6 w-20 bg-slate-100 rounded-full animate-pulse"></div>
          </div>

          {/* Voting Box Skeleton */}
          <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-xs mb-4">
            <div className="h-5 bg-slate-200 rounded-lg w-2/3 mb-2 animate-pulse"></div>
            <div className="h-3 bg-slate-100 rounded w-1/3 mb-4 animate-pulse"></div>
            
            {/* 2 Candidate Skeletons */}
            <div className="relative my-3">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="flex flex-col items-center">
                  <div className="w-full h-32 sm:h-44 rounded-xl bg-slate-200 animate-pulse mb-2"></div>
                  <div className="h-3.5 w-24 bg-slate-200 rounded mb-2 animate-pulse"></div>
                  <div className="w-full py-2.5 bg-emerald-500/20 text-emerald-700 text-xs font-bold rounded-xl text-center">
                    Vote Candidate A
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-full h-32 sm:h-44 rounded-xl bg-slate-200 animate-pulse mb-2"></div>
                  <div className="h-3.5 w-24 bg-slate-200 rounded mb-2 animate-pulse"></div>
                  <div className="w-full py-2.5 bg-indigo-500/20 text-indigo-700 text-xs font-bold rounded-xl text-center">
                    Vote Candidate B
                  </div>
                </div>
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900 text-white font-black text-[10px] flex items-center justify-center border-2 border-white shadow-md">
                VS
              </div>
            </div>

            <div className="w-full h-2.5 bg-slate-100 rounded-full my-3 animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  // 1. LINK EXPIRED STATE: 5 Hours have passed since voting finished!
  // "result anay ky baad wu poll 5 hours baad khud ba khud delete hu jye dashboard syy aur link 5 hours baad expire hu gey .. Baki history mai rhyy"
  if (poll && isLinkFullyExpired) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between py-6 px-3 sm:px-6 font-sans">
        <header className="max-w-xl mx-auto w-full mb-4 flex items-center justify-between bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <CroexLogo size={32} />
            <div>
              <h1 className="text-xs sm:text-sm font-black text-slate-900 leading-none">
                Croex Voting Center
              </h1>
              <span className="text-[10px] text-amber-600 font-bold">
                Hanzla Croex Technology
              </span>
            </div>
          </div>

          <button
            onClick={onBackToPortal}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard / History</span>
          </button>
        </header>

        <main className="max-w-xl mx-auto w-full flex-1 flex flex-col justify-center">
          <div className="bg-white border border-rose-200 rounded-3xl p-6 sm:p-8 shadow-sm text-center relative overflow-hidden">
            <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-rose-100">
              <Clock className="w-7 h-7" />
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-rose-50 text-rose-700 border border-rose-200 uppercase tracking-wider mb-3">
              ⛔ Link Expired (5 Hours Completed)
            </span>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-2">
              {poll.title}
            </h2>

            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-5 leading-relaxed">
              Is voting contest ka result anay ke baad <strong>5 ghante mukammal</strong> ho chuke hain, is liye yeh voting link ab expire ho chuka hai. Contest ka record <strong>History</strong> mai mehfooz hai.
            </p>

            {/* Winner Box */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl mb-5 text-center">
              <div className="w-8 h-8 bg-amber-500 text-white rounded-xl flex items-center justify-center mx-auto mb-2 shadow-xs">
                <Trophy className="w-4 h-4" />
              </div>
              <h3 className="text-base font-black text-amber-950">
                {candidate1Winning
                  ? `🏆 Fatah (Winner): ${poll.candidate1Name}!`
                  : candidate2Winning
                  ? `🏆 Fatah (Winner): ${poll.candidate2Name}!`
                  : '🤝 Contest Ended in a Tie!'}
              </h3>
              <p className="text-xs font-mono font-bold text-amber-800 mt-1">
                Total Cast Votes: {total} votes ({poll.candidate1Votes} vs {poll.candidate2Votes})
              </p>
            </div>

            {/* Candidate Summary */}
            <div className="grid grid-cols-2 gap-3 mb-6 text-left">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 rounded bg-emerald-600 text-white font-black text-[10px] flex items-center justify-center">
                    A
                  </span>
                  <span className="text-xs font-black text-slate-800 truncate">{poll.candidate1Name}</span>
                </div>
                <span className="text-base font-black font-mono text-emerald-700 block">{poll.candidate1Votes} votes</span>
                <span className="text-[10px] font-bold text-slate-400">{c1Percent}% share</span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 rounded bg-indigo-600 text-white font-black text-[10px] flex items-center justify-center">
                    B
                  </span>
                  <span className="text-xs font-black text-slate-800 truncate">{poll.candidate2Name}</span>
                </div>
                <span className="text-base font-black font-mono text-indigo-700 block">{poll.candidate2Votes} votes</span>
                <span className="text-[10px] font-bold text-slate-400">{c2Percent}% share</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 mb-5 flex items-center justify-center gap-2">
              <span>📌</span>
              <span>Yeh poll dashboard se auto-delete ho chuka hai aur <strong>History</strong> mai save hai.</span>
            </div>

            {/* Official Result Slip Download Button for Shared Link Visitors */}
            <button
              type="button"
              onClick={() => setShowCertModal(true)}
              className="w-full mb-3 py-2.5 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white text-xs font-black rounded-xl shadow-md transition flex items-center justify-center gap-2"
            >
              <Award className="w-4 h-4" />
              <span>Download Official Result Slip / Certificate (PDF & Photo)</span>
            </button>

            <button
              onClick={onBackToPortal}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Go to Dashboard / View Contest History</span>
            </button>
          </div>
        </main>

        {/* Official Result Certificate Modal inside expired screen */}
        {showCertModal && (
          <ResultCertificateModal poll={poll} onClose={() => setShowCertModal(false)} />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between py-4 px-3 sm:px-6 font-sans">
      {/* Top Header - Compact */}
      <header className="max-w-xl mx-auto w-full mb-3 flex items-center justify-between bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <CroexLogo size={32} />
          <div>
            <h1 className="text-xs sm:text-sm font-black text-slate-900 leading-none">
              Croex Voting Center
            </h1>
            <span className="text-[10px] text-amber-600 font-bold">
              Official Live Contest
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onBackToPortal}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>{!currentUser ? 'Portal / Home' : isExpired ? 'Back' : 'Dashboard'}</span>
          </button>

          {/* User Requested: Small 'X' Cut Button to easily return from page */}
          <button
            onClick={onBackToPortal}
            className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 flex items-center justify-center transition shadow-2xs active:scale-95"
            title={!currentUser ? 'Portal / Home' : 'Close / Exit Page'}
            aria-label="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Single Isolated Contest Arena - Compact */}
      <main className="max-w-xl mx-auto w-full flex-1 flex flex-col justify-center">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          
          {/* Top Status Bar: Clean status badge + total votes, with right-side X cut */}
          <div className="bg-slate-50/80 border-b border-slate-100 px-4 py-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black ${
                isExpired
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                <span className={`w-2 h-2 rounded-full ${isExpired ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
                {isExpired ? 'Result Out' : 'Live Voting Active'}
              </span>
              <span className="text-[11px] font-mono font-bold text-slate-500">
                {total} Votes
              </span>
            </div>

            {/* Quick Cut 'X' button on status bar */}
            <button
              onClick={onBackToPortal}
              className="w-6 h-6 rounded-md bg-slate-200/70 hover:bg-rose-100 text-slate-600 hover:text-rose-600 flex items-center justify-center transition"
              title="Close"
              aria-label="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Title & Info */}
          <div className="p-4 sm:p-5 text-center border-b border-slate-100">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-snug">
              {poll.title}
            </h2>

            {poll.description && (
              <p className="mt-2 text-xs sm:text-sm text-slate-600 font-medium leading-relaxed whitespace-pre-line px-2">
                {poll.description}
              </p>
            )}

            {/* Feature 5: Real-Time Live Activity & Security Momentum Ticker */}
            <LiveActivityTicker poll={poll} className="mt-3 text-left" />

            {/* Momentum Analysis (AI Powered) */}
            {/* Momentum Analysis (AI & Certified Election Analytics) */}
            {(insights || isExpired) && (
              <div
                className={`mt-4 p-4 rounded-2xl relative overflow-hidden group transition-all ${
                  isExpired
                    ? 'bg-gradient-to-br from-amber-50 via-amber-50/60 to-emerald-50/40 border-2 border-amber-300 shadow-sm'
                    : 'bg-indigo-50/50 border border-indigo-100'
                }`}
              >
                <div className="absolute top-0 right-0 p-3 opacity-15 group-hover:opacity-25 transition-opacity">
                  {isExpired ? (
                    <Trophy className="w-14 h-14 text-amber-600" />
                  ) : (
                    <Flame className="w-12 h-12 text-indigo-600" />
                  )}
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    {isExpired ? (
                      <>
                        <Trophy className="w-3.5 h-3.5 text-amber-600" />
                        <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">
                          🏆 Official Contest Result • فاتح کا باقاعدہ اعلان
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                          Live Momentum Analysis
                        </span>
                      </>
                    )}
                  </div>

                  {isExpired ? (
                    /* WINNER ANNOUNCEMENT WHEN VOTING HAS ENDED */
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight">
                          {poll.candidate1Votes === poll.candidate2Votes
                            ? '🤝 مقابلہ برابر (Tie) رہا!'
                            : `🏆 ${
                                poll.candidate1Votes > poll.candidate2Votes
                                  ? poll.candidate1Name
                                  : poll.candidate2Name
                              } Jeet Gya Hai! (Winner)`}
                        </h3>
                      </div>

                      {/* Prominent 'Voting Closed' Badge requested by user */}
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-100/90 text-rose-800 border border-rose-200 text-[11px] font-black shadow-2xs">
                        <Lock className="w-3 h-3 text-rose-600" />
                        <span>Ab vote lagna band ho chuka hai (Voting is Closed)</span>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <p className="text-xs font-bold text-slate-800 leading-relaxed UrduText">
                          {insights?.analysisUrdu ||
                            (poll.candidate1Votes !== poll.candidate2Votes
                              ? `${
                                  poll.candidate1Votes > poll.candidate2Votes
                                    ? poll.candidate1Name
                                    : poll.candidate2Name
                                } نے کل ${Math.max(
                                  poll.candidate1Votes,
                                  poll.candidate2Votes
                                ).toLocaleString()} ووٹ حاصل کر کے شاندار فتح حاصل کی۔ ووٹنگ کا وقت ختم ہو چکا ہے اور اب مزید ووٹ لگنا بند ہو گئے ہیں!`
                              : 'دونوں امیدواروں کے درمیان ووٹنگ کا مقابلہ برابر رہا۔ باضابطہ ووٹنگ اب بند ہو چکی ہے۔')}
                        </p>
                        <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                          {insights?.analysisEn ||
                            (poll.candidate1Votes !== poll.candidate2Votes
                              ? `Official Winner: ${
                                  poll.candidate1Votes > poll.candidate2Votes
                                    ? poll.candidate1Name
                                    : poll.candidate2Name
                                } won with ${Math.max(
                                  poll.candidate1Votes,
                                  poll.candidate2Votes
                                ).toLocaleString()} certified votes. Vote casting is now officially closed.`
                              : 'The contest concluded in an official tie. Voting is closed.')}
                        </p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-amber-200/80 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5">
                          <div className="px-2.5 py-1 rounded-md bg-amber-500 text-white text-[10px] font-black shadow-2xs flex items-center gap-1">
                            <Award className="w-3 h-3" />
                            <span>
                              {poll.candidate1Votes === poll.candidate2Votes
                                ? 'TIE RESULT'
                                : `WINNER: ${
                                    poll.candidate1Votes > poll.candidate2Votes
                                      ? poll.candidate1Name.toUpperCase()
                                      : poll.candidate2Name.toUpperCase()
                                  }`}
                            </span>
                          </div>
                        </div>
                        <div className="text-[11px] font-black text-amber-800 UrduText text-right">
                          {insights?.keyTakeawayUrdu || 'ووٹنگ مکمل، باضابطہ فاتح کا اعلان'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* LIVE CONTEST MOMENTUM ANALYSIS */
                    <div>
                      {poll.candidate1Votes !== poll.candidate2Votes && (
                        <div className="mb-2">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500 text-white text-[11px] font-black shadow-2xs">
                            <Trophy className="w-3.5 h-3.5" />
                            <span>
                              {poll.candidate1Votes > poll.candidate2Votes
                                ? `🏆 ${poll.candidate1Name} Jeet Raha Hai! (Leading)`
                                : `🏆 ${poll.candidate2Name} Jeet Raha Hai! (Leading)`}
                            </span>
                          </span>
                        </div>
                      )}
                      <h3 className="text-sm sm:text-base font-black text-slate-900 mb-1 leading-tight UrduText">
                        {insights?.headlineUrdu || (
                          poll.candidate1Votes !== poll.candidate2Votes
                            ? `🏆 ${poll.candidate1Votes > poll.candidate2Votes ? poll.candidate1Name : poll.candidate2Name} جیت رہا ہے!`
                            : 'سخت کانٹے دار مقابلہ: دونوں امیدوار برابر ہیں!'
                        )}
                      </h3>
                      <p className="text-[10px] font-bold text-slate-500 italic mb-2 leading-tight">
                        {insights?.headlineEn || (
                          poll.candidate1Votes !== poll.candidate2Votes
                            ? `🏆 ${poll.candidate1Votes > poll.candidate2Votes ? poll.candidate1Name : poll.candidate2Name} is currently leading!`
                            : 'Neck-and-neck tie contest'
                        )}
                      </p>
                      <div className="space-y-1.5">
                        <p className="text-xs text-slate-800 leading-relaxed UrduText font-bold">
                          {insights?.analysisUrdu || (
                            poll.candidate1Votes !== poll.candidate2Votes
                              ? `اس وقت تمام تر لائیو مومینٹم ${poll.candidate1Votes > poll.candidate2Votes ? poll.candidate1Name : poll.candidate2Name} کے حق میں ہے جنہوں نے کل ${Math.max(poll.candidate1Votes, poll.candidate2Votes).toLocaleString()} تصدیق شدہ ووٹس حاصل کر کے برتری قائم کر رکھی ہے!`
                              : 'دونوں امیدواروں کے درمیان زبردست مقابلہ جاری ہے۔ اپنا قیمتی ووٹ ڈال کر اپنے امیدوار کو برتری دلائیں۔'
                          )}
                        </p>
                        <p className="text-[10px] text-slate-600 leading-relaxed font-medium">
                          {insights?.analysisEn || (
                            poll.candidate1Votes !== poll.candidate2Votes
                              ? `${poll.candidate1Votes > poll.candidate2Votes ? poll.candidate1Name : poll.candidate2Name} is currently leading with ${Math.max(poll.candidate1Votes, poll.candidate2Votes).toLocaleString()} certified votes.`
                              : 'Both candidates are tied. Certified votes are being counted in real-time.'
                          )}
                        </p>
                      </div>
                      <div className="mt-3 pt-3 border-t border-indigo-100 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5">
                          <div className="px-2 py-0.5 rounded-md bg-white border border-indigo-100 text-[10px] font-black text-indigo-700">
                            {poll.candidate1Votes !== poll.candidate2Votes ? 'LEADING' : 'TIED'}
                          </div>
                          <span className="text-[10px] font-bold text-slate-400">Live Status</span>
                        </div>
                        <div className="text-[11px] font-black text-indigo-700 UrduText text-right">
                          {insights?.keyTakeawayUrdu || (
                            poll.candidate1Votes !== poll.candidate2Votes
                              ? `🏆 ${poll.candidate1Votes > poll.candidate2Votes ? poll.candidate1Name : poll.candidate2Name} کی برتری برقرار!`
                              : 'اپنا ووٹ دیں اور برتری قائم کریں'
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Official Share / Invite Link & WhatsApp Bar */}
            <div className="mt-2.5 p-2 bg-slate-50 border border-slate-200/90 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-2 text-left">
              <div className="flex items-center gap-1.5 min-w-0 w-full sm:w-auto flex-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="text-[11px] font-mono font-bold text-slate-700 truncate select-all block">
                  {effectiveShareUrl}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold flex items-center justify-center gap-1 shadow-2xs transition active:scale-95"
                  title="Copy Direct Link"
                >
                  {copyFeedback ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copyFeedback ? 'Copied!' : 'Copy Link'}</span>
                </button>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-2xs transition active:scale-95"
                  title="Share on WhatsApp"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
                <a
                  href={smsUrl}
                  className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-2xs transition active:scale-95"
                  title="Share via SMS (Mobile Messaging)"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>SMS</span>
                </a>
              </div>
            </div>

            {/* Banners */}
            {voteSuccessBanner && (
              <div className="mt-2.5 p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-bold flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{voteSuccessBanner}</span>
              </div>
            )}

            {errorMessage && (
              <div className="mt-2.5 p-2 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium flex items-center justify-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {userVotedChoice && !voteSuccessBanner && (
              <div className="mt-2.5 p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900 text-xs font-bold flex flex-col sm:flex-row items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>
                    You voted for: <strong>{userVotedChoice === 1 ? poll.candidate1Name : poll.candidate2Name}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(true)}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>View Official Slip</span>
                </button>
              </div>
            )}

            {!currentUser && (
              <div className="mt-2.5 p-3 bg-gradient-to-r from-amber-50 to-indigo-50 border border-amber-200/80 rounded-xl text-xs flex flex-col sm:flex-row items-center justify-between gap-2.5 text-center sm:text-left shadow-2xs">
                <div>
                  <span className="font-black text-slate-900 block">
                    Apna Personal Account Banayein!
                  </span>
                  <span className="text-[11px] text-slate-600">
                    Aap bhi apna 2-candidate live voting contest shuru kar sakte hain.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onBackToPortal}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs shrink-0 transition active:scale-95"
                >
                  Create Account / Login
                </button>
              </div>
            )}

            {isExpired && (
              <div className="mt-2.5 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-semibold flex flex-col gap-2 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
                    <span>
                      Voting Ended • <strong>Result Out</strong> (Auto-archives after 5 hours)
                    </span>
                  </div>
                  <div className="text-[11px] font-mono font-bold bg-white px-2.5 py-0.5 rounded-lg border border-amber-200 text-amber-900 shrink-0">
                    Auto-Archive: {graceRemaining.formatted}
                  </div>
                </div>

                {/* Feature 1 Button: Download Official Result Certificate */}
                <div className="pt-1 flex justify-center sm:justify-start">
                  <button
                    type="button"
                    onClick={() => setShowCertModal(true)}
                    className="w-full sm:w-auto px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition active:scale-98"
                  >
                    <Award className="w-4 h-4" />
                    <span>Download Official Result Certificate (PNG)</span>
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Candidates Arena - Large Wazeh Sizing */}
          <div className="p-4 sm:p-5">
            {/* Main Banner Photo from Gallery */}
            {poll.bannerPhoto && (
              <div className="mb-4 w-full h-36 sm:h-48 md:h-56 max-h-[240px] rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 flex items-center justify-center shadow-xs relative group">
                <img
                  src={poll.bannerPhoto}
                  alt={poll.title}
                  className="w-full h-full object-cover sm:object-contain"
                />
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white text-[9px] font-bold tracking-wider uppercase">
                  Contest Cover
                </div>
              </div>
            )}

            {/* 2 Candidates: Side-by-Side Wazeh Large Photos with VS in the Center */}
            <div className="relative">
              <div className="grid grid-cols-2 gap-3 sm:gap-4 items-stretch">
                
                {/* Candidate A Card */}
                <div
                  onClick={() => {
                    if (userVotedChoice || isExpired || isSubmitting) return;
                    handleVoteClick(1);
                  }}
                  className={`relative rounded-2xl p-3 sm:p-4 transition-all border-2 flex flex-col justify-between text-center ${
                    userVotedChoice
                      ? 'cursor-default'
                      : isExpired
                      ? 'cursor-not-allowed opacity-90'
                      : 'cursor-pointer active:scale-99 hover:shadow-lg hover:border-emerald-500'
                  } ${
                    userVotedChoice === 1
                      ? 'border-emerald-600 bg-emerald-50/40 shadow-sm ring-2 ring-emerald-500/20'
                      : candidate1Winning && !isExpired
                      ? 'border-emerald-300 bg-white'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  {/* Top: Big Bold "A" Badge & Lead/Winner Status */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 sm:w-13 sm:h-13 rounded-2xl bg-emerald-600 text-white font-black text-xl sm:text-2xl flex items-center justify-center shadow-md">
                      A
                    </div>
                    {candidate1Winning && total > 0 && (
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-black shadow-xs">
                        <Flame className="w-3.5 h-3.5" />
                        <span>{isExpired ? 'Winner' : 'Lead'}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    {/* Big Photo A - Wazeh & Large */}
                    <div className="relative w-full h-56 sm:h-72 md:h-80 rounded-2xl overflow-hidden bg-slate-900 border-2 border-slate-200 mb-2.5 shadow-sm group-hover:border-emerald-400 transition-colors">
                      <img
                        src={poll.candidate1Photo}
                        alt={poll.candidate1Name}
                        className="w-full h-full object-cover object-[center_top]"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';
                        }}
                      />
                      {userVotedChoice === 1 && (
                        <div className="absolute top-2 right-2 bg-emerald-600 text-white rounded-full p-1.5 shadow-md">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    {/* Name */}
                    <h3 className="text-sm sm:text-lg font-black text-slate-900 tracking-tight line-clamp-1 mb-2">
                      {poll.candidate1Name}
                    </h3>
                  </div>

                  <div>
                    {/* Live Vote Tally */}
                    <div className="w-full bg-slate-50 rounded-xl p-2 border border-slate-100 mb-2.5 text-center">
                      <span className="font-mono text-base sm:text-xl font-black text-emerald-700 block leading-tight">
                        {poll.candidate1Votes} Votes
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {c1Percent}% of total
                      </span>
                    </div>

                    {/* Direct Instant Vote A Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (userVotedChoice || isExpired || isSubmitting) return;
                        handleVoteClick(1);
                      }}
                      disabled={Boolean(userVotedChoice) || isExpired || isSubmitting}
                      className={`w-full py-2.5 sm:py-3 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 ${
                        userVotedChoice === 1
                          ? 'bg-emerald-600 text-white cursor-default ring-2 ring-emerald-300'
                          : userVotedChoice && userVotedChoice !== 1
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                          : isExpired
                          ? 'bg-amber-100 text-amber-900 border border-amber-300 cursor-default shadow-xs'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 ring-2 ring-emerald-500/20'
                      }`}
                    >
                      {userVotedChoice === 1 ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-white" />
                          <span>Voted for A</span>
                        </>
                      ) : isExpired ? (
                        <>
                          <Trophy className="w-3.5 h-3.5 text-amber-600" />
                          <span>Result Out</span>
                        </>
                      ) : (
                        <>
                          <VoteIcon className="w-4 h-4" />
                          <span>Vote A</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Center VS Marker */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-slate-950 text-white font-black text-xs sm:text-sm flex items-center justify-center border-4 border-white shadow-xl z-20 pointer-events-none">
                  VS
                </div>

                {/* Candidate B Card */}
                <div
                  onClick={() => {
                    if (userVotedChoice || isExpired || isSubmitting) return;
                    handleVoteClick(2);
                  }}
                  className={`relative rounded-2xl p-3 sm:p-4 transition-all border-2 flex flex-col justify-between text-center ${
                    userVotedChoice
                      ? 'cursor-default'
                      : isExpired
                      ? 'cursor-not-allowed opacity-90'
                      : 'cursor-pointer active:scale-99 hover:shadow-lg hover:border-indigo-500'
                  } ${
                    userVotedChoice === 2
                      ? 'border-indigo-600 bg-indigo-50/40 shadow-sm ring-2 ring-indigo-500/20'
                      : candidate2Winning && !isExpired
                      ? 'border-indigo-300 bg-white'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  {/* Top: Big Bold "B" Badge & Lead/Winner Status */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 sm:w-13 sm:h-13 rounded-2xl bg-indigo-600 text-white font-black text-xl sm:text-2xl flex items-center justify-center shadow-md">
                      B
                    </div>
                    {candidate2Winning && total > 0 && (
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-500 text-white text-[10px] font-black shadow-xs">
                        <Flame className="w-3.5 h-3.5" />
                        <span>{isExpired ? 'Winner' : 'Lead'}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    {/* Big Photo B - Wazeh & Large */}
                    <div className="relative w-full h-56 sm:h-72 md:h-80 rounded-2xl overflow-hidden bg-slate-900 border-2 border-slate-200 mb-2.5 shadow-xs group-hover:border-indigo-400 transition-colors">
                      <img
                        src={poll.candidate2Photo}
                        alt={poll.candidate2Name}
                        className="w-full h-full object-cover object-[center_top]"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80';
                        }}
                      />
                      {userVotedChoice === 2 && (
                        <div className="absolute top-2 right-2 bg-indigo-600 text-white rounded-full p-1.5 shadow-md">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    {/* Name */}
                    <h3 className="text-sm sm:text-lg font-black text-slate-900 tracking-tight line-clamp-1 mb-2">
                      {poll.candidate2Name}
                    </h3>
                  </div>

                  <div>
                    {/* Live Vote Tally */}
                    <div className="w-full bg-slate-50 rounded-xl p-2 border border-slate-100 mb-2.5 text-center">
                      <span className="font-mono text-base sm:text-xl font-black text-slate-800 block leading-tight">
                        {poll.candidate2Votes} Votes
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {c2Percent}% of total
                      </span>
                    </div>

                    {/* Direct Instant Vote B Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (userVotedChoice || isExpired || isSubmitting) return;
                        handleVoteClick(2);
                      }}
                      disabled={Boolean(userVotedChoice) || isExpired || isSubmitting}
                      className={`w-full py-2.5 sm:py-3 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 ${
                        userVotedChoice === 2
                          ? 'bg-indigo-600 text-white cursor-default ring-2 ring-indigo-300'
                          : userVotedChoice && userVotedChoice !== 2
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                          : isExpired
                          ? 'bg-amber-100 text-amber-900 border border-amber-300 cursor-default shadow-xs'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30 ring-2 ring-indigo-500/20'
                      }`}
                    >
                      {userVotedChoice === 2 ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-white" />
                          <span>Voted for B</span>
                        </>
                      ) : isExpired ? (
                        <>
                          <Trophy className="w-3.5 h-3.5 text-amber-600" />
                          <span>Result Out</span>
                        </>
                      ) : (
                        <>
                          <VoteIcon className="w-4 h-4" />
                          <span>Vote B</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* The Animated Green Comparison Strip ("green pati") */}
            <GreenProgressBar
              c1Name={poll.candidate1Name}
              c1Votes={poll.candidate1Votes}
              c2Name={poll.candidate2Name}
              c2Votes={poll.candidate2Votes}
              isExpired={isExpired}
            />

            {/* Expired Winner Announcement */}
            {isExpired && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-center">
                <div className="w-8 h-8 bg-amber-500 text-white rounded-xl flex items-center justify-center mx-auto mb-2 shadow-xs">
                  <Trophy className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-black text-amber-950">
                  {candidate1Winning
                    ? `🏆 Winner: ${poll.candidate1Name}!`
                    : candidate2Winning
                    ? `🏆 Winner: ${poll.candidate2Name}!`
                    : '🤝 Contest Ended in a Tie!'}
                </h4>
                <p className="text-amber-800 text-[11px] mt-0.5">
                  Voting has officially expired. No further votes can be submitted.
                </p>

                {/* Shared link visitors download result slip */}
                <button
                  type="button"
                  onClick={() => setShowCertModal(true)}
                  className="mt-3 px-4 py-2.5 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white font-black text-xs sm:text-sm rounded-xl shadow-md inline-flex items-center justify-center gap-2 transition active:scale-95"
                >
                  <Award className="w-4 h-4" />
                  <span>Download Official Result Slip / Certificate (PDF & Image)</span>
                </button>
              </div>
            )}

            {/* Bottom Live Countdown Timer */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col items-center">
              <CountdownTimer expiresAt={poll.expiresAt} />
            </div>

          </div>

        </div>
      </main>

      {/* Quick Voter Name Modal */}
      {showNameModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-xs w-full p-5 shadow-xl border border-slate-200">
            <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center mb-2">
              <User className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-black text-slate-900">
              Enter Your Name to Vote
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5 mb-3">
              Only 1 vote per voter is permitted.
            </p>
            <form onSubmit={handleNameSubmit} className="space-y-2.5">
              <input
                type="text"
                placeholder="Your Name (e.g. Mudasir)"
                value={voterNameInput}
                onChange={(e) => setVoterNameInput(e.target.value)}
                autoFocus
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowNameModal(false)}
                  className="flex-1 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!voterNameInput.trim()}
                  className="flex-1 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl"
                >
                  Vote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Result Certificate Modal */}
      {showCertModal && poll && (
        <ResultCertificateModal poll={poll} onClose={() => setShowCertModal(false)} />
      )}

      {/* Official Digital Voter Slip Modal */}
      {showReceiptModal && poll && userVotedChoice && (
        <VoterReceiptModal
          poll={poll}
          votedChoice={userVotedChoice}
          onClose={() => setShowReceiptModal(false)}
        />
      )}

      {/* WhatsApp Viral Share Modal */}
      {showWhatsAppModal && poll && (
        <WhatsAppShareModal poll={poll} onClose={() => setShowWhatsAppModal(false)} />
      )}
    </div>
  );
};
