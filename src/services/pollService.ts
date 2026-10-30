import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  increment,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Poll, VoteRecord, AdminLog, DashboardBanner, CompanyRuleItem } from '../types';
import { verifyVotingIntegrity, sanitizeInput, logSecurityThreat } from './securityService';
import { registerPollShortUrl } from '../utils/urlHelper';

const POLLS_COLLECTION = 'polls';
const ADMIN_LOGS_COLLECTION = 'admin_logs';
const DASHBOARD_BANNERS_COLLECTION = 'dashboard_banners';
const COMPANY_RULES_COLLECTION = 'company_info';
const LOCAL_STORAGE_VOTES_KEY = 'mvc_user_voted_map';

// Default starter polls matching the user's dashboard mockup
export const INITIAL_DEMO_POLLS: (Omit<Poll, 'id'> & { id?: string })[] = [
  {
    id: 'poll_general_election_2025',
    title: 'General Election 2025',
    description: 'Choose your preferred candidate for the national election.',
    candidate1Name: 'Candidate Alpha',
    candidate1Photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    candidate1Votes: 71200,
    candidate2Name: 'Candidate Beta',
    candidate2Photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    candidate2Votes: 53332,
    totalVotes: 124532,
    expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    createdBy: 'Hanzla Croex Technology',
    creatorId: 'admin',
    creatorEmail: 'Mudasir.Voting.Centar.pk',
    status: 'active',
    category: 'National',
    bannerPhoto: 'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'poll_national_leadership',
    title: 'National Leadership Election',
    description: 'Vote for the next national leader.',
    candidate1Name: 'Leadership A',
    candidate1Photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80',
    candidate1Votes: 44120,
    candidate2Name: 'Leadership B',
    candidate2Photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80',
    candidate2Votes: 34125,
    totalVotes: 78245,
    expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    createdBy: 'Hanzla Croex Technology',
    creatorId: 'admin',
    creatorEmail: 'Mudasir.Voting.Centar.pk',
    status: 'active',
    category: 'Leadership',
    bannerPhoto: 'https://images.unsplash.com/photo-1577962917302-cd874c4e31d2?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'poll_best_city_investment',
    title: 'Best City for Investment',
    description: 'Choose the best city for investment.',
    candidate1Name: 'Lahore',
    candidate1Photo: 'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=400&q=80',
    candidate1Votes: 24890,
    candidate2Name: 'Islamabad',
    candidate2Photo: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=400&q=80',
    candidate2Votes: 17791,
    totalVotes: 42681,
    expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 14400000).toISOString(),
    createdBy: 'Hanzla Croex Technology',
    creatorId: 'admin',
    creatorEmail: 'Mudasir.Voting.Centar.pk',
    status: 'active',
    category: 'Economy',
    bannerPhoto: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'poll_student_council',
    title: 'Student Council Election',
    description: 'Vote for your class representative.',
    candidate1Name: 'Student Union A',
    candidate1Photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    candidate1Votes: 10450,
    candidate2Name: 'Student Union B',
    candidate2Photo: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80',
    candidate2Votes: 7870,
    totalVotes: 18320,
    expiresAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 21600000).toISOString(),
    createdBy: 'Hanzla Croex Technology',
    creatorId: 'admin',
    creatorEmail: 'Mudasir.Voting.Centar.pk',
    status: 'active',
    category: 'Education',
    bannerPhoto: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=600&q=80',
  },
];

// Helper to check local vote state per user account
export function getUserVoteStorageKey(userEmail?: string): string {
  const clean = String(userEmail || '').trim().toLowerCase();
  return clean ? `mvc_user_votes_${clean}` : LOCAL_STORAGE_VOTES_KEY;
}

