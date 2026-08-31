import React, { useState } from 'react';
import { UserProfile } from '../types';
import { calculateAstrologyAndDestiny } from '../utils/astrology';
import { TAROT_CARDS } from '../data/tarotCards';
import { CardVisual } from './CardVisual';
import { Sparkles, Compass, Shield, Calendar, Award, Share2 } from 'lucide-react';

interface DestinyViewProps {
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  onShare: (title: string, text: string, cards: string) => void;
}

export const DestinyView: React.FC<DestinyViewProps> = ({
  userProfile,
  onUpdateProfile,
  onShare,
}) => {
  const [birthDate, setBirthDate] = useState(userProfile.birthDate || '1995-07-15');
  const astrology = calculateAstrologyAndDestiny(birthDate);

  // Find the tarot card matching destiny arcana
  const destinyCard = TAROT_CARDS.find(
    (c) => c.arcana === 'major' && c.number === astrology.destinyArcana.number
  );

  const handleUpdateDate = (date: string) => {
    setBirthDate(date);
    const newAstro = calculateAstrologyAndDestiny(date);
    onUpdateProfile({
      ...userProfile,
      birthDate: date,
      zodiacSign: `${newAstro.zodiacSymbol} ${newAstro.zodiacSign}`,
      destinyArcana: {
        number: newAstro.destinyArcana.number,
        name: newAstro.destinyArcana.name,
        description: newAstro.destinyArcana.description,
      },
    });
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 space-y-8 animate-in fade-in">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-[#0F0F16] border border-slate-800/60 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20">
              Нумерология & Астрология
            </span>
            <span className="text-xs text-slate-500">Система 22 Высших Арканов</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-slate-100 mt-1">
            Аркан Судьбы <span className="font-light italic text-violet-400">& Матрица Потенциала</span>
          </h2>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2 bg-[#15151F] border border-slate-800/80 rounded-xl p-2">
          <Calendar className="w-4 h-4 text-violet-400 ml-1" />
          <input
            type="date"
            value={birthDate}
            onChange={(e) => handleUpdateDate(e.target.value)}
            className="bg-transparent text-xs text-slate-200 focus:outline-none"
          />
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Visual Arcana Card */}
        <div className="lg:col-span-5 flex flex-col items-center p-6 sm:p-8 rounded-2xl bg-[#0F0F16] border border-slate-800/60 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-violet-500/10 via-transparent to-transparent pointer-events-none" />

          {destinyCard && (
            <CardVisual
              card={destinyCard}
              deckType="tarot"
              isFlipped={true}
              size="lg"
              glow={true}
              positionLabel={`Главный Аркан №${astrology.destinyArcana.number}`}
            />
          )}

          <div className="mt-6 w-full text-center">
            <button
              onClick={() =>
                onShare(
                  `Мой Аркан Судьбы: ${astrology.destinyArcana.name}`,
                  astrology.destinyArcana.description,
                  astrology.destinyArcana.name
                )
              }
              className="w-full py-2.5 rounded-xl bg-violet-950/40 hover:bg-violet-900/40 text-violet-300 border border-violet-500/30 text-xs font-medium flex items-center justify-center gap-2 transition-all"
            >
              <Share2 className="w-3.5 h-3.5" />
              Поделиться своим Арканом
            </button>
          </div>
        </div>

        {/* Right Column: Astrological & Numerological Matrix */}
        <div className="lg:col-span-7 space-y-4">
          {/* Destiny Arcana Card */}
          <div className="p-6 rounded-2xl bg-[#15151F] border border-slate-800/60 shadow-xl space-y-3">
            <div className="flex items-center gap-2 text-violet-400 text-[10px] font-bold uppercase tracking-[0.2em]">
              <Award className="w-4 h-4" />
              Ваше Главное Предназначение
            </div>
            <h3 className="text-xl font-medium text-slate-100">
              № {astrology.destinyArcana.number} — {astrology.destinyArcana.name}
            </h3>
            <p className="text-slate-300 font-serif italic text-base leading-relaxed">
              «{astrology.destinyArcana.description}»
            </p>
          </div>

          {/* Zodiac & Planet Traits */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl bg-[#15151F] border border-slate-800/60 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-violet-400" />
                Зодиакальный Знак
              </span>
              <p className="text-sm font-semibold text-slate-100">
                {astrology.zodiacSymbol} {astrology.zodiacSign}
              </p>
              <p className="text-xs text-slate-400">
                Стихия: <span className="text-violet-300">{astrology.element}</span> • Планета: <span className="text-violet-300">{astrology.rulingPlanet}</span>
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#15151F] border border-slate-800/60 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-violet-400" />
                Ключевые Силы
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">
                {destinyCard?.symbolism || 'Глубокая интуиция, способность трансформации и раскрытия скрытых талантов.'}
              </p>
            </div>
          </div>

          {/* Coaching & Development Focus */}
          <div className="p-5 rounded-xl bg-[#0F0F16] border border-slate-800/60 space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Коучинговый Вопрос для Развития
            </span>
            <p className="text-xs sm:text-sm text-slate-200 font-serif italic">
              «{destinyCard?.coachingQuestion || 'В чем заключается ваша истинная сила, когда вы отпускаете внешние ожидания?'}»
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
