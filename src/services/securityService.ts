import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase';
import { SecurityThreat, ThreatSeverity, ThreatType } from '../types';

const SECURITY_THREATS_COLLECTION = 'security_threats';
const LOCAL_THREATS_CACHE_KEY = 'mvc_security_threats';
const UNREAD_THREATS_COUNT_KEY = 'mvc_unread_threats_count';

// Default initial security audit logs showcasing system protection
export const INITIAL_DEMO_THREATS: SecurityThreat[] = [
  {
    id: 'threat_initial_1',
    type: 'BOT_RAPID_VOTING',
    severity: 'HIGH',
    title: 'Automated Rapid Voting Script Blocked',
    details: 'Multiple vote requests detected within 120ms from automated crawler pattern. IP temporarily throttled.',
    ipAddress: '198.51.100.44',
    userAgent: 'Mozilla/5.0 (compatible; BotScanner/1.0)',
    target: '/api/vote',
    payloadExcerpt: '{ candidateChoice: 1, repeatCount: 50 }',
    actionTaken: 'Auto-Blocked by Croex Rate-Limiter & Device Lock',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    status: 'BLOCKED',
  },
  {
    id: 'threat_initial_2',
    type: 'XSS_INJECTION_ATTEMPT',
    severity: 'CRITICAL',
    title: 'Malicious HTML Script Injection Neutralized',
    details: 'Candidate name contained <script>alert(1)</script> injection token. Payload sanitized and rejected.',
    ipAddress: '203.0.113.19',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    target: '/api/create-poll',
    payloadExcerpt: 'candidate1Name: "<script>eval(document.cookie)</script>"',
    actionTaken: 'Input Stripped & Event Logged to Security Center',
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    status: 'BLOCKED',
  },
];

// Helper: Get cached threats
function getLocalThreats(): SecurityThreat[] {
  try {
    const raw = localStorage.getItem(LOCAL_THREATS_CACHE_KEY);
    return raw ? JSON.parse(raw) : INITIAL_DEMO_THREATS;
  } catch {
    return INITIAL_DEMO_THREATS;
  }
}

function saveLocalThreats(threats: SecurityThreat[]) {
  try {
    localStorage.setItem(LOCAL_THREATS_CACHE_KEY, JSON.stringify(threats.slice(0, 50)));
  } catch {}
}

// 1. Subscribe to live security threats in real-time
export function subscribeToSecurityThreats(
  onUpdate: (threats: SecurityThreat[]) => void
) {
  // Feed local cache immediately
  onUpdate(getLocalThreats());

  const q = query(
    collection(db, SECURITY_THREATS_COLLECTION),
    orderBy('timestamp', 'desc'),
    limit(50)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        onUpdate(getLocalThreats());
        return;
      }

      const list: SecurityThreat[] = [];
      snapshot.forEach((snap) => {
        const d = snap.data();
        list.push({
          id: snap.id,
          type: (d.type || 'SUSPICIOUS_PAYLOAD') as ThreatType,
          severity: (d.severity || 'MEDIUM') as ThreatSeverity,
          title: d.title || 'Security Anomaly',
          details: d.details || '',
          ipAddress: d.ipAddress || 'Client IP Protected',
          userAgent: d.userAgent || '',
          target: d.target || '/',
          payloadExcerpt: d.payloadExcerpt || '',
          actionTaken: d.actionTaken || 'Intercepted & Blocked',
          timestamp: d.timestamp || new Date().toISOString(),
          status: (d.status || 'BLOCKED') as 'BLOCKED' | 'FLAGGED' | 'RESOLVED',
        });
      });

      saveLocalThreats(list);
      onUpdate(list);
    },
    (err) => {
      console.warn('Security threats subscription notice (using local):', err);
      onUpdate(getLocalThreats());
    }
  );
}

