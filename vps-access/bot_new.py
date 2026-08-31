"""Telegram-бот LUNA AI (aiogram 3).

Автономный режим: /start с инлайн-меню, /card, /tarot, /mac, /destiny, /help —
всё из локальных данных (без AI-ключа). Свободный текст — AI-цепочка
(Groq -> Gemini) с rate limit и вежливым фолбэком. События пишутся в events
(воронка общая с Mini App). Единственная «дверь» в Mini App — постоянная
menu-кнопка у поля ввода (setChatMenuButton); инлайн-кнопок с web_app нет.

Запуск: BOT_TOKEN=... python bot.py  (или webhook-режим через main.py)
"""
import asyncio
import logging
import os
import random
import re

import data as d
import astro
import geo
import prompts
from aiogram import Bot, Dispatcher, F
from aiogram.filters import Command
from aiogram.types import (Message, CallbackQuery, InlineKeyboardMarkup,
                           InlineKeyboardButton)
from db import get_conn, log_event

logging.basicConfig(level=logging.INFO)

BOT_TOKEN = os.environ.get("BOT_TOKEN", "")
WEBAPP_URL = os.environ.get("WEBAPP_URL", "https://example.com/")  # базовый URL Mini App

# Пользователи, у которых запрошена дата рождения для /destiny (tg_id -> True)
_awaiting_birth: set[str] = set()

_DATE_RE = re.compile(r"(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})")


def _ensure_user(tg_id: str) -> int | None:
    """Создаёт пользователя при необходимости и возвращает его внутренний id."""
    with get_conn() as conn:
        conn.execute("INSERT OR IGNORE INTO users (tg_id) VALUES (?)", (tg_id,))
        row = conn.execute("SELECT id FROM users WHERE tg_id = ?", (tg_id,)).fetchone()
    return row["id"] if row else None


def _event(message: Message | CallbackQuery, type_: str, payload: str | None = None) -> None:
    """Событие бота в общую с аппом воронку (events)."""
    user = getattr(message, "from_user", None)
    if not user:
        return
    user_id = _ensure_user(str(user.id))
    try:
        log_event(user_id, type_, payload)
    except Exception:  # события не должны ломать ответы бота
        logging.exception("log_event failed")


def start_menu() -> InlineKeyboardMarkup:
    """Инлайн-меню /start: только локальные команды, без web_app."""
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🌅 Карта дня", callback_data="menu:card"),
         InlineKeyboardButton(text="🔮 Расклад", callback_data="menu:tarot")],
        [InlineKeyboardButton(text="🧩 МАК", callback_data="menu:mac"),
         InlineKeyboardButton(text="♈ Наталка", callback_data="menu:natal")],
        [InlineKeyboardButton(text="❓ Помощь", callback_data="menu:help")],
    ])


async def cmd_start(message: Message, bot: Bot):
    _event(message, "bot_start")
    await message.answer(prompts.bot_start(message.from_user.first_name or "Искатель"),
                         reply_markup=start_menu())


async def cmd_help(message: Message, bot: Bot):
    _event(message, "bot_help")
    await message.answer(prompts.BOT_HELP)


def format_card(card: dict, deck: str) -> str:
    name = card.get("title") or card.get("nameRu", "")
    lines = [f"🌙 Карта дня: {name}"]
    keywords = card.get("keywords")
    if keywords:
        lines.append("▪ " + " · ".join(keywords))
    meaning = card.get("metaphor") or card.get("meaningUpright", "")
    lines.append(f"\n{meaning}")
    question = card.get("coachingQuestion") or (card.get("guidingQuestions") or [None])[0]
    if question:
        lines.append(f"\n❓ {question}")
    affirmation = card.get("affirmation")
    if affirmation:
        lines.append(f"\n💫 {affirmation}")
    return "\n".join(lines)


async def send_card(message: Message):
    deck = d.tarot()
    card = random.choice(deck)
    await message.answer(format_card(card, "tarot"))


async def cmd_card(message: Message, bot: Bot):
    _event(message, "bot_card")
    await send_card(message)


def destiny_arcana(date_str: str) -> tuple[int, list[str]]:
    """Нумерология Аркана Судьбы: сумма всех цифр даты, редукция до 1..22 (референс старого проекта)."""
    n = sum(int(c) for c in date_str if c.isdigit())
    while n > 22:
        n = sum(int(c) for c in str(n))
    majors = [c for c in d.tarot() if c.get("arcana") == "major"]
    card = next((c for c in majors if c.get("number") == n), None)
    return n, card.get("keywords", []) if card else ["Мудрость", "Предназначение"]


