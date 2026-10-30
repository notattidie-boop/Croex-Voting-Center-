import React from 'react';
import {
  Home,
  PlusCircle,
  BarChart3,
  History,
  Landmark,
  User,
} from 'lucide-react';
import { UserSession } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

export type TabType = 'home' | 'create' | 'results' | 'history' | 'privacy' | 'profile' | 'admin';

interface BottomNavProps {
  currentTab: TabType;
  onChangeTab: (tab: TabType) => void;
  currentUser: UserSession | null;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onChangeTab,
  currentUser,
}) => {
  const { t } = useLanguage();
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/98 backdrop-blur-md border-t border-slate-200/80 shadow-lg px-2 sm:px-3 py-2">
      <div className="max-w-[430px] mx-auto flex items-center justify-between">
        
        {/* 1. Dashboard (Home) */}
        <button
          onClick={() => onChangeTab('home')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition relative ${
            currentTab === 'home'
              ? 'text-[#C4932C] font-bold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <Home className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="text-[10px] sm:text-[11px] mt-1 tracking-tight">{t('tab.dashboard')}</span>
          {currentTab === 'home' && (
            <div className="absolute -bottom-1 w-6 h-0.5 bg-[#C4932C] rounded-full" />
          )}
        </button>

        {/* 2. Create */}
        <button
          onClick={() => onChangeTab('create')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition relative ${
            currentTab === 'create'
              ? 'text-[#C4932C] font-bold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <PlusCircle className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="text-[10px] sm:text-[11px] mt-1 tracking-tight">{t('tab.create')}</span>
          {currentTab === 'create' && (
            <div className="absolute -bottom-1 w-6 h-0.5 bg-[#C4932C] rounded-full" />
          )}
        </button>

        {/* 3. Result Out */}
        <button
          onClick={() => onChangeTab('results')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition relative ${
            currentTab === 'results'
              ? 'text-[#C4932C] font-bold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="text-[10px] sm:text-[11px] mt-1 tracking-tight">{t('tab.results')}</span>
          {currentTab === 'results' && (
            <div className="absolute -bottom-1 w-6 h-0.5 bg-[#C4932C] rounded-full" />
          )}
        </button>

        {/* 4. History */}
        <button
          onClick={() => onChangeTab('history')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition relative ${
            currentTab === 'history'
              ? 'text-[#C4932C] font-bold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <History className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="text-[10px] sm:text-[11px] mt-1 tracking-tight">{t('tab.history')}</span>
          {currentTab === 'history' && (
            <div className="absolute -bottom-1 w-6 h-0.5 bg-[#C4932C] rounded-full" />
          )}
        </button>

        {/* 5. Company */}
        <button
          onClick={() => onChangeTab('privacy')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition relative ${
            currentTab === 'privacy'
              ? 'text-[#C4932C] font-bold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <Landmark className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="text-[10px] sm:text-[11px] mt-1 tracking-tight">{t('tab.company')}</span>
          {currentTab === 'privacy' && (
            <div className="absolute -bottom-1 w-6 h-0.5 bg-[#C4932C] rounded-full" />
          )}
        </button>

        {/* 6. Profile */}
        <button
          onClick={() => onChangeTab(currentUser?.isAdmin ? 'admin' : 'profile')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition relative ${
            currentTab === 'profile' || currentTab === 'admin'
              ? 'text-[#C4932C] font-bold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <User className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="text-[10px] sm:text-[11px] mt-1 tracking-tight">{t('tab.profile')}</span>
          {(currentTab === 'profile' || currentTab === 'admin') && (
            <div className="absolute -bottom-1 w-6 h-0.5 bg-[#C4932C] rounded-full" />
          )}
        </button>

      </div>
    </div>
  );
};
