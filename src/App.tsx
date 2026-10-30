/**
 * Mudasir Voting Center
 * Real-time 2-candidate live voting platform with initial auth gate,
 * gallery photo uploads, green comparison progress strip, isolated contest links,
 * bottom navigation with Create, Result Out, History, Company Privacy & Profile.
 */

import React, { useState, useEffect } from 'react';
import {
  Vote,
  Shield,
  ShieldCheck,
  PlusCircle,
  Search,
  Filter,
  Flame,
  CheckCircle2,
  Clock,
  Layers,
  HelpCircle,
  ExternalLink,
  LayoutGrid,
  Trophy,
  Award,
  Sparkles,
} from 'lucide-react';
import { Poll, UserSession } from './types';
import {
  subscribeToAllPolls,
  getLocalUserVotes,
  INITIAL_DEMO_POLLS,
  clearAllPollsFromDatabase,
} from './services/pollService';
import {
  getTargetPollIdFromUrl,
  updateUrlToPoll,
  generatePollShareUrls,
  getEmbeddedPollDataFromUrl,
} from './utils/urlHelper';
import { Navbar } from './components/Navbar';
import { CroexLogo } from './components/CroexLogo';
import { PollCard } from './components/PollCard';
import { StandaloneVoteView } from './components/StandaloneVoteView';
import { AdminPanel } from './components/AdminPanel';
import { DashboardView } from './components/DashboardView';
import { AuthScreen } from './components/AuthScreen';
import { BottomNav, TabType } from './components/BottomNav';
import { CreateContestView } from './components/CreateContestView';
import { ProfileView } from './components/ProfileView';
import { OfflineIndicator } from './components/OfflineIndicator';
import { CompanyPrivacyView } from './components/CompanyPrivacyView';
import { SystemGuideModal } from './components/SystemGuideModal';
import {
  isVotingEnded,
  isPostResultExpired,
  calculateGraceRemaining,
} from './utils/pollExpiry';