def format_destiny(tg_id: str) -> str:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT birth_date, birth_time, city FROM users WHERE tg_id = ?", (tg_id,)
        ).fetchone()
    if not row or not row["birth_date"]:
        return None
    place = geo.geocode(row["city"] or "") if row["birth_time"] else None
    chart = astro.natal_chart(row["birth_date"], row["birth_time"],
                              place["lat"] if place else None, place["lon"] if place else None)
    lines = ["✨ Ваша Большая тройка",
             f"☉ Солнце: {chart['sun']['position']}",
             f"☽ Луна: {chart['moon']['position']}"]
    if chart["ascendant"]:
        lines.append(f"↑ Асцендент: {chart['ascendant']['position']}")
    else:
        lines.append("↑ Асцендент: зависит от времени рождения — укажите его в Mini App для точности")
    n, keywords = destiny_arcana(row["birth_date"])
    lines += ["", f"🔮 Бонус — Аркан Судьбы №{n}: " + " · ".join(keywords)]
    return "\n".join(lines)


async def send_destiny(message: Message):
    text = format_destiny(str(message.from_user.id))
    if text is None:
        _awaiting_birth.add(str(message.from_user.id))
        await message.answer(
            "🌙 Чтобы рассчитать вашу Большую тройку, напишите дату рождения "
            "в формате ДД.ММ.ГГГГ (например, 21.03.1990) — я сохраню её в профиль.")
        return
    await message.answer(text)


async def cmd_destiny(message: Message, bot: Bot):
    _event(message, "bot_destiny")
    await send_destiny(message)


def _parse_birth_date(text: str) -> str | None:
    """ДД.ММ.ГГГГ -> ISO YYYY-MM-DD; None если не похоже на дату."""
    m = _DATE_RE.fullmatch(text.strip())
    if not m:
        return None
    day, month, year = int(m.group(1)), int(m.group(2)), int(m.group(3))
    try:
        import datetime
        datetime.date(year, month, day)
    except ValueError:
        return None
    return f"{year:04d}-{month:02d}-{day:02d}"


async def on_birth_date(message: Message):
    """Пользователь ввёл дату после запроса /destiny: сохраняем в профиль и считаем."""
    tg_id = str(message.from_user.id)
    iso = _parse_birth_date(message.text or "")
    if iso is None:
        await message.answer(
            "🌙 Не похоже на дату. Напишите её в формате ДД.ММ.ГГГГ, например 21.03.1990, "
            "или отмените и откройте Mini App кнопкой меню у поля ввода.")
        return
    _awaiting_birth.discard(tg_id)
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO users (tg_id, birth_date) VALUES (?, ?) "
            "ON CONFLICT(tg_id) DO UPDATE SET birth_date = excluded.birth_date",
            (tg_id, iso))
    _event(message, "bot_destiny_date_saved", iso)
    await send_destiny(message)


def format_tarot_card(name: str, keywords: list, meaning: str, is_reversed: bool, question: str) -> str:
    return (f"🎴 *{name}* {'(перев.)' if is_reversed else '(прям.)'}\n"
            f"▪ {', '.join(keywords)}\n💡 {meaning}\n❓ _{question}_")


def three_times_reading() -> str:
    """«Три Времени» из spreads.json — общий модуль с Mini App."""
    spread = next((s for s in d.spreads() if s["id"] == "three-cards-timeline"), None)
    deck = d.tarot()
    cards = random.sample(deck, k=3)
    lines = []
    for pos, card in zip(spread["positions"], cards):
        is_reversed = random.random() < 0.35
        meaning = card["meaningReversed"] if is_reversed else card["meaningUpright"]
        lines.append(f"*{pos['title']}:* {card['nameRu']} {'(перев.)' if is_reversed else '(прям.)'}\n💡 {meaning}")
    return f"🔮 *{spread['title']}*\n\n" + "\n\n".join(lines) + "\n\n✨ Прислушайся: как связаны эти три карты в твоей истории?"


def mac_session() -> str:
    """МАК-карта + первый вопрос — общий модуль (данные из data/mac.json)."""
    card = random.choice(d.mac())
    return (f"🧩 *МАК-Самоанализ*\n\n*{card['title']}* ({card['category']})\n"
            f"_{card['metaphor']}_\n\n❓ {card['guidingQuestions'][0]}\n\n"
            f"💬 Полная сессия с отзеркаливанием — в Mini App ({WEBAPP_URL}mac).")