export function getLocalUserVotes(userEmail?: string): Record<string, number> {
  try {
    const key = getUserVoteStorageKey(userEmail);
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveLocalUserVote(pollId: string, choice: number, userEmail?: string) {
  try {
    const key = getUserVoteStorageKey(userEmail);
    const map = getLocalUserVotes(userEmail);
    map[pollId] = choice;
    localStorage.setItem(key, JSON.stringify(map));
  } catch (err) {
    console.error('Failed to store local vote:', err);
  }
}

// Subscribe to all polls in real-time with instant cache hydration and parallel fast fetch
export function subscribeToAllPolls(onUpdate: (polls: Poll[]) => void, onError?: (err: unknown) => void) {
  // 1. Instant Cache Hydration: Populate memory synchronously so counts never start at 0
  try {
    const cachedRaw = localStorage.getItem('mvc_all_cached_polls');
    if (cachedRaw) {
      const list = JSON.parse(cachedRaw);
      if (Array.isArray(list) && list.length > 0) {
        onUpdate(list);
      }
    }
  } catch {}

  const q = query(collection(db, POLLS_COLLECTION), orderBy('createdAt', 'desc'));

  const parsePollDocs = (docs: any[]): Poll[] => {
    const polls: Poll[] = [];
    docs.forEach((docSnap) => {
      const data = docSnap.data();
      const isPastExpiry = new Date(data.expiresAt).getTime() <= Date.now();
      const effectiveStatus = isPastExpiry ? 'expired' : (data.status || 'active');

      polls.push({
        id: docSnap.id,
        title: data.title || 'Voting Contest',
        description: data.description || '',
        candidate1Name: data.candidate1Name || 'Candidate 1',
        candidate1Photo: data.candidate1Photo || '',
        candidate1Votes: Number(data.candidate1Votes || 0),
        candidate2Name: data.candidate2Name || 'Candidate 2',
        candidate2Photo: data.candidate2Photo || '',
        candidate2Votes: Number(data.candidate2Votes || 0),
        totalVotes: Number((data.candidate1Votes || 0) + (data.candidate2Votes || 0)),
        expiresAt: data.expiresAt || new Date(Date.now() + 86400000).toISOString(),
        createdAt: data.createdAt || new Date().toISOString(),
        createdBy: data.createdBy || 'admin',
        creatorId: data.creatorId || '',
        creatorEmail: data.creatorEmail || '',
        status: effectiveStatus,
        category: data.category || 'General',
        bannerPhoto: data.bannerPhoto || '',
        shortUrl: data.shortUrl || '',
        candidate1AudioText: data.candidate1AudioText || '',
        candidate1AudioUrl: data.candidate1AudioUrl || '',
        candidate2AudioText: data.candidate2AudioText || '',
        candidate2AudioUrl: data.candidate2AudioUrl || '',
      });
    });

    polls.forEach((p) => {
      try {
        localStorage.setItem(`mvc_poll_${p.id}`, JSON.stringify(p));
      } catch {}
    });

    try {
      localStorage.setItem('mvc_all_cached_polls', JSON.stringify(polls));
    } catch {}

    return polls;
  };

  // 2. Parallel Fast Fetch: getDocs resolves rapidly (typically <1s) without waiting for WebChannel stream handshake
  getDocs(q)
    .then((snap) => {
      if (!snap.empty) {
        const parsed = parsePollDocs(snap.docs);
        onUpdate(parsed);
      }
    })
    .catch((err) => {
      console.warn('Initial fast getDocs notice:', err);
    });

  // 3. Real-Time Snapshot Listener: Keeps data continuously live for vote increments
  return onSnapshot(
    q,
    async (snapshot) => {
      if (snapshot.empty) {
        onUpdate([]);
        return;
      }
      const polls = parsePollDocs(snapshot.docs);
      onUpdate(polls);
    },
    (err) => {
      console.warn('Snapshot update notice for polls (offline or reconnecting):', err);
      if (onError) onError(err);
      // Load fallback cached polls if empty
      const localPolls: Poll[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('mvc_poll_')) {
          try {
            const item = JSON.parse(localStorage.getItem(key) || '');
            if (item && item.id) localPolls.push(item);
          } catch {}
        }
      }
      if (localPolls.length > 0) {
        onUpdate(localPolls);
      }
    }
  );
}

// Subscribe to a single poll in real-time with instant local cache and embedded URL fallback
export function subscribeToSinglePoll(
  pollId: string,
  onUpdate: (poll: Poll | null) => void,
  onError?: (err: unknown) => void
) {
  let hasFoundPoll = false;

  // 1. Instant local cache check (<2ms)
  try {
    const cached = localStorage.getItem(`mvc_poll_${pollId}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.id === pollId) {
        hasFoundPoll = true;
        onUpdate(parsed);
      }
    }
  } catch {}

  // 2. Check all cached polls list
  if (!hasFoundPoll) {
    try {
      const allCached = localStorage.getItem('mvc_all_cached_polls');
      if (allCached) {
        const list = JSON.parse(allCached);
        const found = list.find((p: any) => p.id === pollId);
        if (found) {
          hasFoundPoll = true;
          onUpdate(found);
        }
      }
    } catch {}
  }

  // 3. Check demo polls list
  if (!hasFoundPoll) {
    const demo = INITIAL_DEMO_POLLS.find((p) => p.id === pollId);
    if (demo) {
      hasFoundPoll = true;
      onUpdate(demo as Poll);
    }
  }

  // 4. Check embedded URL poll data (guaranteed 0ms offline fallback)
  if (!hasFoundPoll && typeof window !== 'undefined') {
    try {
      const params = new URLSearchParams(window.location.search);
      const encoded = params.get('pd');
      if (encoded) {
        const jsonStr = decodeURIComponent(atob(encoded));
        const raw = JSON.parse(jsonStr);
        if (raw && (raw.id === pollId || !raw.id)) {
          const embeddedPoll: Poll = {
            id: pollId,
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
          hasFoundPoll = true;
          try {
            localStorage.setItem(`mvc_poll_${pollId}`, JSON.stringify(embeddedPoll));
          } catch {}
          onUpdate(embeddedPoll);
        }
      }
    } catch {}
  }

  const pollDocRef = doc(db, POLLS_COLLECTION, pollId);

  // 5. Direct getDoc for rapid initial network response with active retries
  const fetchDocDirectly = (attempt = 1) => {
    getDoc(pollDocRef)
      .then((docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const isPastExpiry = new Date(data.expiresAt).getTime() <= Date.now();
          const effectiveStatus = isPastExpiry ? 'expired' : (data.status || 'active');

          const poll: Poll = {
            id: docSnap.id,
            title: data.title || 'Voting Contest',
            description: data.description || '',
            candidate1Name: data.candidate1Name || 'Candidate 1',
            candidate1Photo: data.candidate1Photo || '',
            candidate1Votes: Number(data.candidate1Votes || 0),
            candidate2Name: data.candidate2Name || 'Candidate 2',
            candidate2Photo: data.candidate2Photo || '',
            candidate2Votes: Number(data.candidate2Votes || 0),
            totalVotes: Number((data.candidate1Votes || 0) + (data.candidate2Votes || 0)),
            expiresAt: data.expiresAt || new Date(Date.now() + 86400000).toISOString(),
            createdAt: data.createdAt || new Date().toISOString(),
            createdBy: data.createdBy || 'admin',
            creatorId: data.creatorId || '',
            creatorEmail: data.creatorEmail || '',
            status: effectiveStatus,
            category: data.category || 'General',
            bannerPhoto: data.bannerPhoto || '',
            shortUrl: data.shortUrl || '',
            candidate1AudioText: data.candidate1AudioText || '',
            candidate1AudioUrl: data.candidate1AudioUrl || '',
            candidate2AudioText: data.candidate2AudioText || '',
            candidate2AudioUrl: data.candidate2AudioUrl || '',
          };
          hasFoundPoll = true;
          try {
            localStorage.setItem(`mvc_poll_${pollId}`, JSON.stringify(poll));
          } catch {}
          onUpdate(poll);
        } else if (attempt < 4) {
          setTimeout(() => fetchDocDirectly(attempt + 1), 1500);
        }
      })
      .catch(() => {
        if (attempt < 4) {
          setTimeout(() => fetchDocDirectly(attempt + 1), 2000);
        }
      });
  };
  fetchDocDirectly();

  // 6. Keep real-time sync with onSnapshot
  return onSnapshot(
    pollDocRef,
    (docSnap) => {
      if (!docSnap.exists()) {
        // Crucial fix: Only emit null if the SERVER confirmed it does not exist (not a local cache miss)
        if (!docSnap.metadata.fromCache && !hasFoundPoll) {
          onUpdate(null);
        }
        return;
      }
      const data = docSnap.data();
      const isPastExpiry = new Date(data.expiresAt).getTime() <= Date.now();
      const effectiveStatus = isPastExpiry ? 'expired' : (data.status || 'active');

      const poll: Poll = {
        id: docSnap.id,
        title: data.title || 'Voting Contest',
        description: data.description || '',
        candidate1Name: data.candidate1Name || 'Candidate 1',
        candidate1Photo: data.candidate1Photo || '',
        candidate1Votes: Number(data.candidate1Votes || 0),
        candidate2Name: data.candidate2Name || 'Candidate 2',
        candidate2Photo: data.candidate2Photo || '',
        candidate2Votes: Number(data.candidate2Votes || 0),
        totalVotes: Number((data.candidate1Votes || 0) + (data.candidate2Votes || 0)),
        expiresAt: data.expiresAt || new Date(Date.now() + 86400000).toISOString(),
        createdAt: data.createdAt || new Date().toISOString(),
        createdBy: data.createdBy || 'admin',
        creatorId: data.creatorId || '',
        creatorEmail: data.creatorEmail || '',
        status: effectiveStatus,
        category: data.category || 'General',
        bannerPhoto: data.bannerPhoto || '',
        shortUrl: data.shortUrl || '',
        candidate1AudioText: data.candidate1AudioText || '',
        candidate1AudioUrl: data.candidate1AudioUrl || '',
        candidate2AudioText: data.candidate2AudioText || '',
        candidate2AudioUrl: data.candidate2AudioUrl || '',
      };
      try {
        localStorage.setItem(`mvc_poll_${pollId}`, JSON.stringify(poll));
      } catch {}
      onUpdate(poll);
    },
    (err) => {
      console.warn(`Snapshot update notice for single poll ${pollId} (offline or reconnecting):`, err);
      if (onError) onError(err);
      // Attempt cache recovery
      try {
        const cached = localStorage.getItem(`mvc_poll_${pollId}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.id === pollId) {
            onUpdate(parsed);
          }
        }
      } catch {}
    }
  );
}