// 2. Log a security threat
export async function logSecurityThreat(
  threat: Omit<SecurityThreat, 'id' | 'timestamp' | 'status'>
): Promise<SecurityThreat> {
  const newId = 'threat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const fullThreat: SecurityThreat = {
    ...threat,
    id: newId,
    timestamp: new Date().toISOString(),
    status: 'BLOCKED',
  };

  // 1. Save to local cache
  const localList = getLocalThreats();
  localList.unshift(fullThreat);
  saveLocalThreats(localList);

  // Increment unread threats badge
  try {
    const unread = Number(localStorage.getItem(UNREAD_THREATS_COUNT_KEY) || '0');
    localStorage.setItem(UNREAD_THREATS_COUNT_KEY, String(unread + 1));
  } catch {}

  // 2. Persist to Firestore
  try {
    const docRef = doc(db, SECURITY_THREATS_COLLECTION, newId);
    await setDoc(docRef, fullThreat);
  } catch (err) {
    console.warn('Could not write security threat to Firestore:', err);
  }

  // 3. Post to backend server security auditor
  try {
    fetch('/api/security-threats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullThreat),
    }).catch(() => {});
  } catch {}

  return fullThreat;
}

// 3. Clear all security threat records
export async function clearAllSecurityThreats(): Promise<void> {
  localStorage.removeItem(LOCAL_THREATS_CACHE_KEY);
  localStorage.setItem(UNREAD_THREATS_COUNT_KEY, '0');

  try {
    const snap = await getDocs(collection(db, SECURITY_THREATS_COLLECTION));
    const deletePromises = snap.docs.map((docSnap) => deleteDoc(docSnap.ref));
    await Promise.all(deletePromises);
  } catch (err) {
    console.warn('Error clearing security threats from Firestore:', err);
  }
}

// 4. Input Sanitization & Attack Detection
export function sanitizeInput(input: string): { cleanText: string; hadMaliciousPayload: boolean } {
  if (!input) return { cleanText: '', hadMaliciousPayload: false };

  const maliciousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /onerror\s*=/gi,
    /onload\s*=/gi,
    /<iframe/gi,
    /document\.cookie/gi,
    /eval\s*\(/gi,
    /UNION\s+SELECT/gi,
    /DROP\s+TABLE/gi,
  ];

  let hadMaliciousPayload = false;
  let cleanText = input;

  for (const pattern of maliciousPatterns) {
    if (pattern.test(cleanText)) {
      hadMaliciousPayload = true;
      cleanText = cleanText.replace(pattern, '[REMOVED_MALICIOUS_TOKEN]');
    }
  }

  // Strip dangerous HTML brackets
  cleanText = cleanText.replace(/[<>]/g, '');

  return { cleanText, hadMaliciousPayload };
}

// 5. Anti-Bot Voting & Tampering Guard
const LAST_VOTE_TIME_KEY = 'mvc_last_vote_click_time';
export function verifyVotingIntegrity(pollId: string): { isAllowed: boolean; reason?: string } {
  const now = Date.now();
  const lastTimeRaw = sessionStorage.getItem(LAST_VOTE_TIME_KEY);

  if (lastTimeRaw) {
    const lastTime = Number(lastTimeRaw);
    // Disallow sub-500ms repeated click attacks
    if (now - lastTime < 500) {
      logSecurityThreat({
        type: 'BOT_RAPID_VOTING',
        severity: 'HIGH',
        title: 'Bot-Like Rapid Voting Intercepted',
        details: `Sub-500ms rapid vote click detected on poll ${pollId}. Automated bot script prevented from manipulating results.`,
        target: `/poll/${pollId}`,
        actionTaken: 'Request Throttled & Device Cooldown Activated',
        payloadExcerpt: `Interval: ${now - lastTime}ms`,
      });
      return {
        isAllowed: false,
        reason: 'Baraye meharbani ehtiyat karein! Rapid bot clicking detect hui hai. Chand second intezar karein.',
      };
    }
  }

  sessionStorage.setItem(LAST_VOTE_TIME_KEY, String(now));
  return { isAllowed: true };
}

