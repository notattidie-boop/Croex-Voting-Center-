import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Radio, RotateCcw } from 'lucide-react';

interface CandidateAudioPlayerProps {
  candidateNumber: 1 | 2;
  candidateName: string;
  customAudioText?: string;
  customAudioUrl?: string;
  candidateColor?: 'emerald' | 'indigo';
}

export const CandidateAudioPlayer: React.FC<CandidateAudioPlayerProps> = ({
  candidateNumber,
  candidateName,
  customAudioText,
  customAudioUrl,
  candidateColor = candidateNumber === 1 ? 'emerald' : 'indigo',
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(12); // seconds
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const progressTimerRef = useRef<any>(null);

  // Natural Urdu / English campaign message
  const defaultSpeech =
    candidateNumber === 1
      ? `اسلام علیکم! میں ${candidateName} ہوں۔ میرا منشور عوام کی خدمت، انصاف اور ترقی ہے۔ اپنا قیمتی ووٹ دے کر مجھے کامیاب بنائیں۔ شکریہ!`
      : `اسلام علیکم! میں ${candidateName} ہوں۔ ہمارا عزم ہے سچائی، دیانت داری اور روشن مستقبل۔ کینڈیڈیٹ ${candidateName} کو اپنا ووٹ دیں۔ شکریہ!`;

  const effectiveSpeechText = (customAudioText && customAudioText.trim()) || defaultSpeech;

  // Cleanup when customAudioUrl changes or unmounts
  useEffect(() => {
    stopAudio();
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current = null;
    }
  }, [customAudioUrl, candidateName]);

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  const stopAudio = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.currentTime = 0;
    }
    clearInterval(progressTimerRef.current);
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
  };

  const handlePlayToggle = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isPlaying) {
      stopAudio();
      return;
    }

    // 1. Priority: Custom audio URL (recorded voice or uploaded audio file)
    if (customAudioUrl && customAudioUrl.trim()) {
      playCustomAudio(customAudioUrl.trim());
      return;
    }

    // 2. Speech Synthesis
    playSpeechSynthesis();
  };

  const playCustomAudio = (url: string) => {
    try {
      if (!audioElRef.current || audioElRef.current.src !== url) {
        audioElRef.current = new Audio(url);
      }
      const audio = audioElRef.current;
      audio.muted = isMuted;

      audio.onloadedmetadata = () => {
        if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
          setDuration(Math.round(audio.duration));
        }
      };

      audio.ontimeupdate = () => {
        if (audio.duration && !isNaN(audio.duration)) {
          const cur = Math.round(audio.currentTime);
          setCurrentTime(cur);
          setProgress(Math.min(100, (audio.currentTime / audio.duration) * 100));
        }
      };

      audio.onended = () => {
        setIsPlaying(false);
        setProgress(0);
        setCurrentTime(0);
      };

      audio.onerror = () => {
        console.warn('Audio playback error, falling back to speech synthesis');
        playSpeechSynthesis();
      };

      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn('Playback error or blocked by autoplay:', err);
        playSpeechSynthesis();
      });
    } catch (e) {
      console.warn('Audio play exception:', e);
      playSpeechSynthesis();
    }
  };

  const playSpeechSynthesis = () => {
    if (typeof window === 'undefined') return;

    if (!('speechSynthesis' in window)) {
      playToneMelody();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(effectiveSpeechText);

    // Pick appropriate voice
    const voices = window.speechSynthesis.getVoices();
    const urduVoice = voices.find(
      (v) =>
        v.lang.toLowerCase().includes('ur') ||
        v.lang.toLowerCase().includes('hi') ||
        v.lang.toLowerCase().includes('pa')
    );
    if (urduVoice) {
      utterance.voice = urduVoice;
    }

    utterance.rate = 0.95;
    utterance.pitch = candidateNumber === 1 ? 1.05 : 0.92;

    const estDuration = Math.max(8, Math.min(25, Math.ceil(effectiveSpeechText.length / 10)));
    setDuration(estDuration);

    utterance.onstart = () => {
      setIsPlaying(true);
      const startTime = Date.now();
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const cur = Math.min(estDuration, Math.round(elapsed));
        setCurrentTime(cur);
        const pct = Math.min(100, Math.round((elapsed / estDuration) * 100));
        setProgress(pct);
        if (pct >= 100) {
          stopAudio();
        }
      }, 100);
    };

    utterance.onend = () => {
      stopAudio();
    };

    utterance.onerror = () => {
      stopAudio();
    };

    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  };

  const playToneMelody = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const notes = candidateNumber === 1 ? [440, 554, 659, 880] : [392, 493, 587, 784];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.25);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.25);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.25 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.25);
        osc.stop(ctx.currentTime + i * 0.25 + 0.35);
      });
      setIsPlaying(true);
      setTimeout(() => setIsPlaying(false), 1400);
    } catch {}
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !isMuted;
    setIsMuted(next);
    if (audioElRef.current) {
      audioElRef.current.muted = next;
    }
  };

  const isEmerald = candidateColor === 'emerald';

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`mt-2 p-2.5 rounded-2xl border transition-all ${
        isPlaying
          ? isEmerald
            ? 'bg-emerald-50/90 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
            : 'bg-indigo-50/90 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs'
          : 'bg-white hover:bg-slate-50 border-slate-200/90 shadow-2xs'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        {/* Play / Pause Button */}
        <button
          type="button"
          onClick={handlePlayToggle}
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-xs ${
            isPlaying
              ? isEmerald
                ? 'bg-emerald-600 text-white animate-pulse'
                : 'bg-indigo-600 text-white animate-pulse'
              : isEmerald
              ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
              : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-800'
          }`}
          title={isPlaying ? 'Pause Campaign Voice' : `Listen to ${candidateName}'s Campaign Message`}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        {/* Info & Animated Waveform */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className={isEmerald ? 'text-emerald-900 truncate' : 'text-indigo-900 truncate'}>
              {isPlaying ? '🔊 ' + candidateName + ' (Playing Voice...)' : `🎙️ ${candidateName} Campaign Voice`}
            </span>
            <span className="text-slate-400 font-mono text-[10px] shrink-0 font-medium">
              {isPlaying ? `${currentTime}s / ${duration}s` : `0:${String(duration).padStart(2, '0')}`}
            </span>
          </div>

          {/* Animated Waveform Visualizer */}
          <div className="flex items-center gap-0.5 mt-1.5 h-3.5 overflow-hidden">
            {[40, 75, 45, 95, 60, 80, 40, 85, 55, 90, 70, 35, 65, 50].map((h, idx) => (
              <span
                key={idx}
                style={{
                  height: isPlaying ? `${Math.max(25, (h * ((idx % 3) + 1.2)) % 100)}%` : '25%',
                  transition: 'height 0.18s ease-in-out',
                }}
                className={`flex-1 rounded-full ${
                  isEmerald
                    ? isPlaying
                      ? 'bg-emerald-500'
                      : 'bg-emerald-200'
                    : isPlaying
                    ? 'bg-indigo-500'
                    : 'bg-indigo-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Volume & Replay Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {isPlaying && (
            <button
              type="button"
              onClick={toggleMute}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          )}
          {!isPlaying && (
            <div className="text-slate-400">
              <Radio className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