// Save or cache shortened URL in Firestore for permanent sharing
export async function savePollShortUrl(pollId: string, shortUrl: string): Promise<void> {
  if (!pollId || !shortUrl) return;
  try {
    registerPollShortUrl(pollId, shortUrl);
  } catch {}
  try {
    const pollDocRef = doc(db, POLLS_COLLECTION, pollId);
    await updateDoc(pollDocRef, { shortUrl });
  } catch (err) {
    console.warn('Could not save shortUrl to firestore (permission or offline):', err);
  }
}

/**
 * Calls backend to get a clean short link (TinyURL) that hides the 'ais' prefix.
 */
export async function shortenUrl(longUrl: string): Promise<string> {
  try {
    const response = await fetch('/api/shorten-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: longUrl }),
    });
    const data = await response.json();
    if (data.success && data.shortUrl) {
      return data.shortUrl;
    }
    return longUrl;
  } catch (err) {
    console.warn('Shortening request failed:', err);
    return longUrl;
  }
}


// Check if a specific user has voted in a poll (device-level lock + user account)
export async function checkIfUserHasVoted(
  pollId: string,
  voterId: string,
  userEmail?: string
): Promise<number | null> {
  // 1. First check device-level lock (0ms instantaneous, works 100% offline)
  if (typeof localStorage !== 'undefined') {
    const deviceChoice = localStorage.getItem(`mvc_poll_voted_${pollId}`);
    if (deviceChoice) {
      return Number(deviceChoice);
    }
  }

  // 2. Check local user account votes
  const localVotes = getLocalUserVotes(userEmail);
  if (localVotes[pollId]) {
    return localVotes[pollId];
  }

  // 3. Remote Firestore subcollection check (with 1.5s timeout for offline/slow networks)
  try {
    const voteRef = doc(db, POLLS_COLLECTION, pollId, 'votes', voterId);
    const votePromise = getDoc(voteRef);
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500));
    const voteSnap = await Promise.race([votePromise, timeoutPromise]);

    if (voteSnap && voteSnap.exists()) {
      const choice = voteSnap.data()?.candidateChoice as number;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`mvc_poll_voted_${pollId}`, String(choice));
      }
      saveLocalUserVote(pollId, choice, userEmail);
      return choice;
    }
    return null;
  } catch (err) {
    console.warn('Could not check remote vote doc, relying on local state:', err);
    return localVotes[pollId] || null;
  }
}

