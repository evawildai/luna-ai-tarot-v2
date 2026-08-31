import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { CardVisual } from './CardVisual';
import { TAROT_DECK } from '../data/tarotCards';
import { MAC_DECK } from '../data/macCards';
import { SPREADS } from '../data/spreads';
import { SpreadDefinition, DrawnCard, TarotCard, MacCard, UserProfile, ReadingResult } from '../types';
import { 
  Sparkles, Layers, RefreshCw, Send, Check, BookmarkPlus, Share2, 
  HelpCircle, ChevronRight, MessageSquare, Compass, Shield, ArrowRight
} from 'lucide-react';

interface SpreadReadingViewProps {
  userProfile: UserProfile;
  onSaveToJournal: (reading: ReadingResult) => void;
  onShare: (title: string, text: string, cardName: string) => void;
}

const QUESTION_SUGGESTIONS = [
  'Что мне нужно знать о моих отношениях прямо сейчас?',
  'В чем причина застоя в работе и как выйти на новый уровень?',
  'Какой мой главный скрытый ресурс и талант?',
  'Какое решение принять на текущей жизненной развилке?',
  'Как восстановить внутренний баланс и победить тревогу?',
  'Какой духовный урок несет текущая ситуация?'
];

export const SpreadReadingView: React.FC<SpreadReadingViewProps> = ({
  userProfile,
  onSaveToJournal,
  onShare,
}) => {
  const [selectedSpread, setSelectedSpread] = useState<SpreadDefinition>(SPREADS[1]); // 3 cards timeline
  const [deckType, setDeckType] = useState<'tarot' | 'mac'>('tarot');
  const [question, setQuestion] = useState('');
  const [drawnCards, setDrawnCards] = useState<DrawnCard[]>([]);
  const [flippedMap, setFlippedMap] = useState<Record<number, boolean>>({});
  const [isDrawing, setIsDrawing] = useState(false);
  const [readingResult, setReadingResult] = useState<any>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [saved, setSaved] = useState(false);

  // Follow-up question state
  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const [followUpChat, setFollowUpChat] = useState<{ q: string; a: string }[]>([]);
  const [loadingFollowUp, setLoadingFollowUp] = useState(false);

  const startNewReading = () => {
    setDrawnCards([]);
    setFlippedMap({});
    setReadingResult(null);
    setFollowUpChat([]);
    setSaved(false);
  };

  const handleSelectSpread = (spread: SpreadDefinition) => {
    setSelectedSpread(spread);
    if (spread.category === 'tarot') setDeckType('tarot');
    if (spread.category === 'mac') setDeckType('mac');
    startNewReading();
  };

  const drawCards = () => {
    setIsDrawing(true);
    setReadingResult(null);
    setFollowUpChat([]);
    setSaved(false);

    const availableDeck = deckType === 'tarot' ? [...TAROT_DECK] : [...MAC_DECK];
    const shuffled = availableDeck.sort(() => Math.random() - 0.5);

    const cards: DrawnCard[] = [];
    const newFlippedMap: Record<number, boolean> = {};

    for (let i = 0; i < selectedSpread.cardCount; i++) {
      const card = shuffled[i];
      const isReversed = deckType === 'tarot' ? Math.random() < 0.22 : false;
      cards.push({
        card,
        deckType,
        isReversed,
        positionIndex: i,
        positionTitle: selectedSpread.positions[i]?.title || `Позиция ${i + 1}`,
      });
      newFlippedMap[i] = true;
    }

    setDrawnCards(cards);
    setFlippedMap(newFlippedMap);
    setIsDrawing(false);

    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#eab308', '#a855f7', '#38bdf8']
    });

    // Auto-fetch AI interpretation
    fetchAIInterpretation(cards);
  };

  const fetchAIInterpretation = async (cards: DrawnCard[]) => {
    setLoadingAI(true);
    try {
      const res = await fetch('/api/tarot/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deckType,
          spreadTitle: selectedSpread.title,
          question: question.trim() || 'Общий анализ ситуации и скрытых факторов',
          userProfile,
          drawnCards: cards,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setReadingResult(data.data);
      }
    } catch (err) {
      console.error('Error fetching AI reading:', err);
    } finally {
      setLoadingAI(false);
    }
  };

  const handleAskFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpQuestion.trim() || loadingFollowUp) return;

    const userQ = followUpQuestion.trim();
    setFollowUpQuestion('');
    setLoadingFollowUp(true);

    try {
      const res = await fetch('/api/tarot/self-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: selectedSpread.title,
          card: drawnCards[0]?.card || TAROT_DECK[0],
          history: followUpChat.map(item => ({ sender: 'user', text: item.q })),
          userMessage: `В контексте сделанного расклада "${selectedSpread.title}" (Вопрос: "${question}") у меня возник уточняющий вопрос: "${userQ}"`,
          userProfile,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setFollowUpChat(prev => [...prev, { q: userQ, a: data.data.replyText }]);
      }
    } catch (err) {
      console.error('Error with follow up:', err);
    } finally {
      setLoadingFollowUp(false);
    }
  };

  const handleSave = () => {
    if (!readingResult || drawnCards.length === 0) return;

    const reading: ReadingResult = {
      id: `reading-${Date.now()}`,
      createdAt: new Date().toISOString(),
      deckType,
      spreadId: selectedSpread.id,
      spreadTitle: selectedSpread.title,
      question: question || 'Общий анализ ситуации',
      userProfile,
      drawnCards,
      interpretation: readingResult,
    };

    onSaveToJournal(reading);
    setSaved(true);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 space-y-8 animate-in fade-in">
      {/* 1. Header & Configuration */}
      <div className="p-6 rounded-2xl bg-[#0F0F16] border border-slate-800/60 backdrop-blur-md space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20">
                Консультация
              </span>
              <span className="text-xs text-slate-500">
                Колода: {deckType === 'tarot' ? 'Сакральное Таро (78 карт)' : 'Метафорические Ассоциативные Карты'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-slate-100 mt-1">
              Персональный Расклад <span className="font-light italic text-violet-400">& Психоанализ</span>
            </h2>
          </div>

          {/* Deck Toggle */}
          <div className="flex p-1 rounded-xl bg-[#0D0D12] border border-slate-800/80">
            <button
              onClick={() => {
                setDeckType('tarot');
                startNewReading();
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                deckType === 'tarot'
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-500 text-white shadow-md shadow-violet-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🔮 Таро
            </button>
            <button
              onClick={() => {
                setDeckType('mac');
                startNewReading();
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                deckType === 'mac'
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-500 text-white shadow-md shadow-violet-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🧩 МАК
            </button>
          </div>
        </div>

        {/* Spreads Selector Carousel */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-3">
            Выберите Схему Расклада
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {SPREADS.filter(s => s.category === 'universal' || s.category === deckType).map((spread) => (
              <button
                key={spread.id}
                onClick={() => handleSelectSpread(spread)}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  selectedSpread.id === spread.id
                    ? 'bg-[#15151F] border-violet-500/50 shadow-lg shadow-violet-500/10'
                    : 'bg-[#15151F]/40 border-slate-800/60 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-medium text-xs sm:text-sm ${selectedSpread.id === spread.id ? 'text-slate-100' : 'text-slate-300'}`}>
                    {spread.title}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-violet-500/10 text-violet-300 border border-violet-500/20">
                    {spread.cardCount} {spread.cardCount === 1 ? 'карта' : spread.cardCount < 5 ? 'карты' : 'карт'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {spread.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Question Form */}
        <div className="space-y-2 pt-2 border-t border-slate-800/60">
          <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Ваш Вопрос или Жизненная Ситуация
          </label>
          <div className="relative">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Сформулируйте личный запрос для глубокого самоанализа..."
              className="w-full pl-4 pr-28 py-3 rounded-full bg-[#1A1A24] border border-slate-800 text-slate-200 placeholder-slate-600 text-sm focus:outline-none focus:border-violet-500/50 transition-all"
            />
            {drawnCards.length === 0 && (
              <button
                onClick={drawCards}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 hover:from-violet-500 hover:to-indigo-400 text-white text-xs font-medium shadow-md shadow-violet-500/20 flex items-center gap-1.5 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Расклад
              </button>
            )}
          </div>

          {/* Quick Suggestions */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="text-[10px] text-slate-600 py-0.5">Быстрый фокус:</span>
            {QUESTION_SUGGESTIONS.slice(0, 3).map((sugg, i) => (
              <button
                key={i}
                onClick={() => setQuestion(sugg)}
                className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#15151F] hover:bg-[#1A1A24] text-slate-400 hover:text-slate-200 border border-slate-800/80 transition-colors"
              >
                {sugg}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Interactive Velvet Tarot Table & Drawn Cards */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#0F0F16] border border-slate-800/60 shadow-2xl relative overflow-hidden">
        {/* Table Center Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-violet-500/5 via-transparent to-transparent pointer-events-none" />

        <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-800/60">
          <div>
            <h3 className="font-medium text-slate-100 text-base sm:text-lg flex items-center gap-2">
              <Layers className="w-5 h-5 text-violet-400" />
              {selectedSpread.title}
            </h3>
            <p className="text-xs text-slate-500">
              Позиции карт на раскладном поле:
            </p>
          </div>

          {drawnCards.length > 0 && (
            <button
              onClick={drawCards}
              className="px-3 py-1.5 rounded-xl bg-[#15151F] hover:bg-[#1A1A24] text-slate-300 border border-slate-800/80 text-xs font-medium flex items-center gap-1.5 transition-colors hover:border-violet-500/30"
            >
              <RefreshCw className="w-3.5 h-3.5 text-violet-400" />
              Перетасовать
            </button>
          )}
        </div>

        {drawnCards.length === 0 ? (
          <div className="py-16 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <Sparkles className="w-8 h-8 animate-pulse" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h4 className="text-lg font-medium text-slate-100">
                Карты готовы к погружению
              </h4>
              <p className="text-xs text-slate-500">
                Сфокусируйтесь на намерении и нажмите кнопку, чтобы разложить карты.
              </p>
            </div>
            <button
              onClick={drawCards}
              className="px-6 py-3 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 hover:from-violet-500 hover:to-indigo-400 text-white font-medium text-sm shadow-xl shadow-violet-500/20 flex items-center gap-2 mx-auto transition-transform hover:scale-105"
            >
              <Sparkles className="w-4 h-4" />
              Вытянуть карты для расклада
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Cards Grid */}
            <div className="flex flex-wrap justify-center items-stretch gap-6 py-4">
              {drawnCards.map((drawn, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center p-4 rounded-xl bg-[#15151F] border border-slate-800/60 hover:border-violet-500/30 transition-all"
                >
                  <CardVisual
                    card={drawn.card}
                    deckType={drawn.deckType}
                    isFlipped={flippedMap[index] ?? true}
                    isReversed={drawn.isReversed}
                    onFlip={() =>
                      setFlippedMap(prev => ({ ...prev, [index]: !prev[index] }))
                    }
                    size="md"
                    positionLabel={`№${index + 1}: ${drawn.positionTitle}`}
                    glow={true}
                  />
                  <div className="mt-3 text-center max-w-[160px]">
                    <p className="text-[11px] text-slate-400 line-clamp-2">
                      {selectedSpread.positions[index]?.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. AI Deep Interpretation Section */}
      {drawnCards.length > 0 && (
        <div className="space-y-6">
          {loadingAI ? (
            <div className="p-10 rounded-2xl bg-[#0F0F16] border border-slate-800/60 text-center space-y-4">
              <div className="w-10 h-10 rounded-full border-2 border-violet-400 border-t-transparent animate-spin mx-auto" />
              <h4 className="text-lg font-medium text-slate-100">
                ИИ-Таролог сопоставляет архетипы и подсознательные связи...
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Анализируем взаимодействие позиций, астрологический профиль {userProfile.name} и психологические паттерны.
              </p>
            </div>
          ) : readingResult ? (
            <div className="space-y-6 animate-in fade-in">
              {/* Summary Card */}
              <div className="p-6 sm:p-8 rounded-2xl bg-[#15151F] border border-slate-800/60 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-violet-400 uppercase tracking-[0.2em] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    Ключевой Инсайт Расклада
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSave}
                      disabled={saved}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        saved
                          ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/40'
                          : 'bg-gradient-to-tr from-violet-600 to-indigo-500 hover:from-violet-500 text-white shadow-md shadow-violet-500/20'
                      }`}
                    >
                      {saved ? <Check className="w-3.5 h-3.5" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
                      {saved ? 'В Дневнике' : 'Сохранить'}
                    </button>
                    <button
                      onClick={() =>
                        onShare(
                          selectedSpread.title,
                          readingResult.summary,
                          drawnCards.map(d => ('nameRu' in d.card ? d.card.nameRu : d.card.title)).join(', ')
                        )
                      }
                      className="p-2 rounded-full bg-[#1A1A24] text-slate-400 hover:text-white border border-slate-800"
                      title="Поделиться"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-slate-100 font-serif italic text-lg sm:text-xl leading-relaxed">
                  «{readingResult.summary}»
                </p>
              </div>

              {/* Per-Card Analysis */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {readingResult.cardAnalyses?.map((item: any, i: number) => (
                  <div
                    key={i}
                    className="p-5 rounded-xl bg-[#15151F] border border-slate-800/60 space-y-2.5 hover:border-violet-500/30 transition-all"
                  >
                    <div className="flex items-center justify-between text-xs border-b border-slate-800/60 pb-2">
                      <span className="font-medium text-violet-300">
                        {item.positionTitle}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {item.cardName}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {item.meaning}
                    </p>
                    {item.psychologicalInsight && (
                      <div className="pt-2 border-t border-slate-800/60 text-[11px] text-violet-300/80 italic">
                        ✦ Психологический срез: {item.psychologicalInsight}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Deep Psychoanalysis Syntheses */}
              {readingResult.deepPsychoanalysis && (
                <div className="p-6 rounded-xl bg-[#15151F] border border-slate-800/60 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-violet-400 flex items-center gap-2">
                    <Compass className="w-4 h-4" />
                    Глубинная Динамика & Синтез Расклада
                  </h4>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                    {readingResult.deepPsychoanalysis}
                  </div>
                </div>
              )}

              {/* Practical Advice & Affirmation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {readingResult.practicalAdvice?.length > 0 && (
                  <div className="p-5 rounded-xl bg-[#15151F] border border-slate-800/60 space-y-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400 flex items-center gap-1.5">
                      <Shield className="w-4 h-4" />
                      Практические Шаги от Таро
                    </h4>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {readingResult.practicalAdvice.map((adv: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-violet-400">✦</span>
                          <span>{adv}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {readingResult.coachingActionStep && (
                  <div className="p-5 rounded-xl bg-[#15151F] border border-violet-500/20 space-y-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      Фокус для Рефлексии
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {readingResult.coachingActionStep}
                    </p>
                    {readingResult.affirmation && (
                      <div className="mt-2 pt-2 border-t border-slate-800 text-xs font-medium text-violet-200">
                        ✨ {readingResult.affirmation}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Interactive Follow-up Question Dialogue with AI Tarologist */}
              <div className="p-6 rounded-2xl bg-[#0F0F16] border border-slate-800/60 space-y-4">
                <div className="flex items-center gap-2 text-violet-400 text-xs font-medium">
                  <MessageSquare className="w-4 h-4" />
                  Уточняющий диалог с ИИ-Тарологом по раскладу
                </div>

                {followUpChat.length > 0 && (
                  <div className="space-y-3 pt-2">
                    {followUpChat.map((chat, idx) => (
                      <div key={idx} className="space-y-2 text-xs">
                        <div className="p-3.5 rounded-2xl rounded-tr-none bg-violet-600/20 border border-violet-500/30 text-slate-200 text-right max-w-[85%] ml-auto">
                          <span className="font-semibold text-violet-300">Вы:</span> {chat.q}
                        </div>
                        <div className="p-4 rounded-2xl rounded-tl-none bg-[#15151F] border border-slate-800/60 text-slate-300 max-w-[90%] mr-auto whitespace-pre-line leading-relaxed">
                          <span className="font-semibold text-violet-400 block mb-1">LUNA AI:</span>
                          {chat.a}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <form onSubmit={handleAskFollowUp} className="flex gap-2 pt-2">
                  <input
                    type="text"
                    value={followUpQuestion}
                    onChange={(e) => setFollowUpQuestion(e.target.value)}
                    placeholder="Задайте уточняющий вопрос по картам..."
                    className="flex-1 px-4 py-2.5 rounded-full bg-[#1A1A24] border border-slate-800 text-slate-200 placeholder-slate-600 text-xs focus:outline-none focus:border-violet-500/50 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={loadingFollowUp || !followUpQuestion.trim()}
                    className="px-5 py-2.5 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 hover:from-violet-500 hover:to-indigo-400 disabled:opacity-50 text-white text-xs font-medium flex items-center gap-1.5 transition-all shadow-md shadow-violet-500/20"
                  >
                    {loadingFollowUp ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin" />
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Спросить
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
