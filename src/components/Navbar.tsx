import React from 'react';
import {
  Vote,
  Shield,
  User,
  Power,
} from 'lucide-react';
import { UserSession } from '../types';
import { TabType } from './BottomNav';
import { CroexLogo } from './CroexLogo';
import { useLanguage } from '../contexts/LanguageContext';

interface NavbarProps {
  currentUser: UserSession | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenAdmin: () => void;
  currentTab: TabType;
  onChangeTab: (tab: TabType) => void;
  onNavigatePortal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onOpenAuth,
  onLogout,
  onOpenAdmin,
  currentTab,
  onChangeTab,
  onNavigatePortal,
}) => {
  const { language, toggleLanguage } = useLanguage();
  const userPhoto = currentUser?.photo || currentUser?.avatar;

  return (
    <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-2xs">
      <div className="max-w-[430px] mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Brand / Logo exactly as in mockup */}
        <button
          onClick={onNavigatePortal}
          className="flex items-center text-left group"
        >
          <CroexLogo size={42} showText={true} />
        </button>

        {/* Right Action buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">

          {/* Admin Control Badge if admin */}
          {currentUser?.isAdmin && (
            <button
              onClick={onOpenAdmin}
              className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition shadow-xs ${
                currentTab === 'admin'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-amber-600" />
              <span>Admin</span>
            </button>
          )}

          {/* Language Selector Button next to Profile Avatar */}
          <button
            onClick={toggleLanguage}
            className="px-2.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200/80 text-xs font-black text-slate-800 flex items-center transition shadow-2xs"
            title="Switch Language (English / اردو)"
          >
            <span className="text-[11px] font-bold">
              {language === 'en' ? 'EN' : 'اردو'}
            </span>
          </button>

          {/* User Profile Avatar strictly per logged-in user account */}
          <button
            onClick={() => onChangeTab('profile')}
            className="relative w-11 h-11 rounded-full p-0.5 bg-gradient-to-tr from-amber-300 via-amber-500 to-amber-600 hover:scale-105 transition-transform shadow-xs"
            title={`Profile: ${currentUser?.name || currentUser?.email || 'User'}`}
          >
            <div className="w-full h-full rounded-full overflow-hidden bg-slate-900 flex items-center justify-center text-white text-sm font-bold">
              {userPhoto ? (
                <img
                  src={userPhoto}
                  alt={currentUser?.name || 'User'}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="font-mono font-black text-[#C4932C] text-sm uppercase">
                  {(currentUser?.name || currentUser?.email || 'U').slice(0, 1)}
                </span>
              )}
            </div>
          </button>

        </div>
      </div>
    </nav>
  );
};
