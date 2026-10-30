/**
 * Direct Fast URL Helper for Hanzla Croex Technology / Mudasir Voting Center
 * Generates direct fast short links with Hanzla Croex Technology branding.
 */

import { generatePollShareUrls, registerPollShortUrl, getCachedShortUrl } from './urlHelper';
import { Poll } from '../types';

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

export async function getOrGenerateShortUrl(
  pollId: string,
  pollTitle?: string,
  savedShortUrl?: string,
  pollData?: Partial<Poll>
): Promise<string> {
  if (savedShortUrl && !isCorruptedShortUrl(savedShortUrl)) {
    registerPollShortUrl(pollId, savedShortUrl);
    return savedShortUrl;
  }
  if (pollData?.shortUrl && !isCorruptedShortUrl(pollData.shortUrl)) {
    registerPollShortUrl(pollId, pollData.shortUrl);
    return pollData.shortUrl;
  }

  const cached = getCachedShortUrl(pollId);
  if (cached && !isCorruptedShortUrl(cached)) return cached;

  const { shareUrl } = generatePollShareUrls(pollId, pollTitle || 'Contest', pollData);

  // If shareUrl already has no ais-, return it
  if (!shareUrl.includes('ais-')) {
    registerPollShortUrl(pollId, shareUrl);
    return shareUrl;
  }

  // Request clean shortened URL from backend
  try {
    const res = await fetch('/api/shorten-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: shareUrl }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.shortUrl && !data.shortUrl.includes('ais-')) {
        registerPollShortUrl(pollId, data.shortUrl);
        return data.shortUrl;
      }
    }
  } catch (e) {
    console.warn('Could not shorten URL via backend:', e);
  }

  return shareUrl;
}

/**
 * Generates direct WhatsApp share message with only ONE single clean short link
 * Completely avoids long URLs and ensures no 'ais' text is in the message.
 */
export function formatPollWhatsAppMessage(
  pollTitle: string,
  shortVoteUrl: string,
  pollId?: string
): string {
  const cached = pollId ? getCachedShortUrl(pollId) : null;
  const effectiveUrl = (cached && !cached.includes('ais-'))
    ? cached
    : (shortVoteUrl && !shortVoteUrl.includes('ais-'))
    ? shortVoteUrl
    : generatePollShareUrls(pollId || 'contest', pollTitle).shareUrl;

  return `🗳️ *Croex Voting Center* 🗳️\n*Hanzla Croex Technology*\n\nContest: *${pollTitle}*\n\n👉 *Cast Your Vote Instantly (1-Tap & Offline):*\n${effectiveUrl}`;
}

/**
 * Generates direct SMS share message with clean contest link
 */
export function formatPollSmsMessage(
  pollTitle: string,
  shortVoteUrl: string,
  pollId?: string
): string {
  const cleanLink =
    shortVoteUrl && !shortVoteUrl.includes('Croex.Voting.Center')
      ? shortVoteUrl
      : generatePollShareUrls(pollId || 'contest', pollTitle).shareUrl;

  return `Croex Voting Center: Contest "${pollTitle}". Cast your vote live (1-Tap & Offline): ${cleanLink}`;
}

/**
 * Generates SMS message for contest result
 */
export function formatResultSmsMessage(
  pollTitle: string,
  winnerName: string,
  winnerVotes: number,
  shortVoteUrl: string
): string {
  return `Croex Voting Center Result Out: "${pollTitle}"! Winner: ${winnerName} (${winnerVotes.toLocaleString()} votes). View official verified result: ${shortVoteUrl}`;
}

/**
 * Generates standard cross-platform SMS intent URL for mobile devices
 */
export function getSmsIntentUrl(message: string): string {
  return `sms:?&body=${encodeURIComponent(message)}`;
}

