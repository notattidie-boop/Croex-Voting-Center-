import React, { useState } from 'react';
import {
  Vote,
  Shield,
  User,
  KeyRound,
  Mail,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ArrowLeft,
  Lock,
} from 'lucide-react';
import { CroexLogo } from './CroexLogo';
import { UserSession } from '../types';
import {
  sendOtpEmail,
  verifyOtpCode,
  registerNewUser,
  loginUser,
  resetUserPassword,
} from '../services/authService';

interface AuthScreenProps {
  onLoginSuccess: (session: UserSession, redirectToAdmin?: boolean) => void;
}

type AuthMode = 'login' | 'register' | 'forgot_password';

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [authMode, setAuthMode] = useState<AuthMode>('login');

  // Form Fields
  const [emailOrUsername, setEmailOrUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');

  // OTP Verification state
  const [otp, setOtp] = useState<string>('');
  const [isOtpSent, setIsOtpSent] = useState<boolean>(false);
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  // Feedback states
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  // Switch mode handler
  const handleModeChange = (mode: AuthMode) => {
    setAuthMode(mode);
    setErrorMessage(null);
    setSuccessMessage(null);
    setOtp('');
    setIsOtpSent(false);
  };

  // Cooldown countdown for OTP resend
  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // 1. Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const { session, redirectToAdmin } = await loginUser(emailOrUsername, password);
      onLoginSuccess(session, redirectToAdmin);
    } catch (err: any) {
      setErrorMessage(err.message || 'Login karne mein masla pesh aya.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Step 1 of Sign Up: Send OTP to User's Gmail
  const handleSendSignupOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = emailOrUsername.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Baraye meharbani durust Gmail / Email darj karein.');
      return;
    }
    if (!fullName.trim()) {
      setErrorMessage('Baraye meharbani apna Pura Naam (Full Name) likhein.');
      return;
    }
    if (!password.trim() || password.length < 4) {
      setErrorMessage('Password kam az kam 4 characters ka hona chahiye.');
      return;
    }

    setIsLoading(true);
    try {
      await sendOtpEmail(cleanEmail, 'signup');
      setIsOtpSent(true);
      setResendCooldown(60);
      setSuccessMessage(`OTP code aapki Gmail (${cleanEmail}) par bhej diya gaya hai!`);
    } catch (err: any) {
      setErrorMessage(err.message || 'OTP nahi bheja ja saka. Email check karein.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2 of Sign Up: Verify OTP & Register Account
  const handleVerifySignupOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!otp.trim() || otp.trim().length !== 6) {
      setErrorMessage('Baraye meharbani 6-digit OTP code darj karein.');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Verify OTP code
      await verifyOtpCode(emailOrUsername, otp, 'signup');

      // 2. Register User in Firestore & create session
      const session = await registerNewUser(fullName, emailOrUsername, password);
      setSuccessMessage('Account kamyabi se ban gaya! Dashboard khul raha hai...');
      setTimeout(() => {
        onLoginSuccess(session, false);
      }, 800);
    } catch (err: any) {
      setErrorMessage(err.message || 'OTP verification fail ho gayi.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Step 1 of Forgot Password: Send Reset OTP
  const handleSendForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = emailOrUsername.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Baraye meharbani apni registered Gmail darj karein.');
      return;
    }

    setIsLoading(true);
    try {
      await sendOtpEmail(cleanEmail, 'forgot_password');
      setIsOtpSent(true);
      setResendCooldown(60);
      setSuccessMessage(`Password reset OTP code aapki Gmail (${cleanEmail}) par bhej diya gaya hai!`);
    } catch (err: any) {
      setErrorMessage(err.message || 'OTP nahi bheja ja saka.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2 of Forgot Password: Verify OTP & Set New Password
  const handleVerifyAndResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!otp.trim() || otp.trim().length !== 6) {
      setErrorMessage('Baraye meharbani 6-digit OTP code darj karein.');
      return;
    }
    if (!newPassword.trim() || newPassword.length < 4) {
      setErrorMessage('Naya password kam az kam 4 characters ka hona chahiye.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Dono passwords apas mein match nahi ho rahay!');
      return;
    }

    setIsLoading(true);
    try {
      await verifyOtpCode(emailOrUsername, otp, 'forgot_password');
      await resetUserPassword(emailOrUsername, newPassword);

      setSuccessMessage('Password kamyabi se tabdeel ho gaya! Baraye meharbani naye password se login karein.');
      setPassword(newPassword);
      setTimeout(() => {
        setAuthMode('login');
        setIsOtpSent(false);
        setOtp('');
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Password reset fail ho gaya.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP trigger
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isLoading) return;
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const purpose = authMode === 'forgot_password' ? 'forgot_password' : 'signup';
      await sendOtpEmail(emailOrUsername, purpose);
      setOtp('');
      setResendCooldown(60);
      setSuccessMessage('Naya OTP code aapki Gmail par bhej diya gaya hai!');
    } catch (err: any) {
      setErrorMessage(err.message || 'OTP dobara nahi bheja ja saka.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col justify-center items-center p-4 font-sans">
      <div className="max-w-sm w-full bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-lg relative">
        
        {/* Brand Header with Uploaded HD Logo */}
        <div className="text-center mb-5">
          <img
            src="/croex-logo-hd.png"
            alt="Croex Voting Center"
            className="w-24 h-24 sm:w-28 sm:h-28 mx-auto mb-2.5 rounded-2xl object-contain shadow-md border border-amber-400/30"
          />
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Croex Voting Center
          </h1>
          <p className="text-[11px] text-amber-600 font-bold mt-0.5 tracking-wide">
            Hanzla Croex Technology
          </p>
        </div>

        {/* Mode Selector Tabs (Login / Create Account) */}
        {authMode !== 'forgot_password' ? (
          <div className="flex items-center p-1 bg-slate-100 rounded-xl mb-5">
            <button
              type="button"
              onClick={() => handleModeChange('login')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                authMode === 'login'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Login
            </button>

            <button
              type="button"
              onClick={() => handleModeChange('register')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                authMode === 'register'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <button
              type="button"
              onClick={() => handleModeChange('login')}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Login</span>
            </button>
            <span className="text-xs font-bold text-indigo-600">Forgot Password</span>
          </div>
        )}

        {/* Status Messages */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-start gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && !isOtpSent && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-start gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ----------------- 1. LOGIN MODE ----------------- */}
        {authMode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                User Name / Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Apna username ya Gmail likhein"
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => handleModeChange('forgot_password')}
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 mt-2 disabled:opacity-50"
            >
              {isLoading ? (
                <span>Checking...</span>
              ) : (
                <>
                  <span>Login Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ----------------- 2. CREATE ACCOUNT WITH GMAIL OTP ----------------- */}
        {authMode === 'register' && (
          <>
            {!isOtpSent ? (
              /* Step 1: Input Details and Send OTP */
              <form onSubmit={handleSendSignupOtp} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Full Name (Pura Naam)
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="e.g. Mudasir Khan"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Apni Gmail Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      placeholder="e.g. user@gmail.com"
                      value={emailOrUsername}
                      onChange={(e) => setEmailOrUsername(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Is Gmail par 6-digit OTP verification code aayega.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Set Password
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 mt-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <span>Sending OTP to Gmail...</span>
                  ) : (
                    <>
                      <span>Send OTP to Gmail</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* Step 2: Enter OTP to finalize registration */
              <form onSubmit={handleVerifySignupOtp} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 text-center">
                    Enter 6-Digit OTP Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    required
                    className="w-full py-2.5 text-center bg-slate-50 border-2 border-indigo-400 rounded-xl text-lg font-mono font-black tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || otp.length !== 6}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isLoading ? (
                    <span>Verifying...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verify OTP & Create Account</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setIsOtpSent(false)}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-800"
                  >
                    Change Details
                  </button>
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || isLoading}
                    onClick={handleResendOtp}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 disabled:text-slate-400 flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                    </span>
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {/* ----------------- 3. FORGOT PASSWORD WITH GMAIL OTP ----------------- */}
        {authMode === 'forgot_password' && (
          <>
            {!isOtpSent ? (
              /* Step 1: Enter email for reset OTP */
              <form onSubmit={handleSendForgotOtp} className="space-y-3">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Apni registered Gmail address likhein. Hum aapko password reset karne ka OTP bhejenge.
                </p>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Registered Gmail
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      placeholder="yourname@gmail.com"
                      value={emailOrUsername}
                      onChange={(e) => setEmailOrUsername(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 mt-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <span>Sending Reset OTP...</span>
                  ) : (
                    <>
                      <span>Send Reset OTP</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* Step 2: Enter OTP and Set New Password */
              <form onSubmit={handleVerifyAndResetPassword} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Enter 6-Digit OTP
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    required
                    className="w-full py-2 text-center bg-slate-50 border-2 border-indigo-400 rounded-xl text-base font-mono font-black tracking-widest text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Naya Password (New Password)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Confirm Naya Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || otp.length !== 6}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isLoading ? (
                    <span>Updating Password...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Set New Password & Login</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setIsOtpSent(false)}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-800"
                  >
                    Change Email
                  </button>
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || isLoading}
                    onClick={handleResendOtp}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 disabled:text-slate-400 flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                    </span>
                  </button>
                </div>
              </form>
            )}
          </>
        )}

      </div>
    </div>
  );
};
