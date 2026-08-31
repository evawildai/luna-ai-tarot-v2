import React, { useState } from 'react';
import { Send, Bot, Sparkles, Check, ExternalLink, Key, RefreshCw, Smartphone, Copy } from 'lucide-react';
import { UserProfile } from '../types';

interface TelegramBotViewProps {
  userProfile: UserProfile;
}

interface BotChatMsg {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  keyboard?: string[];
  time: string;
}

export const TelegramBotView: React.FC<TelegramBotViewProps> = ({ userProfile }) => {
  const [token, setToken] = useState('');
  const [adminSecret, setAdminSecret] = useState('');
  const [tokenSaved, setTokenSaved] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [isSavingToken, setIsSavingToken] = useState(false);
  const [activeStatus, setActiveStatus] = useState<{ hasToken: boolean; tokenMasked: string | null; isPollingActive: boolean; lastBotError?: string }>({
    hasToken: false,
    tokenMasked: null,
    isPollingActive: false,
  });
  const [copied, setCopied] = useState(false);
  const [inputMsg, setInputMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [botMessages, setBotMessages] = useState<BotChatMsg[]>([
    {
      id: '1',
      sender: 'bot',
      text: `✨ Приветствую, ${userProfile.name}! Я твой персональный Telegram-бот **LUNA AI** — ИИ-Таролог и проводник по МАК-картам.\n\nЧем я могу помочь тебе сегодня?`,
      keyboard: ['🌅 Карта Дня', '🔮 Расклад Таро', '🧩 МАК-Самоанализ', '♈ Мой Аркан Судьбы', '📖 Дневник'],
      time: '12:00'
    }
  ]);

  // Fetch status on load
  React.useEffect(() => {
    fetch('/api/telegram/status')
      .then((res) => res.json())
      .then((data) => {
        if (data) setActiveStatus(data);
      })
      .catch(() => {});
  }, []);

  const handleSaveToken = async () => {
    if (!token.trim()) return;
    setIsSavingToken(true);
    setTokenError(null);
    setTokenSaved(false);

    try {
      const res = await fetch('/api/telegram/set-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': adminSecret },
        body: JSON.stringify({ token: token.trim() })
      });
      const data = await res.json();
      if (res.status === 403) {
        setTokenError(data.error || 'Доступ запрещен: неверный ключ администратора');
        return;
      }
      if (data.success) {
        setTokenSaved(true);
        setActiveStatus(prev => ({ ...prev, hasToken: true, isPollingActive: data.isPollingActive, lastBotError: undefined }));
        setTimeout(() => setTokenSaved(false), 4000);
      } else {
        setTokenError(data.error || 'Неверный токен бота (проверьте в @BotFather)');
      }
    } catch {
      setTokenError('Ошибка соединения с сервером');
    } finally {
      setIsSavingToken(false);
    }
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputMsg).trim();
    if (!text || loading) return;

    setInputMsg('');
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: BotChatMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      time: now
    };

    setBotMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const response = await fetch('/api/telegram/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          userProfile
        })
      });

      if (!response.ok) throw new Error('Failed');
      const data = await response.json();

      setBotMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: data.reply || '✨ Ваши карты настроены на волну трансформации.',
          keyboard: data.keyboard || ['🌅 Карта Дня', '🔮 Расклад Таро', '🧩 МАК-Самоанализ'],
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch {
      // Fallback bot simulation
      let reply = '✨ Карты показывают благоприятное время для внутренней тишины и осознания.';
      let keyboard = ['🌅 Карта Дня', '🔮 Расклад Таро', '🧩 МАК-Самоанализ'];

      if (text.includes('Карта Дня') || text === '/daily') {
        reply = `🌅 **Ваша Карта Дня: Звезда (XVII)**\n\n✨ *Свет надежды и вдохновения.*\nСегодня Вселенная напоминает о ваших истинных ценностях. Доверьтесь потоку событий.\n\n💎 *Аффирмация:* «Я следую за своим внутренним светом».`;
      } else if (text.includes('МАК') || text === '/mac') {
        reply = `🧩 **Метафорическая карта: «Ключ в замке»** (Категория: Ресурс)\n\nОбратите внимание на свои скрытые возможности. Ответ уже внутри вас. Что за дверь вы готовы открыть?`;
      } else if (text.includes('Аркан Судьбы') || text === '/destiny') {
        reply = `♈ **Ваш Аркан Судьбы: ${userProfile.destinyArcana?.name || 'Маг (I)'}**\n\nЭнергия созидания, сильной воли и реализации смелых замыслов через слово и мысль.`;
      }

      setBotMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: reply,
          keyboard,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText('https://t.me/BotFather');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 space-y-8 animate-in fade-in">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-[#0F0F16] border border-slate-800/60 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20">
              Telegram Интеграция
            </span>
            <span className="text-xs text-slate-500">Бот & Telegram WebApp</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-slate-100 mt-1">
            LUNA AI Telegram Бот <span className="font-light italic text-violet-400">& Симулятор</span>
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Онлайн Сервер Готов
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Telegram Setup Guide & Token Config */}
        <div className="lg:col-span-5 space-y-6">
          {/* Bot Setup Card */}
          <div className="p-6 rounded-2xl bg-[#0F0F16] border border-slate-800/60 shadow-xl space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800/60">
              <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-medium text-slate-100 text-sm">
                  Подключение вашего Telegram-бота
                </h3>
                <p className="text-[11px] text-slate-500">
                  Запуск через BotFather за 1 минуту
                </p>
              </div>
            </div>

            <ol className="space-y-3 text-xs text-slate-300">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#15151F] border border-slate-800 text-violet-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <span>
                  Откройте <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-violet-400 hover:underline">@BotFather</a> в Telegram и отправьте команду <code className="bg-[#1A1A24] px-1.5 py-0.5 rounded text-violet-300">/newbot</code>.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#15151F] border border-slate-800 text-violet-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <span>
                  Придумайте имя (например, <em>LunaTarot_bot</em>) и скопируйте выданный API Token.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#15151F] border border-slate-800 text-violet-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <span>
                  Вставьте токен в поле ниже для синхронизации webhook:
                </span>
              </li>
            </ol>

            {/* Token Input */}
            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  TELEGRAM_BOT_TOKEN
                </label>
                {activeStatus.hasToken && (
                  <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Подключен ({activeStatus.tokenMasked})
                  </span>
                )}
              </div>
              <div className="relative">
                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="123456789:ABCdefGhIJKlmNoPQRstuVWXyz..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#1A1A24] border border-slate-800 text-slate-200 placeholder-slate-600 text-xs focus:outline-none focus:border-violet-500/50"
                />
              </div>

              <div className="relative">
                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  value={adminSecret}
                  onChange={(e) => setAdminSecret(e.target.value)}
                  placeholder="Ключ администратора (ADMIN_SECRET, если задан на сервере)"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#1A1A24] border border-slate-800 text-slate-200 placeholder-slate-600 text-xs focus:outline-none focus:border-violet-500/50"
                />
              </div>

              {tokenError && (
                <p className="text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg">
                  ⚠️ {tokenError}
                </p>
              )}

              <button
                onClick={handleSaveToken}
                disabled={!token.trim() || isSavingToken}
                className="w-full py-2.5 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 hover:from-violet-500 disabled:opacity-40 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-all shadow-md shadow-violet-500/20"
              >
                {isSavingToken ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Проверка токена...
                  </>
                ) : tokenSaved ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    Токен сохранен и активен!
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Сохранить и подключить бота
                  </>
                )}
              </button>
            </div>
          </div>

          {/* WebApp Feature Banner */}
          <div className="p-5 rounded-2xl bg-[#0F0F16] border border-slate-800/60 space-y-3">
            <div className="flex items-center gap-2 text-violet-400 text-xs font-bold uppercase tracking-[0.2em]">
              <Smartphone className="w-4 h-4" />
              Telegram Mini App (TMA)
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Это веб-приложение оптимизировано для работы внутри Telegram как полноценный Mini App со свайпами, вибрацией haptic feedback и нативным оформлением.
            </p>
            <button
              onClick={handleCopyLink}
              className="px-3.5 py-2 rounded-xl bg-[#15151F] hover:bg-[#1A1A24] border border-slate-800/80 text-slate-300 text-xs font-medium flex items-center gap-2 transition-colors hover:border-violet-500/30 w-full justify-center"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-violet-400" />}
              {copied ? 'Ссылка скопирована' : 'Скопировать ссылку для WebApp кнопки'}
            </button>
          </div>
        </div>

        {/* Right Column: Telegram Phone Mockup Simulator */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="w-full max-w-md rounded-3xl bg-[#0B0B10] border-2 border-slate-800/80 shadow-2xl overflow-hidden flex flex-col h-[640px]">
            {/* Phone Header */}
            <div className="p-4 bg-[#0F0F16] border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shadow-md">
                  ✦
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
                    LUNA AI Таролог
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  </h4>
                  <p className="text-[10px] text-slate-500">bot • онлайн</p>
                </div>
              </div>

              <button
                onClick={() =>
                  setBotMessages([
                    {
                      id: '1',
                      sender: 'bot',
                      text: `✨ Перезапуск бота. Приветствую, ${userProfile.name}! Чем могу помочь?`,
                      keyboard: ['🌅 Карта Дня', '🔮 Расклад Таро', '🧩 МАК-Самоанализ'],
                      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    }
                  ])
                }
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-[#15151F]"
                title="Очистить чат"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[radial-gradient(#15151f_1px,transparent_1px)] [background-size:16px_16px]">
              {botMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.sender === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed whitespace-pre-line shadow-md ${
                      msg.sender === 'user'
                        ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-tr-none'
                        : 'bg-[#15151F] border border-slate-800/80 text-slate-200 rounded-tl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[9px] text-slate-600 mt-1 px-1">
                    {msg.time}
                  </span>

                  {/* Inline Keyboards */}
                  {msg.keyboard && msg.keyboard.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2 max-w-[90%]">
                      {msg.keyboard.map((btn, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSend(btn)}
                          className="px-3 py-1.5 rounded-xl bg-[#1A1A24] hover:bg-[#20202E] border border-slate-800 text-violet-300 text-[11px] font-medium transition-all hover:border-violet-500/40 shadow-sm"
                        >
                          {btn}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="p-3 rounded-2xl rounded-tl-none bg-[#15151F] border border-slate-800/80 text-slate-400 text-xs flex items-center gap-2 w-fit">
                  <div className="w-3.5 h-3.5 border-2 border-violet-400 border-t-transparent animate-spin rounded-full" />
                  <span>печатает...</span>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-[#0F0F16] border-t border-slate-800/80 flex items-center gap-2">
              <input
                type="text"
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Сообщение боту..."
                className="flex-1 px-4 py-2.5 rounded-full bg-[#1A1A24] border border-slate-800 text-slate-200 placeholder-slate-600 text-xs focus:outline-none focus:border-violet-500/50"
              />
              <button
                onClick={() => handleSend()}
                disabled={loading || !inputMsg.trim()}
                className="p-2.5 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 hover:from-violet-500 text-white disabled:opacity-40 transition-all shadow-md shadow-violet-500/20"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
