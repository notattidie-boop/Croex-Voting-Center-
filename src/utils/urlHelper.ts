/**
 * URL and Routing helper for Hanzla Croex Technology / Mudasir Voting Center
 * Generates short, direct fast links containing "Hanzla Croex Technology".
 * Replaces 'ais' prefix with clean HTTPS short links.
 */

import { Poll } from '../types';

export function getTargetPollIdFromUrl(): string | null {
  try {
    // 1. Check query parameter: ?v=xyz or ?p=xyz or ?poll=xyz or ?id=xyz
    const params = new URLSearchParams(window.location.search);
    const pollFromQuery =
      params.get('v') ||
      params.get('p') ||
      params.get('poll') ||
      params.get('id');
    if (pollFromQuery) {
      return pollFromQuery;
    }

    // 2. Check hash route: #/v/xyz or #/poll/xyz or #v=xyz
    const hash = window.location.hash;
    if (hash) {
      const hashMatch =
        hash.match(/#\/?(?:v|vote|poll|p)\/([a-zA-Z0-9_-]+)/) ||
        hash.match(/#(?:v|p|poll|id)=([a-zA-Z0-9_-]+)/);
      if (hashMatch && hashMatch[1]) {
        return hashMatch[1];
      }
    }

    // 3. Check pathname: /v/xyz or /p/xyz or /vote/xyz or /poll/xyz
    const path = window.location.pathname;
    const pathMatch = path.match(/\/(?:v|p|vote|poll|hanzla-croex-technology)\/([a-zA-Z0-9_-]+)/);
    if (pathMatch && pathMatch[1]) {
      return pathMatch[1];
    }
  } catch (e) {
    console.error('Error parsing target poll from URL:', e);
  }
  return null;
}

/**
 * Extracts embedded offline poll data if present in URL
 */
export function getEmbeddedPollDataFromUrl(targetPollId?: string): Poll | null {
  try {
    const params = new URLSearchParams(window.location.search);
    let encoded = params.get('pd');
    if (!encoded && window.location.hash.includes('pd=')) {
      const match = window.location.hash.match(/[?&]pd=([^&]+)/);
      if (match) encoded = match[1];
    }
    if (!encoded) return null;

    let jsonStr = '';
    try {
      jsonStr = decodeURIComponent(escape(atob(encoded)));
    } catch {
      try {
        jsonStr = decodeURIComponent(atob(encoded));
      } catch {
        jsonStr = atob(encoded);
      }
    }
    const raw = JSON.parse(jsonStr);

    if (raw && (raw.id || targetPollId)) {
      const id = raw.id || targetPollId || 'poll_offline';
      const poll: Poll = {
        id,
        title: raw.t || 'Live Voting Contest',
        description: raw.d || '',
        candidate1Name: raw.c1 || 'Candidate 1',
        candidate1Photo: raw.p1 || '',
        candidate1Votes: Number(raw.v1 || 0),
        candidate2Name: raw.c2 || 'Candidate 2',
        candidate2Photo: raw.p2 || '',
        candidate2Votes: Number(raw.v2 || 0),
        totalVotes: Number((raw.v1 || 0) + (raw.v2 || 0)),
        expiresAt: raw.exp || new Date(Date.now() + 86400000).toISOString(),
        createdAt: raw.cat || new Date().toISOString(),
        createdBy: raw.by || 'Creator',
        status: 'active',
        category: 'Contest',
        bannerPhoto: raw.bp || '',
      };

      try {
        localStorage.setItem(`mvc_poll_${id}`, JSON.stringify(poll));
      } catch {}

      return poll;
    }
  } catch (e) {
    console.warn('Could not parse embedded poll payload:', e);
  }
  return null;
}

export const PUBLIC_SHARED_BASE =
  'https://ais-pre-5qf6fz4xu4ltrsagkydslp-578620009695.asia-southeast1.run.app';

export function getAppBaseUrl(): string {
  try {
    let origin = window.location.origin;
    if (origin.includes('ais-dev-')) {
      return origin.replace('ais-dev-', 'ais-pre-');
    }
    if (origin && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
      return origin.replace(/\/$/, '');
    }
  } catch {}
  return PUBLIC_SHARED_BASE;
}

// Cache for cleaned short URLs so they are instantly available synchronously
const knownShortUrls = new Map<string, string>();

function isCorruptedShortUrl(url?: string | null): boolean {
  if (!url) return true;
  const lower = url.toLowerCase();
  return (
    lower.includes('ais-') ||
    lower.includes('2aslg7lk') ||
    lower.includes('esporte') ||
    !url.startsWith('http')
  );
}

export function registerPollShortUrl(pollId: string, shortUrl: string) {
  if (!pollId || !shortUrl || isCorruptedShortUrl(shortUrl)) return;
  knownShortUrls.set(pollId, shortUrl);
  try {
    localStorage.setItem(`mvc_short_${pollId}`, shortUrl);
  } catch {}
}

export function getCachedShortUrl(pollId: string): string | null {
  if (knownShortUrls.has(pollId)) {
    const val = knownShortUrls.get(pollId)!;
    if (!isCorruptedShortUrl(val)) {
      return val;
    } else {
      knownShortUrls.delete(pollId);
    }
  }
  try {
    const saved = localStorage.getItem(`mvc_short_${pollId}`);
    if (saved) {
      if (!isCorruptedShortUrl(saved)) {
        knownShortUrls.set(pollId, saved);
        return saved;
      } else {
        localStorage.removeItem(`mvc_short_${pollId}`);
      }
    }
  } catch {}
  return null;
}

// Clean any old corrupt short links from localStorage on module load
try {
  if (typeof localStorage !== 'undefined') {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('mvc_short_')) {
        const val = localStorage.getItem(key);
        if (isCorruptedShortUrl(val)) {
          localStorage.removeItem(key);
        }
      }
    }
  }
} catch {}

