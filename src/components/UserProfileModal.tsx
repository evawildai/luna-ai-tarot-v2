import React, { useState } from 'react';
import { UserProfile } from '../types';
import { calculateAstrologyAndDestiny } from '../utils/astrology';
import { User, Calendar, Sparkles, X, Check, Compass, Shield } from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  onSave: (profile: UserProfile) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onSave,
}) => {
  const [name, setName] = useState(userProfile.name || '');
  const [birthDate, setBirthDate] = useState(userProfile.birthDate || '');

  if (!isOpen) return null;

  const astrologyData = birthDate ? calculateAstrologyAndDestiny(birthDate) : null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: UserProfile = {
      name: name.trim() || 'Искатель',
      birthDate,
      zodiacSign: astrologyData ? `${astrologyData.zodiacSymbol} ${astrologyData.zodiacSign}` : undefined,
      destinyArcana: astrologyData ? {
        number: astrologyData.destinyArcana.number,
        name: astrologyData.destinyArcana.name,
        description: astrologyData.destinyArcana.description,
      } : undefined,
    };
    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#0F0F16] border border-slate-800/80 p-6 sm:p-7 shadow-2xl overflow-hidden">
        {/* Decorative corner glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-medium tracking-tight text-slate-100">Профиль Искателя</h3>
              <p className="text-xs text-slate-500">Персонализация раскладов Таро и МАК</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-[#15151F] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-5 space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1.5">
              Ваше Имя
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Как к вам обращаться?"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#1A1A24] border border-slate-800 text-slate-200 placeholder-slate-600 text-sm focus:outline-none focus:border-violet-500/50 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1.5">
              Дата Рождения
            </label>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#1A1A24] border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-violet-500/50 transition-all"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">
              Используется для точного расчета Знака Зодиака и Главного Аркана Судьбы.
            </p>
          </div>

          {/* Real-time Astrological & Destiny preview */}
          {astrologyData && (
            <div className="p-4 rounded-xl bg-[#15151F] border border-slate-800/80 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-violet-400" />
                  Знак Зодиака:
                </span>
                <span className="font-medium text-slate-200">
                  {astrologyData.zodiacSymbol} {astrologyData.zodiacSign} ({astrologyData.element}, {astrologyData.rulingPlanet})
                </span>
              </div>

              <div className="flex items-start justify-between text-xs pt-2 border-t border-slate-800/80">
                <span className="text-slate-400 flex items-center gap-1.5 pt-0.5">
                  <Shield className="w-4 h-4 text-violet-400" />
                  Аркан Судьбы:
                </span>
                <div className="text-right max-w-[240px]">
                  <span className="font-semibold text-violet-300">
                    № {astrologyData.destinyArcana.number} — {astrologyData.destinyArcana.name}
                  </span>
                  <p className="text-[11px] text-slate-400 italic mt-0.5 line-clamp-2">
                    {astrologyData.destinyArcana.description}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-800 bg-[#15151F] text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 hover:from-violet-500 hover:to-indigo-400 text-white text-xs font-medium shadow-md shadow-violet-500/20 flex items-center justify-center gap-1.5 transition-all"
            >
              <Check className="w-4 h-4" />
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
