import React, { useRef, useState } from 'react';
import {
  Award,
  Trophy,
  Download,
  Share2,
  CheckCircle2,
  X,
  ShieldCheck,
  Calendar,
  Users,
  Printer,
  Medal,
  Check,
  Sparkles,
  MessageSquare,
} from 'lucide-react';
import { Poll } from '../types';
import { CroexLogo } from './CroexLogo';
import { generatePollShareUrls } from '../utils/urlHelper';
import { formatResultSmsMessage, getSmsIntentUrl } from '../utils/shortUrlHelper';

interface ResultCertificateModalProps {
  poll: Poll;
  onClose: () => void;
}

const DEFAULT_CANDIDATE_1_PHOTO =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80';
const DEFAULT_CANDIDATE_2_PHOTO =
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80';

// Ultra-Resilient High-Definition Image Loader for Canvas (handles base64, backend proxy, CORS, remote URLs)
async function loadCanvasImage(url?: string): Promise<HTMLImageElement | null> {
  if (!url || !url.trim()) return null;
  const cleanUrl = url.trim();

  // Helper to load HTMLImageElement from a string source
  const loadImageElement = (src: string, crossOrigin?: 'anonymous'): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const el = new Image();
      if (crossOrigin) el.crossOrigin = crossOrigin;
      el.onload = () => resolve(el);
      el.onerror = (e) => reject(e);
      el.src = src;
      if (el.complete && el.naturalWidth > 0) resolve(el);
    });
  };

  // 1. If it's a data URL (e.g. user-uploaded photo from camera/gallery via compressAndReadFile),
  // load directly! Data URLs NEVER have CORS restrictions and NEVER taint canvas.
  if (cleanUrl.startsWith('data:')) {
    try {
      const img = await loadImageElement(cleanUrl);
      if (img.naturalWidth > 0) return img;
    } catch (e) {
      console.warn('Direct base64 image load failed:', e);
    }
  }

  // 2. If it's an HTTP/HTTPS URL, route through our same-origin backend proxy:
  // Same-origin endpoint /api/proxy-image?url=... eliminates CORS and canvas tainting completely!
  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
    try {
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(cleanUrl)}`;
      const res = await fetch(proxyUrl);
      if (res.ok) {
        const blob = await res.blob();
        // Convert blob to Data URL using FileReader - data URLs NEVER taint canvas!
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        const proxyImg = await loadImageElement(dataUrl);
        if (proxyImg.naturalWidth > 0) return proxyImg;
      }
    } catch (proxyErr) {
      console.warn('Proxy image fetch failed, trying direct CORS blob:', proxyErr);
    }

    // 3. Fallback: Direct CORS fetch -> Data URL
    try {
      const res = await fetch(cleanUrl, { mode: 'cors' });
      if (res.ok) {
        const blob = await res.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        const blobImg = await loadImageElement(dataUrl);
        if (blobImg.naturalWidth > 0) return blobImg;
      }
    } catch (blobErr) {
      console.warn('Direct CORS blob fetch failed:', blobErr);
    }

    // 4. Fallback: Direct Image with anonymous crossOrigin
    try {
      const directImg = await loadImageElement(cleanUrl, 'anonymous');
      if (directImg.naturalWidth > 0) return directImg;
    } catch (directErr) {
      console.warn('Direct anonymous image load failed:', directErr);
    }
  }

  return null;
}

export const ResultCertificateModal: React.FC<ResultCertificateModalProps> = ({ poll, onClose }) => {
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const certificateContainerRef = useRef<HTMLDivElement>(null);

  const c1Votes = Number(poll.candidate1Votes || 0);
  const c2Votes = Number(poll.candidate2Votes || 0);
  const total = c1Votes + c2Votes || 1;
  const c1Percent = Math.round((c1Votes / total) * 100);
  const c2Percent = Math.round((c2Votes / total) * 100);

  const isTied = c1Votes === c2Votes;
  const isC1Winner = c1Votes >= c2Votes;

  const candidate1EffectivePhoto = poll.candidate1Photo?.trim() || DEFAULT_CANDIDATE_1_PHOTO;
  const candidate2EffectivePhoto = poll.candidate2Photo?.trim() || DEFAULT_CANDIDATE_2_PHOTO;

  const winnerName = isTied ? 'Tie Result' : isC1Winner ? poll.candidate1Name : poll.candidate2Name;
  const winnerPhoto = isTied ? candidate1EffectivePhoto : isC1Winner ? candidate1EffectivePhoto : candidate2EffectivePhoto;
  const winnerVotes = isTied ? c1Votes : Math.max(c1Votes, c2Votes);
  const winnerPct = isTied ? c1Percent : Math.max(c1Percent, c2Percent);

  const loserName = isTied ? 'Tie Result' : isC1Winner ? poll.candidate2Name : poll.candidate1Name;
  const loserPhoto = isTied ? candidate2EffectivePhoto : isC1Winner ? candidate2EffectivePhoto : candidate1EffectivePhoto;
  const loserVotes = isTied ? c2Votes : Math.min(c1Votes, c2Votes);
  const loserPct = isTied ? c2Percent : Math.min(c1Percent, c2Percent);

  const margin = Math.abs(c1Votes - c2Votes);

  const certNumber = `HCT-${poll.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase()}-${Math.abs(
    c1Votes + c2Votes
  ).toString().slice(-4) || '8832'}`;

  // Clean Share Link (no ais-...)
  const fallbackShareUrl = generatePollShareUrls(poll.id, poll.title).shareUrl;
  const cleanPollUrl = poll.shortUrl || fallbackShareUrl;

  // Download High-Resolution White Certificate Image (PNG) with Actual Candidate Photos!
  const handleDownloadImage = async () => {
    setDownloading(true);
    try {
      // 1. Asynchronously preload actual candidate photos
      const [winnerImg, loserImg] = await Promise.all([
        winnerPhoto ? loadCanvasImage(winnerPhoto) : Promise.resolve(null),
        loserPhoto ? loadCanvasImage(loserPhoto) : Promise.resolve(null),
      ]);

      const canvas = document.createElement('canvas');
      // Full HD 1920x1350 Resolution for maximum clarity and sharpness
      canvas.width = 1920;
      canvas.height = 1350;
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error('Canvas context unavailable');

      // Enable High-Definition Image Smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // A. Crisp White Background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 1920, 1350);

      // B. Outer Royal Gold Border (Full HD scale)
      ctx.lineWidth = 18;
      ctx.strokeStyle = '#C4932C';
      ctx.strokeRect(30, 30, 1860, 1290);

      // C. Inner Slate Accent Border
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#E2E8F0';
      ctx.strokeRect(55, 55, 1810, 1240);

      // D. Subtle Watermark Fill
      ctx.fillStyle = '#FAFCFF';
      ctx.fillRect(60, 60, 1800, 1230);

      // E. Header Branding: HANZLA CROEX TECHNOLOGIES
      ctx.textAlign = 'center';
      ctx.font = 'bold 48px "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#0F172A';
      ctx.fillText('HANZLA CROEX TECHNOLOGIES', 960, 130);

      ctx.font = 'bold 20px "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#C4932C';
      ctx.fillText('★ OFFICIAL CERTIFIED ELECTORAL RESULT DECLARATION ★', 960, 172);

      // Gold divider bar
      ctx.strokeStyle = '#C4932C';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(560, 195);
      ctx.lineTo(1360, 195);
      ctx.stroke();

      // F. Contest Title & Details (Crystal Clear & Bold)
      ctx.font = 'bold 46px "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#0F172A';
      ctx.fillText(poll.title, 960, 260);

      ctx.font = 'normal 21px "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#64748B';
      const cleanDesc = (poll.description || 'Verified electoral contest conducted via Hanzla Croex Technologies.').slice(0, 110);
      ctx.fillText(cleanDesc, 960, 305);

      // Helper function to draw candidate photo in a LARGE, FULL HD BOX with object-fit: cover
      const drawCandidateBox = (
        img: HTMLImageElement | null,
        centerX: number,
        centerY: number,
        width: number,
        height: number,
        borderRadius: number,
        borderColor: string,
        initial: string
      ) => {
        const x = centerX - width / 2;
        const y = centerY - height / 2;

        ctx.save();
        // Drop shadow for candidate card box
        ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
        ctx.shadowBlur = 16;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 6;

        // Rounded rectangle path
        ctx.beginPath();
        ctx.moveTo(x + borderRadius, y);
        ctx.lineTo(x + width - borderRadius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + borderRadius);
        ctx.lineTo(x + width, y + height - borderRadius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - borderRadius, y + height);
        ctx.lineTo(x + borderRadius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - borderRadius);
        ctx.lineTo(x, y + borderRadius);
        ctx.quadraticCurveTo(x, y, x + borderRadius, y);
        ctx.closePath();

        // White base fill
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();

        // Reset shadow before border stroke
        ctx.shadowColor = 'transparent';

        // Outer crisp border
        ctx.lineWidth = 8;
        ctx.strokeStyle = borderColor;
        ctx.stroke();
        ctx.clip();

        if (img && img.naturalWidth && img.naturalHeight) {
          // Object-fit: cover calculation to guarantee no stretching or distortion
          const imgRatio = img.naturalWidth / img.naturalHeight;
          const boxRatio = width / height;
          let sWidth = img.naturalWidth;
          let sHeight = img.naturalHeight;
          let sx = 0;
          let sy = 0;

          if (imgRatio > boxRatio) {
            sWidth = img.naturalHeight * boxRatio;
            sx = (img.naturalWidth - sWidth) / 2;
          } else {
            sHeight = img.naturalWidth / boxRatio;
            sy = (img.naturalHeight - sHeight) / 2;
          }

          ctx.drawImage(img, sx, sy, sWidth, sHeight, x, y, width, height);
        } else {
          ctx.fillStyle = '#F8FAFC';
          ctx.fillRect(x, y, width, height);
          ctx.font = 'bold 88px "Segoe UI", Roboto, sans-serif';
          ctx.fillStyle = borderColor;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(initial, centerX, centerY);
        }
        ctx.restore();
      };

      // G. WINNER BOX (Left Side) - Large & Full HD
      const wBoxX = 130;
      const wBoxY = 340;
      const boxW = 790;
      const boxH = 700;

      // Winner background card
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(wBoxX, wBoxY, boxW, boxH);
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#10B981';
      ctx.strokeRect(wBoxX, wBoxY, boxW, boxH);

      // Winner Header Ribbon
      ctx.fillStyle = '#10B981';
      ctx.fillRect(wBoxX, wBoxY, boxW, 60);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.font = 'bold 28px "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('🏆 DECLARED WINNER', wBoxX + boxW / 2, wBoxY + 42);

      // Draw Actual Winner Photo in a HUGE FULL-HD BOX (310x310)
      drawCandidateBox(
        winnerImg,
        wBoxX + boxW / 2,
        wBoxY + 235,
        310,
        310,
        28,
        '#10B981',
        winnerName.slice(0, 1).toUpperCase()
      );

      // Winner Name (Clear & Bold)
      ctx.font = 'bold 42px "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#0F172A';
      ctx.fillText(winnerName, wBoxX + boxW / 2, wBoxY + 445);

      // Winner Votes
      ctx.font = 'bold 56px "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#059669';
      ctx.fillText(`${winnerVotes.toLocaleString()} Votes`, wBoxX + boxW / 2, wBoxY + 520);

      // Winner Percentage Badge
      ctx.font = 'bold 28px "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#047857';
      ctx.fillText(`${winnerPct}% of Total Votes`, wBoxX + boxW / 2, wBoxY + 575);

      // Lead margin
      ctx.font = 'bold 24px "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#C4932C';
      ctx.fillText(`Lead Margin: +${margin.toLocaleString()} Votes`, wBoxX + boxW / 2, wBoxY + 645);

      // H. LOSER / RUNNER-UP BOX (Right Side) - Large & Full HD
      const lBoxX = 1000;
      const lBoxY = 340;

      // Runner-Up background card
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(lBoxX, lBoxY, boxW, boxH);
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#94A3B8';
      ctx.strokeRect(lBoxX, lBoxY, boxW, boxH);

      // Runner-Up Header Ribbon
      ctx.fillStyle = '#475569';
      ctx.fillRect(lBoxX, lBoxY, boxW, 60);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.font = 'bold 28px "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('🥈 RUNNER-UP', lBoxX + boxW / 2, lBoxY + 42);

      // Draw Actual Loser Photo in a HUGE FULL-HD BOX (310x310)
      drawCandidateBox(
        loserImg,
        lBoxX + boxW / 2,
        lBoxY + 235,
        310,
        310,
        28,
        '#64748B',
        loserName.slice(0, 1).toUpperCase()
      );

      // Runner Up Name (Clear & Bold)
      ctx.font = 'bold 42px "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#1E293B';
      ctx.fillText(loserName, lBoxX + boxW / 2, lBoxY + 445);

      // Runner Up Votes
      ctx.font = 'bold 56px "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText(`${loserVotes.toLocaleString()} Votes`, lBoxX + boxW / 2, lBoxY + 520);

      // Runner Up Percentage
      ctx.font = 'bold 28px "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#64748B';
      ctx.fillText(`${loserPct}% of Total Votes`, lBoxX + boxW / 2, lBoxY + 575);

      // Difference
      ctx.font = 'normal 24px "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#64748B';
      ctx.fillText(`Difference: -${margin.toLocaleString()} Votes`, lBoxX + boxW / 2, lBoxY + 645);

      // I. Summary Strip Below Cards (Full HD)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(130, 1070, 1660, 80);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#CBD5E1';
      ctx.strokeRect(130, 1070, 1660, 80);

      ctx.textAlign = 'left';
      ctx.font = 'bold 24px "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#0F172A';
      ctx.fillText(`Total Valid Votes: ${total.toLocaleString()}`, 170, 1120);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#64748B';
      ctx.fillText(`Contest Category: ${poll.category || 'General'}`, 960, 1120);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#C4932C';
      ctx.fillText(`Certificate ID: ${certNumber}`, 1750, 1120);

      // J. Official Seal & Authorization Footer
      ctx.textAlign = 'center';
      ctx.font = 'bold 21px "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#334155';
      ctx.fillText('Official Form Certified & Audited by Hanzla Croex Technologies • 1-Device-1-Vote Protected • Tamper-Proof Audit', 960, 1220);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            try {
              const dataUrl = canvas.toDataURL('image/png', 1.0);
              const a = document.createElement('a');
              a.href = dataUrl;
              a.download = `Croex_Full_HD_Result_${poll.id}.png`;
              document.body.appendChild(a);
              a.click();
              setTimeout(() => {
                if (document.body.contains(a)) document.body.removeChild(a);
              }, 300);
              setDownloading(false);
            } catch (fallbackErr) {
              console.error('DataURL export fallback error:', fallbackErr);
              setDownloading(false);
            }
            return;
          }
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Croex_Full_HD_Result_${poll.id}.png`;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            if (document.body.contains(a)) document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, 300);
          setDownloading(false);
        },
        'image/png',
        1.0
      );
    } catch (err: any) {
      console.error('Error generating certificate image:', err);
      alert('Certificate image download karte waqt masla aya: ' + (err?.message || 'Error'));
      setDownloading(false);
    }
  };

  // Direct PDF Print Flow (invokes browser print on styled white certificate)
  const handlePrintPdf = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const text = `🏆 *HANZLA CROEX TECHNOLOGIES* 🏆
*OFFICIAL CERTIFIED CONTEST RESULT FORM*

Contest: *${poll.title}*
Certificate ID: *${certNumber}*

👑 *DECLARED WINNER:* *${winnerName}*
📊 Winner Votes: *${winnerVotes.toLocaleString()}* (${winnerPct}%)
🥈 *Runner-Up:* *${loserName}*
📉 Runner-Up Votes: *${loserVotes.toLocaleString()}* (${loserPct}%)

⚡ Winning Margin: *${margin.toLocaleString()} votes*
📈 Total Votes Cast: *${total.toLocaleString()}*
🛡️ Verified & Audited by: *Hanzla Croex Technologies*

Check Full Results: ${cleanPollUrl}`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleShareSms = () => {
    const text = formatResultSmsMessage(poll.title, winnerName, winnerVotes, cleanPollUrl);
    window.location.href = getSmsIntentUrl(text);
  };

  const handleCopySummary = () => {
    const text = `🏆 OFFICIAL RESULT FORM - HANZLA CROEX TECHNOLOGIES
Contest: ${poll.title}
Certificate ID: ${certNumber}
Winner: ${winnerName} (${winnerVotes.toLocaleString()} votes - ${winnerPct}%)
Runner-Up: ${loserName} (${loserVotes.toLocaleString()} votes - ${loserPct}%)
Total Votes: ${total.toLocaleString()}
Certified by Hanzla Croex Technologies`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      
      {/* Print-specific style tag to ensure ONLY this white form is printed to PDF */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-certificate-form, #printable-certificate-form * {
            visibility: visible;
          }
          #printable-certificate-form {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            box-shadow: none !important;
            border: 3px solid #C4932C !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="relative w-full max-w-2xl bg-white text-slate-900 rounded-3xl border-2 border-[#C4932C]/60 shadow-2xl p-4 sm:p-7 my-auto">
        
        {/* Top-Right 'X' Cut Button (Clear & prominent as requested by user) */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-600 flex items-center justify-center transition border border-slate-200 shadow-2xs z-20"
          aria-label="Close"
          title="Close / Exit"
        >
          <X className="w-4 h-4" />
        </button>

        {/* ---------------- WHITE CERTIFICATE FORM VIEW ---------------- */}
        <div
          id="printable-certificate-form"
          ref={certificateContainerRef}
          className="bg-white border-2 border-[#C4932C] rounded-2xl p-4 sm:p-6 space-y-4 shadow-xs relative overflow-hidden"
        >
          {/* Subtle Corner Accents */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#C4932C]" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#C4932C]" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#C4932C]" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#C4932C]" />

          {/* 1. Header Branding: HANZLA CROEX TECHNOLOGIES */}
          <div className="text-center space-y-1 pb-3 border-b border-amber-200/80">
            <div className="flex items-center justify-center gap-2 mb-1">
              <CroexLogo size={36} />
              <div className="text-left">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900 uppercase leading-none">
                  Hanzla Croex Technologies
                </h3>
                <span className="text-[10px] font-bold text-[#C4932C] uppercase tracking-wider block mt-0.5">
                  Official Certified Electoral Result Form
                </span>
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[#C4932C] text-[11px] font-black uppercase tracking-wider">
              <Award className="w-3.5 h-3.5" />
              <span>Certified & Tamper-Proof Audit</span>
            </div>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
              Certificate No: <strong className="text-slate-800">{certNumber}</strong>
            </p>
          </div>

          {/* 2. Contest Title & Details */}
          <div className="text-center">
            <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold uppercase mb-1">
              {poll.category || 'General Contest'}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
              {poll.title}
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto line-clamp-2">
              {poll.description || 'Official two-candidate democratic poll conducted via Hanzla Croex Technologies.'}
            </p>
          </div>

          {/* 3. BOTH WINNER & LOSER ACTUAL PHOTOS & DETAILS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            
            {/* WINNER CARD (Actual Photo in Large Box + Name + Votes + Percent) */}
            <div className="bg-gradient-to-b from-emerald-50/90 to-white rounded-2xl border-2 border-emerald-500 p-4 sm:p-5 text-center relative shadow-sm flex flex-col justify-between">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-emerald-600 text-white font-black text-[11px] uppercase tracking-wider shadow-md flex items-center gap-1.5 shrink-0">
                <Trophy className="w-3.5 h-3.5" />
                <span>🏆 Declared Winner</span>
              </div>

              <div className="mt-3 flex flex-col items-center">
                {winnerPhoto ? (
                  <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-3xl overflow-hidden border-4 border-emerald-500 shadow-xl mb-3 bg-slate-100 relative group shrink-0">
                    <img
                      src={winnerPhoto}
                      alt={winnerName}
                      crossOrigin="anonymous"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-1.5 right-1.5 bg-emerald-600 text-white p-1 rounded-lg shadow-sm">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                ) : (
                  <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-3xl bg-emerald-100 border-4 border-emerald-500 flex items-center justify-center text-emerald-800 font-black text-4xl mb-3 shadow-md shrink-0">
                    🏆
                  </div>
                )}
                <h4 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight">
                  {winnerName}
                </h4>
                <div className="mt-1.5">
                  <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 block">
                    {winnerVotes.toLocaleString()} Votes
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-lg inline-block mt-1 border border-emerald-200">
                    {winnerPct}% of Total Votes
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-emerald-200/80 text-xs font-black text-emerald-800">
                Lead Margin: +{margin.toLocaleString()} votes
              </div>
            </div>

            {/* LOSER / RUNNER-UP CARD (Actual Photo in Large Box + Name + Votes + Percent) */}
            <div className="bg-gradient-to-b from-slate-50 to-white rounded-2xl border-2 border-slate-300 p-4 sm:p-5 text-center relative shadow-sm flex flex-col justify-between">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-slate-700 text-white font-black text-[11px] uppercase tracking-wider shadow-md flex items-center gap-1.5 shrink-0">
                <Medal className="w-3.5 h-3.5" />
                <span>🥈 Runner-Up</span>
              </div>

              <div className="mt-3 flex flex-col items-center">
                {loserPhoto ? (
                  <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-3xl overflow-hidden border-4 border-slate-300 shadow-xl mb-3 bg-slate-100 opacity-95 shrink-0">
                    <img
                      src={loserPhoto}
                      alt={loserName}
                      crossOrigin="anonymous"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-3xl bg-slate-200 border-4 border-slate-300 flex items-center justify-center text-slate-700 font-black text-4xl mb-3 shadow-md shrink-0">
                    🥈
                  </div>
                )}
                <h4 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight leading-tight">
                  {loserName}
                </h4>
                <div className="mt-1.5">
                  <span className="text-2xl sm:text-3xl font-black font-mono text-slate-600 block">
                    {loserVotes.toLocaleString()} Votes
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-lg inline-block mt-1 border border-slate-200">
                    {loserPct}% of Total Votes
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-200 text-xs font-semibold text-slate-600">
                Difference: -{margin.toLocaleString()} votes
              </div>
            </div>

          </div>

          {/* 4. Total Summary Stats Strip */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Users className="w-4 h-4 text-slate-500" />
              <span>Total Votes Cast: <strong>{total.toLocaleString()}</strong></span>
            </div>

            <div className="flex items-center gap-1 text-slate-500 text-[11px]">
              <Calendar className="w-3.5 h-3.5" />
              <span>Certified: {new Date().toLocaleDateString()}</span>
            </div>

            <div className="flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>1-Device-1-Vote Audited</span>
            </div>
          </div>

          {/* 5. Authorization Footer Seal */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-200 text-[11px] text-slate-500">
            <div>
              <p className="font-bold text-slate-900">HANZLA CROEX TECHNOLOGIES</p>
              <p className="text-[10px] text-slate-400">Official Cryptographic Electoral System</p>
            </div>
            <div className="text-right">
              <span className="inline-block px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded font-bold text-[10px]">
                ✓ VERIFIED AUDIT STAMP
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons: PDF Download / Print, High-Res Image (PNG), WhatsApp */}
        <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center gap-2">
          <button
            onClick={handlePrintPdf}
            className="w-full sm:flex-1 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95"
            title="Download PDF or Print Official Form"
          >
            <Printer className="w-4 h-4" />
            <span>Download PDF / Print</span>
          </button>

          <button
            onClick={handleDownloadImage}
            disabled={downloading}
            className="w-full sm:flex-1 py-2.5 px-3 rounded-xl bg-[#C4932C] hover:bg-[#AC7E1F] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95"
            title="Download Certificate as Photo (PNG)"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? 'Creating Image...' : 'Download Photo (PNG)'}</span>
          </button>

          <button
            onClick={handleShareWhatsApp}
            className="w-full sm:flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95"
            title="Share Result on WhatsApp"
          >
            <Share2 className="w-4 h-4" />
            <span>WhatsApp</span>
          </button>

          <button
            onClick={handleShareSms}
            className="w-full sm:flex-1 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95"
            title="Share Result via SMS (Mobile Messaging)"
          >
            <MessageSquare className="w-4 h-4" />
            <span>SMS</span>
          </button>

          <button
            onClick={handleCopySummary}
            className="w-full sm:w-auto py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Sparkles className="w-3.5 h-3.5 text-amber-500" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
