import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

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

// In-memory cache for contest insights (cached for 60 seconds per poll)
const insightsCache = new Map<string, { data: ContestInsightResult; cachedAt: number }>();

/**
 * Generates an objective, fair, and high-value contest momentum analysis
 * Completely backend-driven, never mentions Gemini or underlying models
 */
export async function generateContestMomentumInsight(poll: {
  pollId: string;
  title: string;
  candidate1Name: string;
  candidate1Votes: number;
  candidate2Name: string;
  candidate2Votes: number;
  category?: string;
  expiresAt?: string;
}): Promise<ContestInsightResult> {
  const cacheKey = `${poll.pollId}_${poll.candidate1Votes}_${poll.candidate2Votes}`;
  const cached = insightsCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < 60000) {
    return cached.data;
  }

  const total = poll.candidate1Votes + poll.candidate2Votes;
  const c1Pct = total > 0 ? Math.round((poll.candidate1Votes / total) * 100) : 50;
  const c2Pct = total > 0 ? 100 - c1Pct : 50;
  const leaderName = poll.candidate1Votes >= poll.candidate2Votes ? poll.candidate1Name : poll.candidate2Name;
  const marginPct = Math.abs(c1Pct - c2Pct);
  const isEnded = Boolean(poll.expiresAt && new Date(poll.expiresAt).getTime() <= Date.now());

  const winnerName = poll.candidate1Votes > poll.candidate2Votes ? poll.candidate1Name : poll.candidate2Name;
  const loserName = poll.candidate1Votes > poll.candidate2Votes ? poll.candidate2Name : poll.candidate1Name;
  const winVotes = Math.max(poll.candidate1Votes, poll.candidate2Votes);
  const diffVotes = Math.abs(poll.candidate1Votes - poll.candidate2Votes);
  const isTie = poll.candidate1Votes === poll.candidate2Votes;

  // Deterministic fallback if API key is not present or service is unreachable
  const defaultFallback: ContestInsightResult = isEnded
    ? isTie
      ? {
          headlineUrdu: 'مقابلہ برابر رہا! باضابطہ نتیجہ: ٹائی (Tie)',
          analysisUrdu: `دونوں امیدواروں (${poll.candidate1Name} اور ${poll.candidate2Name}) نے برابر ${winVotes.toLocaleString()} ووٹ حاصل کیے۔ ووٹنگ کا وقت ختم ہو چکا ہے اور اب نئے ووٹس لگنا بند ہو گئے ہیں۔`,
          headlineEn: 'Contest Ended in an Official Tie! Voting is Closed',
          analysisEn: `Both candidates finished with ${winVotes.toLocaleString()} votes each. Voting time has ended and vote casting is officially closed.`,
          leadMargin: 0,
          projectedTrend: 'neck_and_neck',
          keyTakeawayUrdu: 'ووٹنگ کا وقت ختم ہو چکا ہے، اب مزید ووٹ لگنا بند ہو گئے ہیں۔',
        }
      : {
          headlineUrdu: `🏆 ${winnerName} جیت چکا ہے! (Official Winner)`,
          analysisUrdu: `${winnerName} نے کل ${winVotes.toLocaleString()} ووٹ حاصل کر کے ${loserName} کے خلاف ${diffVotes.toLocaleString()} ووٹوں سے مقابلہ جیت لیا ہے۔ ووٹنگ کا وقت ختم ہو چکا ہے اور اب نئے ووٹس لگنا بند ہو گئے ہیں!`,
          headlineEn: `🏆 ${winnerName} has Won the Contest! (Official Winner)`,
          analysisEn: `${winnerName} won this contest with ${winVotes.toLocaleString()} certified votes (lead of ${diffVotes.toLocaleString()} votes). Voting has ended and vote casting is now officially closed.`,
          leadMargin: marginPct,
          projectedTrend: 'leading_strong',
          keyTakeawayUrdu: `باضابطہ فاتح: ${winnerName}۔ اب ووٹ لگنا بند ہو چکا ہے۔`,
        }
    : !isTie
    ? {
        headlineUrdu: `🏆 ${winnerName} جیت رہا ہے! (${winVotes.toLocaleString()} ووٹوں کے ساتھ آگے)`,
        analysisUrdu: `اس وقت تمام تر لائیو مومینٹم ${winnerName} کے حق میں ہے جنہوں نے کل ${winVotes.toLocaleString()} تصدیق شدہ ووٹس حاصل کر کے ${loserName} کے خلاف ${diffVotes.toLocaleString()} ووٹوں کی برتری قائم کر لی ہے۔ وہ اس مقابلے میں جیت کی مضبوط پوزیشن میں ہیں!`,
        headlineEn: `🏆 ${winnerName} is Winning! (${winVotes.toLocaleString()} votes, leading by ${diffVotes.toLocaleString()})`,
        analysisEn: `All real-time momentum is strongly in favor of ${winnerName} with ${winVotes.toLocaleString()} certified votes. ${winnerName} is on track to win!`,
        leadMargin: marginPct,
        projectedTrend: 'leading_strong',
        keyTakeawayUrdu: `🏆 ${winnerName} کی واضح برتری، فتح کے قریب!`,
      }
    : {
        headlineUrdu: total === 0 ? 'مقابلہ شروع ہو چکا ہے، اپنا ووٹ کاسٹ کریں!' : `سخت کانٹے دار مقابلہ: ${poll.candidate1Name} اور ${poll.candidate2Name} برابر ہیں!`,
        analysisUrdu: total === 0 ? 'ووٹنگ کا آغاز ہو چکا ہے، ابھی کسی امیدوار کو ووٹ نہیں ملا۔ اپنا قیمتی ووٹ ڈال کر شاندار برتری دلوائیں!' : `دونوں امیدواروں کے درمیان سخت مقابلہ جاری ہے اور دونوں کو برابر ${winVotes.toLocaleString()} ووٹ ملے ہیں۔`,
        headlineEn: total === 0 ? 'Voting is Live! Cast the First Vote' : `Neck-and-Neck Tie: ${poll.candidate1Name} and ${poll.candidate2Name}`,
        analysisEn: total === 0 ? 'Contest is officially active. Cast your certified vote to create the initial lead.' : `Both candidates are currently tied with ${winVotes.toLocaleString()} votes each. Every single vote counts!`,
        leadMargin: 0,
        projectedTrend: 'neck_and_neck',
        keyTakeawayUrdu: 'ہر نیا ووٹ قیمتی ہے، فوری ووٹ دے کر برتری دلائیں۔',
      };

  if (!process.env.GEMINI_API_KEY) {
    return defaultFallback;
  }

  try {
    const prompt = `You are a real-time election and polling analytics engine for "Croex Voting Center".
Analyze this 2-candidate contest and output ONLY raw JSON without markdown code fences:
Contest: "${poll.title}"
Category: ${poll.category || 'General'}
Status: ${isEnded ? 'CONTEST FINISHED (Voting Ended, Closed)' : 'LIVE VOTING ACTIVE'}
Candidate A: ${poll.candidate1Name} (${poll.candidate1Votes} votes, ${c1Pct}%)
Candidate B: ${poll.candidate2Name} (${poll.candidate2Votes} votes, ${c2Pct}%)
Total Votes: ${total}
${
  isEnded
    ? `IMPORTANT: Voting is COMPLETE and CLOSED. In headlineUrdu and headlineEn, state the WINNER (${isTie ? 'Tie' : winnerName}) clearly as "Winner". In analysisUrdu and analysisEn, announce the winner and state that voting has ended and no more votes can be cast ("Ab vote lagna band ho chuka hai").`
    : !isTie
    ? `IMPORTANT: ${winnerName} is currently LEADING and WINNING with ${winVotes} votes against ${loserName} (${diffVotes} vote lead). In headlineUrdu and headlineEn, speak directly and exclusively about ${winnerName} winning/leading (e.g. "🏆 ${winnerName} Jeet Raha Hai!"). In analysisUrdu and analysisEn, discuss ${winnerName}'s lead, victory momentum, and certified votes directly.`
    : `Both candidates are tied. Mention the close competition.`
}

