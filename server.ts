import express from 'express';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

import fs from 'fs';
import {
  generateContestMomentumInsight,
  generateContestSuggestions,
  generateSecurityAudit,
} from './src/server/geminiService';

// OTP Entry type
interface OtpEntry {
  otp: string;
  expiresAt: number;
  purpose: string;
}

// In-memory + persistent cache to survive server restarts
const OTP_CACHE_FILE = path.resolve(__dirname, '.otp_cache.json');
const otpStore = new Map<string, OtpEntry[]>();

// Cyber Security: Threats Store & IP Rate-Limiting Cache
const THREATS_CACHE_FILE = path.resolve(__dirname, '.security_threats.json');
interface ServerSecurityThreat {
  id: string;
  type: string;
  severity: string;
  title: string;
  details: string;
  ipAddress?: string;
  userAgent?: string;
  target?: string;
  payloadExcerpt?: string;
  actionTaken: string;
  timestamp: string;
  status: string;
}

let serverThreats: ServerSecurityThreat[] = [];

// Rate limiting map: ip -> { count, windowStart }
const ipRateLimits = new Map<string, { count: number; windowStart: number }>();
const ipFailedOtpCounts = new Map<string, { count: number; windowStart: number }>();

function loadThreatsCache() {
  try {
    if (fs.existsSync(THREATS_CACHE_FILE)) {
      const raw = fs.readFileSync(THREATS_CACHE_FILE, 'utf-8');
      serverThreats = JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Could not read threats cache:', err);
  }
}

function saveThreatsCache() {
  try {
    fs.writeFileSync(THREATS_CACHE_FILE, JSON.stringify(serverThreats.slice(0, 100), null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not save threats cache:', err);
  }
}

function recordServerThreat(threat: Omit<ServerSecurityThreat, 'id' | 'timestamp' | 'status'>): ServerSecurityThreat {
  const fullThreat: ServerSecurityThreat = {
    ...threat,
    id: 'threat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toISOString(),
    status: 'BLOCKED',
  };
  serverThreats.unshift(fullThreat);
  saveThreatsCache();
  console.log(`[Security Audit Event] Type: ${fullThreat.type} | IP: ${fullThreat.ipAddress} | Action: ${fullThreat.actionTaken}`);
  return fullThreat;
}

loadThreatsCache();

// Security Middleware: Scan incoming payloads for script injection
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    const bodyStr = JSON.stringify(req.body);
    const hasInjection = /<script\b|javascript:|onerror\s*=|onload\s*=|UNION\s+SELECT|DROP\s+TABLE/i.test(bodyStr);
    if (hasInjection) {
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
      recordServerThreat({
        type: 'XSS_INJECTION_ATTEMPT',
        severity: 'CRITICAL',
        title: 'Malicious Payload Injected via HTTP Request',
        details: `Request to ${req.path} contained script or SQL injection tokens. Payload was immediately dropped.`,
        ipAddress: clientIp,
        userAgent: req.headers['user-agent'] || '',
        target: req.path,
        payloadExcerpt: bodyStr.substring(0, 150),
        actionTaken: 'HTTP 403 Forbidden - Request Dropped by Croex Shield',
      });
      return res.status(403).json({ success: false, message: 'Malicious payload detected and rejected by Security Shield.' });
    }
  }
  next();
});

// Load existing cache on boot
function loadOtpCache() {
  try {
    if (fs.existsSync(OTP_CACHE_FILE)) {
      const raw = fs.readFileSync(OTP_CACHE_FILE, 'utf-8');
      const data: Record<string, OtpEntry[]> = JSON.parse(raw);
      const now = Date.now();
      for (const [email, entries] of Object.entries(data)) {
        const valid = entries.filter((e) => e.expiresAt > now);
        if (valid.length > 0) {
          otpStore.set(email, valid);
        }
      }
    }
  } catch (err) {
    console.warn('Could not read OTP cache file:', err);
  }
}

