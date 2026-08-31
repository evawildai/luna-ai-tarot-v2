import React from 'react';
import { motion } from 'motion/react';
import { TarotCard, MacCard } from '../types';
import { 
  Sparkles, Wand2, Moon, Crown, Shield, BookOpen, Heart, 
  Compass, Sun, Flame, RotateCw, Scale, Eye, RefreshCw, 
  Droplet, Zap, Bell, Globe, Coins, Home, Feather, Smile, 
  GitFork, HelpCircle, HeartHandshake, Gift, UserCheck, Sprout
} from 'lucide-react';

interface CardVisualProps {
  card?: TarotCard | MacCard;
  deckType?: 'tarot' | 'mac';
  isFlipped?: boolean;
  isReversed?: boolean;
  onFlip?: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showDetails?: boolean;
  interactive?: boolean;
  positionLabel?: string;
  glow?: boolean;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Sparkles: <Sparkles className="w-full h-full" />,
  Wand2: <Wand2 className="w-full h-full" />,
  Moon: <Moon className="w-full h-full" />,
  Crown: <Crown className="w-full h-full" />,
  Shield: <Shield className="w-full h-full" />,
  BookOpen: <BookOpen className="w-full h-full" />,
  Heart: <Heart className="w-full h-full" />,
  Compass: <Compass className="w-full h-full" />,
  Sun: <Sun className="w-full h-full" />,
  Flame: <Flame className="w-full h-full" />,
  RotateCw: <RotateCw className="w-full h-full" />,
  Scale: <Scale className="w-full h-full" />,
  Eye: <Eye className="w-full h-full" />,
  RefreshCw: <RefreshCw className="w-full h-full" />,
  Droplet: <Droplet className="w-full h-full" />,
  Zap: <Zap className="w-full h-full" />,
  Bell: <Bell className="w-full h-full" />,
  Globe: <Globe className="w-full h-full" />,
  Coins: <Coins className="w-full h-full" />,
  Home: <Home className="w-full h-full" />,
  Feather: <Feather className="w-full h-full" />,
  Smile: <Smile className="w-full h-full" />,
  GitFork: <GitFork className="w-full h-full" />,
  HelpCircle: <HelpCircle className="w-full h-full" />,
  HeartHandshake: <HeartHandshake className="w-full h-full" />,
  Gift: <Gift className="w-full h-full" />,
  UserCheck: <UserCheck className="w-full h-full" />,
  Sprout: <Sprout className="w-full h-full" />
};