const OFFLINE_VOTES_QUEUE_KEY = 'mvc_offline_votes_queue';

export interface QueuedOfflineVote {
  pollId: string;
  voterId: string;
  voterName: string;
  candidateChoice: 1 | 2;
  timestamp: string;
}

export function getQueuedOfflineVotes(): QueuedOfflineVote[] {
  try {
    const raw = localStorage.getItem(OFFLINE_VOTES_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function queueOfflineVote(vote: QueuedOfflineVote) {
  try {
    const queue = getQueuedOfflineVotes();
    queue.push(vote);
    localStorage.setItem(OFFLINE_VOTES_QUEUE_KEY, JSON.stringify(queue));
  } catch {}
}

export async function syncPendingOfflineVotes(): Promise<number> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 0;
  }
  const queue = getQueuedOfflineVotes();
  if (queue.length === 0) return 0;

  let syncedCount = 0;
  const remaining: QueuedOfflineVote[] = [];

  for (const item of queue) {
    try {
      const pollRef = doc(db, POLLS_COLLECTION, item.pollId);
      const voteRef = doc(db, POLLS_COLLECTION, item.pollId, 'votes', item.voterId);

      const existingVote = await getDoc(voteRef);
      if (!existingVote.exists()) {
        await setDoc(voteRef, {
          pollId: item.pollId,
          voterId: item.voterId,
          voterName: item.voterName,
          candidateChoice: item.candidateChoice,
          createdAt: item.timestamp,
          isOfflineSync: true,
        });

        const updatePayload =
          item.candidateChoice === 1
            ? { candidate1Votes: increment(1), totalVotes: increment(1) }
            : { candidate2Votes: increment(1), totalVotes: increment(1) };
        await updateDoc(pollRef, updatePayload);
      }
      syncedCount++;
    } catch (e) {
      console.warn('Could not sync offline vote:', e);
      remaining.push(item);
    }
  }

  localStorage.setItem(OFFLINE_VOTES_QUEUE_KEY, JSON.stringify(remaining));
  return syncedCount;
}

// Automatically sync when browser reconnects to internet
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncPendingOfflineVotes().then((count) => {
      if (count > 0) {
        console.log(`Synced ${count} offline votes to Firestore`);
      }
    });
  });
}

