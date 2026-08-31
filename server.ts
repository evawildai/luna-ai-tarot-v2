import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { TAROT_DECK } from "./src/data/tarotCards";
import { MAC_DECK } from "./src/data/macCards";
import { calculateAstrologyAndDestiny } from "./src/utils/astrology";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Telegram live bot status
let activeTelegramBotToken = process.env.TELEGRAM_BOT_TOKEN || "";
let isPollingActive = false;
let pollingAbortController: AbortController | null = null;
let lastBotError = "";

// --- Security helpers ---

// In-memory rate limiter: max N requests per windowMs per IP (no external deps)
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;
const rateLimitBuckets = new Map<string, number[]>();

function isRateLimited(req: any): boolean {
  const ip = req.ip || req.socket?.remoteAddress || "unknown";
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const hits = (rateLimitBuckets.get(ip) || []).filter((t) => t > windowStart);
  if (hits.length >= RATE_LIMIT_MAX) {
    rateLimitBuckets.set(ip, hits);
    return true;
  }
  hits.push(now);
  rateLimitBuckets.set(ip, hits);
  // Periodic cleanup of stale buckets
  if (rateLimitBuckets.size > 1000) {
    for (const [key, times] of rateLimitBuckets) {
      if (!times.some((t) => t > windowStart)) rateLimitBuckets.delete(key);
    }
  }
  return false;
}

// Attach limiter to all AI-backed endpoints
app.use(["/api/tarot", "/api/mac", "/api/telegram/simulate", "/api/bot"], (req, res, next) => {
  if (isRateLimited(req)) {
    return res.status(429).json({
      error: "Слишком много запросов. Картам нужна пауза — попробуйте через минуту. 🌙",
    });
  }
  next();
});

// set-token endpoint guard: ADMIN_SECRET required in production, localhost-only fallback
function isAdminRequest(req: any): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (secret) {
    return req.headers["x-admin-secret"] === secret;
  }
  // No secret configured: allow only local connections
  const ip = req.socket?.remoteAddress || "";
  return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
}

function isLocalRequest(req: any): boolean {
  const ip = req.socket?.remoteAddress || "";
  return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
}

// System prompt for the AI Tarologist & Psycho-Analyst
const TAROLOGIST_SYSTEM_PROMPT = `
Вы — опытный, чуткий и глубокий ИИ-Таролог и сертифицированный психотерапевт юнгианского направления / коуч по метафорическим ассоциативным картам (МАК).

Ваш стиль:
1. Уважительный, теплый, мистически притягательный, но при этом психологически зрелый и терапевтичный (без дешёвого фатализма, запугивания или «страшных порчей»).
2. Карты Таро и МАК вы рассматриваете как зеркало подсознания, ключ к архетипам (по К.Г. Юнгу) и инструмент глубокого самопознания и трансформации.
3. Всегда учитывайте данные пользователя: Имя, Дату Рождения (Знак Зодиака, Стихию и Аркан Судьбы) и его конкретный жизненный вопрос.
4. Давайте четкие, структурированные ответы: суть каждой карты в ее позиции, психологический инсайт, глубинный разбор ситуации, практический совет (coaching action step) и вдохновляющую аффирмацию.
5. Пишите на красивом, грамотном и выразительном русском языке с аккуратным форматированием.
`;

