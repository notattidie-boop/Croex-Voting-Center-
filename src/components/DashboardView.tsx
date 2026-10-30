import React, { useState, useEffect, useRef } from 'react';
import {
  Flame,
  BarChart3,
  Target,
  ChevronRight,
  ChevronLeft,
  Users,
  CheckSquare,
  Radio,
  Clock,
  ListTodo,
  PlusCircle,
  Vote,
  Sparkles,
  Filter,
  ArrowUpDown,
  SlidersHorizontal,
} from 'lucide-react';
import { Poll, UserSession, DashboardBanner } from '../types';
import { isVotingEnded } from '../utils/pollExpiry';
import { calculateTimeRemaining } from './CountdownTimer';
import { useLanguage } from '../contexts/LanguageContext';
import { subscribeToDashboardBanners, DEFAULT_DASHBOARD_BANNERS } from '../services/pollService';

interface DashboardViewProps {
  currentUser: UserSession | null;
  polls: Poll[];
  allPolls?: Poll[];
  loading?: boolean;
  onOpenVote: (pollId: string) => void;
  onViewAllResults: () => void;
  onViewAllHistory: () => void;
  onOpenCreate?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  polls,
  allPolls,
  loading = false,
  onOpenVote,
  onViewAllResults,
  onViewAllHistory,
  onOpenCreate,
}) => {
  const { t, language } = useLanguage();

  // User's display name (strictly per logged-in user account)
  const displayName = currentUser?.name || currentUser?.email?.split('@')[0] || 'Honorable Voter';

  // Multi-page Banners state (Admin managed)
  const [banners, setBanners] = useState<DashboardBanner[]>(DEFAULT_DASHBOARD_BANNERS);
  const [activeBannerIdx, setActiveBannerIdx] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const touchStartXRef = useRef<number | null>(null);

  useEffect(() => {
    const unsub = subscribeToDashboardBanners((list) => {
      const active = list.filter((b) => b.active !== false);
      setBanners(active.length > 0 ? active : DEFAULT_DASHBOARD_BANNERS);
    });
    return () => unsub();
  }, []);

  // Auto-slide every 5 seconds if not paused
  useEffect(() => {
    if (banners.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setActiveBannerIdx((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length, isPaused]);

  // Touch swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    setIsPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartXRef.current;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        // Swiped right -> previous page
        setActiveBannerIdx((prev) => (prev === 0 ? banners.length - 1 : prev - 1));
      } else {
        // Swiped left -> next page
        setActiveBannerIdx((prev) => (prev + 1) % banners.length);
      }
    }
    touchStartXRef.current = null;
    setIsPaused(false);
  };

  // Strictly ACTIVE polls ONLY - ended, result out, and history polls are completely removed from Dashboard!
  const activePolls = (polls || []).filter((p) => !isVotingEnded(p));

  // 1. Featured poll (Active Polls card) - ONLY from active polls!
  const featuredPoll = activePolls.length > 0 ? activePolls[0] : null;

  // Feature 6: Category Filter Pills & Smart Sorting
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortFilter, setSortFilter] = useState<'trending' | 'ending_soon' | 'tight' | 'newest'>('trending');

  // 2. Ongoing polls - Filtered strictly from active polls (excluding featured)
  const ongoingPollsList = activePolls.filter((p) => {
    if (featuredPoll && p.id === featuredPoll.id) return false;
    if (selectedCategory !== 'All' && p.category && p.category !== selectedCategory) {
      return false;
    }
    return true;
  });

  // Sort ongoing polls
  const sortedOngoing = [...ongoingPollsList].sort((a, b) => {
    const aVotes = (a.candidate1Votes || 0) + (a.candidate2Votes || 0);
    const bVotes = (b.candidate1Votes || 0) + (b.candidate2Votes || 0);

    if (sortFilter === 'trending') {
      return bVotes - aVotes;
    }
    if (sortFilter === 'ending_soon') {
      return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
    }
    if (sortFilter === 'tight') {
      const aMargin = Math.abs((a.candidate1Votes || 0) - (a.candidate2Votes || 0));
      const bMargin = Math.abs((b.candidate1Votes || 0) - (b.candidate2Votes || 0));
      return aMargin - bMargin;
    }
    if (sortFilter === 'newest') {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    }
    return 0;
  });

  // Display ONLY active polls! NEVER fallback to completed or history polls!
  const displayOngoing: Poll[] = sortedOngoing.slice(0, 8);

  // 3. Dynamic Quick Stats across all system contests
  // 3. Dynamic Quick Stats across user's contests (starts strictly from 0 for new users)
  const systemContests = allPolls || polls || [];
  const calculatedTotalVotes = systemContests.reduce(
    (sum, p) => sum + ((p.candidate1Votes || 0) + (p.candidate2Votes || 0) || p.totalVotes || 0),
    0
  );
  const totalVotesCount = calculatedTotalVotes;
  const totalPollsCount = systemContests.length;
  const activePollsCount = systemContests.filter((p) => !isVotingEnded(p)).length;
  const completedPollsCount = systemContests.filter((p) => isVotingEnded(p)).length;

  // Format time remaining helper
  const formatTimeLeft = (expiresAt?: string) => {
    if (!expiresAt) return '2 Days Left';
    const remaining = calculateTimeRemaining(expiresAt);
    if (remaining.isExpired) return 'Ended';
    if (remaining.days > 0) return `${remaining.days} ${remaining.days === 1 ? t('dash.day_left') : t('dash.days_left')}`;
    if (remaining.hours > 0) return `${remaining.hours}h Left`;
    return `${remaining.minutes}m Left`;
  };

  const currentBanner = banners[activeBannerIdx] || banners[0] || DEFAULT_DASHBOARD_BANNERS[0];
  const isUrdu = language === 'ur';

  return (
    <div className={`w-full max-w-[430px] mx-auto px-3.5 sm:px-4 py-3 space-y-5 select-none ${isUrdu ? 'font-urdu' : ''}`}>
      
      {/* ---------------- 1. MULTI-PAGE SCROLLABLE BANNER CAROUSEL (Admin Configured) ---------------- */}
      <section
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative rounded-3xl overflow-hidden border border-[#E9DFCA] bg-gradient-to-r from-[#FFFDF9] via-[#FAF6ED] to-[#F4E9D7] shadow-xs transition-all duration-300"
      >
        <div className="flex items-center justify-between p-4 sm:p-5 relative z-10 min-h-[145px]">
          
          {/* Left Content Column */}
          <div className="flex-1 pr-2 min-w-0">
            {/* Badge pill and Page Counter */}
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <span className="inline-block bg-[#C4932C] text-white text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shadow-2xs">
                {currentBanner.badge || t('dash.welcome_to')}
              </span>
              {banners.length > 1 && (
                <span className="text-[9.5px] font-mono font-bold text-amber-800/80 bg-amber-100/70 px-1.5 py-0.5 rounded">
                  {activeBannerIdx + 1} / {banners.length}
                </span>
              )}
            </div>

            {/* Title / Headline */}
            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight line-clamp-2">
              {activeBannerIdx === 0 && !currentBanner.title.includes('2026')
                ? `${t('dash.hello')}, ${displayName}`
                : currentBanner.title}
            </h1>

            {/* Subtitle / Caption */}
            <p className="text-[11px] text-slate-600 mt-1 leading-snug font-medium line-clamp-2 max-w-[220px]">
              {activeBannerIdx === 0 && !currentBanner.subtitle
                ? t('dash.ceo_msg')
                : currentBanner.subtitle || t('dash.ceo_msg')}
            </p>

            {/* Bottom Action: Either cursive script or Vote Now button */}
            <div className="mt-2">
              {currentBanner.pollId ? (
                <button
                  type="button"
                  onClick={() => onOpenVote(currentBanner.pollId!)}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-[#C4932C] hover:bg-[#AC7E1F] text-white text-[10px] font-bold rounded-full shadow-xs transition active:scale-95"
                >
                  <Vote className="w-3 h-3" />
                  <span>{t('dash.vote_now')}</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              ) : (
                <span
                  style={{ fontFamily: "'Great Vibes', 'Caveat', cursive" }}
                  className="text-2xl sm:text-3xl text-[#C4932C] font-normal leading-none block drop-shadow-2xs"
                >
                  {t('dash.voice_matters')}
                </span>
              )}
            </div>
          </div>

          {/* Right Banner Image */}
          <div className="w-[125px] sm:w-[140px] h-[105px] sm:h-[115px] relative rounded-2xl overflow-hidden shadow-sm border border-[#E0D2B8] bg-slate-950 shrink-0 group">
            <img
              src={currentBanner.imageUrl || '/croex-ballot-hero.jpg'}
              alt={currentBanner.title}
              className="w-full h-full object-cover object-center transition-transform duration-500 hover:scale-105"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/croex-ballot-hero.jpg';
              }}
            />
          </div>

        </div>

        {/* Carousel Navigation Arrows & Page Dots */}
        {banners.length > 1 && (
          <div className="px-4 pb-2.5 pt-0 flex items-center justify-between relative z-10 border-t border-amber-200/40">
            {/* Left / Prev Arrow */}
            <button
              type="button"
              onClick={() => setActiveBannerIdx((prev) => (prev === 0 ? banners.length - 1 : prev - 1))}
              className="w-6 h-6 rounded-full bg-white/80 hover:bg-white text-slate-700 flex items-center justify-center border border-slate-200/60 shadow-2xs transition"
              title="Previous Banner Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {/* Pagination Dots */}
            <div className="flex items-center gap-1.5">
              {banners.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveBannerIdx(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === activeBannerIdx
                      ? 'w-5 bg-[#C4932C]'
                      : 'w-1.5 bg-amber-300/80 hover:bg-amber-400'
                  }`}
                  aria-label={`Go to banner page ${i + 1}`}
                />
              ))}
            </div>

            {/* Right / Next Arrow */}
            <button
              type="button"
              onClick={() => setActiveBannerIdx((prev) => (prev + 1) % banners.length)}
              className="w-6 h-6 rounded-full bg-white/80 hover:bg-white text-slate-700 flex items-center justify-center border border-slate-200/60 shadow-2xs transition"
              title="Next Banner Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Diagonal Soft Glow Accent */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-amber-300/25 via-transparent to-transparent pointer-events-none" />
      </section>

      {/* ---------------- 2. ACTIVE POLLS SECTION ---------------- */}
      <section className="space-y-2.5">
        {/* Section Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Flame className="w-5 h-5 text-amber-600 fill-amber-500" />
            <h2 className="text-base sm:text-[17px] font-black text-slate-900 tracking-tight">
              {t('dash.active_polls')}
            </h2>
          </div>
          <button
            onClick={onViewAllResults}
            className="text-xs font-bold text-[#C4932C] hover:text-[#AC7E1F] flex items-center gap-0.5 transition"
          >
            <span>{t('dash.view_all')}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Featured Big Poll Card */}
        {featuredPoll ? (
          <div
            onClick={() => onOpenVote(featuredPoll.id)}
            className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-3.5 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-3 group"
          >
            {/* Left Thumbnail (Shows custom uploaded thumbnail if user uploaded one) */}
            <div className="w-[72px] h-[72px] sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-900 border border-slate-100 shrink-0">
              <img
                src={
                  featuredPoll.bannerPhoto ||
                  featuredPoll.candidate1Photo ||
                  '/src/assets/images/general_election_thumb_1792136819789.jpg'
                }
                alt={featuredPoll.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    '/src/assets/images/general_election_thumb_1792136819789.jpg';
                }}
              />
            </div>

            {/* Center Info */}
            <div className="flex-1 min-w-0 pr-1">
              {/* Live Now Tag */}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{t('dash.live_now')}</span>
              </span>

              {/* Title */}
              <h3 className="text-sm sm:text-base font-black text-slate-900 truncate tracking-tight group-hover:text-[#C4932C] transition-colors leading-tight">
                {featuredPoll.title}
              </h3>

              {/* Description */}
              <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 font-medium">
                {featuredPoll.description || 'Choose your preferred candidate.'}
              </p>

              {/* Meta: Votes & Days Left */}
              <div className="flex items-center gap-2 text-[10.5px] sm:text-[11px] text-slate-600 mt-1.5 font-semibold">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {(
                      featuredPoll.candidate1Votes + (featuredPoll.candidate2Votes || 0) ||
                      featuredPoll.totalVotes ||
                      0
                    ).toLocaleString()}{' '}
                    {t('dash.votes')}
                  </span>
                </span>
                <span className="text-slate-300">|</span>
                <span className="flex items-center gap-1 text-amber-700">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>{formatTimeLeft(featuredPoll.expiresAt)}</span>
                </span>
              </div>
            </div>

            {/* Right Gold Arrow Button */}
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#C4932C] group-hover:bg-[#AC7E1F] text-white flex items-center justify-center shadow-xs shrink-0 transition-transform group-hover:scale-110">
              <ChevronRight className="w-5 h-5" />
            </div>
          </div>
        ) : loading && systemContests.length === 0 ? (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 text-center shadow-xs animate-pulse">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-2" />
            <div className="h-4 bg-slate-200 rounded w-48 mx-auto mb-2" />
            <div className="h-3 bg-slate-100 rounded w-64 mx-auto" />
          </div>
        ) : (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 text-center shadow-xs">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-2">
              <Flame className="w-5 h-5 text-amber-500" />
            </div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900">
              {systemContests.length === 0
                ? 'Welcome! Your Account is Ready (0 Contests)'
                : 'No Active Contests Right Now'}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
              {systemContests.length === 0
                ? 'Aapka account kamyabi se ban chuka hai! Apna pehla 2-candidate live voting contest banane ke liye neeche click karein.'
                : 'Completed contests have moved to Result Out or History.'}
            </p>
            <div className="mt-3 flex items-center justify-center gap-2">
              {onOpenCreate && (
                <button
                  onClick={onOpenCreate}
                  className="px-3.5 py-1.5 rounded-xl bg-[#C4932C] hover:bg-[#AC7E1F] text-white text-xs font-black shadow-xs transition active:scale-95 flex items-center gap-1.5"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>+ Create Contest</span>
                </button>
              )}
              {systemContests.length > 0 && (
                <button
                  onClick={onViewAllResults}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                >
                  View Result Out
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ---------------- 3. QUICK STATS SECTION ---------------- */}
      <section className="space-y-2.5">
        {/* Section Header */}
        <div className="flex items-center gap-1.5">
          <BarChart3 className="w-5 h-5 text-amber-600" />
          <h2 className="text-base sm:text-[17px] font-black text-slate-900 tracking-tight">
            {t('dash.quick_stats')}
          </h2>
        </div>

        {/* 4 Cards in 1 Row */}
        <div className="grid grid-cols-4 gap-2">
          {/* Card 1: Total Votes */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-2.5 sm:p-3 text-center shadow-xs flex flex-col items-center justify-center">
            <div className="w-9 h-9 rounded-xl bg-[#FEF6E9] text-[#C4932C] border border-amber-200/50 flex items-center justify-center mb-1.5 shadow-2xs">
              <Users className="w-4 h-4" />
            </div>
            <span className="text-[10px] sm:text-[10.5px] text-slate-500 font-semibold block leading-tight">
              {t('dash.total_votes')}
            </span>
            {loading ? (
              <span className="inline-block w-8 h-4 bg-amber-100/80 rounded-md animate-pulse mt-0.5" />
            ) : (
              <span className="text-xs sm:text-sm font-black text-slate-900 tracking-tight mt-0.5">
                {totalVotesCount.toLocaleString()}
              </span>
            )}
          </div>

          {/* Card 2: Total Polls */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-2.5 sm:p-3 text-center shadow-xs flex flex-col items-center justify-center">
            <div className="w-9 h-9 rounded-xl bg-[#EFF2F6] text-[#475569] border border-slate-200/70 flex items-center justify-center mb-1.5 shadow-2xs">
              <ListTodo className="w-4 h-4" />
            </div>
            <span className="text-[10px] sm:text-[10.5px] text-slate-500 font-semibold block leading-tight">
              {t('dash.total_polls')}
            </span>
            {loading ? (
              <span className="inline-block w-8 h-4 bg-slate-200/80 rounded-md animate-pulse mt-0.5" />
            ) : (
              <span className="text-xs sm:text-sm font-black text-slate-900 tracking-tight mt-0.5">
                {totalPollsCount}
              </span>
            )}
          </div>

          {/* Card 3: Active Polls */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-2.5 sm:p-3 text-center shadow-xs flex flex-col items-center justify-center">
            <div className="w-9 h-9 rounded-xl bg-[#EAF7EE] text-[#16A34A] border border-emerald-200/60 flex items-center justify-center mb-1.5 shadow-2xs">
              <Radio className="w-4 h-4" />
            </div>
            <span className="text-[10px] sm:text-[10.5px] text-slate-500 font-semibold block leading-tight">
              {t('dash.active_polls')}
            </span>
            {loading ? (
              <span className="inline-block w-8 h-4 bg-emerald-100/80 rounded-md animate-pulse mt-0.5" />
            ) : (
              <span className="text-xs sm:text-sm font-black text-slate-900 tracking-tight mt-0.5">
                {activePollsCount}
              </span>
            )}
          </div>

          {/* Card 4: Completed Polls */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-2.5 sm:p-3 text-center shadow-xs flex flex-col items-center justify-center">
            <div className="w-9 h-9 rounded-xl bg-[#FEF6E9] text-[#C4932C] border border-amber-200/50 flex items-center justify-center mb-1.5 shadow-2xs">
              <CheckSquare className="w-4 h-4" />
            </div>
            <span className="text-[10px] sm:text-[10.5px] text-slate-500 font-semibold block leading-tight">
              {t('dash.completed_polls')}
            </span>
            {loading ? (
              <span className="inline-block w-8 h-4 bg-amber-100/80 rounded-md animate-pulse mt-0.5" />
            ) : (
              <span className="text-xs sm:text-sm font-black text-slate-900 tracking-tight mt-0.5">
                {completedPollsCount}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ---------------- 4. ONGOING POLLS SECTION ---------------- */}
      <section className="space-y-2.5">
        {/* Section Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Target className="w-5 h-5 text-amber-600" />
            <h2 className="text-base sm:text-[17px] font-black text-slate-900 tracking-tight">
              {t('dash.ongoing_polls')}
            </h2>
          </div>
          <button
            onClick={onViewAllHistory}
            className="text-xs font-bold text-[#C4932C] hover:text-[#AC7E1F] flex items-center gap-0.5 transition"
          >
            <span>{t('dash.view_all')}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Feature 6: Category Filter Pills & Smart Sort Bar */}
        <div className="space-y-2 pt-0.5">
          {/* Category Pills (Horizontal Scroll) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {['All', 'National', 'Leadership', 'Economy', 'Student Council'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition shadow-2xs ${
                  selectedCategory === cat
                    ? 'bg-[#C4932C] text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {cat === 'All' ? 'All Contests' : cat}
              </button>
            ))}
          </div>

          {/* Sort Selector Bar */}
          <div className="flex items-center justify-between text-xs px-1">
            <span className="text-[11px] font-semibold text-slate-500">
              Showing {displayOngoing.length} live contest{displayOngoing.length === 1 ? '' : 's'}
            </span>
            <div className="flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3 text-slate-400" />
              <select
                value={sortFilter}
                onChange={(e) => setSortFilter(e.target.value as any)}
                aria-label="Sort Contests"
                className="bg-transparent text-[11px] font-bold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="trending">🔥 Trending (Most Votes)</option>
                <option value="ending_soon">⏳ Ending Soon</option>
                <option value="tight">⚡ Tight Margin</option>
                <option value="newest">🆕 Newest Added</option>
              </select>
            </div>
          </div>
        </div>

        {/* List of Real Ongoing Cards with User's Uploaded Thumbnails & Live Votes */}
        {displayOngoing.length > 0 ? (
          <div className="space-y-2.5">
            {displayOngoing.map((poll) => {
              const votesCount =
                poll.candidate1Votes + (poll.candidate2Votes || 0) || poll.totalVotes || 0;
              // Real custom thumbnail uploaded by user during poll creation
              const thumbImage =
                poll.bannerPhoto ||
                poll.candidate1Photo ||
                '/src/assets/images/general_election_thumb_1792136819789.jpg';

              return (
                <div
                  key={poll.id}
                  className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-3.5 shadow-xs hover:shadow-md transition-all flex items-center justify-between gap-3 group"
                >
                  {/* Left Thumbnail */}
                  <div className="w-[62px] h-[62px] sm:w-[68px] sm:h-[68px] rounded-xl overflow-hidden bg-slate-900 border border-slate-100 shrink-0">
                    <img
                      src={thumbImage}
                      alt={poll.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          '/src/assets/images/general_election_thumb_1792136819789.jpg';
                      }}
                    />
                  </div>

                  {/* Center Details */}
                  <div className="flex-1 min-w-0 pr-1">
                    {/* Title & Live Badge */}
                    <div className="flex items-center gap-1.5">
                      <h3
                        onClick={() => onOpenVote(poll.id)}
                        className="text-sm font-black text-slate-900 truncate tracking-tight cursor-pointer hover:text-[#C4932C] transition-colors leading-tight"
                      >
                        {poll.title}
                      </h3>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>{t('dash.live')}</span>
                      </span>
                    </div>

                    {/* Subtitle */}
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 font-medium">
                      {poll.description || `${poll.candidate1Name || 'Candidate 1'} vs ${poll.candidate2Name || 'Candidate 2'}`}
                    </p>

                    {/* Meta: Votes & Days */}
                    <div className="flex items-center gap-2 text-[10.5px] text-slate-600 mt-1.5 font-semibold">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-slate-400" />
                        <span>{votesCount.toLocaleString()} {t('dash.votes')}</span>
                      </span>
                      <span className="text-slate-300">|</span>
                      <span className="flex items-center gap-1 text-amber-700">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>{formatTimeLeft(poll.expiresAt)}</span>
                      </span>
                    </div>
                  </div>

                  {/* Right Action: Amber Vote Now Button */}
                  <button
                    onClick={() => onOpenVote(poll.id)}
                    className="px-3.5 py-1.5 rounded-full bg-[#C4932C] hover:bg-[#AC7E1F] text-white text-[11px] font-bold shadow-xs transition-all flex items-center gap-0.5 active:scale-95 shrink-0"
                  >
                    <span>{t('dash.vote_now')}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : loading ? (
          <div className="space-y-2.5">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-3.5 shadow-xs flex items-center gap-3 animate-pulse"
              >
                <div className="w-[62px] h-[62px] sm:w-[68px] sm:h-[68px] rounded-xl bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-slate-200 rounded w-2/3" />
                  <div className="h-2.5 bg-slate-100 rounded w-1/2" />
                  <div className="h-2.5 bg-slate-100 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 text-center text-xs text-slate-500 shadow-2xs">
            {selectedCategory !== 'All'
              ? `No active contests found in "${selectedCategory}" category.`
              : featuredPoll
              ? 'No other active contests right now.'
              : 'No active contests found.'}
          </div>
        )}
      </section>

    </div>
  );
};