// 6. Brute Force Login Tracker
const FAILED_LOGIN_ATTEMPTS_KEY = 'mvc_failed_login_attempts';
export function recordFailedLoginAttempt(identifier: string, isSuperAdminTarget: boolean) {
  try {
    const raw = sessionStorage.getItem(FAILED_LOGIN_ATTEMPTS_KEY);
    const count = (raw ? Number(raw) : 0) + 1;
    sessionStorage.setItem(FAILED_LOGIN_ATTEMPTS_KEY, String(count));

    if (count >= 2 || isSuperAdminTarget) {
      logSecurityThreat({
        type: isSuperAdminTarget ? 'UNAUTHORIZED_ADMIN_PROBE' : 'BRUTE_FORCE_LOGIN',
        severity: isSuperAdminTarget ? 'CRITICAL' : 'HIGH',
        title: isSuperAdminTarget
          ? 'Unauthorized Super Admin Access Probe Blocked'
          : 'Multiple Failed Login Attempts (Brute-Force Guard)',
        details: `Repeated failed password attempt (#${count}) targeting account "${identifier}". IP and device session monitored.`,
        target: '/login',
        actionTaken: 'Access Denied & IP Alert Triggered',
        payloadExcerpt: `Target: ${identifier} | Attempt #${count}`,
      });
    }
  } catch {}
}

export function resetFailedLoginAttempts() {
  try {
    sessionStorage.removeItem(FAILED_LOGIN_ATTEMPTS_KEY);
  } catch {}
}

// 7. Simulated Attack Trigger for Admin Demonstration
export async function simulateTestAttack(type: ThreatType): Promise<SecurityThreat> {
  let title = 'Test Attack Event';
  let details = 'Simulated attack fired for admin panel testing.';
  let severity: ThreatSeverity = 'HIGH';
  let excerpt = 'TEST_PAYLOAD';

  if (type === 'BRUTE_FORCE_LOGIN') {
    title = 'Simulated Brute-Force Password Probe';
    details = 'Attacker fired 25 dictionary password variations within 4 seconds against Admin portal.';
    severity = 'HIGH';
    excerpt = 'POST /login { pass: "admin123", "pass2025" }';
  } else if (type === 'BOT_RAPID_VOTING') {
    title = 'Simulated Automated Bot Voting Surge';
    details = 'Puppeteer/Selenium headless browser bot attempted 100 simultaneous fake votes.';
    severity = 'HIGH';
    excerpt = 'HTTP 1.1 POST /castVote [Headless Chrome UserAgent]';
  } else if (type === 'XSS_INJECTION_ATTEMPT') {
    title = 'Simulated Cross-Site Scripting (XSS) Attack';
    details = 'Malicious JavaScript payload `<script>stealCookies()</script>` intercepted in candidate profile.';
    severity = 'CRITICAL';
    excerpt = 'name="<script>document.location=\'http://attacker.com\'</script>"';
  } else if (type === 'DEVICE_LOCK_TAMPERING') {
    title = 'Simulated Local Storage Lock Bypass';
    details = 'Attacker script manually erased browser vote tokens to cast duplicate votes.';
    severity = 'MEDIUM';
    excerpt = 'localStorage.removeItem("mvc_poll_voted_123")';
  } else if (type === 'UNAUTHORIZED_ADMIN_PROBE') {
    title = 'Simulated Admin Endpoint Scan';
    details = 'Unauthorized scanner tried accessing restricted admin routes `/admin-config`, `/export-db`.';
    severity = 'CRITICAL';
    excerpt = 'GET /api/admin/export-all-users-private';
  }

  return await logSecurityThreat({
    type,
    severity,
    title,
    details,
    ipAddress: '192.168.1.' + Math.floor(10 + Math.random() * 200),
    userAgent: 'Security-Audit-Simulator/3.0',
    target: '/admin/security-test',
    payloadExcerpt: excerpt,
    actionTaken: 'Simulated Attack Intercepted & Verified by Shield',
  });
}
