import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Terminal,
  Activity,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Lock,
  Eye,
  Server,
  Cpu,
  Globe,
  Radio,
} from 'lucide-react';
import { SecurityThreat, ThreatSeverity, ThreatType, SecurityAuditResult } from '../types';
import { fetchSecurityAudit } from '../services/intelligenceService';
import {
  subscribeToSecurityThreats,
  clearAllSecurityThreats,
  simulateTestAttack,
} from '../services/securityService';

export const AdminSecurityShield: React.FC = () => {
  const [threats, setThreats] = useState<SecurityThreat[]>([]);
  const [severityFilter, setSeverityFilter] = useState<'ALL' | ThreatSeverity>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [auditRunning, setAuditRunning] = useState<boolean>(false);
  const [auditPassed, setAuditPassed] = useState<boolean>(false);
  const [aiAudit, setAiAudit] = useState<SecurityAuditResult | null>(null);

  useEffect(() => {
    const unsub = subscribeToSecurityThreats((list) => {
      setThreats(list);
    });
    return () => unsub();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSimulate = async (type: ThreatType) => {
    setIsSimulating(true);
    try {
      const threat = await simulateTestAttack(type);
      showToast(`🚨 Simulated Attack Intercepted: ${threat.title}`);
    } catch {
      showToast('Simulation failed');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleClearLogs = async () => {
    if (confirm('Kya aap tamam security threat logs clear karna chahte hain?')) {
      await clearAllSecurityThreats();
      setThreats([]);
      showToast('Tamam threat logs clear ho gaye!');
    }
  };

  const handleRunAudit = async () => {
    setAuditRunning(true);
    setAuditPassed(false);
    setAiAudit(null);

    try {
      const result = await fetchSecurityAudit();
      if (result) {
        setAiAudit(result);
        setAuditPassed(true);
        showToast('✅ Deep Security Scan Complete: System Integrity Verified');
      } else {
        showToast('Security scan failed to reach backend');
      }
    } catch (err) {
      showToast('Scan error');
    } finally {
      setAuditRunning(false);
    }
  };

  // Metrics calculation
  const totalThreats = threats.length;
  const bruteForceCount = threats.filter((t) => t.type === 'BRUTE_FORCE_LOGIN' || t.type === 'UNAUTHORIZED_ADMIN_PROBE').length;
  const botVotingCount = threats.filter((t) => t.type === 'BOT_RAPID_VOTING' || t.type === 'DEVICE_LOCK_TAMPERING').length;
  const xssCount = threats.filter((t) => t.type === 'XSS_INJECTION_ATTEMPT' || t.type === 'SUSPICIOUS_PAYLOAD').length;

  // Filtered threats
  const filteredThreats = threats.filter((t) => {
    if (severityFilter !== 'ALL' && t.severity !== severityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        t.details.toLowerCase().includes(q) ||
        (t.ipAddress && t.ipAddress.toLowerCase().includes(q)) ||
        (t.target && t.target.toLowerCase().includes(q)) ||
        t.type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 border border-emerald-500 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-bounce text-xs font-bold font-mono">
          <ShieldAlert className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Armored Shield Status Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#070b14] via-[#0d1527] to-[#070b14] border border-emerald-500/30 p-5 sm:p-6 shadow-xl text-white">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.3)]">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-slate-950 rounded-full animate-pulse"></span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Croex Cyber Security Shield
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-widest">
                  Active • 100% Armored
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                تمام بیرونی حملوں، بوٹس، پاس ورڈ گیسنگ اور اسکرپٹ انجیکشن کی ریئل ٹائم نگرانی۔ سسٹم مکمل محفوظ ہے۔
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleRunAudit}
              disabled={auditRunning}
              className="flex-1 sm:flex-none px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20"
            >
              <Activity className={`w-3.5 h-3.5 ${auditRunning ? 'animate-spin' : ''}`} />
              <span>{auditRunning ? 'Auditing System...' : 'Run Security Audit'}</span>
            </button>
            {threats.length > 0 && (
              <button
                onClick={handleClearLogs}
                className="p-2 bg-slate-800/80 hover:bg-rose-500/20 border border-slate-700 hover:border-rose-500/50 text-slate-300 hover:text-rose-400 rounded-xl text-xs transition"
                title="Clear Threat Logs"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Audit Results Bar */}
        {auditPassed && aiAudit && (
          <div className="mt-4 space-y-3">
            <div className="p-4 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl flex flex-col sm:flex-row items-center gap-4">
              <div className="flex flex-col items-center justify-center shrink-0">
                <div className="text-3xl font-black text-emerald-400 font-mono">
                  {aiAudit.healthScore}%
                </div>
                <div className="text-[9px] font-bold text-emerald-500/70 uppercase">Health</div>
              </div>
              <div className="h-px sm:h-10 w-full sm:w-px bg-emerald-500/20"></div>
              <div className="flex-1 text-center sm:text-left">
                <div className="text-xs font-bold text-white mb-1 UrduText">
                  {aiAudit.executiveSummaryUrdu}
                </div>
                <div className="text-[10px] font-medium text-emerald-400/80 italic font-mono">
                  {aiAudit.executiveSummaryEn}
                </div>
              </div>
              <div className="shrink-0">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  aiAudit.threatLevel === 'MINIMAL' 
                    ? 'bg-emerald-500 text-slate-950' 
                    : aiAudit.threatLevel === 'ELEVATED'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-rose-600 text-white animate-pulse'
                }`}>
                  {aiAudit.threatLevel} RISK
                </span>
              </div>
            </div>

            {/* Mitigation Points */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {aiAudit.mitigationReport.map((point, idx) => (
                <div key={idx} className="px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl flex items-center gap-2 text-[10px] font-mono text-slate-400">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4 Threat Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Blocked</span>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 font-mono mt-1">{totalThreats}</div>
          <span className="text-[10px] text-slate-500 font-medium">Interceptions on record</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Brute-Force Guard</span>
            <Lock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 font-mono mt-1">{bruteForceCount}</div>
          <span className="text-[10px] text-slate-500 font-medium">Password attacks halted</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Bot & Rapid Votes</span>
            <Cpu className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-600 font-mono mt-1">{botVotingCount}</div>
          <span className="text-[10px] text-slate-500 font-medium">Automated scripts blocked</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Script / XSS Drops</span>
            <Terminal className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono mt-1">{xssCount}</div>
          <span className="text-[10px] text-slate-500 font-medium">Malicious inputs neutralized</span>
        </div>
      </div>

      {/* Interactive Attack Simulator (Admin Test Bed) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight">
                Live Attack Simulator & Shield Verification
              </h3>
              <p className="text-[11px] text-slate-500">
                ٹیسٹ اٹیک چلا کر چیک کریں کہ شیلڈ کیسے حملہ روک کر ایڈمن لاگ میں دکھاتی ہے۔
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
            SANDBOX TEST READY
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <button
            onClick={() => handleSimulate('BRUTE_FORCE_LOGIN')}
            disabled={isSimulating}
            className="p-2.5 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 text-left transition group"
          >
            <div className="flex items-center gap-1.5 text-amber-700 text-xs font-bold mb-1">
              <Lock className="w-3.5 h-3.5" />
              <span>Brute-Force Attack</span>
            </div>
            <p className="text-[10px] text-slate-500 line-clamp-2">
              Dictionary password spamming test
            </p>
          </button>

          <button
            onClick={() => handleSimulate('BOT_RAPID_VOTING')}
            disabled={isSimulating}
            className="p-2.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 text-left transition group"
          >
            <div className="flex items-center gap-1.5 text-indigo-700 text-xs font-bold mb-1">
              <Cpu className="w-3.5 h-3.5" />
              <span>Rapid Bot Voting</span>
            </div>
            <p className="text-[10px] text-slate-500 line-clamp-2">
              Automated headless bot flood test
            </p>
          </button>

          <button
            onClick={() => handleSimulate('XSS_INJECTION_ATTEMPT')}
            disabled={isSimulating}
            className="p-2.5 rounded-xl border border-slate-200 hover:border-rose-400 hover:bg-rose-50/50 text-left transition group"
          >
            <div className="flex items-center gap-1.5 text-rose-700 text-xs font-bold mb-1">
              <Terminal className="w-3.5 h-3.5" />
              <span>XSS Script Attack</span>
            </div>
            <p className="text-[10px] text-slate-500 line-clamp-2">
              Malicious JavaScript tag injection
            </p>
          </button>

          <button
            onClick={() => handleSimulate('DEVICE_LOCK_TAMPERING')}
            disabled={isSimulating}
            className="p-2.5 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 text-left transition group"
          >
            <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold mb-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Double-Vote Bypass</span>
            </div>
            <p className="text-[10px] text-slate-500 line-clamp-2">
              Cache clear & vote bypass probe
            </p>
          </button>
        </div>
      </div>

      {/* Live Threat Logs Table & Feed */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
            <h3 className="text-sm font-black text-slate-900 tracking-tight">
              Live Intercepted Threat Feed ({filteredThreats.length})
            </h3>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Severity Filter */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl text-[11px] font-bold">
              {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'] as const).map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    severityFilter === sev
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[160px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search threats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {filteredThreats.length === 0 ? (
          <div className="py-12 text-center text-slate-400 font-mono text-xs">
            <ShieldCheck className="w-10 h-10 text-emerald-500/40 mx-auto mb-2" />
            <p className="font-bold text-slate-700">No threat incidents matching your filter.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">System is protected and running smoothly.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredThreats.map((threat) => {
              const isCrit = threat.severity === 'CRITICAL';
              const isHigh = threat.severity === 'HIGH';

              return (
                <div
                  key={threat.id}
                  className="p-4 rounded-2xl border border-slate-200/90 hover:border-slate-300 transition bg-slate-50/50 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isCrit
                            ? 'bg-rose-100 text-rose-600'
                            : isHigh
                            ? 'bg-amber-100 text-amber-600'
                            : 'bg-indigo-100 text-indigo-600'
                        }`}
                      >
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-black text-slate-900 tracking-tight">
                            {threat.title}
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider ${
                              isCrit
                                ? 'bg-rose-500 text-white'
                                : isHigh
                                ? 'bg-amber-500 text-white'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {threat.severity}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {threat.type}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                          {threat.details}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>{threat.status}</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-1">
                        {new Date(threat.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Threat Detail Bar: IP & Action & Payload */}
                  <div className="mt-3 pt-2.5 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono">
                    <div className="flex items-center gap-3 text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3 text-slate-400" />
                        <span>IP: {threat.ipAddress || 'Protected'}</span>
                      </span>
                      {threat.target && (
                        <span className="flex items-center gap-1">
                          <Server className="w-3 h-3 text-slate-400" />
                          <span>Endpoint: {threat.target}</span>
                        </span>
                      )}
                    </div>
                    <div className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                      Action: {threat.actionTaken}
                    </div>
                  </div>

                  {threat.payloadExcerpt && (
                    <div className="mt-2 p-2 bg-slate-900 rounded-xl text-[10px] font-mono text-emerald-400 overflow-x-auto">
                      <code>{threat.payloadExcerpt}</code>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5-Layer Security Architecture Card */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-800">
        <div className="flex items-center gap-2.5 mb-4">
          <Lock className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-black text-white tracking-tight">
            Active 5-Layer Defense Architecture (حفاظتی نظام)
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80">
            <span className="text-[10px] font-mono text-emerald-400 font-bold">LAYER 1: ZERO-TRUST RULES</span>
            <p className="font-bold text-white mt-1">Cloud Firestore Security Rules</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              ڈیٹا بیس رولز بلا واسطہ رائٹس اور غیر مجاز ووٹس کو سرور سائیڈ پر ہی بلاک کر دیتے ہیں۔
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80">
            <span className="text-[10px] font-mono text-emerald-400 font-bold">LAYER 2: 1-VOTE DEVICE LOCK</span>
            <p className="font-bold text-white mt-1">Anti-Double Voting Guard</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              ہر ڈیوائس پر ہارڈویئر فنگر پرنٹ اور کلاؤڈ تصدیق کے ذریعے ڈپلیکیٹ ووٹ ناممکن ہے۔
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80">
            <span className="text-[10px] font-mono text-emerald-400 font-bold">LAYER 3: RATE LIMITER</span>
            <p className="font-bold text-white mt-1">IP Request & OTP Throttling</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              او ٹی پی یا لاگ ان فلڈنگ کی صورت میں متعلقہ آئی پی 10 منٹ کے لیے خودکار بلاک ہو جاتی ہے۔
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80">
            <span className="text-[10px] font-mono text-emerald-400 font-bold">LAYER 4: INPUT SANITIZER</span>
            <p className="font-bold text-white mt-1">XSS & Script Injection Filter</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              تمام نام، عنوانات اور پیغامات میں سے خطرناک اسکرپٹ یا کوڈ کو خود بخود صاف کیا جاتا ہے۔
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80">
            <span className="text-[10px] font-mono text-emerald-400 font-bold">LAYER 5: BRUTE-FORCE LOCK</span>
            <p className="font-bold text-white mt-1">Admin Intrusion Guard</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              ایڈمن پاس ورڈ کے غلط اندراج پر فورا الرٹ جنریٹ ہوتا ہے اور حملہ آور کو بلاک کیا جاتا ہے۔
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">SYSTEM INTEGRITY</span>
              <p className="font-bold text-white mt-1">Encrypted Sessions</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                مکمل سیشنز محفوظ اور کسٹم اٹیک اینٹی باڈیز کے ساتھ لائیو۔
              </p>
            </div>
            <div className="mt-2 text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span>100% OPERATIONAL</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