export const CardVisual: React.FC<CardVisualProps> = ({
  card,
  deckType = 'tarot',
  isFlipped = true,
  isReversed = false,
  onFlip,
  size = 'md',
  showDetails = true,
  interactive = true,
  positionLabel,
  glow = false
}) => {
  const isTarot = card ? 'arcana' in card : deckType === 'tarot';
  const tarotCard = card && 'arcana' in card ? (card as TarotCard) : null;
  const macCard = card && !('arcana' in card) ? (card as MacCard) : null;

  const sizeClasses = {
    sm: 'w-24 h-40 text-xs',
    md: 'w-40 h-64 text-sm',
    lg: 'w-56 h-88 text-base',
    xl: 'w-72 h-112 text-lg'
  }[size];

  const cardTitle = tarotCard ? tarotCard.nameRu : macCard ? macCard.title : 'Неизвестная карта';
  const subTitle = tarotCard ? tarotCard.nameEn : macCard ? macCard.category : '';
  const iconName = card?.visualTheme.iconName || 'Sparkles';
  const accentColor = card?.visualTheme.accentColor || (isTarot ? '#eab308' : '#a855f7');

  return (
    <div className="flex flex-col items-center select-none">
      {positionLabel && (
        <span className="mb-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide bg-[#15151F] text-violet-300 border border-violet-500/30">
          {positionLabel}
        </span>
      )}

      <div
        onClick={interactive ? onFlip : undefined}
        className={`relative ${sizeClasses} perspective-1000 ${interactive ? 'cursor-pointer' : ''}`}
      >
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          className="w-full h-full relative transform-style-preserve-3d"
        >
          {/* Card Back (Face Down) */}
          <div
            className={`absolute inset-0 w-full h-full rounded-2xl p-2.5 backface-hidden flex flex-col items-center justify-between border ${
              glow ? 'animate-pulse-glow border-violet-500/60' : 'border-slate-700/50 shadow-xl'
            } bg-gradient-to-b from-[#15151F] via-[#0F0F16] to-[#0D0D12]`}>
            <div className="w-full h-full rounded-xl border border-violet-500/20 p-2 flex flex-col items-center justify-between relative overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-violet-500/10 via-transparent to-transparent">
              {/* Corner Symbols */}
              <div className="w-full flex justify-between text-violet-400/40 text-[10px] font-sans">
                <span>✦</span>
                <span>✦</span>
              </div>

              {/* Central Mystic Sacred Geometry Art */}
              <div className="relative flex items-center justify-center">
                <div className="w-16 h-16 rounded-full border border-violet-500/30 flex items-center justify-center animate-[spin_20s_linear_infinite] bg-violet-500/5">
                  <div className="w-12 h-12 border border-dashed border-violet-400/40 rotate-45" />
                </div>
                <div className="absolute text-violet-400 drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]">
                  {isTarot ? <Moon className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
                </div>
              </div>

              <div className="text-center">
                <p className="text-[10px] font-medium tracking-[0.2em] text-slate-400 uppercase">
                  {isTarot ? 'Arcana Tarot' : 'MAC Psychology'}
                </p>
              </div>

              <div className="w-full flex justify-between text-violet-400/40 text-[10px] font-sans">
                <span>✦</span>
                <span>✦</span>
              </div>
            </div>
          </div>

          {/* Card Front (Face Up) */}
          <div
            className={`absolute inset-0 w-full h-full rounded-2xl p-2.5 backface-hidden rotate-y-180 flex flex-col justify-between border shadow-2xl overflow-hidden ${
              glow ? 'animate-pulse-glow border-violet-500/50 shadow-violet-500/10' : 'border-slate-700/50'
            } bg-gradient-to-b from-[#1A1A24] via-[#15151F] to-[#0D0D12]`}
            style={{
              transform: `rotateY(180deg) ${isReversed ? 'rotateZ(180deg)' : ''}`
            }}
          >
            {/* Inner Border Frame */}
            <div className="w-full h-full rounded-xl border border-slate-800/80 p-2 flex flex-col justify-between relative bg-black/40 backdrop-blur-xs">
              {/* Header: Number / Category & Astrology */}
              <div className="w-full flex justify-between items-center text-xs text-slate-400 font-sans">
                <span className="font-bold text-violet-400">
                  {tarotCard && tarotCard.arcana === 'major'
                    ? `№ ${tarotCard.number}`
                    : macCard
                    ? macCard.category
                    : '✦'}
                </span>
                {tarotCard?.astrology && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#15151F] border border-violet-500/20 text-violet-300">
                    {tarotCard.astrology}
                  </span>
                )}
                {macCard && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-950/60 border border-violet-500/30 text-violet-300">
                    МАК
                  </span>
                )}
              </div>

              {/* Artwork Graphic Container */}
              <div className="my-auto flex flex-col items-center justify-center p-2">
                <div
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center p-3 shadow-inner relative transition-transform group-hover:scale-105"
                  style={{
                    background: `radial-gradient(circle, ${accentColor}25 0%, #000000aa 85%)`,
                    border: `1px solid ${accentColor}55`
                  }}
                >
                  <div
                    className="w-10 h-10 sm:w-12 sm:h-12 drop-shadow-[0_0_12px_rgba(255,255,255,0.3)]"
                    style={{ color: accentColor }}
                  >
                    {ICON_MAP[iconName] || <Sparkles className="w-full h-full" />}
                  </div>
                </div>

                {/* Subtitle / Keyword preview */}
                {card && (
                  <div className="mt-2 text-center">
                    <p className="text-[11px] font-serif italic text-slate-300 line-clamp-1">
                      {tarotCard?.psychologicalArchetype || macCard?.metaphor}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer: Title */}
              <div className="text-center pt-1 border-t border-slate-800/80">
                <h4 className="font-medium text-xs sm:text-sm text-slate-100 tracking-tight line-clamp-1">
                  {cardTitle}
                </h4>
                {subTitle && (
                  <p className="text-[9px] text-slate-500 font-sans uppercase tracking-wider">
                    {isReversed ? '↺ Перевернутая' : subTitle}
                  </p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {showDetails && card && isFlipped && (
        <div className="mt-2 text-center max-w-[180px]">
          <span className="text-xs font-medium text-violet-300 line-clamp-1">
            {cardTitle} {isReversed ? '(Перевернутая)' : ''}
          </span>
        </div>
      )}
    </div>
  );
};