function saveOtpCache() {
  try {
    const data: Record<string, OtpEntry[]> = {};
    const now = Date.now();
    for (const [email, entries] of otpStore.entries()) {
      const valid = entries.filter((e) => e.expiresAt > now);
      if (valid.length > 0) {
        data[email] = valid;
      }
    }
    fs.writeFileSync(OTP_CACHE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not save OTP cache file:', err);
  }
}

loadOtpCache();


// Gmail SMTP Transporter using provided credentials
const GMAIL_USER = 'croex.otp@gmail.com';
const GMAIL_PASS = 'lhkk wsvl lbfm utaz'.replace(/\s+/g, '');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_PASS,
  },
});

// Verify SMTP connection on server startup
transporter.verify((error) => {
  if (error) {
    console.error('SMTP connection error:', error.message);
  } else {
    console.log('✅ SMTP transporter is ready to deliver OTPs from croex.otp@gmail.com');
  }
});

// API: Send OTP
app.post('/api/send-otp', async (req, res) => {
  try {
    const { email, purpose } = req.body;
    const cleanEmail = String(email || '').trim().toLowerCase();
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({ success: false, message: 'Valid email address is required.' });
    }

    // IP Rate Limiting: Max 6 OTP requests per 10 minutes
    const now = Date.now();
    const rate = ipRateLimits.get(clientIp) || { count: 0, windowStart: now };
    if (now - rate.windowStart > 10 * 60 * 1000) {
      rate.count = 1;
      rate.windowStart = now;
    } else {
      rate.count++;
    }
    ipRateLimits.set(clientIp, rate);

    if (rate.count > 6) {
      recordServerThreat({
        type: 'RATE_LIMIT_EXCEEDED',
        severity: 'HIGH',
        title: 'OTP Flooding Attack Blocked',
        details: `IP ${clientIp} exceeded rate limit with ${rate.count} requests in 10 minutes. Throttled.`,
        ipAddress: clientIp,
        userAgent: req.headers['user-agent'] || '',
        target: '/api/send-otp',
        payloadExcerpt: `Email: ${cleanEmail}`,
        actionTaken: 'HTTP 429 Too Many Requests - Flooding Guard Engaged',
      });
      return res.status(429).json({ success: false, message: 'Bohat zyada requests! Baraye meharbani 10 minute baad koshish karein.' });
    }

    // Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes validity

    const newEntry: OtpEntry = {
      otp,
      expiresAt,
      purpose: purpose || 'signup',
    };

    // Store active OTPs for this email (allow up to 5 valid recent codes within validity window)
    const existing = (otpStore.get(cleanEmail) || []).filter((e) => e.expiresAt > Date.now());
    existing.unshift(newEntry);
    otpStore.set(cleanEmail, existing.slice(0, 5));
    saveOtpCache();

    console.log(`[OTP GENERATED] Email: ${cleanEmail} | OTP: ${otp} | Purpose: ${purpose || 'signup'}`);

    const isSignup = purpose === 'signup';
    const subject = isSignup
      ? `${otp} is your Croex Voting Center verification code`
      : `${otp} is your Croex Voting Center password reset code`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%); padding: 28px 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.025em;">
        Croex Voting Center
      </h1>
      <p style="color: #e0e7ff; margin: 6px 0 0 0; font-size: 13px; font-weight: 500;">
        Hanzla Croex Technology • Official Verification
      </p>
    </div>

    <!-- Body -->
    <div style="padding: 32px 24px; text-align: center;">
      <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569;">
        ${isSignup ? 'Welcome! Use the verification code below to complete your account registration:' : 'You requested a password reset. Use the code below to set your new password:'}
      </p>

      <!-- Code Box -->
      <div style="margin: 24px 0; padding: 18px; background-color: #f1f5f9; border-radius: 12px; border: 2px dashed #cbd5e1; display: inline-block;">
        <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #4f46e5;">
          ${otp}
        </span>
      </div>

      <p style="margin: 12px 0 0 0; font-size: 12px; color: #64748b;">
        This verification code is valid for <strong>15 minutes</strong>.
      </p>
      <p style="margin: 6px 0 0 0; font-size: 11px; color: #94a3b8;">
        For your security, please do not share this OTP with anyone. If you did not request this, you can safely ignore this email.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 11px; color: #94a3b8;">
      © ${new Date().getFullYear()} Croex Voting Center • Hanzla Croex Technology
    </div>

  </div>
</body>
</html>
    `;

    const textContent = `Your Croex Voting Center verification code is: ${otp}\n\nThis code will expire in 15 minutes.\nDo not share this code with anyone.`;

    await transporter.sendMail({
      from: `"Croex Voting Center" <${GMAIL_USER}>`,
      to: cleanEmail,
      subject,
      text: textContent,
      html: htmlContent,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'High',
      },
    });

    return res.json({
      success: true,
      message: 'Verification OTP sent directly from Croex Voting Center to your email.',
    });
  } catch (error: any) {
    console.error('Failed to send OTP:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Failed to send OTP. Please try again.',
    });
  }
});

// API: Verify OTP
app.post('/api/verify-otp', (req, res) => {
  const { email, otp, purpose } = req.body;
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanOtp = String(otp || '').replace(/\D/g, '').trim();
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';

  const entries = otpStore.get(cleanEmail) || [];
  const now = Date.now();
  const validEntries = entries.filter((e) => e.expiresAt > now);

  if (validEntries.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'OTP nahi mila ya expire ho gaya hai. Dobara OTP request karein.',
    });
  }

  // Match against any active valid OTP for this email
  const matchIndex = validEntries.findIndex((e) => e.otp === cleanOtp);

  if (matchIndex === -1) {
    // Record failed attempt for brute-force tracking
    const failRate = ipFailedOtpCounts.get(clientIp) || { count: 0, windowStart: now };
    if (now - failRate.windowStart > 10 * 60 * 1000) {
      failRate.count = 1;
      failRate.windowStart = now;
    } else {
      failRate.count++;
    }
    ipFailedOtpCounts.set(clientIp, failRate);

    if (failRate.count >= 4) {
      recordServerThreat({
        type: 'BRUTE_FORCE_LOGIN',
        severity: 'CRITICAL',
        title: 'OTP Brute-Force Guessing Attack Intercepted',
        details: `IP ${clientIp} attempted ${failRate.count} failed OTP code combinations for email ${cleanEmail}.`,
        ipAddress: clientIp,
        userAgent: req.headers['user-agent'] || '',
        target: '/api/verify-otp',
        payloadExcerpt: `Target: ${cleanEmail} | Attempt: ${cleanOtp}`,
        actionTaken: 'Blocked & Session Flagged in Security Center',
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Galat OTP code darj kiya hai! Dobara check karein.',
    });
  }

  // OTP verified successfully - clear used entries for this email
  otpStore.delete(cleanEmail);
  saveOtpCache();

  return res.json({
    success: true,
    message: 'OTP tasdeeq ho gaya!',
  });
});

// API: Security Threats Logs
app.get('/api/security-threats', (_req, res) => {
  return res.json({ success: true, threats: serverThreats });
});

app.post('/api/security-threats', (req, res) => {
  const threat = req.body;
  if (!threat || !threat.type) {
    return res.status(400).json({ success: false, message: 'Invalid threat payload' });
  }
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || threat.ipAddress || 'Client';
  const recorded = recordServerThreat({
    type: threat.type,
    severity: threat.severity || 'MEDIUM',
    title: threat.title || 'Security Anomaly',
    details: threat.details || '',
    ipAddress: clientIp,
    userAgent: req.headers['user-agent'] || threat.userAgent || '',
    target: threat.target || '/',
    payloadExcerpt: threat.payloadExcerpt || '',
    actionTaken: threat.actionTaken || 'Intercepted by Security Shield',
  });
  return res.json({ success: true, threat: recorded });
});

app.delete('/api/security-threats', (_req, res) => {
  serverThreats = [];
  saveThreatsCache();
  return res.json({ success: true, message: 'Security threats log cleared' });
});


// Cache for shortened URLs
const shortUrlCache = new Map<string, string>();

// API: Shorten URL - returns a clean, fast link without 'ais' prefix (TinyURL POST -> is.gd)
app.post('/api/shorten-url', async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ success: false, message: 'URL is required' });
  }

  // 1. Check in-memory cache
  if (shortUrlCache.has(url)) {
    const cached = shortUrlCache.get(url)!;
    if (!cached.includes('2aslg7lk') && !cached.includes('ais-') && cached.startsWith('http')) {
      return res.json({ success: true, shortUrl: cached });
    }
  }

  // Provider 1: TinyURL via HTTP POST (bypasses CDN cache, generates real tinyurl.com links)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const resp = await fetch('https://tinyurl.com/api-create.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      body: `url=${encodeURIComponent(url)}`,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (resp.ok) {
      const shortUrl = (await resp.text()).trim();
      if (
        shortUrl &&
        shortUrl.startsWith('https://tinyurl.com/') &&
        !shortUrl.includes('2aslg7lk') &&
        !shortUrl.toLowerCase().includes('error')
      ) {
        shortUrlCache.set(url, shortUrl);
        console.log(`[URL SHORTENED via TinyURL POST] ${url} -> ${shortUrl}`);
        return res.json({ success: true, shortUrl });
      }
    }
  } catch (e) {
    console.warn('TinyURL POST failed, trying is.gd:', e);
  }

  // Provider 2: is.gd fallback
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const resp = await fetch(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (resp.ok) {
      const shortUrl = (await resp.text()).trim();
      if (
        shortUrl &&
        shortUrl.startsWith('https://is.gd/') &&
        !shortUrl.toLowerCase().includes('error')
      ) {
        shortUrlCache.set(url, shortUrl);
        console.log(`[URL SHORTENED via is.gd] ${url} -> ${shortUrl}`);
        return res.json({ success: true, shortUrl });
      }
    }
  } catch (e) {
    console.warn('is.gd provider failed:', e);
  }

  // Fallback to direct URL
  return res.json({ success: true, shortUrl: url });
});

// High-speed Same-Origin Image Proxy to avoid Canvas Tainting during Result Certificate Generation
app.get('/api/proxy-image', async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl || !targetUrl.startsWith('http')) {
    return res.status(400).send('Valid image URL required');
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(response.status).send(`Image fetch failed: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();

    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    return res.send(Buffer.from(buffer));
  } catch (err: any) {
    console.warn('Proxy image fetch error:', err?.message || err);
    return res.status(500).send('Image proxy error');
  }
});

