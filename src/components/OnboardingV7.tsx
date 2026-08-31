import React, { useState } from 'react';
import { Sparkles, Moon, X, ChevronRight } from 'lucide-react';

/**
 * Мягкий онбординг v7.
 * Без формы на входе: пользователь сразу попадает в карты.
 * Данные (имя, дата рождения, тон) спрашиваем только по триггеру —
 * мягким bottom-sheet'ом, который можно закрыть без ответа.
 * «Пульс карт» — дышащая колода на первом экране вместо приветственной формы.
 */

const TONES = [
  { id: 'мягко', label: 'Мягко', hint: 'бережно и тепло' },
  { id: 'честно', label: 'Честно', hint: 'прямо, без ваты' },
  { id: 'провокативно', label: 'Провокативно', hint: 'встряхнуть' },
  { id: 'достигатор', label: 'Достигатор', hint: 'цели и шаги' },
];

const LS_KEY = 'luna_onboarding_v7'; // 'done' | 'skipped'

export function onboardingDone(): boolean {
  try {
    return localStorage.getItem(LS_KEY) === 'done';
  } catch {
    return true;
  }
}

/** Пульс карт: дышащая колода — первый экран без формы. */
export const PulseDeck: React.FC<{ onDraw: () => void }> = ({ onDraw }) => (
  <div className="relative overflow-hidden rounded-3xl border border-slate-800/70 bg-gradient-to-b from-[#161622] to-[#0F0F16] px-6 py-8 mb-5">
    <div className="flex flex-col sm:flex-row items-center gap-6">
      {/* Дышащая колода */}
      <button
        onClick={onDraw}
        aria-label="Вытянуть карту"
        className="relative shrink-0 w-28 h-44 [perspective:800px] group"
      >
        {[2, 1, 0].map((i) => (
          <div
            key={i}
            className="absolute inset-0 rounded-2xl border border-violet-400/25 bg-gradient-to-br from-[#1E1B33] via-[#191731] to-[#12101F] shadow-xl shadow-violet-950/40 animate-[luna-pulse_3.2s_ease-in-out_infinite]"
            style={{
              transform: `rotate(${(i - 1) * 5}deg) translateY(${i * -3}px)`,
              animationDelay: `${i * 0.5}s`,
            }}
          >
            <div className="absolute inset-2 rounded-xl border border-violet-300/10 flex items-center justify-center">
              <Moon className="w-7 h-7 text-violet-300/50" />
            </div>
          </div>
        ))}
        <span className="absolute -inset-4 rounded-full bg-violet-500/10 blur-2xl animate-[luna-pulse_3.2s_ease-in-out_infinite]" />
      </button>
      <div className="text-center sm:text-left">
        <h2 className="font-[Cinzel] text-xl text-violet-100">
          Карты уже пульсируют
        </h2>
        <p className="mt-2 text-sm text-slate-400 leading-relaxed max-w-sm">
          Никаких анкет — просто потяните карту. Имя и дату рождения Луна
          попросит сама, когда они сделают расклад точнее.
        </p>
        <button
          onClick={onDraw}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 hover:brightness-110 transition-all"
        >
          <Sparkles className="w-4 h-4" />
          Вытянуть карту
        </button>
      </div>
    </div>
    <style>{`
      @keyframes luna-pulse {
        0%, 100% { transform: scale(1) rotate(var(--r, 0deg)); opacity: 0.9; }
        50% { transform: scale(1.045) rotate(var(--r, 0deg)); opacity: 1; }
      }
    `}</style>
  </div>
);

/** Мягкий sheet: спрашиваем данные один раз, по триггеру, с правом промолчать. */
export const SoftAskSheet: React.FC<{
  isOpen: boolean;
  reason: 'draw' | 'destiny' | 'nudge';
  onClose: () => void;
  onSave: (data: { name: string; birthDate: string; tone: string }) => void;
}> = ({ isOpen, reason, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [tone, setTone] = useState('мягко');
  if (!isOpen) return null;

  const reasonText: Record<string, string> = {
    draw: 'Расклад станет глубже, если Луна узнает вас чуть лучше.',
    destiny: 'Аркан Судьбы считается по дате рождения — введите её, и карта откроется.',
    nudge: 'Имя и дата рождения — это всё, что нужно Луне для персональных трактовок.',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-slate-800 bg-[#12121B] p-6 pb-8 shadow-2xl">
        <button
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute right-4 top-4 w-8 h-8 rounded-full bg-slate-800/70 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <h3 className="font-[Cinzel] text-lg text-violet-100 pr-8">
          Настроим Луну под вас?
        </h3>
        <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">{reasonText[reason]}</p>

        <div className="mt-5 space-y-4">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-slate-500">Как к вам обращаться</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Имя или никнейм"
              className="mt-1.5 w-full rounded-xl bg-[#0D0D12] border border-slate-800 px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:border-violet-500/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-slate-500">Дата рождения</label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="mt-1.5 w-full rounded-xl bg-[#0D0D12] border border-slate-800 px-4 py-2.5 text-sm text-slate-200 focus:border-violet-500/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-slate-500">Голос Луны</label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {TONES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTone(t.id)}
                  className={`rounded-xl border px-3 py-2 text-left transition-all ${
                    tone === t.id
                      ? 'border-violet-500/60 bg-violet-500/10'
                      : 'border-slate-800 bg-[#0D0D12] hover:border-slate-700'
                  }`}
                >
                  <span className="block text-xs font-semibold text-slate-200">{t.label}</span>
                  <span className="block text-[10px] text-slate-500">{t.hint}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={() => onSave({ name: name.trim(), birthDate, tone })}
          className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 hover:brightness-110 transition-all"
        >
          Сохранить
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={onClose}
          className="mt-2 w-full py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          Не сейчас — карты и так работают
        </button>
      </div>
    </div>
  );
};

/** Напалки: мягкое напоминание, пока профиль не заполнен. */
export const NudgePill: React.FC<{ onOpen: () => void; onDismiss: () => void }> = ({
  onOpen,
  onDismiss,
}) => (
  <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-full border border-violet-500/30 bg-[#161622]/95 backdrop-blur px-4 py-2.5 shadow-xl shadow-violet-950/40">
    <span className="text-base">🌙</span>
    <button onClick={onOpen} className="text-xs text-slate-200 hover:text-white transition-colors">
      Добавьте дату рождения — трактовки станут точнее
    </button>
    <button
      onClick={onDismiss}
      aria-label="Скрыть"
      className="text-slate-500 hover:text-slate-300 transition-colors"
    >
      <X className="w-3.5 h-3.5" />
    </button>
  </div>
);
