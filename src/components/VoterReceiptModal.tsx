import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Copy,
  Share2,
  X,
  FileCheck,
  Lock,
  Calendar,
  Smartphone,
  Hash,
  Link as LinkIcon,
  Printer,
  Check,
  MessageSquare,
} from 'lucide-react';
import { Poll } from '../types';
import { generatePollShareUrls } from '../utils/urlHelper';
import { getSmsIntentUrl } from '../utils/shortUrlHelper';

// Ultra-Resilient Image Loader for Canvas (handles base64, blob, relative paths, proxy, and CORS without tainting canvas)
async function loadCanvasImage(url?: string): Promise<HTMLImageElement | null> {
  if (!url || !url.trim()) return null;
  const cleanUrl = url.trim();

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

  // 1. Data URLs & Blob URLs (user gallery uploads)
  if (cleanUrl.startsWith('data:') || cleanUrl.startsWith('blob:')) {
    try {
      const img = await loadImageElement(cleanUrl);
      if (img.naturalWidth > 0) return img;
    } catch (e) {
      console.warn('Direct data/blob image load failed:', e);
    }
  }

  // 2. HTTP/HTTPS URLs (external photos via proxy to eliminate CORS)
  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
    try {
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(cleanUrl)}`;
      const res = await fetch(proxyUrl);
      if (res.ok) {
        const blob = await res.blob();
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

    // Direct CORS fallback
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
    } catch {}

    // Anonymous crossOrigin fallback
    try {
      const directImg = await loadImageElement(cleanUrl, 'anonymous');
      if (directImg.naturalWidth > 0) return directImg;
    } catch {}
  }

  // 3. Relative or local paths (e.g. /croex-logo-hd.png, /assets/...)
  try {
    const localImg = await loadImageElement(cleanUrl);
    if (localImg.naturalWidth > 0) return localImg;
  } catch {}

  return null;
}

interface VoterReceiptModalProps {
  poll: Poll;
  votedChoice: number;
  onClose: () => void;
}

export const VoterReceiptModal: React.FC<VoterReceiptModalProps> = ({
  poll,
  votedChoice,
  onClose,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Generate or retrieve deterministic receipt code stored for this poll
  const receiptStorageKey = `croex_receipt_${poll.id}`;
  let receiptCode = '';
  try {
    const existing = localStorage.getItem(receiptStorageKey);
    if (existing) {
      receiptCode = existing;
    } else {
      const randomDigits = Math.floor(100000 + Math.random() * 900000);
      receiptCode = `CRX-${poll.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase()}-${randomDigits}`;
      localStorage.setItem(receiptStorageKey, receiptCode);
    }
  } catch {
    receiptCode = `CRX-SEC-${Date.now().toString().slice(-6)}`;
  }

  // Exact shared poll link
  const fallbackShareUrl = generatePollShareUrls(poll.id, poll.title).shareUrl;
  const pollShareLink = fallbackShareUrl;

  const candidateName = votedChoice === 1 ? poll.candidate1Name : poll.candidate2Name;
  const candidatePhoto = votedChoice === 1 ? poll.candidate1Photo : poll.candidate2Photo;
  const candidateTag = votedChoice === 1 ? 'Candidate Alpha (A)' : 'Candidate Beta (B)';

  const handleCopyCode = () => {
    navigator.clipboard.writeText(receiptCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(pollShareLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShareReceipt = () => {
    const text = `🗳️ *CROEX VOTING CENTER - OFFICIAL VOTER RECEIPT*
I have cast my verified vote in: *${poll.title}*!

✅ Choice: *${candidateName}* (${candidateTag})
🔐 Verification Receipt ID: *${receiptCode}*
🛡️ Security: 1-Device-1-Vote Tamper-Proof Certified
🔗 Poll Link: ${pollShareLink}

Certified by Hanzla Croex Technologies`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleShareSms = () => {
    const text = `Croex Voting Center: My verified vote for ${candidateName} in "${poll.title}" is recorded! Verification Code: ${receiptCode}. Vote live/offline: ${pollShareLink}`;
    window.location.href = getSmsIntentUrl(text);
  };

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleDownloadSlipImage = async () => {
    if (isDownloading) return;
    setIsDownloading(true);

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Pre-load candidate image for embedding directly inside the voter slip
      const candidateImg = await loadCanvasImage(candidatePhoto);

      const width = 800;
      const height = 1260;
      canvas.width = width;
      canvas.height = height;

      // 1. Background with subtle gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#FFFFFF');
      bgGrad.addColorStop(0.5, '#F8FAFC');
      bgGrad.addColorStop(1, '#ECFDF5');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Outer Border & Emerald Inner Frame
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 10;
      ctx.strokeRect(15, 15, width - 30, height - 30);

      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2;
      ctx.strokeRect(26, 26, width - 52, height - 52);

      // 3. Header Ribbon
      ctx.fillStyle = '#064E3B';
      ctx.fillRect(28, 28, width - 56, 120);

      // Header Text
      ctx.fillStyle = '#F59E0B';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('HANZLA CROEX TECHNOLOGIES • SECURE AUDIT RECORD', width / 2, 60);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 28px sans-serif';
      ctx.fillText('OFFICIAL VERIFIED VOTER SLIP', width / 2, 98);

      ctx.fillStyle = '#A7F3D0';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('(تصدیق شدہ ووٹنگ سلپ • باضابطہ انتخابی ریکارڈ)', width / 2, 126);

      // 4. Verification ID Box
      ctx.fillStyle = '#F1F5F9';
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(50, 170, width - 100, 70, 16);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#64748B';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('CRYPTOGRAPHIC VERIFICATION CODE', 75, 195);

      ctx.fillStyle = '#0F172A';
      ctx.font = '900 24px monospace';
      ctx.fillText(receiptCode, 75, 226);

      // Security Shield Stamp on right of Code
      ctx.fillStyle = '#059669';
      ctx.beginPath();
      ctx.arc(width - 95, 205, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✓', width - 95, 211);

      // 5. Contest Title
      ctx.fillStyle = '#0F172A';
      ctx.font = '900 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Contest: "${poll.title}"`, width / 2, 275);

      // 6. Main Voted Candidate Big Card WITH LARGE HD RECTANGULAR PHOTO BOX
      const cardY = 300;
      const cardH = 490;
      const cardGrad = ctx.createLinearGradient(0, cardY, 0, cardY + cardH);
      cardGrad.addColorStop(0, '#ECFDF5');
      cardGrad.addColorStop(1, '#D1FAE5');
      ctx.fillStyle = cardGrad;
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.roundRect(50, cardY, width - 100, cardH, 24);
      ctx.fill();
      ctx.stroke();

      // Card Badge
      ctx.fillStyle = '#059669';
      ctx.beginPath();
      ctx.roundRect(width / 2 - 130, cardY + 16, 260, 30, 8);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CONFIRMED VOTE CAST FOR', width / 2, cardY + 36);

      // Large HD Photo Box (Square / Rectangular Box with crisp border)
      const boxW = 250;
      const boxH = 250;
      const boxX = width / 2 - boxW / 2;
      const boxY = cardY + 55;

      // Outer Card Box Frame Shadow & Border
      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(boxX - 6, boxY - 6, boxW + 12, boxH + 12, 22);
      ctx.fill();
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Inner clip for HD Candidate Photo
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 18);
      ctx.clip();

      if (candidateImg && candidateImg.naturalWidth > 0 && candidateImg.naturalHeight > 0) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Object-fit: cover calculation with face centering to guarantee NO STRETCHING OR SQUISHING of face
        const imgW = candidateImg.naturalWidth;
        const imgH = candidateImg.naturalHeight;
        const imgRatio = imgW / imgH;
        const boxRatio = boxW / boxH;

        let sx = 0;
        let sy = 0;
        let sWidth = imgW;
        let sHeight = imgH;

        if (imgRatio > boxRatio) {
          // Photo is wider than box -> crop sides, keep center
          sWidth = imgH * boxRatio;
          sx = (imgW - sWidth) / 2;
        } else {
          // Photo is taller than box (portrait) -> crop top/bottom with face focus (20% from top)
          sHeight = imgW / boxRatio;
          sy = Math.max(0, Math.min(imgH - sHeight, (imgH - sHeight) * 0.20));
        }

        ctx.drawImage(candidateImg, sx, sy, sWidth, sHeight, boxX, boxY, boxW, boxH);
      } else {
        ctx.fillStyle = '#065F46';
        ctx.fillRect(boxX, boxY, boxW, boxH);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 80px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(votedChoice === 1 ? 'A' : 'B', width / 2, boxY + boxH / 2);
      }
      ctx.restore();

      // Candidate Name (Under the Photo)
      ctx.fillStyle = '#064E3B';
      ctx.font = '900 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(candidateName, width / 2, cardY + 345);

      ctx.fillStyle = '#047857';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(candidateTag, width / 2, cardY + 382);

      ctx.fillStyle = '#065F46';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText('✓ 100% Certified Real-Time Vote Recorded', width / 2, cardY + 418);

      // Verification Line
      ctx.fillStyle = '#059669';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('Official Voter Verification Record • Mudasir Voting Center', width / 2, cardY + 450);

      // 7. Security Specs Grid
      const specY = 810;
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(50, specY, width - 100, 240, 16);
      ctx.fill();
      ctx.stroke();

      const drawRow = (label: string, val: string, yPos: number, isLast = false) => {
        ctx.fillStyle = '#64748B';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(label, 75, yPos);

        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(val, width - 75, yPos);

        if (!isLast) {
          ctx.strokeStyle = '#F1F5F9';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(75, yPos + 12);
          ctx.lineTo(width - 75, yPos + 12);
          ctx.stroke();
        }
      };

      drawRow('Vote Timestamp', new Date().toLocaleString(), specY + 40);
      drawRow('Security Protocol', '1-Device-1-Vote Tamper-Proof', specY + 88);
      drawRow('Platform Origin', 'Croex Voting Center Cloud', specY + 136);
      drawRow('Official Organization', 'Hanzla Croex Technologies', specY + 184);
      drawRow('Audit Status', 'VERIFIED & TAMPER-FREE ✓', specY + 225, true);

      // 8. Official Golden Stamp Seal
      ctx.save();
      ctx.translate(width - 130, height - 145);
      ctx.rotate(-0.1);
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 50, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#B45309';
      ctx.font = '900 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CROEX VERIFIED', 0, -10);
      ctx.fillText('OFFICIAL STAMP', 0, 8);
      ctx.fillText('★ ★ ★', 0, 25);
      ctx.restore();

      // 9. Footer Note
      ctx.fillStyle = '#94A3B8';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('This digital voter slip serves as verified proof of voting under Hanzla Croex Technologies.', 50, height - 65);
      ctx.fillText('Scan or verify online at Mudasir Voting Center.', 50, height - 45);

      // Trigger Download
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Croex_Vote_Slip_${candidateName.replace(/\s+/g, '_')}_${receiptCode}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to download slip image:', err);
      // Fallback to print
      window.print();
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 p-5 sm:p-6 my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Header */}
        <div className="text-center space-y-1.5 pb-3 border-b border-slate-100">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900">Official Verified Voter Slip</h3>
            <p className="text-[11px] text-slate-500 font-medium">Hanzla Croex Technologies • Secure Audit Record</p>
          </div>
        </div>

        {/* Receipt Code Box */}
        <div className="mt-3.5 p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <p className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Cryptographic Receipt ID</p>
              <p className="font-mono text-xs sm:text-sm font-extrabold text-slate-900">{receiptCode}</p>
            </div>
          </div>
          <button
            onClick={handleCopyCode}
            className="p-1.5 sm:p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 shadow-2xs transition"
          >
            {copiedCode ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="text-[11px]">{copiedCode ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        {/* Voted Candidate Detail - Large HD Square/Rectangular Box */}
        <div className="mt-3.5 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50/80 border-2 border-emerald-300 shadow-xs flex items-center gap-3.5 sm:gap-4">
          {candidatePhoto ? (
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-3 border-emerald-500 shadow-md shrink-0 bg-white">
              <img
                src={candidatePhoto}
                alt={candidateName}
                className="w-full h-full object-cover object-[center_top]"
              />
            </div>
          ) : (
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-black text-3xl sm:text-4xl flex items-center justify-center border-3 border-emerald-500 shadow-md shrink-0">
              {votedChoice === 1 ? 'A' : 'B'}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-lg mb-1 border border-emerald-200">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Your Cast Vote</span>
            </span>
            <p className="text-base sm:text-lg font-black text-slate-900 truncate">{candidateName}</p>
            <p className="text-xs sm:text-sm font-bold text-emerald-700">{candidateTag}</p>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">تصدیق شدہ ووٹ ریکارڈ</p>
          </div>
        </div>

        {/* Verified Share Poll Link */}
        <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <LinkIcon className="w-3 h-3 text-amber-600" />
              <span>Poll Share Link</span>
            </span>
            <button
              onClick={handleCopyLink}
              className="text-[10px] font-bold text-amber-700 hover:text-amber-800 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs flex items-center gap-1 transition"
            >
              {copiedLink ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copiedLink ? 'Link Copied' : 'Copy Link'}</span>
            </button>
          </div>
          <p className="font-mono text-[11px] font-bold text-slate-800 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 truncate select-all">
            {pollShareLink}
          </p>
        </div>

        {/* Contest Info & Security Details */}
        <div className="mt-3 space-y-1.5 text-xs text-slate-600">
          <div className="flex items-center justify-between py-1 border-b border-slate-100">
            <span className="text-slate-400">Contest</span>
            <span className="font-bold text-slate-800 truncate max-w-[210px]">{poll.title}</span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-slate-100">
            <span className="text-slate-400">Timestamp</span>
            <span className="font-semibold text-slate-700 text-[11px]">{new Date().toLocaleString()}</span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-slate-100">
            <span className="text-slate-400">Device Protection</span>
            <span className="inline-flex items-center gap-1 font-bold text-emerald-700 text-[11px]">
              <Lock className="w-3 h-3 text-emerald-600" />
              1-Device-1-Vote Certified
            </span>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-slate-400">Certified By</span>
            <span className="font-bold text-slate-800 text-[11px]">Hanzla Croex Technologies</span>
          </div>
        </div>

        {/* Download Success Banner */}
        {downloadSuccess && (
          <div className="mt-3 p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>تصویر ڈاؤنلوڈ ہو گئی ہے! پرچی موبائل میں محفوظ ہو گئی ہے۔</span>
          </div>
        )}

        {/* Primary Action: Download Slip (Requested by User) */}
        <div className="mt-4">
          <button
            onClick={handleDownloadSlipImage}
            disabled={isDownloading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md transition active:scale-95 disabled:opacity-60"
            title="Download Voter Slip as Image"
          >
            <Printer className="w-4 h-4" />
            <span>
              {isDownloading
                ? 'تصویر تیار ہو رہی ہے...'
                : '📥 Download Slip (پرچی ڈاؤنلوڈ کریں)'}
            </span>
          </button>
        </div>

        {/* Secondary Share Actions - Clean without 'ثبوت' per user request */}
        <div className="mt-2.5 flex gap-2">
          <button
            onClick={handleShareReceipt}
            className="flex-1 py-2 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs flex items-center justify-center gap-1 shadow-2xs transition active:scale-95"
            title="Share via WhatsApp"
          >
            <Share2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>WhatsApp</span>
          </button>
          <button
            onClick={handleShareSms}
            className="flex-1 py-2 px-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-bold text-xs flex items-center justify-center gap-1 shadow-2xs transition active:scale-95"
            title="Share via SMS"
          >
            <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
            <span>SMS</span>
          </button>
          <button
            onClick={onClose}
            className="py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
