import React, { useState, useEffect } from 'react';
import {
  Shield,
  PlusCircle,
  TrendingUp,
  Clock,
  Trash2,
  Share2,
  Copy,
  Check,
  Power,
  RotateCcw,
  Zap,
  BarChart3,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Eye,
  MessageCircle,
  MessageSquare,
  Upload,
  X,
  Users,
  UserCheck,
  Phone,
  Mail,
  MapPin,
  ArrowLeft,
  Search,
  Lock,
  ImageIcon,
  Sliders,
  Scale,
  FileText,
  Building,
  Edit2,
} from 'lucide-react';
import { Poll, AdminLog, UserAccount, DashboardBanner, CompanyRuleItem } from '../types';
import {
  createPoll,
  adminAddVotes,
  adminUpdatePollStatus,
  adminExtendPollExpiry,
  adminDeletePoll,
  subscribeToAdminLogs,
  clearAllPollsFromDatabase,
  shortenUrl,
  savePollShortUrl,
  subscribeToDashboardBanners,
  adminAddBanner,
  adminDeleteBanner,
  adminUpdateBanner,
  subscribeToCompanyRules,
  adminAddCompanyRule,
  adminDeleteCompanyRule,
  adminUpdateCompanyRule,
} from '../services/pollService';
import {
  getAllRegisteredUsers,
  adminUpdateUser,
  deleteAllUsersExceptAdmin,
} from '../services/authService';
import { CountdownTimer, calculateTimeRemaining } from './CountdownTimer';
import { generatePollShareUrls } from '../utils/urlHelper';
import { formatPollSmsMessage, getSmsIntentUrl } from '../utils/shortUrlHelper';
import { compressAndReadFile } from '../utils/imageUpload';
import {
  isVotingEnded,
  isPostResultExpired,
  calculateGraceRemaining,
} from '../utils/pollExpiry';
import { CroexLogo } from './CroexLogo';
import { AdminSecurityShield } from './AdminSecurityShield';
import { fetchContestSuggestions } from '../services/intelligenceService';

