import React, { useState, useEffect } from 'react';
import { UserProfile, ReadingResult } from './types';
import { DailyCardView } from './components/DailyCardView';
import { SpreadReadingView } from './components/SpreadReadingView';
import { MacSelfAnalysisView } from './components/MacSelfAnalysisView';
import { JournalView } from './components/JournalView';
import { DestinyView } from './components/DestinyView';
import { UserProfileModal } from './components/UserProfileModal';
import { ShareModal } from './components/ShareModal';
import { PulseDeck, SoftAskSheet, NudgePill, onboardingDone } from './components/OnboardingV7';
import { 
  Sparkles, Sun, Layers, HeartHandshake, Bookmark, 
  Compass, User, Shield
} from 'lucide-react';

const DEFAULT_PROFILE: UserProfile = {
  name: 'Искатель',
  birthDate: '1995-07-15',
  zodiacSign: '♋ Рак',
  destinyArcana: {
    number: 9,
    name: 'Отшельник',
    description: 'Глубокая внутренняя мудрость, путь духовного поиска и озарения.',
  },
};

type ActiveTab = 'spreads' | 'daily' | 'mac' | 'journal' | 'destiny';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('spreads');
  // Онбординг v7: свежий пользователь = в localStorage нет профиля (до первого автосейва).
  const [isFreshUser] = useState(() => {
    try { return !localStorage.getItem('luna_user_profile'); } catch { return false; }
  });
  const [softAsk, setSoftAsk] = useState<{ isOpen: boolean; reason: 'draw' | 'destiny' | 'nudge' }>({
    isOpen: false, reason: 'nudge',
  });
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('luna_user_profile');
      return saved ? JSON.parse(saved) : DEFAULT_PROFILE;
    } catch {
      return DEFAULT_PROFILE;
    }
  });

  const [journalEntries, setJournalEntries] = useState<ReadingResult[]>(() => {
    try {
      const saved = localStorage.getItem('luna_journal_entries');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [shareData, setShareData] = useState<{
    isOpen: boolean;
    title: string;
    text: string;
    cards?: string;
  }>({
    isOpen: false,
    title: '',
    text: '',
    cards: '',
  });

  // Save profile to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('luna_user_profile', JSON.stringify(userProfile));
    } catch (e) {
      console.error(e);
    }
  }, [userProfile]);

  // Save journal to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('luna_journal_entries', JSON.stringify(journalEntries));
    } catch (e) {
      console.error(e);
    }
  }, [journalEntries]);

  const handleSaveToJournal = (entry: ReadingResult) => {
    setJournalEntries((prev) => [entry, ...prev]);
  };

  const handleDeleteJournalEntry = (id: string) => {
    setJournalEntries((prev) => prev.filter((item) => item.id !== id));
  };

  const handleToggleFavorite = (id: string) => {
    setJournalEntries((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
      )
    );
  };

  const handleUpdateReflection = (id: string, reflection: string) => {
    setJournalEntries((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, userReflection: reflection } : item
      )
    );
  };

  const handleSoftAskSave = (data: { name: string; birthDate: string; tone: string }) => {
    setUserProfile((prev) => ({
      ...prev,
      name: data.name || prev.name,
      birthDate: data.birthDate || prev.birthDate,
      tone: data.tone,
    }));
    try { localStorage.setItem('luna_onboarding_v7', 'done'); } catch {}
    setSoftAsk((prev) => ({ ...prev, isOpen: false }));
  };

  const closeSoftAsk = () => {
    try { localStorage.setItem('luna_onboarding_v7', 'done'); } catch {}
    setSoftAsk((prev) => ({ ...prev, isOpen: false }));
  };

  // Триггеры данных: расклад/карта дня у свежего пользователя и вкладка Аркана.
  const handleNav = (tab: ActiveTab) => {
    if (tab === 'destiny' && isFreshUser && !onboardingDone()) {
      setSoftAsk({ isOpen: true, reason: 'destiny' });
    }
    setActiveTab(tab);
  };

  const handleOpenShare = (title: string, text: string, cards?: string) => {
    setShareData({
      isOpen: true,
      title,
      text,
      cards,
    });
  };

  return (
    <div className="min-h-screen bg-[#0D0D12] text-slate-300 flex flex-col selection:bg-violet-500/30 selection:text-violet-200">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#0F0F16]/90 backdrop-blur-md border-b border-slate-800/60 px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('spreads')}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-400 flex items-center justify-center text-white shadow-lg shadow-violet-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-100 text-sm tracking-tight">
                  LUNA AI
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">
                  ТАРО & МАК
                </span>
              </div>
              <p className="text-[10px] text-slate-500 leading-none">
                Инсайт & Самоанализ
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 p-1 rounded-full bg-[#15151F] border border-slate-800/80">
            <button
              onClick={() => setActiveTab('spreads')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'spreads'
                  ? 'bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow-md shadow-violet-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Расклады
            </button>

            <button
              onClick={() => setActiveTab('daily')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'daily'
                  ? 'bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow-md shadow-violet-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              Карта Дня
            </button>

            <button
              onClick={() => setActiveTab('mac')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'mac'
                  ? 'bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow-md shadow-violet-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <HeartHandshake className="w-3.5 h-3.5" />
              МАК-Коуч
            </button>

            <button
              onClick={() => handleNav('destiny')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'destiny'
                  ? 'bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow-md shadow-violet-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Аркан Судьбы
            </button>

            <button
              onClick={() => setActiveTab('journal')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'journal'
                  ? 'bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow-md shadow-violet-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              Дневник
              {journalEntries.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-violet-400 text-slate-950 text-[10px] font-bold flex items-center justify-center">
                  {journalEntries.length}
                </span>
              )}
            </button>
          </nav>

          {/* User Profile Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-2 p-1.5 pr-3 rounded-full bg-[#15151F] hover:bg-[#1A1A24] border border-slate-800 text-xs text-slate-200 transition-all hover:border-violet-500/30 shadow-sm"
            >
              <div className="w-6 h-6 rounded-full bg-violet-500/20 text-violet-300 flex items-center justify-center text-[10px] font-bold">
                {userProfile.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-left hidden sm:block">
                <span className="font-medium text-slate-200 text-xs block leading-tight">
                  {userProfile.name}
                </span>
                {userProfile.destinyArcana && (
                  <span className="text-[10px] text-violet-400 block leading-tight">
                    {userProfile.destinyArcana.name}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Scrollbar */}
        <div className="flex md:hidden items-center gap-1.5 overflow-x-auto pt-2.5 scrollbar-none">
          <button
            onClick={() => setActiveTab('spreads')}
            className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${
              activeTab === 'spreads' ? 'bg-violet-600 text-white font-medium' : 'text-slate-400 bg-[#15151F]'
            }`}
          >
            🔮 Расклады
          </button>
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${
              activeTab === 'daily' ? 'bg-violet-600 text-white font-medium' : 'text-slate-400 bg-[#15151F]'
            }`}
          >
            🌅 Карта Дня
          </button>
          <button
            onClick={() => setActiveTab('mac')}
            className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${
              activeTab === 'mac' ? 'bg-violet-600 text-white font-medium' : 'text-slate-400 bg-[#15151F]'
            }`}
          >
            🧩 МАК-Коуч
          </button>
          <button
            onClick={() => handleNav('destiny')}
            className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${
              activeTab === 'destiny' ? 'bg-violet-600 text-white font-medium' : 'text-slate-400 bg-[#15151F]'
            }`}
          >
            ♈ Аркан Судьбы
          </button>
          <button
            onClick={() => setActiveTab('journal')}
            className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${
              activeTab === 'journal' ? 'bg-violet-600 text-white font-medium' : 'text-slate-400 bg-[#15151F]'
            }`}
          >
            📖 Дневник ({journalEntries.length})
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 py-4">
        {activeTab === 'spreads' && isFreshUser && !onboardingDone() && (
          <div className="max-w-7xl mx-auto lg:px-8 px-0">
            <PulseDeck onDraw={() => setSoftAsk({ isOpen: true, reason: 'draw' })} />
          </div>
        )}
        {activeTab === 'spreads' && (
          <SpreadReadingView
            userProfile={userProfile}
            onSaveToJournal={handleSaveToJournal}
            onShare={handleOpenShare}
          />
        )}

        {activeTab === 'daily' && (
          <DailyCardView
            userProfile={userProfile}
            onSaveToJournal={handleSaveToJournal}
            onShare={handleOpenShare}
          />
        )}

        {activeTab === 'mac' && (
          <MacSelfAnalysisView
            userProfile={userProfile}
            onSaveToJournal={handleSaveToJournal}
            onShare={handleOpenShare}
          />
        )}

        {activeTab === 'destiny' && (
          <DestinyView
            userProfile={userProfile}
            onUpdateProfile={setUserProfile}
            onShare={handleOpenShare}
          />
        )}

        {activeTab === 'journal' && (
          <JournalView
            entries={journalEntries}
            onDeleteEntry={handleDeleteJournalEntry}
            onToggleFavorite={handleToggleFavorite}
            onUpdateReflection={handleUpdateReflection}
            onShare={handleOpenShare}
          />
        )}
      </main>

      {/* Мягкий онбординг v7: sheet по триггеру + напалки */}
      {(isFreshUser && !nudgeDismissed && !onboardingDone() && (activeTab === 'spreads' || activeTab === 'daily')) && (
        <NudgePill
          onOpen={() => setSoftAsk({ isOpen: true, reason: 'nudge' })}
          onDismiss={() => setNudgeDismissed(true)}
        />
      )}
      <SoftAskSheet
        isOpen={softAsk.isOpen}
        reason={softAsk.reason}
        onClose={closeSoftAsk}
        onSave={handleSoftAskSave}
      />

      {/* Profile Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userProfile={userProfile}
        onSave={setUserProfile}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={shareData.isOpen}
        onClose={() => setShareData((prev) => ({ ...prev, isOpen: false }))}
        title={shareData.title}
        text={shareData.text}
        cards={shareData.cards}
      />
    </div>
  );
}
