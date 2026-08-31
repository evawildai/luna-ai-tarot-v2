import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { CardVisual } from './CardVisual';
import { TAROT_DECK } from '../data/tarotCards';
import { MAC_DECK } from '../data/macCards';
import { TarotCard, MacCard, UserProfile, ReadingResult } from '../types';
import { Sparkles, RefreshCw, BookmarkPlus, Share2, Compass, AlertCircle, Quote, Check, ArrowRight } from 'lucide-react';
import { CardChat } from './CardChat';

interface DailyCardViewProps {
  userProfile: UserProfile;
  onSaveToJournal: (reading: ReadingResult) => void;
  onShare: (title: string, text: string, cardName: string) => void;
}

export const DailyCardView: React.FC<DailyCardViewProps> = ({
  userProfile,
  onSaveToJournal,
  onShare,
}) => {
  const [deckType, setDeckType] = useState<'tarot' | 'mac'>('tarot');
  const [selectedCard, setSelectedCard] = useState<TarotCard | MacCard | null>(null);
  const [isReversed, setIsReversed] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dailyData, setDailyData] = useState<any>(null);
  const [saved, setSaved] = useState(false);

  // Pick deterministic daily card seed based on current date or allow drawing
  const drawDailyCard = async (forceRandom = false) => {
    setIsFlipped(false);
    setDailyData(null);
    setSaved(false);

    // Pick card
    let card: TarotCard | MacCard;
    let reversed = false;

    if (deckType === 'tarot') {
      const idx = Math.floor(Math.random() * TAROT_DECK.length);
      card = TAROT_DECK[idx];
      reversed = Math.random() < 0.25; // 25% chance of reversal
    } else {
      const idx = Math.floor(Math.random() * MAC_DECK.length);
      card = MAC_DECK[idx];
      reversed = false;
    }

    setSelectedCard(card);
    setIsReversed(reversed);

    // Reveal animation
    setTimeout(() => {
      setIsFlipped(true);
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#eab308', '#a855f7', '#38bdf8']
      });
      fetchDailyInterpretation(card, reversed);
    }, 400);
  };

  const fetchDailyInterpretation = async (card: TarotCard | MacCard, reversed: boolean) => {
    setLoading(true);
    try {
      const res = await fetch('/api/tarot/daily-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deckType,
          card,
          isReversed: reversed,
          userProfile
        })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setDailyData(data.data);
      }
    } catch (err) {
      console.error('Error fetching daily card interpretation:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Wait for an explicit user click — do not auto-draw on page load
  }, [deckType]);

  const handleSave = () => {
    if (!selectedCard || !dailyData) return;

    const reading: ReadingResult = {
      id: `daily-${Date.now()}`,
      createdAt: new Date().toISOString(),
      deckType,
      spreadId: 'one-card',
      spreadTitle: `Карта Дня: ${deckType === 'tarot' ? 'Таро' : 'МАК'}`,
      question: 'Какое главное послание и энергия этого дня?',
      userProfile,
      drawnCards: [
        {
          card: selectedCard,
          deckType,
          isReversed,
          positionIndex: 0,
          positionTitle: 'Карта Дня'
        }
      ],
      interpretation: {
        summary: dailyData.dayMessage || '',
        cardAnalyses: [
          {
            cardName: 'nameRu' in selectedCard ? selectedCard.nameRu : selectedCard.title,
            positionTitle: 'Карта Дня',
            meaning: dailyData.energyOfTheDay || '',
            psychologicalInsight: dailyData.coachingQuestion || ''
          }
        ],
        deepPsychoanalysis: `Энергия дня: ${dailyData.energyOfTheDay}\nВозможность: ${dailyData.opportunity}\nПредостережение: ${dailyData.warning}`,
        practicalAdvice: [dailyData.opportunity, dailyData.warning].filter(Boolean),
        coachingActionStep: dailyData.coachingQuestion || '',
        affirmation: dailyData.affirmation || ''
      }
    };

    onSaveToJournal(reading);
    setSaved(true);
  };

  const cardName = selectedCard
    ? 'nameRu' in selectedCard
      ? selectedCard.nameRu
      : selectedCard.title
    : '';

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 space-y-8 animate-in fade-in">
      {/* Header & Deck Selector */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-[#0F0F16] border border-slate-800/60 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20">
              Ежедневная Практика
            </span>
            <span className="text-xs text-slate-500">
              {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-slate-100 mt-1">
            Карта Дня <span className="font-light italic text-violet-400">& Инсайт</span>
          </h2>
        </div>

        {/* Deck Toggle */}
        <div className="flex p-1 rounded-xl bg-[#0D0D12] border border-slate-800/80">
          <button
            onClick={() => { setDeckType('tarot'); setSelectedCard(null); setDailyData(null); setIsFlipped(false); setSaved(false); }}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              deckType === 'tarot'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-500 text-white shadow-md shadow-violet-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🔮 Колода Таро
          </button>
          <button
            onClick={() => { setDeckType('mac'); setSelectedCard(null); setDailyData(null); setIsFlipped(false); setSaved(false); }}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              deckType === 'mac'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-500 text-white shadow-md shadow-violet-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🧩 Метафорические (МАК)
          </button>
        </div>
      </div>

      {/* Main Card Reveal Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Visual Card Stage */}
        <div className="lg:col-span-5 flex flex-col items-center p-6 sm:p-8 rounded-2xl bg-[#0F0F16] border border-slate-800/60 shadow-2xl relative overflow-hidden">
          {/* Subtle mystic aura */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-violet-500/5 via-transparent to-transparent pointer-events-none" />

          <CardVisual
            card={selectedCard || undefined}
            deckType={deckType}
            isFlipped={isFlipped}
            isReversed={isReversed}
            onFlip={() => setIsFlipped(!isFlipped)}
            size="lg"
            glow={true}
            positionLabel="Энергия Сегодня"
          />

          <div className="mt-6 flex flex-wrap justify-center gap-3 w-full">
            <button
              onClick={() => drawDailyCard(true)}
              className={`text-xs font-medium flex items-center gap-2 transition-all rounded-xl px-5 py-3 ${
                !selectedCard
                  ? 'bg-gradient-to-tr from-violet-600 to-indigo-500 hover:from-violet-500 hover:to-indigo-400 text-white shadow-lg shadow-violet-500/30 font-semibold animate-pulse'
                  : 'bg-[#15151F] hover:bg-[#1A1A24] text-slate-300 border border-slate-800/80 hover:border-violet-500/30'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5 text-violet-400" />
              {!selectedCard
                ? '🔮 Тянуть карту дня'
                : 'Тянуть другую карту'}
            </button>

            {dailyData && (
              <button
                onClick={() =>
                  onShare(
                    `Карта дня: ${cardName}`,
                    dailyData.dayMessage,
                    cardName
                  )
                }
                className="px-4 py-2 rounded-xl bg-violet-950/40 hover:bg-violet-900/40 text-violet-300 border border-violet-500/30 text-xs font-medium flex items-center gap-2 transition-all"
              >
                <Share2 className="w-3.5 h-3.5" />
                Поделиться
              </button>
            )}
          </div>
        </div>

        {/* Right Column: AI Interpretation & Insights */}
        <div className="lg:col-span-7 space-y-5">
          {!selectedCard ? (
            <div className="p-8 rounded-2xl bg-[#0F0F16] border border-slate-800/60 text-center space-y-3">
              <p className="text-lg sm:text-xl font-serif italic text-slate-200">
                Сосредоточьтесь на своём вопросе...
              </p>
              <p className="text-xs text-slate-500 italic max-w-md mx-auto">
                Когда будете готовы — нажмите «Тянуть карту дня». Луна вытянет карту специально для вас и расскажет, что она значит.
              </p>
            </div>
          ) : loading ? (
            <div className="p-8 rounded-2xl bg-[#0F0F16] border border-slate-800/60 text-center space-y-4">
              <div className="w-10 h-10 rounded-full border-2 border-violet-400 border-t-transparent animate-spin mx-auto" />
              <p className="text-sm text-slate-200 tracking-wide font-medium">
                ИИ-Таролог погружается в сакральную структуру карты...
              </p>
              <p className="text-xs text-slate-500 italic">
                Считываем астрологические паттерны и юнгианские архетипы
              </p>
            </div>
          ) : dailyData ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              {/* Day Message Banner */}
              <div className="p-6 rounded-2xl bg-[#15151F] border border-slate-800/60 shadow-lg">
                <div className="flex items-center gap-2 text-violet-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-2">
                  <Sparkles className="w-4 h-4" />
                  Главное Послание Дня
                </div>
                <p className="text-slate-100 font-serif italic text-lg sm:text-xl leading-relaxed">
                  «{dailyData.dayMessage}»
                </p>
              </div>

              {/* Energy & Coaching Question Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-xl bg-[#15151F] border border-slate-800/60 space-y-2">
                  <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">
                    <Compass className="w-4 h-4 text-violet-400" />
                    Энергия Дня
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {dailyData.energyOfTheDay}
                  </p>
                </div>

                <div className="p-5 rounded-xl bg-[#15151F] border border-slate-800/60 space-y-2">
                  <div className="flex items-center gap-2 text-violet-400 text-[10px] font-bold uppercase tracking-[0.2em]">
                    <Quote className="w-4 h-4" />
                    Вопрос для Рефлексии
                  </div>
                  <p className="text-xs sm:text-sm text-violet-200/90 leading-relaxed italic">
                    {dailyData.coachingQuestion}
                  </p>
                </div>
              </div>

              {/* Opportunity & Warning */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {dailyData.opportunity && (
                  <div className="p-4 rounded-xl bg-[#15151F] border border-slate-800/60 text-xs space-y-1">
                    <span className="font-medium text-emerald-400 flex items-center gap-1.5">
                      ✦ Возможность Дня
                    </span>
                    <p className="text-slate-400 leading-relaxed">{dailyData.opportunity}</p>
                  </div>
                )}
                {dailyData.warning && (
                  <div className="p-4 rounded-xl bg-[#15151F] border border-slate-800/60 text-xs space-y-1">
                    <span className="font-medium text-rose-400 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Предостережение
                    </span>
                    <p className="text-slate-400 leading-relaxed">{dailyData.warning}</p>
                  </div>
                )}
              </div>

              {/* Affirmation */}
              {dailyData.affirmation && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-violet-900/20 to-transparent border border-violet-500/20 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-violet-400 font-bold">
                      Аффирмация-Якорь
                    </span>
                    <p className="text-sm font-medium text-slate-200">
                      {dailyData.affirmation}
                    </p>
                  </div>
                </div>
              )}

              {/* Chat with the card */}
              <CardChat
                deckType={deckType}
                card={selectedCard}
                isReversed={isReversed}
                userProfile={userProfile}
              />

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  onClick={handleSave}
                  disabled={saved}
                  className={`px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                    saved
                      ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/40'
                      : 'bg-gradient-to-tr from-violet-600 to-indigo-500 hover:from-violet-500 hover:to-indigo-400 text-white shadow-lg shadow-violet-500/20'
                  }`}
                >
                  {saved ? (
                    <>
                      <Check className="w-4 h-4" />
                      Сохранено в Дневник
                    </>
                  ) : (
                    <>
                      <BookmarkPlus className="w-4 h-4" />
                      Сохранить в Дневник Инсайтов
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
