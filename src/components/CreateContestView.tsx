import React, { useState, useRef, useEffect } from 'react';
import {
  PlusCircle,
  Upload,
  Clock,
  CheckCircle2,
  Copy,
  Check,
  MessageCircle,
  Eye,
  X,
  Camera,
  Globe,
  Image as ImageIcon,
  ArrowRight,
  MessageSquare,
  Zap,
} from 'lucide-react';
import { UserSession, Poll } from '../types';
import { fetchContestSuggestions } from '../services/intelligenceService';
import { createPoll, savePollShortUrl, shortenUrl } from '../services/pollService';
import { compressAndReadFile } from '../utils/imageUpload';
import { generatePollShareUrls } from '../utils/urlHelper';
import {
  formatPollWhatsAppMessage,
  formatPollSmsMessage,
  getSmsIntentUrl,
} from '../utils/shortUrlHelper';
import { useLanguage } from '../contexts/LanguageContext';

interface CreateContestViewProps {
  currentUser: UserSession | null;
  onContestCreated: (newPollId: string) => void;
  onOpenVotePage: (pollId: string) => void;
}

export const CreateContestView: React.FC<CreateContestViewProps> = ({
  currentUser,
  onContestCreated,
  onOpenVotePage,
}) => {
  const { t } = useLanguage();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [bannerPhoto, setBannerPhoto] = useState('');
  const [c1Name, setC1Name] = useState('');
  const [c1Photo, setC1Photo] = useState('');
  const [c2Name, setC2Name] = useState('');
  const [c2Photo, setC2Photo] = useState('');

  // Days, Hours, Minutes, Seconds
  const [days, setDays] = useState<number>(1);
  const [hours, setHours] = useState<number>(0);
  const [minutes, setMinutes] = useState<number>(0);
  const [seconds, setSeconds] = useState<number>(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdPollId, setCreatedPollId] = useState<string | null>(null);
  const [createdPollTitle, setCreatedPollTitle] = useState<string>('');
  const [tinyUrl, setTinyUrl] = useState<string | null>(null);
  const [copiedDirect, setCopiedDirect] = useState<boolean>(false);

  const [isSuggesting, setIsSuggesting] = useState(false);
  const bannerFileRef = useRef<HTMLInputElement>(null);
  const c1FileRef = useRef<HTMLInputElement>(null);
  const c2FileRef = useRef<HTMLInputElement>(null);

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
      // Auto-set duration if provided
      if (suggestions.suggestedDurationHours) {
        setDays(Math.floor(suggestions.suggestedDurationHours / 24));
        setHours(suggestions.suggestedDurationHours % 24);
      }
    }
    setIsSuggesting(false);
  };

  const handleGalleryUpload = async (
    file: File,
    setTarget: (url: string) => void
  ) => {
    try {
      const compressedDataUrl = await compressAndReadFile(file);
      setTarget(compressedDataUrl);
    } catch (err) {
      console.error('Gallery file upload failed:', err);
      alert('Could not process photo. Please choose another image.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !c1Name.trim() || !c2Name.trim()) {
      alert('Please fill Poll Name, Candidate A Name, and Candidate B Name.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Calculate total duration in minutes
      const totalMinutes =
        Number(days) * 24 * 60 +
        Number(hours) * 60 +
        Number(minutes) +
        Math.ceil(Number(seconds) / 60);

      const newId = await createPoll({
        title: title.trim(),
        description:
          description.trim() ||
          `${c1Name.trim()} vs ${c2Name.trim()} - Official Head-to-Head Live Contest`,
        candidate1Name: c1Name.trim(),
        candidate1Photo:
          c1Photo.trim() ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        candidate2Name: c2Name.trim(),
        candidate2Photo:
          c2Photo.trim() ||
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
        durationDays: 0,
        durationHours: 0,
        durationMinutes: Math.max(totalMinutes, 1),
        category: 'Contest',
        createdBy: currentUser?.name || 'Voter',
        creatorId: currentUser?.id || '',
        creatorEmail: currentUser?.email || '',
        bannerPhoto: bannerPhoto.trim(), // User's custom thumbnail for dashboard
      });

      // Cache contest locally for 0ms instant loading
      const localPollData: Partial<Poll> = {
        id: newId,
        title: title.trim(),
        description:
          description.trim() ||
          `${c1Name.trim()} vs ${c2Name.trim()} - Official Head-to-Head Live Contest`,
        candidate1Name: c1Name.trim(),
        candidate1Photo: c1Photo.trim(),
        candidate1Votes: 0,
        candidate2Name: c2Name.trim(),
        candidate2Photo: c2Photo.trim(),
        candidate2Votes: 0,
        totalVotes: 0,
        expiresAt: new Date(Date.now() + Math.max(totalMinutes, 1) * 60000).toISOString(),
        createdAt: new Date().toISOString(),
        createdBy: currentUser?.name || 'Voter',
        creatorId: currentUser?.id || '',
        creatorEmail: currentUser?.email || '',
        status: 'active',
        category: 'Contest',
        bannerPhoto: bannerPhoto.trim(),
      };
      try {
        localStorage.setItem(`mvc_poll_${newId}`, JSON.stringify(localPollData));
        const myPolls: string[] = JSON.parse(localStorage.getItem('mvc_my_poll_ids') || '[]');
        if (!myPolls.includes(newId)) {
          myPolls.push(newId);
          localStorage.setItem('mvc_my_poll_ids', JSON.stringify(myPolls));
        }
      } catch {}

      // Feature: Auto-generate clean short link without 'ais' prefix BEFORE revealing share card
      let cleanLink = '';
      try {
        const { shareUrl } = generatePollShareUrls(newId, title, localPollData);
        cleanLink = await shortenUrl(shareUrl);
        if (cleanLink && !cleanLink.includes('ais-')) {
          setTinyUrl(cleanLink);
          await savePollShortUrl(newId, cleanLink);
        }
      } catch (err) {
        console.warn('Post-creation shortening failed:', err);
      }

      setCreatedPollId(newId);
      setCreatedPollTitle(title);
    } catch (err) {
      console.error('Failed to create contest:', err);
      alert('Could not publish contest. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setTitle('');
    setDescription('');
    setBannerPhoto('');
    setC1Name('');
    setC1Photo('');
    setC2Name('');
    setC2Photo('');
    setDays(1);
    setHours(0);
    setMinutes(0);
    setSeconds(0);
    setCreatedPollId(null);
    setTinyUrl(null);
  };

  // Immediate Share Card upon creation with unique clean short link
  if (createdPollId) {
    const { shareUrl } = generatePollShareUrls(createdPollId, createdPollTitle);
    const activeShareUrl = tinyUrl || shareUrl;
    const whatsappMessage = formatPollWhatsAppMessage(createdPollTitle, activeShareUrl, createdPollId);
    const whatsappLink = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMessage)}`;
    const smsMessage = formatPollSmsMessage(createdPollTitle, activeShareUrl, createdPollId);
    const smsLink = getSmsIntentUrl(smsMessage);

    const handleCopy = () => {
      navigator.clipboard.writeText(activeShareUrl);
      setCopiedDirect(true);
      setTimeout(() => setCopiedDirect(false), 2000);
    };

    return (
      <div className="max-w-[430px] mx-auto px-4 py-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs text-center">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-2xs">
            <CheckCircle2 className="w-7 h-7" />
          </div>

          <h2 className="text-lg font-black text-slate-900 tracking-tight">
            {t('create.success_title')}
          </h2>
          <p className="text-xs text-slate-500 mt-1 mb-4 font-medium">
            {t('create.success_desc')}
          </p>

          {/* Single Clean Short Share Link Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-left mb-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-[#C4932C] flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#C4932C]" />
                <span>Official Voting Link (1-Tap Instant):</span>
              </span>
              <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full">
                Live & Offline
              </span>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-xs font-mono font-bold text-slate-900 break-all select-all block">
                {activeShareUrl}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopy}
                className="py-2.5 px-3 bg-[#C4932C] hover:bg-[#AC7E1F] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs"
              >
                {copiedDirect ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedDirect ? t('create.copied') : t('create.copy_link')}</span>
              </button>
              <a
                href={smsLink}
                className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs"
                title="Share via SMS (Mobile Messaging)"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Share via SMS</span>
              </a>
            </div>

            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs block text-center"
            >
              <span className="flex items-center justify-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Share on WhatsApp</span>
              </span>
            </a>
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenVotePage(createdPollId)}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Open Voting Screen</span>
              </button>

              <button
                type="button"
                onClick={() => onContestCreated(createdPollId)}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Go to Dashboard</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
            >
              + Create Another Poll
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[430px] mx-auto px-3.5 sm:px-4 py-4">
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs">
        
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-[#C4932C] text-white flex items-center justify-center font-bold shadow-2xs">
            <PlusCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight">
              {t('create.title')}
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              {t('create.subtitle')}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* 1. Poll Name (Title) - Searchable by Admin */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-black text-slate-800 uppercase tracking-wider">
                {t('create.poll_name')}
              </label>
              <button
                type="button"
                onClick={handleSuggest}
                disabled={isSuggesting}
                className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-black transition active:scale-95 border border-indigo-100 disabled:opacity-50"
              >
                <Zap className={`w-3 h-3 ${isSuggesting ? 'animate-pulse' : ''}`} />
                <span>{isSuggesting ? 'Tajweez aa rahi hai...' : 'Smart Suggest'}</span>
              </button>
            </div>
            <input
              type="text"
              placeholder={t('create.poll_name_placeholder')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#C4932C] bg-slate-50/50"
            />
          </div>

          {/* 2. Poll Thumbnail / Cover Photo (Shows on Dashboard) */}
          <div className="p-3 bg-amber-50/40 border border-amber-200/60 rounded-2xl">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-black text-slate-800 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-[#C4932C]" />
                <span>{t('create.poll_thumbnail')}</span>
              </label>
              {bannerPhoto && (
                <button
                  type="button"
                  onClick={() => setBannerPhoto('')}
                  className="text-[10px] text-rose-600 font-bold hover:underline"
                >
                  Remove Photo
                </button>
              )}
            </div>

            {bannerPhoto ? (
              <div className="relative w-full h-28 rounded-xl overflow-hidden border border-amber-300 bg-slate-950 flex items-center justify-center shadow-xs">
                <img
                  src={bannerPhoto}
                  alt="Poll Thumbnail"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => bannerFileRef.current?.click()}
                  className="absolute bottom-2 right-2 px-2.5 py-1 bg-black/75 hover:bg-black text-white text-[10px] font-bold rounded-lg backdrop-blur-xs flex items-center gap-1"
                >
                  <Camera className="w-3 h-3" />
                  <span>Change Photo</span>
                </button>
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  ref={bannerFileRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleGalleryUpload(e.target.files[0], setBannerPhoto);
                  }}
                />
                <button
                  type="button"
                  onClick={() => bannerFileRef.current?.click()}
                  className="w-full py-3 px-3 bg-white hover:bg-amber-50/60 border-2 border-dashed border-amber-300 rounded-xl text-xs font-bold text-[#C4932C] flex items-center justify-center gap-2 transition group shadow-2xs"
                >
                  <Upload className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>{t('create.upload_thumbnail')}</span>
                </button>
                <p className="text-[10px] text-slate-400 text-center mt-1 font-medium">
                  {t('create.thumbnail_hint')}
                </p>
              </div>
            )}
          </div>

          {/* 3. Contest Description (Optional) */}
          <div>
            <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
              {t('create.desc')}
            </label>
            <textarea
              rows={2}
              placeholder={t('create.desc_placeholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#C4932C] bg-slate-50/50"
            />
          </div>

          {/* 4. Side-by-Side Candidates: Side A & Side B with VS Center */}
          <div className="relative my-2">
            <div className="grid grid-cols-2 gap-3 items-stretch">
              
              {/* Candidate A Card */}
              <div className="p-3 bg-slate-50/80 border border-slate-200 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                      A
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                      {t('create.side_a')}
                    </span>
                  </div>

                  {/* Name Input - Clean without wazy buttons */}
                  <div className="mb-2.5">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      {t('create.candidate_a_name')}
                    </label>
                    <input
                      type="text"
                      placeholder="Candidate A Name"
                      value={c1Name}
                      onChange={(e) => setC1Name(e.target.value)}
                      required
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#C4932C] shadow-2xs"
                    />
                  </div>

                  {/* Photo Upload */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      {t('create.candidate_a_photo')}
                    </label>
                    {c1Photo ? (
                      <div className="relative w-full h-36 rounded-xl overflow-hidden border-2 border-emerald-300 bg-slate-950 shadow-xs flex items-center justify-center">
                        <img src={c1Photo} alt="Candidate A" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setC1Photo('')}
                          className="absolute top-1.5 right-1.5 px-2 py-0.5 bg-rose-600 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-md hover:bg-rose-700 transition"
                        >
                          <X className="w-3 h-3" />
                          <span>Change</span>
                        </button>
                      </div>
                    ) : (
                      <div>
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
                          className="w-full h-36 bg-white hover:bg-emerald-50/40 border-2 border-dashed border-emerald-300 rounded-xl flex flex-col items-center justify-center text-slate-600 transition group p-2 text-center"
                        >
                          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform mb-1">
                            <Camera className="w-4 h-4" />
                          </div>
                          <span className="text-[11px] font-black text-slate-900">Upload A Photo</span>
                          <span className="text-[9px] text-slate-400">Gallery / Camera</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* VS Center Badge */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-950 text-white font-black text-xs flex items-center justify-center border-2 border-white shadow-md z-10 pointer-events-none">
                VS
              </div>

              {/* Candidate B Card */}
              <div className="p-3 bg-slate-50/80 border border-slate-200 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-6 h-6 rounded-lg bg-[#C4932C] text-white font-black text-xs flex items-center justify-center shadow-xs">
                      B
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                      {t('create.side_b')}
                    </span>
                  </div>

                  {/* Name Input - Clean without wazy buttons */}
                  <div className="mb-2.5">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      {t('create.candidate_b_name')}
                    </label>
                    <input
                      type="text"
                      placeholder="Candidate B Name"
                      value={c2Name}
                      onChange={(e) => setC2Name(e.target.value)}
                      required
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#C4932C] shadow-2xs"
                    />
                  </div>

                  {/* Photo Upload */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      {t('create.candidate_b_photo')}
                    </label>
                    {c2Photo ? (
                      <div className="relative w-full h-36 rounded-xl overflow-hidden border-2 border-amber-300 bg-slate-950 shadow-xs flex items-center justify-center">
                        <img src={c2Photo} alt="Candidate B" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setC2Photo('')}
                          className="absolute top-1.5 right-1.5 px-2 py-0.5 bg-rose-600 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-md hover:bg-rose-700 transition"
                        >
                          <X className="w-3 h-3" />
                          <span>Change</span>
                        </button>
                      </div>
                    ) : (
                      <div>
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
                          className="w-full h-36 bg-white hover:bg-amber-50/40 border-2 border-dashed border-amber-300 rounded-xl flex flex-col items-center justify-center text-slate-600 transition group p-2 text-center"
                        >
                          <div className="w-8 h-8 rounded-xl bg-amber-50 text-[#C4932C] flex items-center justify-center group-hover:scale-105 transition-transform mb-1">
                            <Camera className="w-4 h-4" />
                          </div>
                          <span className="text-[11px] font-black text-slate-900">Upload B Photo</span>
                          <span className="text-[9px] text-slate-400">Gallery / Camera</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* 5. Voting Duration */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="flex items-center gap-1.5 mb-2">
              <Clock className="w-4 h-4 text-[#C4932C]" />
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-900">
                {t('create.duration')}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">{t('create.days')}</label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-center"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">{t('create.hours')}</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-center"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">{t('create.minutes')}</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={minutes}
                  onChange={(e) => setMinutes(Number(e.target.value))}
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-center"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">{t('create.seconds')}</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={seconds}
                  onChange={(e) => setSeconds(Number(e.target.value))}
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-center"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-[#C4932C] hover:bg-[#AC7E1F] text-white font-black text-xs rounded-2xl transition shadow-xs flex items-center justify-center gap-1.5 active:scale-98"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{isSubmitting ? t('create.publishing') : t('create.publish')}</span>
          </button>
        </form>

      </div>
    </div>
  );
};