// 1. Reading Endpoint
app.post("/api/tarot/reading", async (req, res) => {
  try {
    const { deckType, spreadTitle, question, userProfile, drawnCards } = req.body;

    if (!drawnCards || !Array.isArray(drawnCards) || drawnCards.length === 0) {
      return res.status(400).json({ error: "No drawn cards provided" });
    }

    const cardsDescription = drawnCards
      .map((dc: any, idx: number) => {
        const orientation = dc.isReversed ? "Перевернутая" : "Прямая";
        return `Позиция ${idx + 1} [${dc.positionTitle}]: Карта "${dc.card.nameRu || dc.card.title}" (${orientation}). Архетип/Категория: ${dc.card.psychologicalArchetype || dc.card.category}. Ключевые слова: ${(dc.card.keywords || [dc.card.metaphor]).join(", ")}.`;
      })
      .join("\n");

    const userContext = userProfile
      ? `Имя: ${userProfile.name || "Искатель"}, Дата рождения: ${userProfile.birthDate || "Не указана"}, Знак зодиака: ${userProfile.zodiacSign || "Гармония"}, Аркан Судьбы: ${userProfile.destinyArcana?.name || "Не рассчитан"}.`
      : "Имя: Искатель";

    const prompt = `
Сделайте подробный, вдохновляющий и психологически точный расклад:
Тип колоды: ${deckType === "tarot" ? "Таро" : "Метафорические карты (МАК)"}
Название расклада: "${spreadTitle}"
Вопрос пользователя: "${question || "Общий анализ текущей энергии и ситуации"}"
Контекст вопрошающего: ${userContext}

Выпавшие карты:
${cardsDescription}

Верните ответ строго в формате JSON со следующей структурой:
{
  "summary": "Краткое поэтичное и точное резюме расклада (2-3 предложения)",
  "cardAnalyses": [
    {
      "cardName": "Название карты",
      "positionTitle": "Название позиции",
      "meaning": "Трактовка карты в контексте вопроса и позиции",
      "psychologicalInsight": "Глубинный психологический срез и подсказка подсознания"
    }
  ],
  "deepPsychoanalysis": "Развернутый синтез всех карт: как они взаимодействуют между собой, какая глубинная динамика разворачивается, какие скрытые мотивы или блоки проявляются (2-3 параграфа).",
  "practicalAdvice": [
    "Конкретный практический совет 1",
    "Конкретный практический совет 2",
    "Конкретный практический совет 3"
  ],
  "coachingActionStep": "Один конкретный, легко выполнимый шаг или вопрос для саморефлексии на сегодня",
  "affirmation": "Глубокая исцеляющая аффирмация-якорь"
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        systemInstruction: TAROLOGIST_SYSTEM_PROMPT,
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    });

    const responseText = response.text || "{}";
    const parsedData = JSON.parse(responseText);

    res.json({
      success: true,
      data: parsedData,
    });
  } catch (error: any) {
    console.error("Tarot reading error:", error);
    res.status(500).json({
      error: "Не удалось получить расклад от ИИ-таролога",
      details: error.message,
    });
  }
});

// 2. Daily Card Endpoint
app.post("/api/tarot/daily-card", async (req, res) => {
  try {
    const { deckType, card, isReversed, userProfile } = req.body;

    const userContext = userProfile
      ? `Имя: ${userProfile.name || "Искатель"}, Знак: ${userProfile.zodiacSign || "Вселенная"}`
      : "Имя: Искатель";

    const prompt = `
Дайте вдохновляющую и глубокую трактовку Карты Дня:
Тип карты: ${deckType === "tarot" ? "Таро" : "Метафорическая Ассоциативная Карта (МАК)"}
Карта: "${card.nameRu || card.title}" (${isReversed ? "Перевернутое положение" : "Прямое положение"})
Архетип / Категория: ${card.psychologicalArchetype || card.category}
Символизм / Метафора: ${card.symbolism || card.metaphor}
Контекст пользователя: ${userContext}

Верните ответ строго в JSON:
{
  "dayMessage": "Главное послание дня (2-3 выразительных предложения)",
  "energyOfTheDay": "Описание преобладающей энергии (свет, предостережение, ресурсы)",
  "coachingQuestion": "Психологический вопрос для самоанализа в течение дня",
  "opportunity": "Шанс или подарок дня",
  "warning": "Предостережение от импульсивных ловушек",
  "affirmation": "Сильная утренняя аффирмация"
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        systemInstruction: TAROLOGIST_SYSTEM_PROMPT,
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error("Daily card error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 2.1 Ask the card a free-form question / explain its meaning
app.post("/api/tarot/ask", async (req, res) => {
  try {
    const { deckType, card, isReversed, question, mode, userProfile, chat } = req.body;

    if (!card) {
      return res.status(400).json({ error: "No card provided" });
    }

    const cardName = 'nameRu' in card ? card.nameRu : card.title;
    const cardMeta =
      deckType === "tarot"
        ? `Карта Таро "${cardName}" (${isReversed ? "перевернутая" : "прямая"}). Ключевые слова: ${(card.keywords || []).join(", ")}.`
        : `МАК-карта "${card.title}" (Категория: ${card.category}). Метафора: ${card.metaphor}. Описание: ${card.description}`;

    const historyText = (chat || [])
      .map((m: any) => `${m.sender === "user" ? "Пользователь" : "Луна"}: ${m.text}`)
      .join("\n");

    const intent =
      mode === "explain"
        ? `Пользователь просит объяснить значение карты простыми, живыми словами — без терминов, как мудрая подруга-таролог объяснила бы другу. Коротко (3-5 предложений), тепло и по делу.`
        : `Пользователь задаёт карте личный вопрос: "${question || "..."}". Ответь на него через призму symbolism этой карты: мягко, глубоко, с опорой на интуицию пользователя. 4-6 предложений. Заверши одним коротким вопросом для размышления.`;

    const prompt = `
Контекст: пользователь вытянул карту в приложении LUNA AI.
${cardMeta}
Пользователь: ${userProfile?.name || "Искатель"}${userProfile?.zodiacSign ? `, знак ${userProfile.zodiacSign}` : ""}.

${historyText ? `Предыдущий разговор об этой карте:\n${historyText}\n` : ""}
Задача: ${intent}

Верни JSON: { "reply": "текст ответа" }
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: TAROLOGIST_SYSTEM_PROMPT,
        responseMimeType: "application/json",
        temperature: 0.8,
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json({ success: true, reply: parsed.reply || "Карты хранят молчание — попробуйте спросить иначе." });
  } catch (error: any) {
    console.error("Ask card error:", error);
    res.status(500).json({ error: error.message, reply: "🌙 Связь с картами на секунду прервалась. Попробуйте ещё раз." });
  }
});

// 3. Metaphorical Card Self-Analysis Interactive Session
app.post("/api/tarot/self-analysis", async (req, res) => {
  try {
    const { history, userMessage, card, theme, userProfile } = req.body;

    const prompt = `
Вы ведете диалог самоанализа по метафорической карте.
Тема запроса: "${theme || "Самопознание и внутренние ресурсы"}"
Карта в фокусе: "${card?.title || "Метафорическая карта"}" (Категория: ${card?.category || "Ресурс"}, Метафора: ${card?.metaphor || ""}, Описание: ${card?.description || ""})
Пользователь: ${userProfile?.name || "Искатель"}

Предыдущая беседа:
${(history || []).map((m: any) => `${m.sender === "user" ? "Клиент" : "Психолог"}: ${m.text}`).join("\n")}

Новый ответ/мысль клиента: "${userMessage}"

Дайте глубокий, бережный и профессиональный ответ:
1. Отразите чувства и ассоциации клиента (эмпатическое отзеркаливание).
2. Свяжите его слова с символикой карты и его внутренними скрытыми ресурсами.
3. Задайте 1-2 развивающих трансформационных вопроса, помогающих клиенту увидеть выход или новый угол зрения.
4. Предложите 2-3 коротких варианта фокуса для следующего шага.

Верните JSON:
{
  "replyText": "Текст ответа психолога-коуча",
  "suggestedFollowUps": ["Вариант вопроса/мысли 1", "Вариант вопроса/мысли 2", "Вариант 3"]
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "Вы — чуткий психолог-консультант, специалист по арт-терапии и МАК. Ваш тон — принимающий, безоценочный, поддерживающий.",
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error("Self analysis error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 3.1 MAC Reflect endpoint (for MacSelfAnalysisView)
app.post("/api/mac/reflect", async (req, res) => {
  try {
    const { card, userReflection, conversationHistory, userProfile } = req.body;

    const historyFormatted = (conversationHistory || [])
      .map((m: any) => `${m.sender === "user" ? "Пользователь" : "ИИ-Коуч"}: ${m.text}`)
      .join("\n");

    const prompt = `
Вы — опытный коуч и психолог по Метафорическим Ассоциативным Картам (МАК).
Пользователь: ${userProfile?.name || "Искатель"} (Знак Зодиака: ${userProfile?.zodiacSign || "Гармония"})
Выбранная МАК-карта: "${card?.title || "Метафорическая карта"}" (${card?.category || "Ресурс"})
Метафора: "${card?.metaphor || ""}"
Психологический фокус: "${card?.psychologicalFocus || ""}"

История диалога:
${historyFormatted}

Пользователь написал рефлексию:
"${userReflection}"

Дайте глубокий, теплый, терапевтичный ответ в 2-3 коротких абзаца:
1. Примите и отзеркальте его эмоцию/мысль без оценки и критики.
2. Соедините это с метафорой карты «${card?.title}» и поиском внутреннего ресурса.
3. Задайте один глубокий открытый коучинговый вопрос для дальнейшего осознания.

Верните JSON:
{
  "reply": "Текст вашего психологического ответа"
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "Вы — бережный, профессиональный психологический коуч по метафорическим ассоциативным картам.",
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json({ success: true, reply: parsed.reply || "Прислушайтесь к своим внутренним ощущениям. Какой ресурс сейчас готов раскрыться?" });
  } catch (error: any) {
    console.error("MAC reflect error:", error);
    res.status(500).json({
      error: error.message,
      reply: "То, что вы чувствуете — ценно. Какой первый бережный шаг к себе вы хотите сделать прямо сейчас?"
    });
  }
});

// 4. Telegram Bot Live Simulation / WebApp endpoint
app.post(["/api/bot/simulate-message", "/api/telegram/simulate"], async (req, res) => {
  try {
    const { message, userProfile } = req.body;

    const prompt = `
Пользователь написал Telegram-боту "LUNA AI Таролог & МАК-Проводник":
Сообщение пользователя: "${message}"
Профиль пользователя: ${userProfile ? `Имя: ${userProfile.name}, ДР: ${userProfile.birthDate}, Знак: ${userProfile.zodiacSign}, Аркан: ${userProfile.destinyArcana?.name}` : "Новый пользователь"}

Сгенерируйте ответ бота в стиле Telegram:
- Если это команда (/start, /help, /card, /tarot, /mac, /destiny) или нажатие кнопок меню — ответьте приветственно и содержательно с разметкой Markdown.
- Если это личный вопрос (про любовь, работу, выбор, тревогу) — дайте мудрый, поддерживающий ответ с элементами таро-мудрости.
- Используйте эстетичные эмодзи и читаемые абзацы.

Верните JSON:
{
  "reply": "Текст ответа бота в красивой Markdown разметке Telegram",
  "keyboard": ["🌅 Карта Дня", "🔮 Расклад Таро", "🧩 МАК-Самоанализ", "♈ Аркан Судьбы", "📖 Дневник"]
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "Вы — официальный Telegram-бот LUNA AI Таролог. Ваш тон чарующий, вежливый, дружелюбный и помогающий.",
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json({ success: true, reply: parsed.reply, keyboard: parsed.keyboard });
  } catch (error: any) {
    console.error("Bot simulation error:", error);
    res.status(500).json({
      error: error.message,
      reply: "✨ Карты напоминают: в моменты неопределенности обратитесь к своей внутренней мудрости.",
      keyboard: ["🌅 Карта Дня", "🔮 Расклад Таро", "🧩 МАК-Самоанализ"]
    });
  }
});

// 5. Telegram Real Bot Token Management & Status
app.get("/api/telegram/status", (req, res) => {
  res.json({
    hasToken: Boolean(activeTelegramBotToken),
    tokenMasked: activeTelegramBotToken
      ? `${activeTelegramBotToken.substring(0, 5)}...${activeTelegramBotToken.substring(activeTelegramBotToken.length - 4)}`
      : null,
    isPollingActive,
    lastBotError,
  });
});

app.post("/api/telegram/set-token", async (req, res) => {
  if (!isAdminRequest(req)) {
    return res.status(403).json({
      error: process.env.ADMIN_SECRET
        ? "Доступ запрещен: требуется ключ администратора"
        : "Доступ запрещен: управление токеном бота доступно только с сервера (или задайте ADMIN_SECRET в .env)",
    });
  }
  const { token } = req.body;
  const cleanToken = token ? token.trim() : "";
  lastBotError = "";

  if (cleanToken) {
    const verified = await verifyAndStartTelegramBot(cleanToken);
    if (verified) {
      activeTelegramBotToken = cleanToken;
    }
  } else {
    activeTelegramBotToken = "";
    stopTelegramPolling();
  }

  res.json({
    success: !lastBotError,
    hasToken: Boolean(activeTelegramBotToken),
    isPollingActive,
    error: lastBotError || undefined,
  });
});

// Helper to verify bot token first before polling
async function verifyAndStartTelegramBot(token: string): Promise<boolean> {
  stopTelegramPolling();
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = (await res.json()) as any;
    if (!data.ok) {
      lastBotError = data.description || "Неверный токен Telegram бота";
      console.warn("Telegram bot token verification failed:", data.description || "404 Not Found");
      return false;
    }
    console.log(`Telegram Bot verified successfully: @${data.result?.username}`);
    startTelegramPolling(token);
    return true;
  } catch (err: any) {
    lastBotError = `Ошибка подключения к Telegram API: ${err.message}`;
    console.warn("Telegram bot verify error:", err.message);
    return false;
  }
}

// Helper for Real Telegram Bot polling if token provided
async function startTelegramPolling(token: string) {
  if (isPollingActive) {
    stopTelegramPolling();
  }

  isPollingActive = true;
  pollingAbortController = new AbortController();

  console.log("Starting Telegram Bot long-polling...");

  (async () => {
    let offset = 0;
    while (isPollingActive) {
      try {
        const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=20`;
        const res = await fetch(url, { signal: pollingAbortController?.signal });
        const data = (await res.json()) as any;

        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            offset = update.update_id + 1;
            if (update.message && update.message.text) {
              await handleRealTelegramMessage(token, update.message);
            }
          }
        } else if (!data.ok) {
          lastBotError = data.description || "Telegram API error";
          console.warn("Telegram polling stopped:", lastBotError);
          break;
        }
      } catch (err: any) {
        if (err.name === "AbortError") break;
        console.warn("Telegram polling notice:", err.message);
        lastBotError = err.message;
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
    isPollingActive = false;
  })();
}

function stopTelegramPolling() {
  if (pollingAbortController) {
    pollingAbortController.abort();
    pollingAbortController = null;
  }
  isPollingActive = false;
}

// In-memory birth dates per chat (for /destiny)
const chatBirthDates = new Map<number, string>();

const BOT_MENU_KEYBOARD = {
  keyboard: [
    [{ text: "🌅 Карта Дня" }, { text: "🔮 Расклад Таро" }],
    [{ text: "🧩 МАК-Самоанализ" }, { text: "♈ Аркан Судьбы" }],
    [{ text: "ℹ️ Помощь" }],
  ],
  resize_keyboard: true,
};

const BOT_BUTTON_COMMANDS: Record<string, string> = {
  "🌅 Карта Дня": "/card",
  "🔮 Расклад Таро": "/tarot",
  "🧩 МАК-Самоанализ": "/mac",
  "♈ Аркан Судьбы": "/destiny",
  "ℹ️ Помощь": "/help",
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Legacy Telegram Markdown has no escaping — strip markup-breaking chars from dynamic text
function escapeMarkdown(text: string): string {
  return text.replace(/[*_`\[]/g, " ");
}

function formatTarotCard(name: string, keywords: string[], meaning: string, isReversed: boolean, question: string): string {
  return `🎴 *${name}* — _${isReversed ? "перевернутая" : "прямая"}_\n\n🔑 Ключевые слова: ${keywords.join(", ")}\n\n💡 ${meaning}\n\n_Сфокусируйся на вопросе: «${question}» — и прислушайся к своим ощущениям от карты._`;
}

function formatMacCard(card: any): string {
  const question = pickRandom(card.guidingQuestions || []);
  return `🧩 *${card.title}* (${card.category})\n\n🗺 Метафора: ${card.metaphor}\n\n📖 ${card.description}\n\n❓ Вопрос для самоанализа: _${question}_\n\n✨ Аффирмация: «${card.affirmation}»`;
}

async function handleRealTelegramMessage(token: string, message: any) {
  const chatId = message.chat.id;
  const text = (message.text || "").trim();
  const firstName = message.from?.first_name || "Искатель";

  // Map reply-keyboard button labels to commands
  const command = BOT_BUTTON_COMMANDS[text] || text.split(" ")[0].toLowerCase();

  try {
    let replyText = "";

    switch (command) {
      case "/start":
        replyText = `✨ *Приветствую тебя, ${escapeMarkdown(firstName)}!* 🔮\n\nЯ твой персональный *ИИ-Таролог и проводник по Метафорическим картам (МАК)*.\n\n🌟 *Что я умею:*\n• 🎴 Расклады на любовь, карьеру, развилки выбора\n• 🌅 Ежедневная Карта Дня с глубокой трактовкой\n• 🧩 Метафорические ассоциативные карты для самоанализа\n• ♈ Расчет Аркана Судьбы по дате рождения\n• 💬 Ответы на любые личные волнующие вопросы\n\n_Напиши свой вопрос или используй кнопки меню ниже для полного погружения!_`;
        break;

      case "/help":
        replyText = `📖 *Команды бота:*\n\n• /start — знакомство\n• /card — 🌅 Карта Дня\n• /tarot — 🔮 Расклад из трёх карт\n• /mac — 🧩 Метафорическая карта (МАК)\n• /destiny 01.01.1990 — ♈ Аркан Судьбы по дате рождения\n\n_А ещё можешь просто написать мне свой вопрос — я отвечу как таролог._`;
        break;

      case "/card": {
        const card = pickRandom(TAROT_DECK);
        const isReversed = Math.random() < 0.35;
        replyText = `🌅 *Карта Дня*\n\n${formatTarotCard(card.nameRu, card.keywords, isReversed ? card.meaningReversed : card.meaningUpright, isReversed, "что несет мне этот день")}\n\n❓ Вопрос дня: _${card.coachingQuestion}_`;
        break;
      }

      case "/tarot": {
        const positions = ["Прошлое", "Настоящее", "Будущее"];
        const used = new Set<number>();
        const lines = positions.map((pos) => {
          let idx = Math.floor(Math.random() * TAROT_DECK.length);
          while (used.has(idx)) idx = Math.floor(Math.random() * TAROT_DECK.length);
          used.add(idx);
          const card = TAROT_DECK[idx];
          const isReversed = Math.random() < 0.35;
          return `*${pos}:* ${card.nameRu} ${isReversed ? "(перев.)" : "(прям.)"}\n💡 ${isReversed ? card.meaningReversed : card.meaningUpright}`;
        });
        replyText = `🔮 *Расклад «Три Времени»*\n\n${lines.join("\n\n")}\n\n✨ Прислушайся: как связаны эти три карты в твоей истории?`;
        break;
      }

      case "/mac": {
        const card = pickRandom(MAC_DECK);
        replyText = `🧩 *МАК-Самоанализ*\n\n${formatMacCard(card)}`;
        break;
      }

      case "/destiny": {
        const parts = text.split(/\s+/).slice(1).join("");
        const savedDate = parts || chatBirthDates.get(chatId);
        if (!savedDate) {
          replyText = `♈ *Аркан Судьбы*\n\nОтправь мне дату рождения в формате:\n/destiny 01.01.1990\n\nИ я рассчитаю твой личный Аркан Судьбы по нумерологии Таро.`;
          break;
        }
        const iso = savedDate.split(".").reverse().join("-");
        const astro = calculateAstrologyAndDestiny(iso);
        if (!astro) {
          chatBirthDates.delete(chatId);
          replyText = `⚠️ Не удалось разобрать дату «${escapeMarkdown(savedDate)}». Попробуй формат: /destiny 01.01.1990`;
          break;
        }
        chatBirthDates.set(chatId, savedDate);
        const arcana = astro.destinyArcana;
        replyText = `♈ *Твой Аркан Судьбы*\n\n🎴 *${escapeMarkdown(arcana.name)}* (Аркан ${arcana.number})\n\n💬 ${escapeMarkdown(arcana.description)}\n\n🔑 Ключевые энергии: ${arcana.keywords.map(escapeMarkdown).join(", ")}\n\n${astro.zodiacSymbol} Знак зодиака: ${escapeMarkdown(astro.zodiacSign)} (${escapeMarkdown(astro.element)}, ${escapeMarkdown(astro.rulingPlanet)})`;
        break;
      }

      default: {
        // Free-form question -> AI tarologist (only here are tokens spent)
        const aiRes = await ai.models.generateContent({
          model: "gemini-3.7-flash",
          contents: `Пользователь в Telegram (${firstName}) написал: "${text}". Дай вдохновляющий ответ Таролога с эмодзи и мудростью карт на русском языке.`,
          config: {
            systemInstruction: TAROLOGIST_SYSTEM_PROMPT,
          },
        });
        replyText = aiRes.text || "Карты хранят молчание... Сформулируйте вопрос с открытым сердцем.";
        break;
      }
    }

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: replyText,
        parse_mode: "Markdown",
        reply_markup: BOT_MENU_KEYBOARD,
      }),
    });
  } catch (err) {
    console.error("Error replying to Telegram user:", err);
  }
}

// Auto-start polling if token is in environment
if (activeTelegramBotToken) {
  verifyAndStartTelegramBot(activeTelegramBotToken);
}

// Vite middleware setup
// Production mode: either NODE_ENV=production or running from bundled dist
const isProduction = process.env.NODE_ENV === "production" || process.env["npm_lifecycle_event"] === "start";

async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Только localhost: наружу сервер доступен через nginx (80/443).
  // Прямой доступ извне к порту открывает бэкенд в обход SSL и лимитов.
  app.listen(PORT, "127.0.0.1", () => {
    console.log(`AI Tarot & MAC Server running on http://localhost:${PORT}`);
  });
}

startServer();