Output format:
{
  "headlineUrdu": "Short Urdu headline under 10 words",
  "analysisUrdu": "2 sentences of objective analysis in natural Urdu",
  "headlineEn": "Short English headline under 10 words",
  "analysisEn": "2 sentences of objective analysis in crisp English",
  "leadMargin": ${marginPct},
  "projectedTrend": "leading_strong" or "neck_and_neck" or "comeback_possible",
  "keyTakeawayUrdu": "One sentence summary"
}
Rules:
- Strictly impartial and objective.
- Never use words like 'AI', 'Gemini', 'Language Model', or 'robot'.
- Write in natural, modern Pakistani Urdu.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = (response.text || '').trim();
    const cleanJson = text.replace(/^```json\s*|\s*```$/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    const result: ContestInsightResult = {
      headlineUrdu: parsed.headlineUrdu || defaultFallback.headlineUrdu,
      analysisUrdu: parsed.analysisUrdu || defaultFallback.analysisUrdu,
      headlineEn: parsed.headlineEn || defaultFallback.headlineEn,
      analysisEn: parsed.analysisEn || defaultFallback.analysisEn,
      leadMargin: marginPct,
      projectedTrend: parsed.projectedTrend || defaultFallback.projectedTrend,
      keyTakeawayUrdu: parsed.keyTakeawayUrdu || defaultFallback.keyTakeawayUrdu,
    };

    insightsCache.set(cacheKey, { data: result, cachedAt: Date.now() });
    return result;
  } catch (err) {
    console.warn('Contest insight generation failed, using statistical fallback:', err);
    return defaultFallback;
  }
}

/**
 * Generates neutral, engaging contest titles and descriptions
 */
