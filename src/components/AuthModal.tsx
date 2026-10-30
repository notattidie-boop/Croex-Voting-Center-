import React, { useState } from 'react';
import {
  X,
  Shield,
  User,
  KeyRound,
  Mail,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Vote,
} from 'lucide-react';
import { UserSession } from '../types';
import { loginUser, registerNewUser } from '../services/authService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (session: UserSession) => void;
  initialAdminMode?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  initialAdminMode = false,
}) => {
  const [isModeAdmin, setIsModeAdmin] = useState<boolean>(initialAdminMode);
  const [isRegister, setIsRegister] = useState<boolean>(false);

  // Form Fields
  const [emailOrUsername, setEmailOrUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanInput = emailOrUsername.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanInput) {
      setErrorMessage('User name / Email darj karein.');
      return;
    }
    if (!cleanPass) {
      setErrorMessage('Password darj karein.');
      return;
    }

    setIsLoading(true);
    try {
      if (!isModeAdmin && isRegister) {
        const session = await registerNewUser(name || cleanInput.split('@')[0], cleanInput, cleanPass);
        onLoginSuccess(session);
        onClose();
      } else {
        const { session } = await loginUser(cleanInput, cleanPass);
        onLoginSuccess(session);
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Operation fail ho gaya.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestQuickEntry = () => {
    const guestSession: UserSession = {
      id: 'guest_' + Date.now().toString(36),
      name: 'Honorable Voter',
      email: 'guest@voter.local',
      isAdmin: false,
    };
    localStorage.setItem('mvc_user_session', JSON.stringify(guestSession));
    onLoginSuccess(guestSession);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon & Brand */}
        <div className="flex items-center gap-3 mb-5">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs ${
              isModeAdmin ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'
            }`}
          >
            {isModeAdmin ? <Shield className="w-6 h-6" /> : <Vote className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              {isModeAdmin ? 'Admin Control Access' : isRegister ? 'Voter Sign Up' : 'Voter Login'}
            </h3>
            <p className="text-xs text-amber-600 font-bold">Croex Voting Center</p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl mb-5">
          <button
            type="button"
            onClick={() => {
              setIsModeAdmin(false);
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
              !isModeAdmin ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Voter Login
          </button>
          <button
            type="button"
            onClick={() => {
              setIsModeAdmin(true);
              setErrorMessage(null);
              setEmailOrUsername('Mudasir.Voting.Centar.pk');
              setPassword('Mudasir2211@@');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              isModeAdmin ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Admin Portal</span>
          </button>
        </div>


        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isModeAdmin && isRegister && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Aapka Naam (Full Name)
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="e.g. Mudasir Khan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              {isModeAdmin ? 'Admin Email / Username' : 'Email Address'}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder={isModeAdmin ? 'mudasir.voting.center.com' : 'voter@example.com'}
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                required
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className={`w-full py-3 text-white font-bold text-sm rounded-xl transition shadow-xs flex items-center justify-center gap-2 ${
              isModeAdmin
                ? 'bg-indigo-600 hover:bg-indigo-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            <span>{isModeAdmin ? 'Admin Panel Login Karein' : isRegister ? 'Account Banayein' : 'Login Karein'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Footer actions */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col gap-2.5 text-center">
          {!isModeAdmin && (
            <>
              <button
                type="button"
                onClick={() => setIsRegister(!isRegister)}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                {isRegister ? 'Already have an account? Login yahan karein' : 'Naya account banana hai? Sign Up karein'}
              </button>

              <button
                type="button"
                onClick={handleGuestQuickEntry}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 py-1"
              >
                ⚡ Baghair Login Fast Voting Entry (Guest Mode)
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
