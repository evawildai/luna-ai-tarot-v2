import React, { useState } from 'react';
import { X, Check, Copy, Share2, Send, Sparkles } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  text: string;
  cards?: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  title,
  text,
  cards,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const sharePayload = `✨ ${title}\n\n${cards ? `🔮 Карты: ${cards}\n\n` : ''}«${text}»\n\n— Получено в LUNA AI Таролог & МАК`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sharePayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleTelegramShare = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(sharePayload)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md rounded-2xl bg-[#0F0F16] border border-slate-800/80 p-6 shadow-2xl overflow-hidden space-y-4">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-28 h-28 bg-violet-600/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <h3 className="text-sm font-medium text-slate-100">Поделиться Инсайтом</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-[#15151F]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 rounded-xl bg-[#15151F] border border-slate-800/80 space-y-2">
          <h4 className="text-xs font-semibold text-violet-300">{title}</h4>
          {cards && <p className="text-[11px] text-slate-400">Карты: {cards}</p>}
          <p className="text-xs text-slate-200 font-serif italic line-clamp-4 leading-relaxed">
            «{text}»
          </p>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleCopy}
            className="flex-1 py-2.5 rounded-xl bg-[#15151F] hover:bg-[#1A1A24] text-slate-200 border border-slate-800 text-xs font-medium flex items-center justify-center gap-2 transition-all hover:border-violet-500/30"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-violet-400" />}
            {copied ? 'Скопировано!' : 'Скопировать текст'}
          </button>

          <button
            onClick={handleTelegramShare}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 hover:from-violet-500 text-white text-xs font-medium flex items-center justify-center gap-2 transition-all shadow-md shadow-violet-500/20"
          >
            <Send className="w-3.5 h-3.5" />
            В Telegram
          </button>
        </div>
      </div>
    </div>
  );
};