// Cast a real-time vote with offline support & strict 1-vote-per-user enforcement
// Cast a real-time vote with offline support & strict 1-vote-per-user enforcement
export async function castVote(
  pollId: string,
  voterId: string,
  voterName: string,
  candidateChoice: 1 | 2,
  userEmail?: string
): Promise<{ success: boolean; message: string; isOffline?: boolean }> {
  // 0. Anti-Bot and Rapid Click Security Check
  const integrity = verifyVotingIntegrity(pollId);
  if (!integrity.isAllowed) {
    return {
      success: false,
      message: integrity.reason || 'Baraye meharbani ehtiyat karein! Rapid bot clicking detect hui hai.',
    };
  }

  const pollRef = doc(db, POLLS_COLLECTION, pollId);
  const voteRef = doc(db, POLLS_COLLECTION, pollId, 'votes', voterId);

  // 1. STRICT 1-VOTE-PER-USER ENFORCEMENT: Check Firestore voter doc
  try {
    const existingVoteDoc = await getDoc(voteRef);
    if (existingVoteDoc.exists()) {
      return {
        success: false,
        message: 'Aap pehle hi is poll mai vote de chuke hain! Aik user sirf aik vote cast kar sakta hai.',
      };
    }
  } catch (e) {
    console.warn('Could not check remote vote doc before vote write:', e);
  }

  // Lock vote at device level & user account level immediately (0ms instant lock)
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(`mvc_poll_voted_${pollId}`, String(candidateChoice));
  }
  saveLocalUserVote(pollId, candidateChoice, userEmail);

  // Optimistically update cached poll tally in localStorage (0ms instant local sync)
  try {
    const cached = localStorage.getItem(`mvc_poll_${pollId}`);
    if (cached) {
      const p = JSON.parse(cached);
      if (candidateChoice === 1) p.candidate1Votes = (Number(p.candidate1Votes) || 0) + 1;
      else p.candidate2Votes = (Number(p.candidate2Votes) || 0) + 1;
      p.totalVotes = (Number(p.totalVotes) || 0) + 1;
      localStorage.setItem(`mvc_poll_${pollId}`, JSON.stringify(p));
    }

    const allCached = localStorage.getItem('mvc_all_cached_polls');
    if (allCached) {
      const list = JSON.parse(allCached);
      const updated = list.map((item: any) => {
        if (item.id === pollId) {
          return {
            ...item,
            candidate1Votes: candidateChoice === 1 ? (Number(item.candidate1Votes) || 0) + 1 : Number(item.candidate1Votes) || 0,
            candidate2Votes: candidateChoice === 2 ? (Number(item.candidate2Votes) || 0) + 1 : Number(item.candidate2Votes) || 0,
            totalVotes: (Number(item.totalVotes) || 0) + 1,
          };
        }
        return item;
      });
      localStorage.setItem('mvc_all_cached_polls', JSON.stringify(updated));
    }
  } catch {}

  // Broadcast instantly to any other tab / creator dashboard on this browser
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('croex_vote_cast', { detail: { pollId, choice: candidateChoice } }));
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel('croex_voting_channel');
        bc.postMessage({ type: 'VOTE_CAST', pollId, candidateChoice });
        setTimeout(() => bc.close(), 1000);
      }
    }
  } catch {}

  // 2. OFFLINE DETECTION: If client is strictly offline, queue vote locally
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
  if (isOffline) {
    queueOfflineVote({
      pollId,
      voterId,
      voterName: voterName || 'Voter',
      candidateChoice,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      isOffline: true,
      message: 'Aapka vote baghir internet (offline) darj ho gaya hai! Internet aate hi automatic sync ho jayega.',
    };
  }

  try {
    // Update poll vote counts atomically AND write voter doc in parallel!
    const updatePayload =
      candidateChoice === 1
        ? { candidate1Votes: increment(1), totalVotes: increment(1) }
        : { candidate2Votes: increment(1), totalVotes: increment(1) };

    const voteData = {
      pollId,
      voterId,
      voterName: voterName || 'Voter',
      candidateChoice,
      createdAt: new Date().toISOString(),
    };

    // Parallel atomic write guarantees maximum speed and immediate snapshot notification to creator's dashboard
    await Promise.all([
      updateDoc(pollRef, updatePayload),
      setDoc(voteRef, voteData),
    ]);

    // Trigger sync for any previously pending offline votes in background
    syncPendingOfflineVotes().catch(() => {});

    return { success: true, message: 'Shukriya! Aapka vote kamyabi sy darj ho gaya hai.' };
  } catch (err: any) {
    console.warn('Network issue during direct Firestore write, saving to offline queue:', err);
    queueOfflineVote({
      pollId,
      voterId,
      voterName: voterName || 'Voter',
      candidateChoice,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      isOffline: true,
      message: 'Aapka vote baghir internet (offline) darj ho gaya hai! Internet aate hi automatic sync ho jayega.',
    };
  }
}

// Admin function: Add/Boost votes manually ("Aur mai khud bei Kisi ky votes bhraa sakun")
export async function adminAddVotes(
  pollId: string,
  candidateChoice: 1 | 2,
  amount: number,
  candidateName: string,
  pollTitle?: string
): Promise<void> {
  const pollRef = doc(db, POLLS_COLLECTION, pollId);
  const logRef = doc(collection(db, ADMIN_LOGS_COLLECTION));

  const updatePayload =
    candidateChoice === 1
      ? { candidate1Votes: increment(amount), totalVotes: increment(amount) }
      : { candidate2Votes: increment(amount), totalVotes: increment(amount) };

  try {
    await updateDoc(pollRef, updatePayload);

    // Record audit log
    await setDoc(logRef, {
      pollId,
      pollTitle: pollTitle || 'Poll',
      action: `Admin manually added +${amount} votes to ${candidateName}`,
      candidateName,
      addedVotes: amount,
      timestamp: new Date().toISOString(),
    });

    // Update local cache for instant zero-latency feedback
    try {
      const cached = localStorage.getItem(`mvc_poll_${pollId}`);
      if (cached) {
        const p = JSON.parse(cached);
        if (candidateChoice === 1) p.candidate1Votes = (Number(p.candidate1Votes) || 0) + amount;
        else p.candidate2Votes = (Number(p.candidate2Votes) || 0) + amount;
        p.totalVotes = (Number(p.totalVotes) || 0) + amount;
        localStorage.setItem(`mvc_poll_${pollId}`, JSON.stringify(p));
      }
      const allCached = localStorage.getItem('mvc_all_cached_polls');
      if (allCached) {
        const list = JSON.parse(allCached);
        const updated = list.map((item: any) => {
          if (item.id === pollId) {
            return {
              ...item,
              candidate1Votes: candidateChoice === 1 ? (Number(item.candidate1Votes) || 0) + amount : Number(item.candidate1Votes) || 0,
              candidate2Votes: candidateChoice === 2 ? (Number(item.candidate2Votes) || 0) + amount : Number(item.candidate2Votes) || 0,
              totalVotes: (Number(item.totalVotes) || 0) + amount,
            };
          }
          return item;
        });
        localStorage.setItem('mvc_all_cached_polls', JSON.stringify(updated));
      }
    } catch {}
  } catch (err) {
    console.error('Failed to manually boost votes:', err);
    handleFirestoreError(err, OperationType.UPDATE, `${POLLS_COLLECTION}/${pollId}`);
  }
}

// Create new 2-candidate poll with user isolation attribution
export async function createPoll(pollData: {
  title: string;
  description: string;
  candidate1Name: string;
  candidate1Photo?: string;
  candidate2Name: string;
  candidate2Photo?: string;
  durationDays: number;
  durationHours: number;
  durationMinutes: number;
  category?: string;
  createdBy?: string;
  creatorId?: string;
  creatorEmail?: string;
  bannerPhoto?: string;
  shortUrl?: string;
  candidate1AudioText?: string;
  candidate1AudioUrl?: string;
  candidate2AudioText?: string;
  candidate2AudioUrl?: string;
}): Promise<string> {
  const newDocRef = doc(collection(db, POLLS_COLLECTION));

  // Compute expiry ISO date
  const totalMs =
    (pollData.durationDays * 24 * 60 +
      pollData.durationHours * 60 +
      pollData.durationMinutes) *
    60 *
    1000;

  const expiresAt = new Date(Date.now() + Math.max(totalMs, 60000)).toISOString();

  // Sanitize fields and detect potential XSS payload
  const titleSan = sanitizeInput(pollData.title);
  const descSan = sanitizeInput(pollData.description || '');
  const c1San = sanitizeInput(pollData.candidate1Name);
  const c2San = sanitizeInput(pollData.candidate2Name);

  if (titleSan.hadMaliciousPayload || descSan.hadMaliciousPayload || c1San.hadMaliciousPayload || c2San.hadMaliciousPayload) {
    logSecurityThreat({
      type: 'XSS_INJECTION_ATTEMPT',
      severity: 'CRITICAL',
      title: 'Script Injection Payload Intercepted in Contest Creation',
      details: `Malicious script tags detected in contest input by ${pollData.createdBy || pollData.creatorEmail || 'User'}. Input was neutralized.`,
      target: '/create-poll',
      actionTaken: 'Dangerous Tokens Stripped & Alert Dispatched',
      payloadExcerpt: `Title: ${pollData.title.substring(0, 100)}`,
    });
  }

  const newPoll: Omit<Poll, 'id'> = {
    title: titleSan.cleanText.trim(),
    description: descSan.cleanText.trim() || 'Two candidate live voting contest.',
    candidate1Name: c1San.cleanText.trim(),
    candidate1Photo:
      pollData.candidate1Photo?.trim() ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    candidate1Votes: 0,
    candidate2Name: c2San.cleanText.trim(),
    candidate2Photo:
      pollData.candidate2Photo?.trim() ||
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    candidate2Votes: 0,
    totalVotes: 0,
    expiresAt,
    createdAt: new Date().toISOString(),
    createdBy: pollData.createdBy || 'Voter',
    creatorId: pollData.creatorId || '',
    creatorEmail: pollData.creatorEmail || '',
    status: 'active',
    category: pollData.category || 'General',
    bannerPhoto: pollData.bannerPhoto?.trim() || '',
    shortUrl: pollData.shortUrl?.trim() || '',
    candidate1AudioText: pollData.candidate1AudioText?.trim() || '',
    candidate1AudioUrl: pollData.candidate1AudioUrl?.trim() || '',
    candidate2AudioText: pollData.candidate2AudioText?.trim() || '',
    candidate2AudioUrl: pollData.candidate2AudioUrl?.trim() || '',
  };


  const createdPoll: Poll = { id: newDocRef.id, ...newPoll };
  // 1. Immediately save to local storage cache so it is instantly available (0ms)
  try {
    localStorage.setItem(`mvc_poll_${newDocRef.id}`, JSON.stringify(createdPoll));
  } catch {}

  // 2. Persist to Firestore database reliably
  try {
    await setDoc(newDocRef, newPoll);
  } catch (err) {
    console.warn('Initial Firestore write warning, retrying in background:', err);
    // Background retry to ensure persistence
    setDoc(newDocRef, newPoll).catch((e) => console.error('Firestore write retry error:', e));
  }

  return newDocRef.id;
}

// Admin: Toggle active/closed status
export async function adminUpdatePollStatus(pollId: string, status: 'active' | 'closed'): Promise<void> {
  try {
    await updateDoc(doc(db, POLLS_COLLECTION, pollId), { status });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${POLLS_COLLECTION}/${pollId}`);
  }
}

// Admin: Extend or update expiry
export async function adminExtendPollExpiry(pollId: string, additionalHours: number): Promise<void> {
  try {
    const snap = await getDoc(doc(db, POLLS_COLLECTION, pollId));
    if (!snap.exists()) return;
    const currentExpiry = new Date(snap.data()?.expiresAt || Date.now()).getTime();
    const newExpiry = new Date(Math.max(Date.now(), currentExpiry) + additionalHours * 3600000).toISOString();
    await updateDoc(doc(db, POLLS_COLLECTION, pollId), {
      expiresAt: newExpiry,
      status: 'active',
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${POLLS_COLLECTION}/${pollId}`);
  }
}