async def cmd_tarot(message: Message, bot: Bot):
    _event(message, "bot_tarot")
    await message.answer(three_times_reading(), parse_mode="Markdown")


async def cmd_mac(message: Message, bot: Bot):
    _event(message, "bot_mac")
    await message.answer(mac_session(), parse_mode="Markdown")


async def on_fallback(message: Message):
    """Свободный вопрос -> AI-цепочка (Groq -> Gemini) с rate limit; фолбэк — вежливый + ссылка на апп."""
    import ai
    import prompts.tones as tones

    _event(message, "bot_free", (message.text or "")[:100])
    if ai.is_rate_limited(f"tg:{message.from_user.id}"):
        _event(message, "bot_rate_limited")
        await message.answer(prompts.RATE_LIMIT_MESSAGE)
        return
    with get_conn() as conn:
        row = conn.execute("SELECT tone FROM users WHERE tg_id = ?", (str(message.from_user.id),)).fetchone()
    system = tones.build_system(prompts.SYSTEM_BOT, row["tone"] if row else None)
    reply = ai.generate_text(
        prompts.bot_free_question(message.from_user.first_name or "Искатель", message.text),
        system,
    )
    if reply:
        _event(message, "bot_free_ai_ok")
        await message.answer(reply)
        return
    _event(message, "bot_free_fallback")
    await message.answer(
        "🌙 Карты сейчас хранят молчание — но я всегда рядом. Задай вопрос позже или "
        f"открой полную сессию в Mini App: {WEBAPP_URL}")


async def on_menu(callback: CallbackQuery, bot: Bot):
    """Инлайн-меню /start: диспатчим на те же команды, что и слэш-команды."""
    action = (callback.data or "").removeprefix("menu:")
    message = callback.message
    events = {"card": "bot_card", "tarot": "bot_tarot", "mac": "bot_mac",
              "natal": "bot_destiny", "help": "bot_help"}
    await callback.answer()
    if action not in events or message is None:
        return
    _event(callback, events[action])
    if action == "card":
        await send_card(message)
    elif action == "tarot":
        await message.answer(three_times_reading(), parse_mode="Markdown")
    elif action == "mac":
        await message.answer(mac_session(), parse_mode="Markdown")
    elif action == "natal":
        await send_destiny(message)
    elif action == "help":
        await message.answer(prompts.BOT_HELP)


def register_handlers(dp: Dispatcher) -> Dispatcher:
    """Регистрация хендлеров — общий модуль для polling и webhook (main.py)."""
    dp.message.register(cmd_start, Command("start"))
    dp.message.register(cmd_help, Command("help"))
    dp.message.register(cmd_card, Command("card"))
    dp.message.register(cmd_tarot, Command("tarot"))
    dp.message.register(cmd_mac, Command("mac"))
    dp.message.register(cmd_destiny, Command("destiny"))
    # Ожидание даты рождения — до общего текстового фолбэка
    dp.message.register(on_birth_date,
                        F.text & (lambda m: str(m.from_user.id) in _awaiting_birth))
    dp.callback_query.register(on_menu, F.data.startswith("menu:"))
    dp.message.register(on_fallback, F.text)
    return dp


async def main() -> None:
    if not BOT_TOKEN:
        # Dry-run: без токена бот не стартует, но импорт и конфигурация проверены.
        raise SystemExit(
            "BOT_TOKEN не задан. Dry-run конфигурации пройден: модуль загружается без ошибок. "
            "Для реального запуска: BOT_TOKEN=... python bot.py"
        )
    bot = Bot(token=BOT_TOKEN)
    dp = register_handlers(Dispatcher())

    webhook_url = os.environ.get("WEBHOOK_URL", "")  # напр. https://домен/telegram/webhook
    if webhook_url:
        # Webhook-режим (VPS): апдейты принимает FastAPI-роут main.py,
        # этот процесс только выставляет webhook и завершается.
        secret = os.environ.get("WEBHOOK_SECRET", "")
        if not secret:
            raise SystemExit("WEBHOOK_MODE: задайте WEBHOOK_SECRET (X-Telegram-Secret-Token)")
        await bot.set_webhook(
            webhook_url,
            secret_token=secret,
            allowed_updates=["message", "callback_query"],
            drop_pending_updates=True,
        )
        print(f"Webhook установлен: {webhook_url}")
        await bot.session.close()
        return
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
