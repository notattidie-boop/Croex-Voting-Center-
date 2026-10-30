import React, { useState } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Flame,
  PlusCircle,
  Share2,
  Wifi,
  WifiOff,
  Trophy,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Award,
  Vote,
  Smartphone,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { CroexLogo } from './CroexLogo';

interface SystemGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GuideStep {
  number: string;
  category: string;
  categoryUrdu: string;
  title: string;
  titleUrdu: string;
  descriptionUrdu: string;
  descriptionEn: string;
  highlightPoints: { icon: string; textUrdu: string; textEn: string }[];
  visual: React.ReactNode;
}

export const SystemGuideModal: React.FC<SystemGuideModalProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState<number>(0);

  if (!isOpen) return null;

  const handleFinish = () => {
    try {
      localStorage.setItem('croex_system_tour_completed', 'true');
    } catch {}
    onClose();
  };

  const steps: GuideStep[] = [
    {
      number: '01',
      category: 'Official Welcome',
      categoryUrdu: 'خوش آمدید',
      title: 'Croex Election Ecosystem',
      titleUrdu: 'جدید ترین انتخابی نظام میں خوش آمدید',
      descriptionUrdu:
        'یہ پاکستان کا پہلا ریئل ٹائم لائیو پولنگ پلیٹ فارم ہے جہاں شفافیت اور سیکیورٹی ہماری اولین ترجیح ہے۔ ہم آپ کو ایک ایسا ماحول فراہم کرتے ہیں جہاں ہر ووٹ کی اہمیت ہے اور ہر نتیجہ سو فیصد درست ہے۔',
      descriptionEn:
        'The next-generation election ecosystem for Pakistan. Engineered for absolute transparency, real-time sync, and a premium voting experience.',
      highlightPoints: [
        { icon: '🔒', textUrdu: 'ہر ڈیوائس پر صرف ایک تصدیق شدہ ووٹ کی اجازت', textEn: 'Strict 1-device-1-vote tamper prevention' },
        { icon: '⚡', textUrdu: 'لائیو کاؤنٹ ڈاؤن اور لمحہ بہ لمحہ ووٹ اپڈیٹس', textEn: 'Instant real-time percentage and vote sync' },
      ],
      visual: (
        <div className="relative rounded-2xl bg-gradient-to-br from-slate-950 via-[#0d121f] to-slate-900 border border-amber-500/30 p-5 text-center overflow-hidden shadow-xl">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-400 to-amber-200 p-0.5 shadow-lg shadow-amber-500/20 mb-3">
              <div className="w-full h-full bg-slate-950 rounded-[14px] p-1 flex items-center justify-center">
                <img
                  src="/croex-logo-hd.png"
                  alt="Croex Logo"
                  className="w-full h-full object-contain rounded-lg"
                />
              </div>
            </div>
            <h3 className="text-sm font-black text-white tracking-tight">Croex Voting Center</h3>
            <p className="text-[10px] text-amber-400 font-bold uppercase tracking-widest mt-0.5">
              Hanzla Croex Technology
            </p>
            <div className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700/80 text-[11px] text-emerald-400 font-semibold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Official Live Polling Platform</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      number: '02',
      category: 'Live Dashboard',
      categoryUrdu: 'لائیو ڈیش بورڈ',
      title: 'Active Contests at a Glance',
      titleUrdu: 'لائیو مقابلے اور فوری ووٹنگ',
      descriptionUrdu:
        'ڈیش بورڈ پر صرف وہی مقابلے ظاہر ہوتے ہیں جن کی ووٹنگ فی الوقت جاری ہو۔ آپ ہر امیدوار کا موجودہ تناسب دیکھ سکتے ہیں اور "Vote Now" پر کلک کر کے فوری اپنا حصہ ڈال سکتے ہیں۔',
      descriptionEn:
        'The main dashboard showcases only currently active polls. Monitor real-time lead margins, expiry countdowns, and cast votes with a single tap.',
      highlightPoints: [
        { icon: '📊', textUrdu: 'گرین پروگریس بار سے دونوں امیدواروں کا موازنہ', textEn: 'Dynamic comparison progress strip' },
        { icon: '⏱️', textUrdu: 'وقت ختم ہوتے ہی پول خودکار نتائج میں منتقل', textEn: 'Auto-transition to results upon expiry' },
      ],
      visual: (
        <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 shadow-xl space-y-3 text-left">
          <div className="flex items-center justify-between text-[11px]">
            <span className="inline-flex items-center gap-1.5 text-rose-400 font-bold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              LIVE CONTEST
            </span>
            <span className="font-mono text-amber-400 font-bold text-[10px]">
              01d : 08h : 30m
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
              <p className="text-[10px] text-slate-400 uppercase font-bold">Candidate A</p>
              <p className="text-sm font-black text-white mt-0.5">Alpha</p>
              <p className="text-xs font-mono font-bold text-emerald-400 mt-1">62%</p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
              <p className="text-[10px] text-slate-400 uppercase font-bold">Candidate B</p>
              <p className="text-sm font-black text-white mt-0.5">Beta</p>
              <p className="text-xs font-mono font-bold text-slate-400 mt-1">38%</p>
            </div>
          </div>

          <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden flex">
            <div className="bg-emerald-500 h-full w-[62%] transition-all duration-500" />
            <div className="bg-slate-700 h-full w-[38%]" />
          </div>
        </div>
      ),
    },
    {
      number: '03',
      category: 'Create Contest',
      categoryUrdu: 'مقابلہ بنائیں',
      title: 'Host Your Own 2-Candidate Poll',
      titleUrdu: 'اپنا مقابلہ شروع کریں',
      descriptionUrdu:
        'نیچے موجود "Create" ٹیب پر جا کر آپ کسی بھی دو امیدواروں کے درمیان الیکشن یا مقابلہ لانچ کر سکتے ہیں۔ اپنے موبائل سے تصاویر منتخب کریں، دورانیہ مقرر کریں اور مقابلہ لائیو کریں۔',
      descriptionEn:
        'Tap the Create tab in the bottom bar to launch a face-off. Upload photos directly from your device gallery and specify voting duration.',
      highlightPoints: [
        { icon: '🖼️', textUrdu: 'موبائل گیلری سے ہائی کوالٹی تصاویر لگائیں', textEn: 'Device gallery photo upload support' },
        { icon: '⏳', textUrdu: 'دورانیہ گھنٹوں یا دنوں میں اپنی مرضی سے منتخب کریں', textEn: 'Custom voting timer in hours or days' },
      ],
      visual: (
        <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 shadow-xl">
          <div className="grid grid-cols-2 gap-2.5 mb-2.5">
            <div className="rounded-xl border border-dashed border-indigo-500/40 bg-indigo-950/20 p-2.5 text-center">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 mx-auto flex items-center justify-center font-bold text-xs mb-1">
                A
              </div>
              <span className="text-[11px] font-bold text-white block truncate">Candidate 1</span>
              <span className="text-[9px] text-slate-400">Photo Attached</span>
            </div>
            <div className="rounded-xl border border-dashed border-amber-500/40 bg-amber-950/20 p-2.5 text-center">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 mx-auto flex items-center justify-center font-bold text-xs mb-1">
                B
              </div>
              <span className="text-[11px] font-bold text-white block truncate">Candidate 2</span>
              <span className="text-[9px] text-slate-400">Photo Attached</span>
            </div>
          </div>
          <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-slate-300">
            <span>Duration: <strong>24 Hours</strong></span>
            <span className="text-emerald-400 font-bold">✓ Ready to Publish</span>
          </div>
        </div>
      ),
    },
    {
      number: '04',
      category: 'Instant Sharing',
      categoryUrdu: 'فاسٹ شیئر لنک',
      title: 'Sub-Second Voting Link',
      titleUrdu: 'واٹس ایپ پر 1-سیکنڈ فاسٹ لنک',
      descriptionUrdu:
        'مقابلہ شروع ہوتے ہی آپ کو ایک تیز ترین لنک ملتا ہے۔ اسے واٹس ایپ یا سوشل میڈیا پر شیئر کریں۔ ووٹر جب بھی لنک پر کلک کرے گا، وہ سیدھا اسی پول کے ووٹنگ پیج پر 1 سیکنڈ میں پہنچ جائے گا۔',
      descriptionEn:
        'Every contest generates an instant shareable URL. When opened, it bypasses home screens and opens the voting ballot in under 1 second.',
      highlightPoints: [
        { icon: '📲', textUrdu: '1-ٹیپ واٹس ایپ فارمیٹڈ میسج شیئرنگ', textEn: '1-tap WhatsApp auto-formatted share message' },
        { icon: '🚀', textUrdu: 'کوئی فالتو انتظار نہیں، براہ راست پول اوپننگ', textEn: 'Direct landing on isolated poll screen' },
      ],
      visual: (
        <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 shadow-xl space-y-2.5">
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-mono text-amber-300 truncate max-w-[210px]">
              .../v/election_contest_2026
            </span>
            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded">
              &lt; 1s
            </span>
          </div>
          <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-600/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
            <Share2 className="w-3.5 h-3.5" />
            <span>Direct WhatsApp & SMS Invite Ready</span>
          </div>
        </div>
      ),
    },
    {
      number: '05',
      category: 'Offline Resilience',
      categoryUrdu: 'بغیر انٹرنیٹ ووٹنگ',
      title: 'Vote Seamlessly Without Internet',
      titleUrdu: 'انٹرنیٹ کے بغیر ووٹنگ اور آٹو سنک',
      descriptionUrdu:
        'اگر ووٹ دیتے وقت انٹرنیٹ بند ہو یا سگنل کمزور ہوں تو پریشانی کی کوئی بات نہیں۔ ووٹ فوری ڈیوائس پر محفوظ ہو جاتا ہے، اور انٹرنیٹ بحال ہوتے ہی بیک گراؤنڈ میں خودکار طریقے سے کلاؤڈ پر جمع ہو جاتا ہے۔',
      descriptionEn:
        'Never lose a vote due to connectivity drops. Votes cast offline are recorded instantly, tamper-locked to the device, and auto-synced to the cloud on reconnect.',
      highlightPoints: [
        { icon: '📶', textUrdu: 'نیٹ بند ہونے پر بھی ووٹ ضائع نہیں ہوتا', textEn: 'Zero vote drops during poor network reception' },
        { icon: '🔄', textUrdu: 'انٹرنیٹ آتے ہی پس منظر میں خودکار کلاؤڈ سنک', textEn: 'Automatic background synchronization' },
      ],
      visual: (
        <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 shadow-xl text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-bold">
            <WifiOff className="w-3.5 h-3.5 text-cyan-400" />
            <span>Offline Mode Active • Vote Stored</span>
          </div>
          <p className="text-[11px] text-slate-300">
            ووٹر کی تصدیقی رسید تیار • انٹرنیٹ پر آٹو سنک ہوگا
          </p>
        </div>
      ),
    },
    {
      number: '06',
      category: 'Results & Certification',
      categoryUrdu: 'نتائج اور سرٹیفکیٹ',
      title: 'Verified Results & Winner Honors',
      titleUrdu: 'سرکاری نتائج اور وکٹری سرٹیفکیٹ',
      descriptionUrdu:
        'ووٹنگ کا وقت ختم ہونے کے بعد شفاف طریقے سے حتمی نتائج اور فاتح کا اعلان کیا جاتا ہے۔ فاتح کے لیے تصدیق شدہ وکٹری سرٹیفکیٹ اور ووٹر کے لیے ذاتی ڈیجیٹل رسید فراہم کی جاتی ہے۔',
      descriptionEn:
        'Upon conclusion, the contest is officially locked. Download tamper-proof victory certificates for the winning candidate and verified voter slips.',
      highlightPoints: [
        { icon: '🏆', textUrdu: 'فاتح کے نام کا باقاعدہ وکٹری سرٹیفکیٹ ڈاؤن لوڈ', textEn: 'Download official verified victory certificate' },
        { icon: '🧾', textUrdu: 'ہر ووٹر کو تصدیق شدہ یونیک ڈیجیٹل سلپ', textEn: 'Deterministic digital receipt ID for each voter' },
      ],
      visual: (
        <div className="rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/30 border border-amber-500/40 p-4 shadow-xl text-center space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-amber-400 font-bold text-xs">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Winner Declared & Tamper-Proof Certified</span>
          </div>
          <div className="py-1.5 px-3 rounded-lg bg-amber-400/10 border border-amber-400/30 text-amber-300 text-[11px] font-bold flex items-center justify-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>Download Official Victory Certificate</span>
          </div>
        </div>
      ),
    },
  ];

  const current = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;
  const progressPercent = Math.round(((currentStep + 1) / steps.length) * 100);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-title"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm sm:max-w-md w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Top Header */}
        <div className="px-5 pt-4 pb-3 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CroexLogo size={28} showText={false} />
            <div>
              <span className="text-[10px] text-amber-400 font-mono font-bold uppercase tracking-wider block">
                {current.number} / 06 · {current.categoryUrdu}
              </span>
              <span className="text-xs font-bold text-white leading-none">
                Croex Voting Center
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleFinish}
            className="text-[11px] font-bold text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 transition border border-slate-700/60"
          >
            Skip (چھوڑیں)
          </button>
        </div>

        {/* Minimal Progress Bar */}
        <div className="w-full bg-slate-800 h-1">
          <div
            className="bg-gradient-to-r from-amber-500 to-amber-400 h-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Visual Showcase */}
          <div>{current.visual}</div>

          {/* Heading */}
          <div className="text-right">
            <h2
              id="guide-title"
              className="text-base sm:text-lg font-black text-white leading-tight UrduText"
            >
              {current.titleUrdu}
            </h2>
            <p className="text-[11px] text-amber-400/90 font-medium text-left mt-0.5">
              {current.title}
            </p>
          </div>

          {/* Natural Urdu Explanation */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-right">
            <p className="text-xs sm:text-[13px] text-slate-200 leading-relaxed font-normal UrduText">
              {current.descriptionUrdu}
            </p>
          </div>

          {/* Feature Highlight Bullets */}
          <div className="space-y-2">
            {current.highlightPoints.map((pt, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-950/40 border border-slate-800/60"
              >
                <span className="text-sm mt-0.5">{pt.icon}</span>
                <div className="flex-1 text-right">
                  <p className="text-xs font-bold text-white leading-snug UrduText">
                    {pt.textUrdu}
                  </p>
                  <p className="text-[10px] text-slate-400 text-left mt-0.5">
                    {pt.textEn}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* English Summary Subtitle */}
          <p className="text-[10px] text-slate-500 italic leading-snug text-left pt-1">
            {current.descriptionEn}
          </p>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 bg-slate-950/90 border-t border-slate-800/80 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={isFirst}
            onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
            className="px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-white text-xs font-bold transition flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>پچھلا (Back)</span>
          </button>

          <div className="flex items-center gap-1">
            {steps.map((_, idx) => (
              <span
                key={idx}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  idx === currentStep ? 'bg-amber-400 w-3' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>

          {isLast ? (
            <button
              type="button"
              onClick={handleFinish}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 text-xs font-black transition shadow-lg flex items-center gap-1.5 active:scale-95"
            >
              <span>شروع کریں (Start)</span>
              <CheckCircle2 className="w-4 h-4 text-slate-950" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1))}
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-black transition shadow-md flex items-center gap-1.5 active:scale-95"
            >
              <span>اگلا (Next)</span>
              <ChevronRight className="w-4 h-4 text-slate-950" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
