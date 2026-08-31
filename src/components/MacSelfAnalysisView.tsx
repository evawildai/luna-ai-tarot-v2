import React, { useState } from 'react';
import { MAC_CARDS } from '../data/macCards';
import { MacCard, UserProfile } from '../types';
import { CardVisual } from './CardVisual';
import { 
  HeartHandshake, Sparkles, Send, RefreshCw, BookmarkPlus, 
  Check, HelpCircle, Layers, Feather, UserCheck
} from 'lucide-react';

interface MacSelfAnalysisViewProps {
  userProfile: UserProfile;
  onSaveToJournal: (item: any) => void;
  onShare: (title: string, text: string, cards: string) => void;
}

interface DialogueMessage {
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
}

export const MacSelfAnalysisView: React.FC<MacSelfAnalysisViewProps> = ({
  userProfile,
  onSaveToJournal,
  onShare,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Все');
  const [activeCard, setActiveCard] = useState<MacCard | null>(null);
  const [userInput, setUserInput] = useState('');
  const [dialogue, setDialogue] = useState<DialogueMessage[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [saved, setSaved] = useState(false);

  const categories = ['Все', 'Ресурс', 'Тень', 'Отношения', 'Выбор', 'Внутренний ребенок', 'Трансформация', 'Препятствие'];

  const filteredCards = selectedCategory === 'Все'
    ? MAC_CARDS
    : MAC_CARDS.filter(c => c.category === selectedCategory);

  const handleSelectCard = (card: MacCard) => {
    setActiveCard(card);
    setSaved(false);
    setUserInput('');
    setDialogue([
      {
        sender: 'ai',
        text: `Приветствую, ${userProfile.name}. Вы выбрали метафорическую карту «${card.title}» (${card.category}).\n\nОбратите внимание на образ: «${card.metaphor}».\n\nЧто первое привлекает ваш взгляд? Какие эмоции или воспоминания поднимаются?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleDrawRandomCard = () => {
    const pool = selectedCategory === 'Все' ? MAC_CARDS : MAC_CARDS.filter(c => c.category === selectedCategory);
    const random = pool[Math.floor(Math.random() * pool.length)];
    handleSelectCard(random);
  };

  // Clicking a category pill immediately draws a random card from that category
  const handleCategoryClick = (cat: string) => {
    setSelectedCategory(cat);
    const pool = cat === 'Все' ? MAC_CARDS : MAC_CARDS.filter(c => c.category === cat);
    const random = pool[Math.floor(Math.random() * pool.length)];
    handleSelectCard(random);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || loadingAI || !activeCard) return;

    const userText = userInput.trim();
    setUserInput('');
    const newMsg: DialogueMessage = {
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newDialogue = [...dialogue, newMsg];
    setDialogue(newDialogue);
    setLoadingAI(true);

    try {
      const response = await fetch('/api/mac/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card: activeCard,
          userReflection: userText,
          conversationHistory: dialogue.map(d => ({ sender: d.sender, text: d.text })),
          userProfile
        })
      });

      if (!response.ok) throw new Error('API request failed');
      const data = await response.json();

      setDialogue(prev => [
        ...prev,
        {
          sender: 'ai',
          text: data.reply || 'Прислушайтесь к тому, как это откликается в теле. Какой один шаг вы можете сделать сегодня, опираясь на этот образ?',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch {
      // Fallback empathic psychological response
      setDialogue(prev => [
        ...prev,
        {
          sender: 'ai',
          text: `То, что вы описали («${userText.slice(0, 50)}...»), отражает важный внутренний процесс. Образ «${activeCard.title}» указывает на ${activeCard.psychologicalFocus.toLowerCase()}.\n\nСпросите себя: если бы этот символ мог дать вам один мудрый совет прямо сейчас — что бы он произнес?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoadingAI(false);
    }
  };

  const handleSaveSession = () => {
    if (!activeCard) return;
    const journalEntry = {
      id: 'mac-' + Date.now(),
      createdAt: new Date().toISOString(),
      deckType: 'mac' as const,
      spreadId: 'mac-self-analysis',
      spreadTitle: `МАК-Самоанализ: ${activeCard.title}`,
      question: `Психологическая сессия по карте «${activeCard.title}»`,
      userProfile,
      drawnCards: [
        {
          card: activeCard,
          deckType: 'mac' as const,
          positionIndex: 0,
          positionTitle: activeCard.category
        }
      ],
      interpretation: {
        summary: `Сессия самоанализа с картой «${activeCard.title}». Метафора: ${activeCard.metaphor}. Аффирмация: ${activeCard.affirmation}`,
        cardAnalyses: [
          {
            cardName: activeCard.title,
            positionTitle: activeCard.category,
            meaning: activeCard.description,
            psychologicalInsight: activeCard.psychologicalFocus
          }
        ],
        deepPsychoanalysis: dialogue.map(d => `${d.sender === 'user' ? 'Вы' : 'LUNA AI'}: ${d.text}`).join('\n\n'),
        practicalAdvice: activeCard.guidingQuestions,
        coachingActionStep: activeCard.affirmation,
        affirmation: activeCard.affirmation
      }
    };

    onSaveToJournal(journalEntry);
    setSaved(true);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 space-y-8 animate-in fade-in">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-[#0F0F16] border border-slate-800/60 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20">
              Глубокий Самоанализ
            </span>
            <span className="text-xs text-slate-500">Метафорические Ассоциативные Карты (МАК)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-slate-100 mt-1">
            Психологический Коуч <span className="font-light italic text-violet-400">& Диалог с Подсознанием</span>
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDrawRandomCard}
            className={`text-xs font-medium flex items-center gap-2 transition-all rounded-xl px-5 py-3 ${
              !activeCard
                ? 'bg-gradient-to-tr from-violet-600 to-indigo-500 hover:from-violet-500 hover:to-indigo-400 text-white shadow-lg shadow-violet-500/30 font-semibold animate-pulse'
                : 'bg-[#15151F] hover:bg-[#1A1A24] text-slate-300 border border-slate-800/80 hover:border-violet-500/30'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5 text-violet-400" />
            {!activeCard ? '🔮 Тянуть карту' : 'Случайная карта'}
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => handleCategoryClick(cat)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? 'bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow-md shadow-violet-500/20'
                : 'bg-[#15151F] border border-slate-800/60 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Main Grid: Card Exploration & Dialogue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Active Card & Deck Browser */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-2xl bg-[#0F0F16] border border-slate-800/60 shadow-xl flex flex-col items-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-violet-500/5 via-transparent to-transparent pointer-events-none" />

            {activeCard ? (
              <CardVisual
                card={activeCard}
                deckType="mac"
                isFlipped={true}
                size="lg"
                glow={true}
                positionLabel={activeCard.category}
              />
            ) : (
              <div className="w-full py-10 text-center space-y-3">
                <div className="w-24 h-36 mx-auto rounded-xl bg-[#15151F] border-2 border-dashed border-slate-700 flex items-center justify-center text-3xl">
                  🃏
                </div>
                <p className="text-sm font-serif italic text-slate-200">
                  Сосредоточьтесь на своём запросе...
                </p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Нажмите «Тянуть карту» — или выберите категорию выше, и Луна вытянет карту из неё.
                </p>
              </div>
            )}

            {/* Card Metaphor & Guidance */}
            {activeCard && (
              <div className="w-full mt-6 space-y-3 pt-4 border-t border-slate-800/60">
              <div className="p-3.5 rounded-xl bg-[#15151F] border border-slate-800/60 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Метафорический Образ
                </span>
                <p className="text-xs text-slate-300 font-serif italic leading-relaxed">
                  «{activeCard.metaphor}»
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#15151F] border border-slate-800/60 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-violet-400" />
                  Психологический Фокус
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {activeCard.psychologicalFocus}
                </p>
              </div>

              {/* Guiding Questions Chips */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" />
                  Вопросы для размышления
                </span>
                <div className="space-y-1.5">
                  {activeCard.guidingQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => setUserInput(q)}
                      className="w-full text-left p-2 rounded-lg bg-[#15151F] hover:bg-[#1A1A24] border border-slate-800 text-[11px] text-slate-400 hover:text-violet-300 transition-colors"
                    >
                      ✦ {q}
                    </button>
                  ))}
                </div>
              </div>
              </div>
            )}
          </div>

          {/* Mini Cards Deck Carousel */}
          <div className="p-4 rounded-2xl bg-[#0F0F16] border border-slate-800/60 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 block">
              Выберите другую карту из колоды ({filteredCards.length})
            </span>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {filteredCards.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSelectCard(c)}
                  className={`p-1.5 rounded-xl border shrink-0 transition-all ${
                    activeCard?.id === c.id
                      ? 'border-violet-500 bg-[#15151F] shadow-md shadow-violet-500/20'
                      : 'border-slate-800 hover:border-slate-700 bg-[#15151F]/40 opacity-70 hover:opacity-100'
                  }`}
                >
                  <CardVisual card={c} deckType="mac" isFlipped={true} size="sm" showDetails={false} interactive={false} />
                  <p className="text-[10px] text-slate-300 font-medium text-center mt-1 max-w-[80px] truncate">
                    {c.title}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Interactive AI Psychological Dialogue */}
        <div className="lg:col-span-7 space-y-4 flex flex-col h-full">
          <div className="p-6 rounded-2xl bg-[#0F0F16] border border-slate-800/60 shadow-xl flex-1 flex flex-col justify-between">
            <div>
              {/* Dialogue Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800/60 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                    L
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-slate-100">
                      ИИ МАК-Психолог
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Безопасное пространство саморефлексии
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveSession}
                    disabled={saved}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      saved
                        ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/40'
                        : 'bg-gradient-to-tr from-violet-600 to-indigo-500 hover:from-violet-500 text-white shadow-md shadow-violet-500/20'
                    }`}
                  >
                    {saved ? <Check className="w-3.5 h-3.5" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
                    {saved ? 'В Дневнике' : 'Сохранить'}
                  </button>
                </div>
              </div>

              {/* Chat Thread */}
              <div className="space-y-3.5 max-h-[460px] overflow-y-auto pr-1">
                {dialogue.length === 0 && !loadingAI && (
                  <div className="py-10 text-center space-y-2">
                    <p className="text-sm font-serif italic text-slate-300">
                      Это безопасное пространство саморефлексии.
                    </p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Вытяните карту слева — и начните диалог с подсознанием. Расскажите, что вы чувствуете, глядя на образ карты.
                    </p>
                  </div>
                )}
                {dialogue.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex flex-col ${
                      msg.sender === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed max-w-[90%] whitespace-pre-line ${
                        msg.sender === 'user'
                          ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-tr-none shadow-md shadow-violet-500/20'
                          : 'bg-[#15151F] border border-slate-800/60 text-slate-200 rounded-tl-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[10px] text-slate-600 mt-1 px-1">
                      {msg.timestamp}
                    </span>
                  </div>
                ))}

                {loadingAI && (
                  <div className="flex items-center gap-2 p-3.5 rounded-2xl rounded-tl-none bg-[#15151F] border border-slate-800/60 text-slate-400 text-xs w-fit">
                    <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent animate-spin rounded-full" />
                    <span>LUNA AI осмысляет ваш отклик...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="mt-4 pt-4 border-t border-slate-800/60 space-y-2">
              <div className="relative">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder={activeCard ? 'Опишите, что вы чувствуете, глядя на эту карту...' : 'Сначала вытяните карту...'}
                  className="w-full pl-4 pr-12 py-3 rounded-full bg-[#1A1A24] border border-slate-800 text-slate-200 placeholder-slate-600 text-xs sm:text-sm focus:outline-none focus:border-violet-500/50 transition-all"
                />
                <button
                  type="submit"
                  disabled={loadingAI || !userInput.trim() || !activeCard}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 hover:from-violet-500 hover:to-indigo-400 disabled:opacity-40 text-white transition-all shadow-md shadow-violet-500/20"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-slate-500 text-center">
                Все ответы генерируются с опорой на методы юнгианской психологии и коучинга
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
