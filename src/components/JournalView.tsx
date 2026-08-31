import React, { useState } from 'react';
import { ReadingResult } from '../types';
import { CardVisual } from './CardVisual';
import { 
  Bookmark, Trash2, Heart, Search, Filter, Share2, 
  Calendar, Layers, Sparkles, ChevronDown, ChevronUp, Edit3 
} from 'lucide-react';

interface JournalViewProps {
  entries: ReadingResult[];
  onDeleteEntry: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onUpdateReflection: (id: string, reflection: string) => void;
  onShare: (title: string, text: string, cards: string) => void;
}

export const JournalView: React.FC<JournalViewProps> = ({
  entries,
  onDeleteEntry,
  onToggleFavorite,
  onUpdateReflection,
  onShare,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'tarot' | 'mac' | 'favorites'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(entries[0]?.id || null);
  const [editingReflectionId, setEditingReflectionId] = useState<string | null>(null);
  const [reflectionInput, setReflectionInput] = useState('');

  const filteredEntries = entries.filter((item) => {
    if (filterType === 'favorites' && !item.isFavorite) return false;
    if (filterType === 'tarot' && item.deckType !== 'tarot') return false;
    if (filterType === 'mac' && item.deckType !== 'mac') return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchQuestion = item.question?.toLowerCase().includes(q);
      const matchSpread = item.spreadTitle?.toLowerCase().includes(q);
      const matchSummary = item.interpretation?.summary?.toLowerCase().includes(q);
      const matchCard = item.drawnCards?.some((c) =>
        'nameRu' in c.card ? c.card.nameRu.toLowerCase().includes(q) : c.card.title.toLowerCase().includes(q)
      );
      return matchQuestion || matchSpread || matchSummary || matchCard;
    }
    return true;
  });

  const handleSaveReflection = (id: string) => {
    onUpdateReflection(id, reflectionInput);
    setEditingReflectionId(null);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 space-y-8 animate-in fade-in">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-[#0F0F16] border border-slate-800/60 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20">
              Личная Хроника
            </span>
            <span className="text-xs text-slate-500">
              Сохранено: {entries.length} {entries.length === 1 ? 'сессия' : 'сессий'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-slate-100 mt-1">
            Дневник Инсайтов <span className="font-light italic text-violet-400">& Рефлексий</span>
          </h2>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Поиск по раскладам..."
              className="pl-8 pr-3 py-1.5 rounded-full bg-[#1A1A24] border border-slate-800 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500/50 w-48"
            />
          </div>

          <div className="flex p-1 rounded-full bg-[#0D0D12] border border-slate-800">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
                filterType === 'all'
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-500 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Все
            </button>
            <button
              onClick={() => setFilterType('tarot')}
              className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
                filterType === 'tarot'
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-500 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Таро
            </button>
            <button
              onClick={() => setFilterType('mac')}
              className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
                filterType === 'mac'
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-500 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              МАК
            </button>
            <button
              onClick={() => setFilterType('favorites')}
              className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all flex items-center gap-1 ${
                filterType === 'favorites'
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-500 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Heart className="w-3 h-3 text-rose-400 fill-rose-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Entries List */}
      {filteredEntries.length === 0 ? (
        <div className="p-12 rounded-2xl bg-[#0F0F16] border border-slate-800/60 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto text-violet-400">
            <Bookmark className="w-6 h-6" />
          </div>
          <h3 className="text-base font-medium text-slate-200">Дневник пока пуст</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Проведите расклад Таро или сессию с МАК-картами и сохраните результат, чтобы отслеживать динамику инсайтов.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEntries.map((item) => {
            const isExpanded = expandedId === item.id;
            const cardNames = item.drawnCards
              .map((d) => ('nameRu' in d.card ? d.card.nameRu : d.card.title))
              .join(', ');

            return (
              <div
                key={item.id}
                className="rounded-2xl bg-[#0F0F16] border border-slate-800/60 shadow-xl overflow-hidden transition-all"
              >
                {/* Header Row */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-[#15151F]/40 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                          item.deckType === 'tarot'
                            ? 'bg-violet-950/50 text-violet-300 border-violet-500/30'
                            : 'bg-indigo-950/50 text-indigo-300 border-indigo-500/30'
                        }`}
                      >
                        {item.deckType === 'tarot' ? 'Таро' : 'МАК'}
                      </span>
                      <span className="text-xs font-medium text-slate-400">
                        {item.spreadTitle}
                      </span>
                      <span className="text-[11px] text-slate-600">
                        {new Date(item.createdAt).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <h4 className="text-sm font-medium text-slate-100">
                      «{item.question}»
                    </h4>
                    <p className="text-xs text-slate-400 line-clamp-1 font-serif italic">
                      Карты: {cardNames}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onToggleFavorite(item.id)}
                      className={`p-2 rounded-full border transition-all ${
                        item.isFavorite
                          ? 'bg-rose-950/50 border-rose-500/40 text-rose-400'
                          : 'bg-[#15151F] border-slate-800 text-slate-500 hover:text-rose-400'
                      }`}
                      title="В избранное"
                    >
                      <Heart className={`w-3.5 h-3.5 ${item.isFavorite ? 'fill-rose-400' : ''}`} />
                    </button>

                    <button
                      onClick={() =>
                        onShare(
                          item.spreadTitle,
                          item.interpretation.summary,
                          cardNames
                        )
                      }
                      className="p-2 rounded-full bg-[#15151F] border border-slate-800 text-slate-400 hover:text-violet-300 transition-colors"
                      title="Поделиться"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onDeleteEntry(item.id)}
                      className="p-2 rounded-full bg-[#15151F] border border-slate-800 text-slate-500 hover:text-rose-400 transition-colors"
                      title="Удалить"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="p-2 rounded-full bg-[#15151F] border border-slate-800 text-slate-400 hover:text-white"
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-5 sm:p-6 border-t border-slate-800/60 bg-[#0B0B10] space-y-6">
                    {/* Cards Visual Row */}
                    <div className="flex flex-wrap gap-4 justify-center sm:justify-start">
                      {item.drawnCards.map((drawn, idx) => (
                        <div key={idx} className="flex flex-col items-center">
                          <CardVisual
                            card={drawn.card}
                            deckType={drawn.deckType}
                            isFlipped={true}
                            size="sm"
                            showDetails={true}
                            positionLabel={drawn.positionTitle}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Summary */}
                    <div className="p-4 rounded-xl bg-[#15151F] border border-slate-800/60 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400">
                        Главный Инсайт
                      </span>
                      <p className="text-xs sm:text-sm text-slate-200 font-serif italic leading-relaxed">
                        «{item.interpretation.summary}»
                      </p>
                    </div>

                    {/* Deep Psychoanalysis */}
                    {item.interpretation.deepPsychoanalysis && (
                      <div className="p-4 rounded-xl bg-[#15151F] border border-slate-800/60 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                          Глубинный Анализ
                        </span>
                        <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                          {item.interpretation.deepPsychoanalysis}
                        </p>
                      </div>
                    )}

                    {/* Affirmation */}
                    {item.interpretation.affirmation && (
                      <div className="p-3 rounded-xl bg-violet-950/30 border border-violet-500/20 text-xs text-violet-300">
                        ✨ <strong>Аффирмация:</strong> {item.interpretation.affirmation}
                      </div>
                    )}

                    {/* User Reflection Note */}
                    <div className="p-4 rounded-xl bg-[#15151F] border border-slate-800/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-1.5">
                          <Edit3 className="w-3.5 h-3.5 text-violet-400" />
                          Ваша Личная Заметка & Рефлексия
                        </span>
                        {editingReflectionId !== item.id && (
                          <button
                            onClick={() => {
                              setEditingReflectionId(item.id);
                              setReflectionInput(item.userReflection || '');
                            }}
                            className="text-[11px] text-violet-400 hover:underline"
                          >
                            {item.userReflection ? 'Редактировать' : '+ Добавить заметку'}
                          </button>
                        )}
                      </div>

                      {editingReflectionId === item.id ? (
                        <div className="space-y-2 pt-1">
                          <textarea
                            value={reflectionInput}
                            onChange={(e) => setReflectionInput(e.target.value)}
                            placeholder="Запишите свои мысли, озарения или события дня..."
                            rows={3}
                            className="w-full p-3 rounded-xl bg-[#1A1A24] border border-slate-800 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500/50"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEditingReflectionId(null)}
                              className="px-3 py-1 rounded-lg text-xs text-slate-400 hover:text-slate-200"
                            >
                              Отмена
                            </button>
                            <button
                              onClick={() => handleSaveReflection(item.id)}
                              className="px-4 py-1 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-500 text-white text-xs font-medium"
                            >
                              Сохранить заметку
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">
                          {item.userReflection || 'Заметка не добавлена. Вы можете записать свои мысли по этому раскладу.'}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
