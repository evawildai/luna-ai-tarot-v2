import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, MessageCircle } from 'lucide-react';
import { TarotCard, MacCard, UserProfile } from '../types';

interface CardChatMessage {
  sender: 'user' | 'luna';
  text: string;
}

interface CardChatProps {
  deckType: 'tarot' | 'mac';
  card: TarotCard | MacCard | null;
  isReversed: boolean;
  userProfile: UserProfile;
}

export const CardChat: React.FC<CardChatProps> = ({ deckType, card, isReversed, userProfile }) => {
  const [chat, setChat] = useState<CardChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setChat([]);
    setQuestion('');
  }, [card]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [chat, loading]);

  const ask = async (mode: 'explain' | 'question', q?: string) => {
    if (!card || loading) return;
    const outgoing: CardChatMessage = {
      sender: 'user',
      text: mode === 'explain' ? 'Объясни значение этой карты простыми словами' : q || '',
    };
    const nextChat = [...chat, outgoing];
    setChat(nextChat);
    setQuestion('');
    setLoading(true);
    try {
      const res = await fetch('/api/tarot/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deckType, card, isReversed, mode, question: q, userProfile, chat: nextChat.slice(-6) }),
      });
      const data = await res.json();
      setChat((c) => [...c, { sender: 'luna', text: data.reply || data.error || 'Карты молчат...' }]);
    } catch {
      setChat((c) => [...c, { sender: 'luna', text: '🌙 Связь с картами прервалась. Попробуйте ещё раз.' }]);
    } finally {
      setLoading(false);
    }
  };

  const cardName = card ? ('nameRu' in card ? card.nameRu : card.title) : '';

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-[#0F0F16] border border-slate-800/60 space-y-4">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400">
        <MessageCircle className="w-4 h-4" />
        Поговорите с картой «{cardName}»
      </div>

      {chat.length === 0 && (
        <p className="text-xs text-slate-500 italic leading-relaxed">
          Не понимаете, о чём карта? Нажмите «Объяснить значение» — или задайте свой личный вопрос, и Луна ответит через символику карты.
        </p>
      )}

      {chat.length > 0 && (
        <div className="max-h-72 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
          {chat.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                  m.sender === 'user'
                    ? 'bg-gradient-to-r from-violet-600/80 to-indigo-500/80 text-white rounded-br-sm'
                    : 'bg-[#15151F] border border-slate-800/80 text-slate-200 rounded-bl-sm'
                }`}
              >
                {m.sender === 'luna' && (
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-violet-400 mb-1">
                    <Sparkles className="w-3 h-3" /> Луна
                  </span>
                )}
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-500 pl-1">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:300ms]" />
              Луна размышляет...
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Explain button */}
      <button
        onClick={() => ask('explain')}
        disabled={!card || loading}
        className="w-full px-4 py-2.5 rounded-xl bg-violet-950/40 hover:bg-violet-900/40 disabled:opacity-40 text-violet-300 border border-violet-500/30 text-xs font-medium flex items-center justify-center gap-2 transition-all"
      >
        <Sparkles className="w-3.5 h-3.5" />
        ✨ Объяснить значение карты
      </button>

      {/* Free question */}
      <div className="flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && question.trim() && ask('question', question.trim())}
          placeholder="Спросите карту о своём..."
          className="flex-1 px-4 py-2.5 rounded-xl bg-[#15151F] border border-slate-800/80 focus:border-violet-500/50 outline-none text-xs sm:text-sm text-slate-200 placeholder:text-slate-600 transition-colors"
        />
        <button
          onClick={() => question.trim() && ask('question', question.trim())}
          disabled={!card || loading || !question.trim()}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 hover:from-violet-500 hover:to-indigo-400 disabled:opacity-40 text-white shadow-lg shadow-violet-500/20 transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
