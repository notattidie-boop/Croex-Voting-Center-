import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'ur';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Brand & Header
    'app.title': 'Croex Voting Center',
    'app.tagline': 'Real-Time Live Voting Platform',
    'nav.admin': 'Admin',
    'nav.login': 'Login',
    'nav.logout': 'Logout',
    'nav.language': 'Language',

    // Dashboard
    'dash.welcome_to': 'WELCOME TO',
    'dash.hello': 'Hello',
    'dash.ceo_msg': "On behalf of Hanzla Croex Technology's CEO, we warmly welcome you to Croex Voting Center.",
    'dash.voice_matters': 'Your Voice Matters',
    'dash.active_polls': 'Active Polls',
    'dash.view_all': 'View All',
    'dash.live_now': 'Live Now',
    'dash.live': 'Live',
    'dash.votes': 'Votes',
    'dash.days_left': 'Days Left',
    'dash.day_left': 'Day Left',
    'dash.quick_stats': 'Quick Stats',
    'dash.total_votes': 'Total Votes',
    'dash.total_polls': 'Total Polls',
    'dash.completed_polls': 'Completed Polls',
    'dash.ongoing_polls': 'Ongoing Polls',
    'dash.vote_now': 'Vote Now',
    'dash.no_polls_yet': 'No polls created yet. Create the first live contest!',
    'dash.create_first_poll': 'Create First Poll',

    // Bottom Navigation
    'tab.dashboard': 'Dashboard',
    'tab.create': 'Create',
    'tab.results': 'Result Out',
    'tab.history': 'History',
    'tab.company': 'Company',
    'tab.profile': 'Profile',

    // Create Contest
    'create.title': 'Create 2-Candidate Contest',
    'create.subtitle': 'Enter poll name, photos, thumbnail, and set the live timer.',
    'create.poll_name': 'Poll Name (Title) *',
    'create.poll_name_placeholder': 'e.g. National Leadership Election 2026',
    'create.desc': 'Contest Description / Rules (Optional)',
    'create.desc_placeholder': 'e.g. Official head-to-head live contest between candidate A and B...',
    'create.poll_thumbnail': 'Poll Thumbnail / Cover Photo (Shows on Dashboard)',
    'create.upload_thumbnail': 'Upload Poll Thumbnail',
    'create.thumbnail_hint': 'High quality photo for dashboard display',
    'create.side_a': 'Side A',
    'create.side_b': 'Side B',
    'create.candidate_a_name': 'Candidate A Name *',
    'create.candidate_b_name': 'Candidate B Name *',
    'create.candidate_a_photo': 'Candidate A Photo',
    'create.candidate_b_photo': 'Candidate B Photo',
    'create.upload_a_photo': 'Upload Candidate A Photo',
    'create.upload_b_photo': 'Upload Candidate B Photo',
    'create.duration': 'Voting Duration (Live Countdown)',
    'create.days': 'Days',
    'create.hours': 'Hours',
    'create.minutes': 'Minutes',
    'create.seconds': 'Seconds',
    'create.publish': 'Publish & Start Live Contest',
    'create.publishing': 'Publishing Contest...',
    'create.success_title': 'Contest Started!',
    'create.success_desc': 'Your live voting contest is running with real-time countdown.',
    'create.voting_link': 'Official Voting Link (Croex Voting Center):',
    'create.copy_link': 'Copy Voting Link',
    'create.copied': 'Copied Voting Link!',
    'create.whatsapp': 'Share on WhatsApp',
    'create.open_vote': 'Open Voting Page',
    'create.new_poll': 'Create Another Poll',

    // Admin
    'admin.dashboard': 'Admin Dashboard',
    'admin.search_placeholder': 'Search contests by poll name or candidate...',
    'admin.all_contests': 'All Contests',
    'admin.live_active': 'Live Active',
    'admin.results_out': 'Result Out',
    'admin.history': 'History',
    'admin.banners': 'Banners',
    'admin.company_rules': 'Company Rules',
  },
  ur: {
    // Brand & Header
    'app.title': 'کروئکس ووٹنگ سینٹر',
    'app.tagline': 'ریئل ٹائم لائیو مقابلہ پلیٹ فارم',
    'nav.admin': 'ایڈمن کنٹرول',
    'nav.login': 'لاگ ان',
    'nav.logout': 'لاگ آؤٹ',
    'nav.language': 'زبان تبدیل کریں',

    // Dashboard
    'dash.welcome_to': 'WELCOME TO',
    'dash.hello': 'خوش آمدید',
    'dash.ceo_msg': 'ہنزلا کروئکس ٹیکنالوجی کے پلیٹ فارم پر خوش آمدید۔ مکمل شفافیت کے ساتھ رائے دیں۔',
    'dash.voice_matters': 'Your Voice Matters',
    'dash.active_polls': 'لائیو جاری مقابلے (Active Polls)',
    'dash.view_all': 'سب دیکھیں',
    'dash.live_now': 'لائیو اب',
    'dash.live': 'لائیو',
    'dash.votes': 'ووٹ',
    'dash.days_left': 'دن باقی',
    'dash.day_left': 'دن باقی',
    'dash.quick_stats': 'فوری شماریات (Quick Stats)',
    'dash.total_votes': 'کل کاسٹ شدہ ووٹس',
    'dash.total_polls': 'تمام مقابلے',
    'dash.completed_polls': 'مکمل مقابلے',
    'dash.ongoing_polls': 'جاری مقابلے (Ongoing Polls)',
    'dash.vote_now': 'ووٹ کاسٹ کریں',
    'dash.no_polls_yet': 'ابھی کوئی مقابلہ نہیں بنایا گیا۔ نیا لائیو پول شروع کریں!',
    'dash.create_first_poll': 'پہلا پول بنائیں',

    // Bottom Navigation
    'tab.dashboard': 'ڈیش بورڈ',
    'tab.create': 'نیا مقابلہ',
    'tab.results': 'نتائج (Result Out)',
    'tab.history': 'ہسٹری (History)',
    'tab.company': 'کمپنی و ضوابط (Company)',
    'tab.profile': 'پروفائل',

    // Create Contest
    'create.title': '2-امیدوار مقابلہ شروع کریں',
    'create.subtitle': 'عنوان، امیدواران کی تصاویر اور الٹی گنتی کا دورانیہ متعین کریں۔',
    'create.poll_name': 'مقابلے کا عنوان (Poll Title) *',
    'create.poll_name_placeholder': 'مثال: قومی قیادت کا انتخاب 2026',
    'create.desc': 'مقابلے کی تفصیل اور قواعد (اختیاری)',
    'create.desc_placeholder': 'امیدوار الف اور بے کے درمیان لائیو مقابلہ...',
    'create.poll_thumbnail': 'ڈیش بورڈ کور فوٹو / تھمب نیل',
    'create.upload_thumbnail': 'تھمب نیل تصویر لگائیں',
    'create.thumbnail_hint': 'ڈیش بورڈ پر نمایاں نظر آنے والی تصویر',
    'create.side_a': 'امیدوار الف (A)',
    'create.side_b': 'امیدوار بے (B)',
    'create.candidate_a_name': 'امیدوار A کا نام *',
    'create.candidate_b_name': 'امیدوار B کا نام *',
    'create.candidate_a_photo': 'امیدوار A کی تصویر',
    'create.candidate_b_photo': 'امیدوار B کی تصویر',
    'create.upload_a_photo': 'امیدوار A کی تصویر منتخب کریں',
    'create.upload_b_photo': 'امیدوار B کی تصویر منتخب کریں',
    'create.duration': 'ووٹنگ کا دورانیہ (لائیو ٹائمر)',
    'create.days': 'دن',
    'create.hours': 'گھنٹے',
    'create.minutes': 'منٹ',
    'create.seconds': 'سیکنڈ',
    'create.publish': 'مقابلہ شروع اور لائیو نشر کریں',
    'create.publishing': 'مقابلہ نشر ہو رہا ہے...',
    'create.success_title': 'مقابلہ کامیابی سے شروع ہو گیا!',
    'create.success_desc': 'آپ کا لائیو ووٹنگ مقابلہ اب عوام کے لیے جاری ہے۔',
    'create.voting_link': 'مخصوص لائیو ووٹنگ لنک (Croex Voting Center):',
    'create.copy_link': 'ووٹنگ لنک کاپی کریں',
    'create.copied': 'لنک کاپی ہو گیا!',
    'create.whatsapp': 'واٹس ایپ پر شیئر کریں',
    'create.open_vote': 'ووٹنگ پیج کھولیں',
    'create.new_poll': 'ایک اور نیا پول بنائیں',

    // Admin
    'admin.dashboard': 'ایڈمن کنٹرول پینل',
    'admin.search_placeholder': 'عنوان یا امیدوار کے نام سے تلاش کریں...',
    'admin.all_contests': 'تمام مقابلے',
    'admin.live_active': 'لائیو جاری',
    'admin.results_out': 'نتائج (Result Out)',
    'admin.history': 'ہسٹری (History)',
    'admin.banners': 'ڈیش بورڈ بینرز',
    'admin.company_rules': 'کمپنی رولز و نئی باتیں',
  },
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (key: string) => key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('croex_app_lang');
      if (saved === 'ur' || saved === 'en') return saved;
    } catch {}
    return 'en'; // English is default as requested
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
      if (language === 'ur') {
        document.documentElement.classList.add('font-urdu');
        document.documentElement.setAttribute('dir', 'rtl');
      } else {
        document.documentElement.classList.remove('font-urdu');
        document.documentElement.setAttribute('dir', 'ltr');
      }
    }
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('croex_app_lang', lang);
    } catch {}
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ur' : 'en');
  };

  const t = (key: string): string => {
    return translations[language]?.[key] || translations['en']?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