export default function App() {
  // Synchronous initialization from localStorage cache so stats never flash 0 or reset
  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => {
    try {
      const savedSession = localStorage.getItem('mvc_user_session');
      if (savedSession) return JSON.parse(savedSession);
    } catch {}
    return null;
  });

  const [polls, setPolls] = useState<Poll[]>(() => {
    try {
      const cached = localStorage.getItem('mvc_all_cached_polls');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  const [loading, setLoading] = useState<boolean>(true);

  // Tab state for bottom navigation: home | create | results | history | privacy | profile | admin
  const [currentTab, setCurrentTab] = useState<TabType>('home');

  // Direct isolated contest link mode (synchronously detected so link opens instantly)
  const [standalonePollId, setStandalonePollId] = useState<string | null>(() => getTargetPollIdFromUrl());
  // Remember last opened standalone poll so voters who click Back can easily return
  const [lastStandalonePollId, setLastStandalonePollId] = useState<string | null>(() => getTargetPollIdFromUrl());

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'dashboard' | 'active' | 'results' | 'history'>('dashboard');

  // Real-time 1-second ticker for automatic 3-hour dashboard auto-removal
  const [, setTick] = useState<number>(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Controlled Startup Splash: Holds until user polls and analytics are loaded so stats never flash 0
  const [appBootSplash, setAppBootSplash] = useState<boolean>(() => !getTargetPollIdFromUrl());
  const [splashProgress, setSplashProgress] = useState<number>(20);
  const [splashStatus, setSplashStatus] = useState<string>('Connecting to Croex Cloud Network...');

  useEffect(() => {
    if (getTargetPollIdFromUrl()) {
      setAppBootSplash(false);
      return;
    }

    const t1 = setTimeout(() => {
      setSplashProgress(50);
      setSplashStatus('Loading user account & live contests...');
    }, 600);

    const t2 = setTimeout(() => {
      setSplashProgress(80);
      setSplashStatus('Synchronizing real-time verified votes...');
    }, 1300);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // Dismiss splash only once loading is false (all Firestore polls & user data ready) or at max 9s timeout
  useEffect(() => {
    if (!appBootSplash) return;

    if (!loading) {
      setSplashProgress(100);
      setSplashStatus('All data synchronized! Opening dashboard...');
      const finishTimer = setTimeout(() => {
        setAppBootSplash(false);
      }, 450);
      return () => clearTimeout(finishTimer);
    }

    const maxTimeout = setTimeout(() => {
      setSplashProgress(100);
      setSplashStatus('Starting with cached data...');
      setTimeout(() => {
        setAppBootSplash(false);
      }, 300);
    }, 9000);

    return () => clearTimeout(maxTimeout);
  }, [loading, appBootSplash]);

  // User local votes map - synchronously initialized
  const [userVotedMap, setUserVotedMap] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('mvc_user_session');
      const email = saved ? JSON.parse(saved)?.email : null;
      return email ? getLocalUserVotes(email) : {};
    } catch {
      return {};
    }
  });

  // First-time System Guide Tour (Runs strictly ONCE on first app opening / install)
  const [showSystemGuide, setShowSystemGuide] = useState<boolean>(() => {
    try {
      return localStorage.getItem('croex_system_tour_completed') !== 'true';
    } catch {
      return false;
    }
  });

  // 1. Check URL parameters and saved session on boot
  useEffect(() => {
    try {
      const savedSession = localStorage.getItem('mvc_user_session');
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        setCurrentUser(parsed);
      }
    } catch (e) {
      console.warn('Error reading saved session:', e);
    }

    // Check if user clicked a direct shared poll link (e.g. from WhatsApp)
    const targetId = getTargetPollIdFromUrl();
    if (targetId) {
      setStandalonePollId(targetId);
      setLastStandalonePollId(targetId);
    }

    const handlePopState = () => {
      const id = getTargetPollIdFromUrl();
      if (id) {
        setStandalonePollId(id);
        setLastStandalonePollId(id);
      } else {
        setStandalonePollId(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  // Sync user's personal vote map whenever currentUser session changes
  useEffect(() => {
    if (currentUser?.email) {
      setUserVotedMap(getLocalUserVotes(currentUser.email));
    } else {
      setUserVotedMap({});
    }
  }, [currentUser]);

  // 2. Subscribe to live Firestore polls
  useEffect(() => {
    const unsubscribe = subscribeToAllPolls(
      (updatedPolls) => {
        setPolls(updatedPolls);
        setLoading(false);
      },
      (err) => {
        console.warn('Snapshot sync fallback active:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // 3. Instant Multi-Tab / Local Real-time sync:
  // When a vote is cast anywhere on the device, immediately reflect it on the creator's dashboard!
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      if ('BroadcastChannel' in window) {
        channel = new BroadcastChannel('croex_voting_channel');
        channel.onmessage = (event) => {
          if (event.data?.type === 'VOTE_CAST') {
            const { pollId, candidateChoice } = event.data;
            setPolls((prev) =>
              prev.map((p) => {
                if (p.id === pollId) {
                  return {
                    ...p,
                    candidate1Votes: candidateChoice === 1 ? p.candidate1Votes + 1 : p.candidate1Votes,
                    candidate2Votes: candidateChoice === 2 ? p.candidate2Votes + 1 : p.candidate2Votes,
                    totalVotes: p.totalVotes + 1,
                  };
                }
                return p;
              })
            );
          }
        };
      }
    } catch {}

    const handleCustomVoteCast = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.pollId && detail?.choice) {
        setPolls((prev) =>
          prev.map((p) => {
            if (p.id === detail.pollId) {
              return {
                ...p,
                candidate1Votes: detail.choice === 1 ? p.candidate1Votes + 1 : p.candidate1Votes,
                candidate2Votes: detail.choice === 2 ? p.candidate2Votes + 1 : p.candidate2Votes,
                totalVotes: p.totalVotes + 1,
              };
            }
            return p;
          })
        );
      }
    };

    window.addEventListener('croex_vote_cast', handleCustomVoteCast);

    return () => {
      channel?.close();
      window.removeEventListener('croex_vote_cast', handleCustomVoteCast);
    };
  }, []);

  const [previousTab, setPreviousTab] = useState<TabType>('home');

  // Handlers
  const handleOpenVoteView = (pollId: string) => {
    setLastStandalonePollId(pollId);
    setPreviousTab(currentTab);
    setStandalonePollId(pollId);
    updateUrlToPoll(pollId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToPortal = () => {
    setStandalonePollId(null);
    updateUrlToPoll(null);
    setCurrentTab(previousTab || 'home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSuccess = (session: UserSession, redirectToAdmin = false) => {
    setCurrentUser(session);
    setUserVotedMap(getLocalUserVotes(session.email));
    if (redirectToAdmin || session.isAdmin) {
      setCurrentTab('admin');
    } else {
      setCurrentTab('home');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('mvc_user_session');
    setCurrentUser(null);
    setUserVotedMap({});
    setCurrentTab('home');
  };

  // Raw polls from Firestore
  const allSystemPolls: Poll[] = polls;

  // SCENARIO 1: Direct Isolated Shared Contest View (Instantaneous open on link click)
  if (standalonePollId) {
    let targetPoll = allSystemPolls.find((p) => p.id === standalonePollId) || null;
    if (!targetPoll) {
      targetPoll = getEmbeddedPollDataFromUrl(standalonePollId);
    }
    if (!targetPoll) {
      try {
        const cached = localStorage.getItem(`mvc_poll_${standalonePollId}`);
        if (cached) {
          targetPoll = JSON.parse(cached);
        }
      } catch {
        // ignore
      }
    }
    if (!targetPoll) {
      try {
        const allCached = localStorage.getItem('mvc_all_cached_polls');
        if (allCached) {
          const list = JSON.parse(allCached);
          targetPoll = list.find((p: any) => p.id === standalonePollId) || null;
        }
      } catch {
        // ignore
      }
    }
    return (
      <>
        <StandaloneVoteView
          pollId={standalonePollId}
          initialPoll={targetPoll}
          currentUser={currentUser}
          onOpenAuth={() => setStandalonePollId(null)}
          onBackToPortal={handleBackToPortal}
        />
        <OfflineIndicator />
      </>
    );
  }

  // Initial App Startup Splash (HD Logo + Animated Progress Bar + Cloud Data Synchronization)
  if (appBootSplash) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[#141926] via-[#0b0e17] to-[#070910] text-white p-6 font-sans select-none animate-in fade-in duration-300">
        <div className="relative mb-5 animate-in fade-in zoom-in-95 duration-500">
          <img
            src="/croex-logo-hd.png"
            alt="Croex Voting Center"
            className="w-44 h-44 sm:w-48 sm:h-48 max-w-[70vw] max-h-[70vw] object-contain rounded-3xl shadow-2xl drop-shadow-[0_20px_35px_rgba(217,119,6,0.35)] border border-amber-400/40"
          />
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight mt-1 text-center">
          Croex Voting Center
        </h1>
        <p className="text-xs text-amber-400 font-bold tracking-widest uppercase mt-1 text-center">
          Hanzla Croex Technology
        </p>

        {/* Real Progress Bar */}
        <div className="w-64 max-w-[80vw] mt-7 space-y-2">
          <div className="w-full h-2 bg-slate-800/90 rounded-full overflow-hidden border border-slate-700/60 p-0.5 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 rounded-full transition-all duration-500 ease-out shadow-[0_0_12px_rgba(245,158,11,0.6)]"
              style={{ width: `${splashProgress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium px-0.5">
            <span className="truncate pr-2">{splashStatus}</span>
            <span className="font-mono text-amber-400 font-bold shrink-0">{splashProgress}%</span>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="text-[11px] text-slate-400 font-mono">Live Screen Opening...</span>
        </div>
      </div>
    );
  }

  // SCENARIO 2: Initial Mandatory Login / Sign Up Gate
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0b0e17] flex flex-col">
        {lastStandalonePollId && (
          <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 px-4 py-2.5 text-slate-950 font-bold text-xs flex items-center justify-between shadow-md z-50">
            <span className="truncate pr-2">🗳️ You were viewing a live voting poll!</span>
            <button
              onClick={() => {
                setStandalonePollId(lastStandalonePollId);
                updateUrlToPoll(lastStandalonePollId);
              }}
              className="px-3 py-1 bg-slate-950 hover:bg-slate-900 text-white rounded-lg text-xs font-black transition flex items-center gap-1 active:scale-95 shrink-0"
            >
              <span>← Return to Poll</span>
            </button>
          </div>
        )}
        <div className="flex-1">
          <AuthScreen onLoginSuccess={handleLoginSuccess} />
        </div>
      </div>
    );
  }

  // Strict User Account & Data Isolation:
  // - Admin sees all contests across all users on the platform
  // - Every regular user sees ONLY their OWN contests (polls they created) or polls they voted in!
  // - Brand new user account starts completely from ZERO (0 active polls, 0 results, 0 history, 0 votes)!
  // - One user can NEVER see another user's polls, results, or history!
  const isMyCreatedPoll = (p: Poll) => {
    if (!currentUser) return false;
    const myEmail = (currentUser.email || '').toLowerCase().trim();
    const myId = currentUser.id || '';

    // Strictly match by user's unique email or user's unique account ID ONLY.
    // NEVER match by display name (which caused users with default name 'Voter' to see each other's polls).
    const matchesEmail = Boolean(myEmail && p.creatorEmail && p.creatorEmail.toLowerCase().trim() === myEmail);
    const matchesId = Boolean(myId && p.creatorId && p.creatorId === myId);

    return matchesEmail || matchesId;
  };

  // Contests in which THIS user has cast a vote
  const isPollVotedByMe = (p: Poll) => {
    return Boolean(userVotedMap[p.id]);
  };

  // Total visible active contests for user:
  // Admin sees all polls; Regular user sees ONLY their own created polls + polls they participated in!
  const userVisiblePolls = currentUser.isAdmin
    ? allSystemPolls
    : allSystemPolls.filter((p) => isMyCreatedPoll(p) || isPollVotedByMe(p));

  // Personal contests created strictly by this user
  const userCreatedPolls = allSystemPolls.filter((p) => isMyCreatedPoll(p));

  // 1. DASHBOARD: Only LIVE polls (Voting is currently open)
  const livePolls = currentUser.isAdmin
    ? allSystemPolls.filter((p) => !isVotingEnded(p))
    : allSystemPolls.filter((p) => (isMyCreatedPoll(p) || isPollVotedByMe(p)) && !isVotingEnded(p));

  // 2. RESULT OUT: Contests where voting time ended, but 5 hours have NOT yet passed
  const recentResultPolls = currentUser.isAdmin
    ? allSystemPolls.filter((p) => isVotingEnded(p) && !isPostResultExpired(p))
    : allSystemPolls.filter(
        (p) => (isMyCreatedPoll(p) || isPollVotedByMe(p)) && isVotingEnded(p) && !isPostResultExpired(p)
      );

  // 3. HISTORY: Strictly user's OWN history!
  // A brand-new user with 0 votes and 0 created polls will see a clean, empty History!
  const historyPolls = currentUser.isAdmin
    ? allSystemPolls.filter((p) => isVotingEnded(p) && isPostResultExpired(p))
    : allSystemPolls.filter(
        (p) => (isMyCreatedPoll(p) || isPollVotedByMe(p)) && isVotingEnded(p) && isPostResultExpired(p)
      );

  // Filtered polls for Home tab / Search
  const filteredPolls = userVisiblePolls.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.candidate1Name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.candidate2Name.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterMode === 'active') {
      return !isVotingEnded(p);
    }
    if (filterMode === 'results') {
      return isVotingEnded(p) && !isPostResultExpired(p);
    }
    if (filterMode === 'history') {
      return isVotingEnded(p) && isPostResultExpired(p);
    }
    return !isVotingEnded(p);
  });

  const totalSystemVotes = userVisiblePolls.reduce((sum, p) => sum + p.totalVotes, 0);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans selection:bg-amber-100 selection:text-amber-900 pb-24">
      {/* Top Navigation */}
      <Navbar
        currentUser={currentUser}
        onOpenAuth={() => {}}
        onLogout={handleLogout}
        onOpenAdmin={() => setCurrentTab('admin')}
        currentTab={currentTab}
        onChangeTab={setCurrentTab}
        onNavigatePortal={() => setCurrentTab('home')}
      />

      {/* Main Tab Renderers */}
      {currentTab === 'admin' && currentUser?.isAdmin ? (
        <AdminPanel
          polls={allSystemPolls}
          onSelectPollForViewing={handleOpenVoteView}
          onLogoutAdmin={handleLogout}
        />
      ) : currentTab === 'create' ? (
        <CreateContestView
          currentUser={currentUser}
          onContestCreated={() => {
            setCurrentTab('home');
          }}
          onOpenVotePage={handleOpenVoteView}
        />
      ) : currentTab === 'results' ? (
        /* RESULT OUT TAB (Create ky agye) */
        <main className="max-w-4xl mx-auto px-4 py-5 flex-1 w-full">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 mb-6 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black shadow-xs">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Result Out
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  Winners, final vote counts, and green progress comparisons.
                </p>
              </div>
            </div>
          </div>

          {recentResultPolls.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-xs">
              <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Trophy className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black text-slate-900">No Contests in Result Out Window</h3>
              <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
                Contests stay in Result Out for 5 hours after voting ends. Contests older than 5 hours are automatically archived in the History tab.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentResultPolls.map((poll) => (
                <PollCard
                  key={poll.id}
                  poll={poll}
                  onOpenVote={handleOpenVoteView}
                  userVotedChoice={userVotedMap[poll.id] || null}
                />
              ))}
            </div>
          )}
        </main>
      ) : currentTab === 'history' ? (
        /* HISTORY TAB */
        <main className="max-w-4xl mx-auto px-4 py-5 flex-1 w-full">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 mb-6 shadow-xs">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black shadow-xs">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    Contest History Archive
                  </h1>
                  <p className="text-xs text-slate-500 font-medium">
                    Permanent record and verified vote counts of all completed contests.
                  </p>
                </div>
              </div>

              {/* History Search */}
              <div className="relative min-w-[200px] sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search history..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {historyPolls.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-xs">
              <div className="w-14 h-14 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Clock className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black text-slate-900">No History Records Yet</h3>
              <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
                Completed polls after 5 hours will be automatically archived here forever.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {historyPolls
                .filter((p) =>
                  p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  p.candidate1Name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  p.candidate2Name.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((poll) => (
                  <PollCard
                    key={poll.id}
                    poll={poll}
                    onOpenVote={handleOpenVoteView}
                    userVotedChoice={userVotedMap[poll.id] || null}
                  />
                ))}
            </div>
          )}
        </main>
      ) : currentTab === 'privacy' ? (
        /* COMPANY PRIVACY TAB (Profile sy pelhay) */
        <CompanyPrivacyView
          isAdmin={currentUser?.isAdmin}
          onClose={() => setCurrentTab('home')}
        />
      ) : currentTab === 'profile' ? (
        <ProfileView
          key={currentUser?.email || 'profile'}
          currentUser={currentUser}
          onOpenAdminPanel={() => setCurrentTab('admin')}
          onOpenAuth={() => {}}
          onLogout={handleLogout}
          userPollsCount={userCreatedPolls.length}
          userVotesCount={Object.keys(userVotedMap).length}
          onProfileUpdated={(updated) => setCurrentUser(updated)}
          onOpenGuide={() => setShowSystemGuide(true)}
        />
      ) : (
        /* DASHBOARD TAB - EXACT DESIGN PROVIDED BY USER */
        <DashboardView
          currentUser={currentUser}
          polls={livePolls}
          allPolls={userVisiblePolls}
          loading={loading}
          onOpenVote={handleOpenVoteView}
          onViewAllResults={() => setCurrentTab('results')}
          onViewAllHistory={() => setCurrentTab('history')}
          onOpenCreate={() => setCurrentTab('create')}
        />
      )}

      {/* 6-Button Bottom Navigation Bar: Dashboard, Create, Result Out, History, Company, Profile */}
      <BottomNav
        currentTab={currentTab}
        onChangeTab={setCurrentTab}
        currentUser={currentUser}
      />

      {/* Real-time Offline & Sync Indicator */}
      <OfflineIndicator />

      {/* First-time System User Guide (Runs strictly once on first app open/install) */}
      <SystemGuideModal
        isOpen={showSystemGuide}
        onClose={() => setShowSystemGuide(false)}
      />
    </div>
  );
}