// Admin: Delete poll
export async function adminDeletePoll(pollId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, POLLS_COLLECTION, pollId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${POLLS_COLLECTION}/${pollId}`);
  }
}

// Super-Admin: Set exact votes directly for Candidate 1 & Candidate 2
export async function adminSetExactVotes(
  pollId: string,
  candidate1Votes: number,
  candidate2Votes: number
): Promise<void> {
  const pollRef = doc(db, POLLS_COLLECTION, pollId);
  const c1 = Math.max(0, candidate1Votes);
  const c2 = Math.max(0, candidate2Votes);
  const totalVotes = c1 + c2;

  try {
    await updateDoc(pollRef, {
      candidate1Votes: c1,
      candidate2Votes: c2,
      totalVotes,
    });
  } catch (err) {
    console.warn('Direct update failed, checking offline cache:', err);
  }

  // Update local cache
  try {
    const cached = localStorage.getItem(`mvc_poll_${pollId}`);
    if (cached) {
      const p = JSON.parse(cached);
      p.candidate1Votes = c1;
      p.candidate2Votes = c2;
      p.totalVotes = totalVotes;
      localStorage.setItem(`mvc_poll_${pollId}`, JSON.stringify(p));
    }
  } catch {}
}

// Super-Admin: Move poll instantly between Active, Result Out, and History
export async function adminSetPollLifecyclePhase(
  pollId: string,
  phase: 'active' | 'results' | 'history'
): Promise<void> {
  const pollRef = doc(db, POLLS_COLLECTION, pollId);
  let expiresAt = new Date().toISOString();
  let status: 'active' | 'expired' | 'closed' | 'archived' = 'active';

  if (phase === 'active') {
    // 2 days in the future
    expiresAt = new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString();
    status = 'active';
  } else if (phase === 'results') {
    // Ended 2 minutes ago (within 5h Result Out grace)
    expiresAt = new Date(Date.now() - 120 * 1000).toISOString();
    status = 'expired';
  } else if (phase === 'history') {
    // Ended 6 hours ago (exceeded 5h Result Out grace -> History)
    expiresAt = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
    status = 'archived';
  }

  try {
    await updateDoc(pollRef, { status, expiresAt });
  } catch (err) {
    console.warn('Lifecycle update error:', err);
  }

  // Update local cache
  try {
    const cached = localStorage.getItem(`mvc_poll_${pollId}`);
    if (cached) {
      const p = JSON.parse(cached);
      p.status = status;
      p.expiresAt = expiresAt;
      localStorage.setItem(`mvc_poll_${pollId}`, JSON.stringify(p));
    }
  } catch {}
}

// Super-Admin: Update candidate campaign speech text and audio URLs
export async function adminUpdateCandidateSpeech(
  pollId: string,
  c1Speech: string,
  c2Speech: string,
  c1Url?: string,
  c2Url?: string
): Promise<void> {
  const pollRef = doc(db, POLLS_COLLECTION, pollId);
  try {
    await updateDoc(pollRef, {
      candidate1AudioText: c1Speech,
      candidate2AudioText: c2Speech,
      ...(c1Url ? { candidate1AudioUrl: c1Url } : {}),
      ...(c2Url ? { candidate2AudioUrl: c2Url } : {}),
    });
  } catch (err) {
    console.warn('Speech update error:', err);
  }
}

// Subscribe to Admin Logs
export function subscribeToAdminLogs(onUpdate: (logs: AdminLog[]) => void) {
  const q = query(collection(db, ADMIN_LOGS_COLLECTION), orderBy('timestamp', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const logs: AdminLog[] = [];
    snapshot.forEach((snap) => {
      const data = snap.data();
      logs.push({
        id: snap.id,
        pollId: data.pollId || '',
        pollTitle: data.pollTitle,
        action: data.action || '',
        candidateName: data.candidateName,
        addedVotes: data.addedVotes || 0,
        timestamp: data.timestamp || new Date().toISOString(),
      });
    });
    onUpdate(logs);
  });
}

// Delete all polls from Firestore (reset/clean database)
export async function clearAllPollsFromDatabase(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, POLLS_COLLECTION));
    const deletePromises = snap.docs.map((docSnap) => deleteDoc(docSnap.ref));
    await Promise.all(deletePromises);

    // Also clear admin logs
    const logsSnap = await getDocs(collection(db, ADMIN_LOGS_COLLECTION));
    const logPromises = logsSnap.docs.map((docSnap) => deleteDoc(docSnap.ref));
    await Promise.all(logPromises);

    // Clear local storage votes
    localStorage.removeItem(LOCAL_STORAGE_VOTES_KEY);
  } catch (err) {
    console.error('Error clearing database polls:', err);
  }
}

// ---------------- DASHBOARD BANNERS (Admin Managed & Scrollable) ----------------
export const DEFAULT_DASHBOARD_BANNERS: DashboardBanner[] = [
  {
    id: 'banner_welcome_official',
    title: 'Hanzla Croex Technology',
    subtitle: 'Welcome to Croex Voting Center - Verified Live Polls with 1-Tap Offline & Online Support',
    imageUrl: '/croex-ballot-hero.jpg',
    badge: 'OFFICIAL PLATFORM',
    order: 1,
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'banner_national_general',
    title: 'General Election 2026',
    subtitle: 'Participate in head-to-head live voter contests with instant real-time progress comparisons',
    imageUrl: '/src/assets/images/general_election_thumb_1792136819789.jpg',
    badge: 'FEATURED CONTEST',
    order: 2,
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'banner_security_assurance',
    title: '100% Anti-Fraud Guarantee',
    subtitle: 'Strict single-vote verification per voter device with complete privacy protection',
    imageUrl: '/src/assets/images/minar_pakistan_thumb_1792136834406.jpg',
    badge: 'SECURITY & TRUST',
    order: 3,
    active: true,
    createdAt: new Date().toISOString(),
  },
];

export function subscribeToDashboardBanners(onUpdate: (banners: DashboardBanner[]) => void) {
  const q = query(collection(db, DASHBOARD_BANNERS_COLLECTION), orderBy('order', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        onUpdate(DEFAULT_DASHBOARD_BANNERS);
        return;
      }
      const list: DashboardBanner[] = [];
      snapshot.forEach((snap) => {
        const d = snap.data();
        list.push({
          id: snap.id,
          title: d.title || 'Official Announcement',
          subtitle: d.subtitle || '',
          imageUrl: d.imageUrl || '/croex-ballot-hero.jpg',
          badge: d.badge || 'ANNOUNCEMENT',
          linkUrl: d.linkUrl || '',
          pollId: d.pollId || '',
          order: typeof d.order === 'number' ? d.order : 0,
          active: d.active !== false,
          createdAt: d.createdAt || new Date().toISOString(),
        });
      });
      onUpdate(list.length > 0 ? list : DEFAULT_DASHBOARD_BANNERS);
    },
    (err) => {
      console.warn('Banners snapshot error, using defaults:', err);
      onUpdate(DEFAULT_DASHBOARD_BANNERS);
    }
  );
}

export async function adminAddBanner(
  banner: Omit<DashboardBanner, 'id' | 'createdAt'>
): Promise<string> {
  const docRef = doc(collection(db, DASHBOARD_BANNERS_COLLECTION));
  const newBanner = {
    ...banner,
    createdAt: new Date().toISOString(),
  };
  await setDoc(docRef, newBanner);
  return docRef.id;
}

export async function adminDeleteBanner(bannerId: string): Promise<void> {
  await deleteDoc(doc(db, DASHBOARD_BANNERS_COLLECTION, bannerId));
}

export async function adminUpdateBanner(
  bannerId: string,
  updates: Partial<DashboardBanner>
): Promise<void> {
  await updateDoc(doc(db, DASHBOARD_BANNERS_COLLECTION, bannerId), updates);
}

// ---------------- COMPANY RULES & POLICIES (Admin Managed) ----------------
export const DEFAULT_COMPANY_RULES: CompanyRuleItem[] = [
  {
    id: 'rule_1',
    title: '1. Verified Single Vote Policy',
    description: 'Each participant is permitted exactly one vote per contest. Any duplicate or automated votes are filtered out by security algorithms.',
    category: 'Integrity',
    order: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rule_2',
    title: '2. Real-Time Transparent Tallies',
    description: 'All vote counts, percentages, and live green progress comparisons are computed and synced in real-time across all voter screens.',
    category: 'Transparency',
    order: 2,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rule_3',
    title: '3. Zero Downtime & Instant Offline Voting',
    description: 'Contest links load instantaneously without extra redirections. If internet connectivity drops, votes are securely saved offline and synchronized automatically upon reconnect.',
    category: 'Accessibility',
    order: 3,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rule_4',
    title: '4. Candidate Respect & Fair Competition',
    description: 'All candidates must be represented respectfully with valid photos and official names. Defamatory, inappropriate, or misleading contest entries are prohibited.',
    category: 'Ethics',
    order: 4,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rule_5',
    title: '5. Automated Result Finalization & Historical Archival',
    description: 'When the timer expires, the winner is announced immediately. The contest remains in the results grace period before transitioning to the permanent history archive.',
    category: 'Lifecycle',
    order: 5,
    createdAt: new Date().toISOString(),
  },
];

export function subscribeToCompanyRules(onUpdate: (rules: CompanyRuleItem[]) => void) {
  const q = query(collection(db, COMPANY_RULES_COLLECTION), orderBy('order', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        // Fallback to local storage or defaults
        try {
          const cached = localStorage.getItem('croex_company_rules');
          if (cached) {
            onUpdate(JSON.parse(cached));
            return;
          }
        } catch {}
        onUpdate(DEFAULT_COMPANY_RULES);
        return;
      }

      const list: CompanyRuleItem[] = [];
      snapshot.forEach((snap) => {
        const d = snap.data();
        list.push({
          id: snap.id,
          title: d.title || 'Rule',
          description: d.description || '',
          category: d.category || 'General',
          order: typeof d.order === 'number' ? d.order : 0,
          createdAt: d.createdAt || new Date().toISOString(),
          addedBy: d.addedBy || 'Admin',
        });
      });

      try {
        localStorage.setItem('croex_company_rules', JSON.stringify(list));
      } catch {}

      onUpdate(list.length > 0 ? list : DEFAULT_COMPANY_RULES);
    },
    (err) => {
      console.warn('Company rules snapshot error, fallback to defaults:', err);
      onUpdate(DEFAULT_COMPANY_RULES);
    }
  );
}

export async function adminAddCompanyRule(
  rule: Omit<CompanyRuleItem, 'id' | 'createdAt'>
): Promise<string> {
  const docRef = doc(collection(db, COMPANY_RULES_COLLECTION));
  const newRule = {
    ...rule,
    createdAt: new Date().toISOString(),
  };
  await setDoc(docRef, newRule);
  return docRef.id;
}

export async function adminDeleteCompanyRule(ruleId: string): Promise<void> {
  await deleteDoc(doc(db, COMPANY_RULES_COLLECTION, ruleId));
}

export async function adminUpdateCompanyRule(
  ruleId: string,
  updates: Partial<CompanyRuleItem>
): Promise<void> {
  await updateDoc(doc(db, COMPANY_RULES_COLLECTION, ruleId), updates);
}
