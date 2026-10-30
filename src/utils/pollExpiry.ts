import { Poll } from '../types';

export const POST_RESULT_GRACE_MS = 5 * 60 * 60 * 1000; // Exactly 5 Hours (in milliseconds)

export type PollPhase = 'active' | 'results_grace' | 'archived_expired';

/**
 * Check if the active voting period has ended
 */
export function isVotingEnded(poll: Poll): boolean {
  if (poll.status === 'expired' || poll.status === 'closed') return true;
  const expiryTime = new Date(poll.expiresAt).getTime();
  if (isNaN(expiryTime)) return false;
  return Date.now() >= expiryTime;
}

/**
 * Check if 5 hours have passed since the voting time finished.
 * If true:
 *  - Poll is automatically removed from active Dashboard and Results Out
 *  - Direct voting link is expired
 *  - Remains preserved in History forever
 */
export function isPostResultExpired(poll: Poll): boolean {
  const expiryTime = new Date(poll.expiresAt).getTime();
  if (isNaN(expiryTime)) return false;
  
  // Expiry time + 5 hours
  const postResultDeadline = expiryTime + POST_RESULT_GRACE_MS;
  return Date.now() >= postResultDeadline;
}

/**
 * Get current lifecycle phase of a poll:
 * - 'active': Voting is currently live and open
 * - 'results_grace': Voting ended, final results are displayed on Dashboard and link for up to 5 hours (Result Out)
 * - 'archived_expired': 5 hours have passed since results; removed from Dashboard, link expired, kept in History
 */
export function getPollPhase(poll: Poll): PollPhase {
  if (!isVotingEnded(poll)) {
    return 'active';
  }
  if (isPostResultExpired(poll)) {
    return 'archived_expired';
  }
  return 'results_grace';
}

/**
 * Calculate remaining time until the 5-hour post-result deadline.
 */
export function calculateGraceRemaining(expiresAt: string): {
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  formatted: string;
} {
  const expiryTime = new Date(expiresAt).getTime();
  const postResultDeadline = expiryTime + POST_RESULT_GRACE_MS;
  const diff = postResultDeadline - Date.now();

  if (diff <= 0 || isNaN(diff)) {
    return {
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
      formatted: '00:00:00',
    };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  const formatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return {
    hours,
    minutes,
    seconds,
    isExpired: false,
    formatted,
  };
}