export async function generateContestSuggestions(input: {
  candidate1Name: string;
  candidate2Name: string;
  category?: string;
  rawTopic?: string;
}): Promise<ContestSuggestionResult> {
  const c1 = input.candidate1Name.trim() || 'Candidate A';
  const c2 = input.candidate2Name.trim() || 'Candidate B';

  const defaultFallback: ContestSuggestionResult = {
    suggestedTitle: `${c1} vs ${c2} - Live Voting Contest`,
    suggestedDescription: `Vote for your preferred candidate between ${c1} and ${c2}. Real-time certified votes with verified results.`,
    recommendedCategory: input.category || 'General',
    suggestedDurationHours: 24,
  };

  if (!process.env.GEMINI_API_KEY) {
    return defaultFallback;
  }

  try {
    const prompt = `You are a contest title and description generator for a live 2-candidate voting system.
Candidate 1: "${c1}"
Candidate 2: "${c2}"
Category / Topic hint: "${input.rawTopic || input.category || 'Public Contest'}"

Return ONLY raw JSON with:
{
  "suggestedTitle": "A balanced, engaging contest title under 8 words",
  "suggestedDescription": "A neutral, professional 1-2 sentence description explaining the face-off",
  "recommendedCategory": "Best category (e.g. Leadership, Sports, Campus, Entertainment, Community)",
  "suggestedDurationHours": 24 or 48 or 72
}
Never use the words AI, Gemini, or robotic phrases.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = (response.text || '').trim();
    const cleanJson = text.replace(/^```json\s*|\s*```$/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    return {
      suggestedTitle: parsed.suggestedTitle || defaultFallback.suggestedTitle,
      suggestedDescription: parsed.suggestedDescription || defaultFallback.suggestedDescription,
      recommendedCategory: parsed.recommendedCategory || defaultFallback.recommendedCategory,
      suggestedDurationHours: Number(parsed.suggestedDurationHours) || 24,
    };
  } catch (err) {
    console.warn('Suggestion generation failed, using fallback:', err);
    return defaultFallback;
  }
}

/**
 * Intelligent Cyber Security & Threat Audit for Admin Control Panel
 */
export async function generateSecurityAudit(
  threats: any[]
): Promise<SecurityAuditResult> {
  const threatCount = threats.length;
  const recentBlocked = threats.slice(0, 10);

  const defaultFallback: SecurityAuditResult = {
    healthScore: threatCount === 0 ? 100 : Math.max(70, 100 - threatCount * 4),
    threatLevel: threatCount > 10 ? 'ELEVATED' : 'MINIMAL',
    executiveSummaryUrdu:
      threatCount === 0
        ? 'سسٹم کا تمام ٹریفک محفوظ ہے، کسی قسم کی مشتبہ سرگرمی نوٹ نہیں ہوئی۔'
        : `کل ${threatCount} مشتبہ کوششیں بلاک کی جا چکی ہیں، کلاؤڈ شیلڈ مکمل طور پر متحرک ہے۔`,
    executiveSummaryEn:
      threatCount === 0
        ? 'All voter transactions verified. Zero security anomalies recorded.'
        : `${threatCount} unauthorized traffic attempts intercepted and dropped by Security Shield.`,
    mitigationReport: [
      '1-Device-1-Vote Hardware Lock: ACTIVE',
      'Anti-Brute Force OTP Rate Limiter: ENFORCING',
      'XSS Payload Interceptor: ACTIVE',
    ],
  };

  if (!process.env.GEMINI_API_KEY || threatCount === 0) {
    return defaultFallback;
  }

  try {
    const prompt = `You are the cyber security auditing engine for Croex Voting Center.
Evaluate these recently blocked threats:
${JSON.stringify(recentBlocked)}

Output ONLY raw JSON:
{
  "healthScore": integer from 0 to 100,
  "threatLevel": "MINIMAL" or "ELEVATED" or "CRITICAL",
  "executiveSummaryUrdu": "One concise sentence in natural Urdu summarizing the security shield status",
  "executiveSummaryEn": "One concise sentence in professional English",
  "mitigationReport": ["Action 1", "Action 2", "Action 3"]
}
Never mention AI or Gemini.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = (response.text || '').trim();
    const cleanJson = text.replace(/^```json\s*|\s*```$/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    return {
      healthScore: Number(parsed.healthScore) || defaultFallback.healthScore,
      threatLevel: parsed.threatLevel || defaultFallback.threatLevel,
      executiveSummaryUrdu: parsed.executiveSummaryUrdu || defaultFallback.executiveSummaryUrdu,
      executiveSummaryEn: parsed.executiveSummaryEn || defaultFallback.executiveSummaryEn,
      mitigationReport: Array.isArray(parsed.mitigationReport)
        ? parsed.mitigationReport
        : defaultFallback.mitigationReport,
    };
  } catch (err) {
    return defaultFallback;
  }
}