interface AdminPanelProps {
  polls: Poll[];
  onSelectPollForViewing: (pollId: string) => void;
  onLogoutAdmin: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  polls,
  onSelectPollForViewing,
  onLogoutAdmin,
}) => {
  const [activeTab, setActiveTab] = useState<'manage' | 'create' | 'banners' | 'company' | 'users' | 'analytics' | 'security'>('manage');
  const [manageFilter, setManageFilter] = useState<'all' | 'active' | 'results' | 'history'>('all');

  // Poll Search State for Admin
  const [pollSearch, setPollSearch] = useState<string>('');

  // Users Management State
  const [registeredUsers, setRegisteredUsers] = useState<UserAccount[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  const [userSearch, setUserSearch] = useState<string>('');
  const [adminNewPassword, setAdminNewPassword] = useState<string>('');
  const [userActionSuccess, setUserActionSuccess] = useState<string | null>(null);

  // Banners State
  const [banners, setBanners] = useState<DashboardBanner[]>([]);
  const [showBannerModal, setShowBannerModal] = useState<boolean>(false);
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerSubtitle, setBannerSubtitle] = useState('');
  const [bannerImage, setBannerImage] = useState('');
  const [bannerBadge, setBannerBadge] = useState('OFFICIAL');
  const [bannerPollId, setBannerPollId] = useState('');
  const [bannerOrder, setBannerOrder] = useState<number>(1);
  const [isSavingBanner, setIsSavingBanner] = useState<boolean>(false);
  const bannerFileInputRef = React.useRef<HTMLInputElement>(null);

  // Company Rules State
  const [companyRules, setCompanyRules] = useState<CompanyRuleItem[]>([]);
  const [showRuleModal, setShowRuleModal] = useState<boolean>(false);
  const [ruleTitle, setRuleTitle] = useState('');
  const [ruleDesc, setRuleDesc] = useState('');
  const [ruleCategory, setRuleCategory] = useState('Terms');
  const [isSavingRule, setIsSavingRule] = useState<boolean>(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  // Create Poll Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [c1Name, setC1Name] = useState('');
  const [c1Photo, setC1Photo] = useState('');
  const [c2Name, setC2Name] = useState('');
  const [c2Photo, setC2Photo] = useState('');
  const [days, setDays] = useState(1);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [category, setCategory] = useState('General');
  const [isCreating, setIsCreating] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const handleSuggest = async () => {
    if (!c1Name.trim() && !c2Name.trim()) {
      alert('Pehly candidates ky naam likhein taaky hum behtar tajweez de sakein.');
      return;
    }
    setIsSuggesting(true);
    const suggestions = await fetchContestSuggestions({
      candidate1Name: c1Name,
      candidate2Name: c2Name,
    });
    if (suggestions) {
      setTitle(suggestions.suggestedTitle);
      setDescription(suggestions.suggestedDescription);
      setDays(Math.floor(suggestions.suggestedDurationHours / 24));
      setHours(suggestions.suggestedDurationHours % 24);
      setCategory(suggestions.recommendedCategory);
    }
    setIsSuggesting(false);
  };

  // File input refs
  const c1FileRef = React.useRef<HTMLInputElement>(null);
  const c2FileRef = React.useRef<HTMLInputElement>(null);

  // Custom vote boost input map
  const [customBoostMap, setCustomBoostMap] = useState<Record<string, number>>({});
  const [boostSuccessToast, setBoostSuccessToast] = useState<string | null>(null);
  const [copyMap, setCopyMap] = useState<Record<string, boolean>>({});

  // Audit Logs
  const [logs, setLogs] = useState<AdminLog[]>([]);

  const fetchUsers = async () => {
    try {
      const list = await getAllRegisteredUsers();
      setRegisteredUsers(list);
    } catch (e) {
      console.warn('Error fetching users:', e);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [activeTab]);

  useEffect(() => {
    const unsub = subscribeToAdminLogs((newLogs) => {
      setLogs(newLogs);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = subscribeToDashboardBanners((list) => {
      setBanners(list);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = subscribeToCompanyRules((list) => {
      setCompanyRules(list);
    });
    return () => unsub();
  }, []);

  const showToast = (msg: string) => {
    setBoostSuccessToast(msg);
    setTimeout(() => setBoostSuccessToast(null), 3000);
  };

  const handleBoost = async (
    pollId: string,
    choice: 1 | 2,
    amount: number,
    candidateName: string,
    pollTitle: string
  ) => {
    try {
      await adminAddVotes(pollId, choice, amount, candidateName, pollTitle);
      showToast(`Successfully added +${amount} votes to ${candidateName}!`);
    } catch (e) {
      console.error('Boost error:', e);
      showToast('Failed to add manual votes');
    }
  };

  const handleGalleryUpload = async (file: File, setter: (val: string) => void) => {
    try {
      const dataUrl = await compressAndReadFile(file);
      setter(dataUrl);
    } catch (err) {
      console.error('File read error:', err);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !c1Name.trim() || !c2Name.trim()) {
      alert('Contest title and both candidate names are required!');
      return;
    }

    setIsCreating(true);
    try {
      const newId = await createPoll({
        title,
        description,
        candidate1Name: c1Name,
        candidate1Photo: c1Photo,
        candidate2Name: c2Name,
        candidate2Photo: c2Photo,
        durationDays: Number(days),
        durationHours: Number(hours),
        durationMinutes: Number(minutes),
        category,
        createdBy: 'Mudasir (Super Admin)',
      });

      // Feature: Auto-generate clean short link without 'ais' prefix
      try {
        const { shareUrl } = generatePollShareUrls(newId, title);
        const cleanLink = await shortenUrl(shareUrl);
        if (cleanLink && cleanLink !== shareUrl) {
          await savePollShortUrl(newId, cleanLink);
        }
      } catch (err) {
        console.warn('Post-creation shortening failed (admin):', err);
      }

      showToast('New voting contest created successfully!');
      setTitle('');
      setDescription('');
      setC1Name('');
      setC1Photo('');
      setC2Name('');
      setC2Photo('');
      setDays(1);
      setHours(0);
      setMinutes(0);
      setActiveTab('manage');
    } catch (err) {
      console.error('Error creating poll:', err);
      alert('Failed to publish contest.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = async (pollId: string, pollTitle: string) => {
    const poll = polls.find((p) => p.id === pollId);
    let linkToCopy = poll?.shortUrl && !poll.shortUrl.includes('ais-') ? poll.shortUrl : '';
    if (!linkToCopy) {
      const { shareUrl } = generatePollShareUrls(pollId, pollTitle);
      try {
        const clean = await shortenUrl(shareUrl);
        if (clean && !clean.includes('ais-')) {
          linkToCopy = clean;
          savePollShortUrl(pollId, clean);
        } else {
          linkToCopy = shareUrl;
        }
      } catch {
        linkToCopy = shareUrl;
      }
    }
    navigator.clipboard.writeText(linkToCopy);
    setCopyMap((prev) => ({ ...prev, [pollId]: true }));
    setTimeout(() => {
      setCopyMap((prev) => ({ ...prev, [pollId]: false }));
    }, 2000);
  };

  const totalVotesAcrossAll = polls.reduce((acc, p) => acc + p.totalVotes, 0);

  // Banner Actions
  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerTitle.trim() || !bannerImage.trim()) {
      showToast('Please provide a banner title and image');
      return;
    }
    setIsSavingBanner(true);
    try {
      await adminAddBanner({
        title: bannerTitle.trim(),
        subtitle: bannerSubtitle.trim(),
        imageUrl: bannerImage.trim(),
        badge: bannerBadge.trim() || 'OFFICIAL',
        pollId: bannerPollId.trim() || undefined,
        order: Number(bannerOrder) || (banners.length + 1),
        active: true,
      });
      showToast('Banner page created successfully!');
      setShowBannerModal(false);
      setBannerTitle('');
      setBannerSubtitle('');
      setBannerImage('');
      setBannerBadge('OFFICIAL');
      setBannerPollId('');
    } catch (e) {
      console.error('Error saving banner:', e);
      showToast('Failed to save banner');
    } finally {
      setIsSavingBanner(false);
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!confirm('Are you sure you want to delete this banner?')) return;
    try {
      await adminDeleteBanner(id);
      showToast('Banner deleted');
    } catch (e) {
      console.error(e);
      showToast('Failed to delete banner');
    }
  };

  const handleToggleBannerActive = async (banner: DashboardBanner) => {
    try {
      await adminUpdateBanner(banner.id, { active: !banner.active });
      showToast(`Banner ${!banner.active ? 'activated' : 'deactivated'}`);
    } catch (e) {
      console.error(e);
    }
  };

  // Company Rule Actions
  const handleSaveCompanyRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleTitle.trim() || !ruleDesc.trim()) {
      showToast('Please provide rule title and description');
      return;
    }
    setIsSavingRule(true);
    try {
      if (editingRuleId) {
        await adminUpdateCompanyRule(editingRuleId, {
          title: ruleTitle.trim(),
          description: ruleDesc.trim(),
          category: ruleCategory.trim() || 'Terms',
        });
        showToast('Rule updated successfully');
        setEditingRuleId(null);
      } else {
        await adminAddCompanyRule({
          title: ruleTitle.trim(),
          description: ruleDesc.trim(),
          category: ruleCategory.trim() || 'Terms',
          order: companyRules.length + 1,
          addedBy: 'Admin',
        });
        showToast('Company rule added successfully');
      }
      setShowRuleModal(false);
      setRuleTitle('');
      setRuleDesc('');
      setRuleCategory('Terms');
    } catch (e) {
      console.error(e);
      showToast('Failed to save rule');
    } finally {
      setIsSavingRule(false);
    }
  };

  const handleDeleteCompanyRule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this company rule?')) return;
    try {
      await adminDeleteCompanyRule(id);
      showToast('Company rule deleted');
    } catch (e) {
      console.error(e);
      showToast('Failed to delete rule');
    }
  };

  return (
    <div className="max-w-xl sm:max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 font-sans">
      {/* Toast Alert */}
      {boostSuccessToast && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 border border-slate-700 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold">{boostSuccessToast}</span>
        </div>
      )}

      {/* Top Admin App Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs mb-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CroexLogo size={42} />
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Croex Admin Panel
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  Super Admin
                </span>
              </div>
              <p className="text-slate-500 text-[11px] mt-0.5 font-medium">
                Mudasir.Voting.Centar.pk
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {polls.length > 0 && (
              <button
                onClick={async () => {
                  if (confirm('Are you sure you want to delete ALL contests from the database? This cannot be undone.')) {
                    await clearAllPollsFromDatabase();
                    showToast('All contests deleted successfully!');
                  }
                }}
                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-xl transition border border-rose-200 text-xs font-bold"
                title="Delete All Contests"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onLogoutAdmin}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 rounded-xl text-xs font-bold transition border border-slate-200"
            >
              <Power className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row (App-style compact 4-card grid) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3.5">
        <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Total Contests</span>
          <div className="text-xl font-black text-slate-900 mt-0.5 font-mono">{polls.length}</div>
        </div>
        <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">System Votes</span>
          <div className="text-xl font-black text-indigo-600 mt-0.5 font-mono">{totalVotesAcrossAll}</div>
        </div>
        <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Active Contests</span>
          <div className="text-xl font-black text-emerald-600 mt-0.5 font-mono">
            {polls.filter((p) => p.status === 'active' && !calculateTimeRemaining(p.expiresAt).isExpired).length}
          </div>
        </div>
        <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Manual Logs</span>
          <div className="text-xl font-black text-amber-600 mt-0.5 font-mono">{logs.length}</div>
        </div>
      </div>

      {/* App-style Segmented Tabs */}
      <div className="flex flex-wrap items-center p-1 bg-slate-200/80 rounded-xl mb-4 gap-1">
        <button
          onClick={() => setActiveTab('manage')}
          className={`flex-1 min-w-[95px] py-1.5 px-2 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 ${
            activeTab === 'manage'
              ? 'bg-white text-indigo-600 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Boost Votes</span>
        </button>

        <button
          onClick={() => setActiveTab('create')}
          className={`flex-1 min-w-[95px] py-1.5 px-2 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 ${
            activeTab === 'create'
              ? 'bg-white text-indigo-600 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>New Contest</span>
        </button>

        <button
          onClick={() => setActiveTab('banners')}
          className={`flex-1 min-w-[95px] py-1.5 px-2 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 ${
            activeTab === 'banners'
              ? 'bg-white text-[#C4932C] shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Banners ({banners.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('company')}
          className={`flex-1 min-w-[95px] py-1.5 px-2 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 ${
            activeTab === 'company'
              ? 'bg-white text-[#C4932C] shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Company Rules ({companyRules.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('users');
            setSelectedUser(null);
            fetchUsers();
          }}
          className={`flex-1 min-w-[95px] py-1.5 px-2 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 ${
            activeTab === 'users'
              ? 'bg-white text-indigo-600 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Users ({registeredUsers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex-1 min-w-[95px] py-1.5 px-2 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 ${
            activeTab === 'analytics'
              ? 'bg-white text-indigo-600 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Audit Logs</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex-1 min-w-[105px] py-1.5 px-2 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 ${
            activeTab === 'security'
              ? 'bg-emerald-600 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Cyber Shield</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
        </button>
      </div>


      {/* TAB 1: MANAGE & MANUAL VOTE BOOSTER */}
      {activeTab === 'manage' && (
        <div className="space-y-6">
          {/* Admin Manage Filter Pills and Poll Name Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 p-1.5 bg-white border border-slate-200 rounded-2xl w-fit shadow-2xs">
              <button
                onClick={() => setManageFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  manageFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Contests ({polls.length})
              </button>
              <button
                onClick={() => setManageFilter('active')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  manageFilter === 'active'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Live Active ({polls.filter((p) => !isVotingEnded(p)).length})
              </button>
              <button
                onClick={() => setManageFilter('results')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  manageFilter === 'results'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Results Out ({polls.filter((p) => isVotingEnded(p) && !isPostResultExpired(p)).length})
              </button>
              <button
                onClick={() => setManageFilter('history')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  manageFilter === 'history'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                History ({polls.filter((p) => isPostResultExpired(p)).length})
              </button>
            </div>

            {/* Poll Name Search Bar for Admin */}
            <div className="relative min-w-[240px] sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search contest by poll name..."
                value={pollSearch}
                onChange={(e) => setPollSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#C4932C] shadow-2xs"
              />
              {pollSearch && (
                <button
                  onClick={() => setPollSearch('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {polls.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center">
              <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-800">No Contests Active</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">Create your first 2-candidate contest.</p>
              <button
                onClick={() => setActiveTab('create')}
                className="px-5 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl"
              >
                Create Contest
              </button>
            </div>
          ) : (
            polls
              .filter((p) => {
                if (pollSearch.trim()) {
                  const q = pollSearch.toLowerCase();
                  const match =
                    p.title.toLowerCase().includes(q) ||
                    p.candidate1Name.toLowerCase().includes(q) ||
                    p.candidate2Name.toLowerCase().includes(q) ||
                    p.id.toLowerCase().includes(q);
                  if (!match) return false;
                }
                if (manageFilter === 'active') return !isVotingEnded(p);
                if (manageFilter === 'results') return isVotingEnded(p) && !isPostResultExpired(p);
                if (manageFilter === 'history') return isPostResultExpired(p);
                return true;
              })
              .map((poll) => {
                const isPollEnded = isVotingEnded(poll);
                const isPostResultLimit = isPostResultExpired(poll);
                const grace = calculateGraceRemaining(poll.expiresAt);
                const { shareUrl, whatsappUrl } = generatePollShareUrls(poll.id, poll.title);
                const total = poll.candidate1Votes + poll.candidate2Votes;
                const c1Pct = total > 0 ? Math.round((poll.candidate1Votes / total) * 100) : 50;
                const c2Pct = total > 0 ? Math.round((poll.candidate2Votes / total) * 100) : 50;

                return (
                  <div
                    key={poll.id}
                    className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs hover:border-slate-300 transition"
                  >
                    {/* Top Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {poll.category || 'Contest'}
                          </span>
                          <span
                            className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                              isPostResultLimit
                                ? 'bg-slate-100 text-slate-700 border border-slate-300'
                                : isPollEnded
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {isPostResultLimit
                              ? '📜 In History (Auto-deleted from Dashboard)'
                              : isPollEnded
                              ? `🏆 Results Out (Dashboard se delete in: ${grace.formatted})`
                              : 'Active Contest'}
                          </span>
                        </div>
                        <h2 className="text-xl font-black text-slate-900 mt-1">{poll.title}</h2>
                      </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSelectPollForViewing(poll.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Isolated Voting View</span>
                      </button>

                      <button
                        onClick={() => handleCopyLink(poll.id, poll.title)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                      >
                        {copyMap[poll.id] ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copyMap[poll.id] ? 'Copied' : 'Copy Link'}</span>
                      </button>

                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition"
                        title="Share on WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>

                      <a
                        href={getSmsIntentUrl(formatPollSmsMessage(poll.title, shareUrl, poll.id))}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition"
                        title="Share via SMS (Mobile Messaging)"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>SMS</span>
                      </a>
                    </div>
                  </div>

                  {/* Manual Vote Adjustment Grid (Admin Marzi Jitnay Votes Bharaein) */}
                  <div className="my-6 p-5 bg-indigo-50/40 border border-indigo-100 rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-indigo-600" />
                        <h4 className="text-xs sm:text-sm font-black text-indigo-950 uppercase tracking-wider">
                          Mudasir Vote Booster (Exclusive Admin Control)
                        </h4>
                      </div>
                      <span className="text-xs text-indigo-700 font-bold hidden sm:inline">
                        Instant Firestore Sync
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Candidate 1 Booster */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <img
                              src={poll.candidate1Photo}
                              alt={poll.candidate1Name}
                              className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                            />
                            <div>
                              <strong className="block text-sm font-black text-slate-900">
                                {poll.candidate1Name}
                              </strong>
                              <span className="text-[11px] text-slate-400 font-bold">Candidate 1</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="block text-xl font-black text-indigo-600 font-mono">
                              {poll.candidate1Votes}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold">{c1Pct}% of total</span>
                          </div>
                        </div>

                        {/* Quick Boost */}
                        <div>
                          <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                            Quick Vote Boost:
                          </span>
                          <div className="grid grid-cols-5 gap-1.5">
                            {[1, 5, 10, 50, 100].map((num) => (
                              <button
                                key={num}
                                onClick={() => handleBoost(poll.id, 1, num, poll.candidate1Name, poll.title)}
                                className="py-1.5 px-1 bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-800 text-xs font-black rounded-lg transition"
                              >
                                +{num}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Custom Input Boost */}
                        <div className="mt-3 flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            placeholder="Custom Amount"
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            onChange={(e) =>
                              setCustomBoostMap((prev) => ({
                                ...prev,
                                [`${poll.id}_1`]: Number(e.target.value),
                              }))
                            }
                          />
                          <button
                            onClick={() => {
                              const amount = customBoostMap[`${poll.id}_1`];
                              if (amount && amount > 0) {
                                handleBoost(poll.id, 1, amount, poll.candidate1Name, poll.title);
                              }
                            }}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shrink-0 transition"
                          >
                            Add
                          </button>
                        </div>
                      </div>

                      {/* Candidate 2 Booster */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <img
                              src={poll.candidate2Photo}
                              alt={poll.candidate2Name}
                              className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                            />
                            <div>
                              <strong className="block text-sm font-black text-slate-900">
                                {poll.candidate2Name}
                              </strong>
                              <span className="text-[11px] text-slate-400 font-bold">Candidate 2</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="block text-xl font-black text-indigo-600 font-mono">
                              {poll.candidate2Votes}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold">{c2Pct}% of total</span>
                          </div>
                        </div>

                        {/* Quick Boost */}
                        <div>
                          <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                            Quick Vote Boost:
                          </span>
                          <div className="grid grid-cols-5 gap-1.5">
                            {[1, 5, 10, 50, 100].map((num) => (
                              <button
                                key={num}
                                onClick={() => handleBoost(poll.id, 2, num, poll.candidate2Name, poll.title)}
                                className="py-1.5 px-1 bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-800 text-xs font-black rounded-lg transition"
                              >
                                +{num}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Custom Input Boost */}
                        <div className="mt-3 flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            placeholder="Custom Amount"
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            onChange={(e) =>
                              setCustomBoostMap((prev) => ({
                                ...prev,
                                [`${poll.id}_2`]: Number(e.target.value),
                              }))
                            }
                          />
                          <button
                            onClick={() => {
                              const amount = customBoostMap[`${poll.id}_2`];
                              if (amount && amount > 0) {
                                handleBoost(poll.id, 2, amount, poll.candidate2Name, poll.title);
                              }
                            }}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shrink-0 transition"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Expiry Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-600">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span>Expiry:</span>
                        <CountdownTimer expiresAt={poll.expiresAt} compact />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => adminExtendPollExpiry(poll.id, 24)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                      >
                        +1 Day Extend
                      </button>

                      <button
                        onClick={() => adminExtendPollExpiry(poll.id, 1)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                      >
                        +1 Hour Extend
                      </button>

                      {isPollEnded ? (
                        <button
                          onClick={() => adminExtendPollExpiry(poll.id, 24)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition"
                        >
                          Re-Open Contest
                        </button>
                      ) : (
                        <button
                          onClick={() => adminUpdatePollStatus(poll.id, 'closed')}
                          className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold rounded-xl transition"
                        >
                          Close Now
                        </button>
                      )}

                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this contest?')) {
                            adminDeletePoll(poll.id);
                          }
                        }}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl transition"
                      >
                        <Trash2 className="w-3.5 h-3.5 inline mr-1" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: CREATE CONTEST WITH GALLERY */}
      {activeTab === 'create' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
              <PlusCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">Create Official 2-Candidate Contest</h2>
              <p className="text-xs text-slate-500">Configure candidates, gallery pictures, and timer.</p>
            </div>
          </div>

          <form onSubmit={handleCreateSubmit} className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Contest Title *
                </label>
                <button
                  type="button"
                  onClick={handleSuggest}
                  disabled={isSuggesting}
                  className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-black transition active:scale-95 border border-indigo-100 disabled:opacity-50"
                >
                  <Zap className={`w-3 h-3 ${isSuggesting ? 'animate-pulse' : ''}`} />
                  <span>{isSuggesting ? 'Thinking...' : 'Smart Suggest'}</span>
                </button>
              </div>
              <input
                type="text"
                placeholder="e.g. Mudasir Khan vs Ali Hassan - Who is the leader?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Description (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Details of the contest..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Candidates 1 & 2: Side-by-Side Large Photos with Center VS */}
            <div className="relative pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
                {/* Candidate 1 */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                        A
                      </span>
                      <span className="text-xs font-black text-slate-800">
                        Side A (Bari Photo)
                      </span>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Name *</label>
                      <input
                        type="text"
                        placeholder="Candidate A Name"
                        value={c1Name}
                        onChange={(e) => setC1Name(e.target.value)}
                        required
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Photo (Gallery Upload)</label>
                    {c1Photo ? (
                      <div className="relative w-full h-44 rounded-xl overflow-hidden border border-slate-300 bg-slate-900 mb-2">
                        <img src={c1Photo} alt="C1" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setC1Photo('')}
                          className="absolute top-2 right-2 px-2 py-1 bg-rose-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-md hover:bg-rose-700"
                        >
                          <X className="w-3 h-3" />
                          <span>Remove</span>
                        </button>
                      </div>
                    ) : (
                      <div className="mb-2">
                        <input
                          type="file"
                          ref={c1FileRef}
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) handleGalleryUpload(e.target.files[0], setC1Photo);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => c1FileRef.current?.click()}
                          className="w-full h-40 bg-white hover:bg-indigo-50/40 border-2 border-dashed border-indigo-200 hover:border-indigo-500 rounded-xl text-xs font-bold text-slate-700 flex flex-col items-center justify-center gap-1.5 transition"
                        >
                          <Upload className="w-5 h-5 text-indigo-600" />
                          <span>Upload Side A Photo from Gallery</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Center VS Marker */}
                <div className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-slate-950 text-white font-black text-xs items-center justify-center border-4 border-white shadow-lg z-10 pointer-events-none">
                  VS
                </div>

                {/* Candidate 2 */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                        B
                      </span>
                      <span className="text-xs font-black text-slate-800">
                        Side B (Bari Photo)
                      </span>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Name *</label>
                      <input
                        type="text"
                        placeholder="Candidate B Name"
                        value={c2Name}
                        onChange={(e) => setC2Name(e.target.value)}
                        required
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Photo (Gallery Upload)</label>
                    {c2Photo ? (
                      <div className="relative w-full h-44 rounded-xl overflow-hidden border border-slate-300 bg-slate-900 mb-2">
                        <img src={c2Photo} alt="C2" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setC2Photo('')}
                          className="absolute top-2 right-2 px-2 py-1 bg-rose-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-md hover:bg-rose-700"
                        >
                          <X className="w-3 h-3" />
                          <span>Remove</span>
                        </button>
                      </div>
                    ) : (
                      <div className="mb-2">
                        <input
                          type="file"
                          ref={c2FileRef}
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) handleGalleryUpload(e.target.files[0], setC2Photo);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => c2FileRef.current?.click()}
                          className="w-full h-40 bg-white hover:bg-indigo-50/40 border-2 border-dashed border-indigo-200 hover:border-indigo-500 rounded-xl text-xs font-bold text-slate-700 flex flex-col items-center justify-center gap-1.5 transition"
                        >
                          <Upload className="w-5 h-5 text-indigo-600" />
                          <span>Upload Candidate 2 Photo from Gallery</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Duration */}
            <div className="p-4 sm:p-5 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                  Duration & Automatic Expiry
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Days</label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Hours</label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={hours}
                    onChange={(e) => setHours(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Minutes</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={minutes}
                    onChange={(e) => setMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isCreating}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm rounded-xl transition shadow-md flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-5 h-5" />
              <span>{isCreating ? 'Publishing Contest...' : 'Publish Contest & Activate'}</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: REAL-TIME ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
            <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              <span>Live Vote Distribution Analytics</span>
            </h3>

            <div className="space-y-5">
              {polls.map((poll) => {
                const total = poll.candidate1Votes + poll.candidate2Votes;
                const c1Pct = total > 0 ? Math.round((poll.candidate1Votes / total) * 100) : 50;
                const c2Pct = total > 0 ? Math.round((poll.candidate2Votes / total) * 100) : 50;

                return (
                  <div key={poll.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div className="flex items-center justify-between mb-2">
                      <strong className="text-sm font-black text-slate-900">{poll.title}</strong>
                      <span className="text-xs font-mono font-bold text-slate-500">
                        {total} Total Votes
                      </span>
                    </div>

                    <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden flex mb-2">
                      <div
                        className="bg-emerald-500 h-full transition-all duration-500"
                        style={{ width: `${c1Pct}%` }}
                      />
                      <div
                        className="bg-slate-800 h-full transition-all duration-500"
                        style={{ width: `${c2Pct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-emerald-700">
                        {poll.candidate1Name}: {poll.candidate1Votes} ({c1Pct}%)
                      </span>
                      <span className="text-slate-800">
                        {poll.candidate2Name}: {poll.candidate2Votes} ({c2Pct}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Audit Logs */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
            <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              <span>Admin Manual Boost Activity Log</span>
            </h3>

            {logs.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                No manual boost actions performed yet.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {logs.map((log) => (
                  <div key={log.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <strong className="text-slate-800 font-semibold">{log.action}</strong>
                      {log.pollTitle && (
                        <span className="text-slate-400 block text-[11px]">{log.pollTitle}</span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md font-mono font-bold">
                        +{log.addedVotes} votes
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: USERS MANAGEMENT & IN-DEPTH DETAIL PAGE */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Subview 1: In-Depth User Detail Page */}
          {selectedUser ? (
            <div className="space-y-4">
              {/* Back Button */}
              <button
                onClick={() => setSelectedUser(null)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition shadow-2xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Users List</span>
              </button>

              {userActionSuccess && (
                <div className="p-3 bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{userActionSuccess}</span>
                </div>
              )}

              {/* User Profile Overview Card */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pb-5 border-b border-slate-100 text-center sm:text-left">
                  {/* Photo */}
                  <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-900 border-2 border-indigo-200 shadow-sm flex items-center justify-center shrink-0">
                    {selectedUser.photo ? (
                      <img
                        src={selectedUser.photo}
                        alt={selectedUser.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-black text-white uppercase">
                        {selectedUser.name?.charAt(0) || selectedUser.email?.charAt(0) || 'U'}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                      <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                        {selectedUser.name || 'Unnamed User'}
                      </h2>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          selectedUser.status === 'suspended'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {selectedUser.status === 'suspended' ? 'Suspended' : 'Active Account'}
                      </span>
                    </div>

                    <p className="text-xs font-mono text-slate-500 flex items-center justify-center sm:justify-start gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{selectedUser.email}</span>
                    </p>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-2 text-xs text-slate-600">
                      {selectedUser.phone ? (
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                          <Phone className="w-3 h-3 text-emerald-600" />
                          <span>{selectedUser.phone}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No phone added</span>
                      )}

                      {selectedUser.city && (
                        <span className="inline-flex items-center gap-1 font-medium bg-slate-100 px-2 py-0.5 rounded-lg">
                          <MapPin className="w-3 h-3 text-rose-500" />
                          <span>{selectedUser.city}</span>
                        </span>
                      )}
                    </div>

                    {selectedUser.bio && (
                      <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2 rounded-xl border border-slate-100 italic">
                        "{selectedUser.bio}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Metrics */}
                {(() => {
                  const userContests = polls.filter(
                    (p) =>
                      p.creatorEmail === selectedUser.email ||
                      p.creatorId === selectedUser.id ||
                      p.createdBy === selectedUser.name
                  );
                  const totalContestVotes = userContests.reduce((acc, p) => acc + p.totalVotes, 0);

                  return (
                    <div>
                      <div className="grid grid-cols-3 gap-2 my-4 text-center">
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                          <span className="block text-[10px] font-bold text-slate-400 uppercase">
                            Contests
                          </span>
                          <span className="text-lg font-black font-mono text-slate-900 mt-0.5 block">
                            {userContests.length}
                          </span>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                          <span className="block text-[10px] font-bold text-slate-400 uppercase">
                            Votes Received
                          </span>
                          <span className="text-lg font-black font-mono text-indigo-600 mt-0.5 block">
                            {totalContestVotes}
                          </span>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                          <span className="block text-[10px] font-bold text-slate-400 uppercase">
                            Registered
                          </span>
                          <span className="text-[11px] font-bold text-slate-700 mt-1 block">
                            {selectedUser.createdAt
                              ? new Date(selectedUser.createdAt).toLocaleDateString()
                              : 'Recently'}
                          </span>
                        </div>
                      </div>

                      {/* Admin Quick Actions on this User */}
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 mb-5">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Admin Controls for {selectedUser.name}</span>
                        </h4>

                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <button
                            onClick={async () => {
                              const newStatus = selectedUser.status === 'suspended' ? 'active' : 'suspended';
                              await adminUpdateUser(selectedUser.email, { status: newStatus });
                              setSelectedUser({ ...selectedUser, status: newStatus });
                              setUserActionSuccess(`User account status updated to: ${newStatus}`);
                              fetchUsers();
                              setTimeout(() => setUserActionSuccess(null), 3000);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                              selectedUser.status === 'suspended'
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'bg-rose-100 hover:bg-rose-200 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {selectedUser.status === 'suspended' ? '✓ Re-Activate Account' : 'Suspend Account'}
                          </button>
                        </div>

                        {/* Reset Password Directly */}
                        <div className="pt-2 border-t border-slate-200">
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                            Set New Password Directly:
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="New password (e.g. Pass123)"
                              value={adminNewPassword}
                              onChange={(e) => setAdminNewPassword(e.target.value)}
                              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs flex-1 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <button
                              onClick={async () => {
                                if (!adminNewPassword.trim() || adminNewPassword.trim().length < 4) {
                                  alert('Password kam az kam 4 characters ka hona chahiye.');
                                  return;
                                }
                                await adminUpdateUser(selectedUser.email, {
                                  password: adminNewPassword.trim(),
                                });
                                setUserActionSuccess('User password kamyabi se reset ho gaya!');
                                setAdminNewPassword('');
                                setTimeout(() => setUserActionSuccess(null), 3000);
                              }}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shrink-0"
                            >
                              Update Password
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* User's Contests List */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                          Contests Created by {selectedUser.name} ({userContests.length})
                        </h4>

                        {userContests.length === 0 ? (
                          <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl text-center text-xs text-slate-500">
                            Is user ne abhi koi contest start nahi kiya.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {userContests.map((c) => (
                              <div
                                key={c.id}
                                className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 hover:bg-slate-100/70 transition"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-slate-900 overflow-hidden shrink-0 border border-slate-200">
                                    <img
                                      src={c.candidate1Photo}
                                      alt={c.candidate1Name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div>
                                    <h5 className="text-xs font-black text-slate-900 line-clamp-1">
                                      {c.title}
                                    </h5>
                                    <span className="text-[11px] font-mono font-bold text-indigo-700">
                                      {c.totalVotes} Total Votes ({c.candidate1Name} vs {c.candidate2Name})
                                    </span>
                                  </div>
                                </div>

                                <button
                                  onClick={() => onSelectPollForViewing(c.id)}
                                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>View</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : (
            /* Subview 2: All Users Directory */
            <div className="space-y-4">
              {/* Search & Header */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      Registered Users ({registeredUsers.length})
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Kisi bhi user par click karke mukammal data aur contests dekhein.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  {/* Search Input */}
                  <div className="relative w-full sm:w-56">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                    />
                  </div>

                  {/* Delete All Users Except Admin Button */}
                  <button
                    type="button"
                    onClick={async () => {
                      if (
                        window.confirm(
                          'Kya aap waqai Super Admin ke ilawa baqi tamaam users ke accounts delete karna chahte hain? (Yeh amal wapis nahi ho sakta)'
                        )
                      ) {
                        const res = await deleteAllUsersExceptAdmin();
                        alert(`Super Admin ke ilawa ${res.deletedCount} user accounts kamyabi se delete kar diye gaye hain.`);
                        fetchUsers();
                      }
                    }}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                    title="Delete all user accounts except Super Admin"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete All (Except Admin)</span>
                  </button>
                </div>
              </div>

              {/* Users List Grid */}
              {registeredUsers.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center">
                  <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-bold">Koi user registered nahi mila.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {registeredUsers
                    .filter((u) => {
                      if (!userSearch.trim()) return true;
                      const q = userSearch.toLowerCase();
                      return (
                        u.name?.toLowerCase().includes(q) ||
                        u.email?.toLowerCase().includes(q) ||
                        u.phone?.toLowerCase().includes(q)
                      );
                    })
                    .map((user) => {
                      const userContestsCount = polls.filter(
                        (p) =>
                          p.creatorEmail === user.email ||
                          p.creatorId === user.id ||
                          p.createdBy === user.name
                      ).length;

                      return (
                        <div
                          key={user.id || user.email}
                          onClick={() => setSelectedUser(user)}
                          className="bg-white border border-slate-200 hover:border-indigo-400 rounded-2xl p-4 shadow-2xs hover:shadow-sm transition cursor-pointer flex items-center justify-between gap-3 group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Avatar */}
                            <div className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                              {user.photo ? (
                                <img
                                  src={user.photo}
                                  alt={user.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-sm font-black text-white uppercase">
                                  {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                                </span>
                              )}
                            </div>

                            {/* Details */}
                            <div className="min-w-0">
                              <h4 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-indigo-600 transition truncate">
                                {user.name || 'Unnamed'}
                              </h4>
                              <p className="text-[11px] font-mono text-slate-500 truncate">
                                {user.email}
                              </p>
                              {user.phone && (
                                <p className="text-[10px] font-mono font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                                  <Phone className="w-2.5 h-2.5" />
                                  <span>{user.phone}</span>
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="block text-[10px] font-bold uppercase text-slate-400">
                              Contests
                            </span>
                            <span className="text-xs font-black font-mono text-indigo-600">
                              {userContestsCount}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB: BANNERS (Multi-page dashboard banners manager) */}
      {activeTab === 'banners' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-[#C4932C]" />
                <span>Dashboard Multi-Page Banners</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Admin can add as many banner pages as desired. Users can scroll through them on the home dashboard.
              </p>
            </div>
            <button
              onClick={() => {
                setBannerTitle('');
                setBannerSubtitle('');
                setBannerImage('');
                setBannerBadge('OFFICIAL');
                setBannerPollId('');
                setBannerOrder(banners.length + 1);
                setShowBannerModal(true);
              }}
              className="px-4 py-2 bg-[#C4932C] hover:bg-[#AC7E1F] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add New Banner Page</span>
            </button>
          </div>

          {/* Banner list */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {banners.map((b, idx) => (
              <div
                key={b.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col justify-between gap-3 group"
              >
                <div>
                  <div className="relative h-32 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 mb-2.5">
                    <img
                      src={b.imageUrl}
                      alt={b.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/croex-ballot-hero.jpg';
                      }}
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-[#C4932C] text-white text-[9px] font-black uppercase tracking-wider shadow-xs">
                      {b.badge || `PAGE ${idx + 1}`}
                    </div>
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-mono font-bold backdrop-blur-xs">
                      #{b.order || idx + 1}
                    </div>
                  </div>

                  <h4 className="text-sm font-black text-slate-900 leading-tight">
                    {b.title}
                  </h4>
                  {b.subtitle && (
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                      {b.subtitle}
                    </p>
                  )}
                  {b.pollId && (
                    <span className="inline-block mt-2 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Linked to Poll: {b.pollId}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
                    {b.active ? '● Active on Dashboard' : '○ Inactive'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggleBannerActive(b)}
                      className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                    >
                      {b.active ? 'Hide' : 'Show'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBanner(b.id)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Delete banner"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Modal: Add New Banner */}
          {showBannerModal && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-200">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <PlusCircle className="w-4 h-4 text-[#C4932C]" />
                    <span>Create New Dashboard Banner Page</span>
                  </h3>
                  <button
                    onClick={() => setShowBannerModal(false)}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveBanner} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                      Banner Title / Headline *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Special Election Notice 2026"
                      value={bannerTitle}
                      onChange={(e) => setBannerTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#C4932C]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                      Banner Subtitle / Description
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Vote live between top candidates with real-time countdown"
                      value={bannerSubtitle}
                      onChange={(e) => setBannerSubtitle(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#C4932C]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                      Badge Label (Pill Tag)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. OFFICIAL, LIVE CONTEST, BREAKING, FEATURED"
                      value={bannerBadge}
                      onChange={(e) => setBannerBadge(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#C4932C]"
                    />
                  </div>

                  {/* Banner Photo Pick Upload */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                      Banner Picture (Pick from Gallery / File or URL) *
                    </label>
                    {bannerImage ? (
                      <div className="relative h-28 rounded-xl overflow-hidden border border-slate-300 bg-slate-950 mb-1.5">
                        <img src={bannerImage} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setBannerImage('')}
                          className="absolute top-2 right-2 px-2 py-0.5 bg-rose-600 text-white rounded text-[10px] font-bold"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <input
                          type="file"
                          ref={bannerFileInputRef}
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            if (e.target.files?.[0]) {
                              const compressed = await compressAndReadFile(e.target.files[0]);
                              setBannerImage(compressed);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => bannerFileInputRef.current?.click()}
                          className="w-full py-3 bg-slate-50 hover:bg-slate-100 border-2 border-dashed border-slate-300 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition"
                        >
                          <Upload className="w-4 h-4 text-slate-500" />
                          <span>Upload Banner Picture from Gallery</span>
                        </button>
                        <input
                          type="text"
                          placeholder="Or paste image URL (https://...)"
                          value={bannerImage}
                          onChange={(e) => setBannerImage(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700"
                        />
                      </div>
                    )}
                  </div>

                  {/* Optional Poll Connection */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                      Link Banner to a Contest (Optional)
                    </label>
                    <select
                      value={bannerPollId}
                      onChange={(e) => setBannerPollId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                    >
                      <option value="">None (Static announcement banner)</option>
                      {polls.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title} ({p.candidate1Name} vs {p.candidate2Name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowBannerModal(false)}
                      className="px-3.5 py-1.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingBanner}
                      className="px-4 py-1.5 bg-[#C4932C] hover:bg-[#AC7E1F] text-white rounded-xl text-xs font-bold flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isSavingBanner ? 'Saving...' : 'Add Banner'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: COMPANY RULES (Admin managed company rules & announcements) */}
      {activeTab === 'company' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Building className="w-5 h-5 text-[#C4932C]" />
                <span>Company Rules & Policy Manager</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Admin can add new rules, policies, or announcements ("company ky rools new bat add kar saky"). All users will see these in the Company tab.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingRuleId(null);
                setRuleTitle('');
                setRuleDesc('');
                setRuleCategory('Terms');
                setShowRuleModal(true);
              }}
              className="px-4 py-2 bg-[#C4932C] hover:bg-[#AC7E1F] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add New Rule / Announcement</span>
            </button>
          </div>

          {/* Rules List */}
          <div className="space-y-2.5">
            {companyRules.map((rule, idx) => (
              <div
                key={rule.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-lg bg-[#C4932C] text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-slate-900">
                        {rule.title}
                      </h4>
                      {rule.category && (
                        <span className="text-[9px] font-bold px-2 py-0.5 bg-amber-50 text-amber-800 rounded-full border border-amber-200">
                          {rule.category}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed font-medium whitespace-pre-line">
                      {rule.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => {
                      setEditingRuleId(rule.id);
                      setRuleTitle(rule.title);
                      setRuleDesc(rule.description);
                      setRuleCategory(rule.category || 'Terms');
                      setShowRuleModal(true);
                    }}
                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                    title="Edit Rule"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteCompanyRule(rule.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition"
                    title="Delete Rule"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Modal: Add / Edit Company Rule */}
          {showRuleModal && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-200">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#C4932C]" />
                    <span>{editingRuleId ? 'Edit Rule' : 'Add New Company Rule / Announcement'}</span>
                  </h3>
                  <button
                    onClick={() => setShowRuleModal(false)}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveCompanyRule} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                      Rule Title / Heading *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 6. Automated Fraud Filter Guidelines"
                      value={ruleTitle}
                      onChange={(e) => setRuleTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#C4932C]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                      Category Tag
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Policy, Security, Terms, Announcement"
                      value={ruleCategory}
                      onChange={(e) => setRuleCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#C4932C]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                      Rule Details / Terms Text *
                    </label>
                    <textarea
                      rows={4}
                      required
                      placeholder="Enter the official rule, policy statement, or update announcement..."
                      value={ruleDesc}
                      onChange={(e) => setRuleDesc(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#C4932C]"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowRuleModal(false)}
                      className="px-3.5 py-1.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingRule}
                      className="px-4 py-1.5 bg-[#C4932C] hover:bg-[#AC7E1F] text-white rounded-xl text-xs font-bold flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isSavingRule ? 'Saving...' : 'Save Rule'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 7: CYBER SECURITY SHIELD & ATTACK DEFENSE CENTER */}
      {activeTab === 'security' && <AdminSecurityShield />}
    </div>
  );
};