/**
 * Generates direct fast share links that always open THIS exact voting app.
 * Automatically checks and uses clean shortened links without 'ais'.
 */
export function generatePollShareUrls(
  pollId: string,
  pollTitle: string,
  pollData?: Partial<Poll>
) {
  // 1. Check if poll has an existing clean shortUrl
  const existingShort =
    pollData?.shortUrl && !isCorruptedShortUrl(pollData.shortUrl)
      ? pollData.shortUrl
      : getCachedShortUrl(pollId);

  if (existingShort) {
    registerPollShortUrl(pollId, existingShort);
    const shareText = `🗳️ *Croex Voting Center* 🗳️\n*Hanzla Croex Technology*\n\nContest: *${pollTitle}*\n\n👉 *Cast Your Vote Live (1-Tap & Instant):*\n${existingShort}`;
    return {
      shareUrl: existingShort,
      brandedShortUrl: existingShort,
      whatsappUrl: `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`,
      whatsappText: shareText,
    };
  }

  const base = getAppBaseUrl();
  let pdParam = '';
  if (pollData && (pollData.candidate1Name || pollData.title)) {
    try {
      const payloadObj = {
        id: pollId,
        t: pollData.title || pollTitle,
        d: pollData.description || '',
        c1: pollData.candidate1Name || 'Candidate 1',
        c2: pollData.candidate2Name || 'Candidate 2',
        p1: pollData.candidate1Photo && pollData.candidate1Photo.startsWith('http') ? pollData.candidate1Photo : '',
        p2: pollData.candidate2Photo && pollData.candidate2Photo.startsWith('http') ? pollData.candidate2Photo : '',
        exp: pollData.expiresAt,
        by: pollData.createdBy || 'Organizer',
      };
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payloadObj))));
      pdParam = `&pd=${encodeURIComponent(encoded)}`;
    } catch {}
  }

  const directLinkClean = `${base}/?v=${encodeURIComponent(pollId)}${pdParam}`;

  const shareText = `🗳️ *Croex Voting Center* 🗳️\n*Hanzla Croex Technology*\n\nContest: *${pollTitle}*\n\n👉 *Cast Your Vote Live (1-Tap & Instant):*\n${directLinkClean}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;

  return {
    shareUrl: directLinkClean,
    brandedShortUrl: directLinkClean,
    whatsappUrl,
    whatsappText: shareText,
  };
}

export function updateUrlToPoll(pollId: string | null) {
  try {
    const url = new URL(window.location.href);
    if (pollId) {
      url.searchParams.set('hanzla-croex-technology', '');
      url.searchParams.set('p', pollId);
      url.searchParams.delete('poll');
      url.searchParams.delete('pd');
    } else {
      url.searchParams.delete('hanzla-croex-technology');
      url.searchParams.delete('p');
      url.searchParams.delete('poll');
      url.searchParams.delete('pd');
    }
    window.history.pushState({}, '', url.toString());
  } catch (e) {
    console.warn('Could not update URL history state:', e);
  }
}
