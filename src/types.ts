export interface Poll {
  id: string;
  title: string;
  description: string;
  candidate1Name: string;
  candidate1Photo: string;
  candidate1Votes: number;
  candidate2Name: string;
  candidate2Photo: string;
  candidate2Votes: number;
  totalVotes: number;
  expiresAt: string; // ISO string
  createdAt: string;
  createdBy: string;
  creatorId?: string;
  creatorEmail?: string;
  status: 'active' | 'expired' | 'closed' | 'archived';
  category?: string;
  bannerPhoto?: string;
  shortUrl?: string;
  candidate1AudioText?: string;
  candidate1AudioUrl?: string;
  candidate2AudioText?: string;
  candidate2AudioUrl?: string;
  cityVotes?: Record<string, { c1: number; c2: number }>;
}

export interface CheerMessage {
  id: string;
  pollId: string;
  voterName: string;
  candidateChoice: 1 | 2;
  message: string;
  city?: string;
  likes: number;
  createdAt: string;
}

export interface VoteRecord {
  id: string;
  pollId: string;
  voterId: string;
  voterName: string;
  candidateChoice: 1 | 2;
  city?: string;
  createdAt: string;
  isOfflineSync?: boolean;
}

export interface AdminLog {
  id: string;
  pollId: string;
  pollTitle?: string;
  action: string;
  candidateName?: string;
  addedVotes: number;
  timestamp: string;
}

export interface UserSession {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  phone?: string;
  photo?: string;
  avatar?: string;
  bio?: string;
  city?: string;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  password?: string;
  phone?: string;
  photo?: string;
  bio?: string;
  city?: string;
  isAdmin?: boolean;
  status?: 'active' | 'suspended';
  createdAt: string;
  lastLogin?: string;
}
export interface DashboardBanner {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  badge?: string;
  linkUrl?: string;
  pollId?: string;
  order: number;
  active: boolean;
  createdAt: string;
}

export interface CompanyRuleItem {
  id: string;
  title: string;
  description: string;
  category?: string;
  order: number;
  createdAt: string;
  addedBy?: string;
}

export type ThreatSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type ThreatType =
  | 'BRUTE_FORCE_LOGIN'
  | 'BOT_RAPID_VOTING'
  | 'XSS_INJECTION_ATTEMPT'
  | 'DEVICE_LOCK_TAMPERING'
  | 'RATE_LIMIT_EXCEEDED'
  | 'UNAUTHORIZED_ADMIN_PROBE'
  | 'SUSPICIOUS_PAYLOAD';

export interface SecurityThreat {
  id: string;
  type: ThreatType;
  severity: ThreatSeverity;
  title: string;
  details: string;
  ipAddress?: string;
  userAgent?: string;
  target?: string;
  payloadExcerpt?: string;
  actionTaken: string;
  timestamp: string;
  status: 'BLOCKED' | 'FLAGGED' | 'RESOLVED';
}

export interface ContestInsightResult {
  headlineUrdu: string;
  analysisUrdu: string;
  headlineEn: string;
  analysisEn: string;
  leadMargin: number;
  projectedTrend: 'leading_strong' | 'neck_and_neck' | 'comeback_possible';
  keyTakeawayUrdu: string;
}

export interface ContestSuggestionResult {
  suggestedTitle: string;
  suggestedDescription: string;
  recommendedCategory: string;
  suggestedDurationHours: number;
}

export interface SecurityAuditResult {
  healthScore: number;
  threatLevel: 'MINIMAL' | 'ELEVATED' | 'CRITICAL';
  executiveSummaryUrdu: string;
  executiveSummaryEn: string;
  mitigationReport: string[];
}