// Route handler for short links: /v/:id, /p/:id, /poll/:id
app.get(['/v/:id', '/p/:id', '/poll/:id', '/vote/:id'], (req, res) => {
  const pollId = req.params.id;
  const queryString = req.url.includes('?') ? '&' + req.url.split('?')[1] : '';
  return res.redirect(`/?v=${encodeURIComponent(pollId)}${queryString}`);
});

// Backend Intelligence API: Contest Momentum Insights
app.post('/api/ai/poll-insights', async (req, res) => {
  try {
    const { pollId, title, candidate1Name, candidate1Votes, candidate2Name, candidate2Votes, category, expiresAt } = req.body;
    if (!pollId || !title) {
      return res.status(400).json({ success: false, message: 'Poll details required' });
    }
    const insights = await generateContestMomentumInsight({
      pollId,
      title,
      candidate1Name: candidate1Name || 'Candidate 1',
      candidate1Votes: Number(candidate1Votes || 0),
      candidate2Name: candidate2Name || 'Candidate 2',
      candidate2Votes: Number(candidate2Votes || 0),
      category,
      expiresAt,
    });
    return res.json({ success: true, insights });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message || 'Insights failed' });
  }
});

// Backend Intelligence API: Smart Contest Title & Description Suggestions
app.post('/api/ai/suggest-contest', async (req, res) => {
  try {
    const { candidate1Name, candidate2Name, category, rawTopic } = req.body;
    const suggestions = await generateContestSuggestions({
      candidate1Name: candidate1Name || '',
      candidate2Name: candidate2Name || '',
      category,
      rawTopic,
    });
    return res.json({ success: true, suggestions });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message || 'Suggestions failed' });
  }
});

// Backend Intelligence API: Smart Security & Fraud Risk Audit
app.get('/api/ai/security-audit', async (_req, res) => {
  try {
    const audit = await generateSecurityAudit(serverThreats);
    return res.json({ success: true, audit });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message || 'Security audit failed' });
  }
});

async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
