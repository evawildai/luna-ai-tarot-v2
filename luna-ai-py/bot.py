"""Telegram-бот LUNA AI (aiogram 3): /start с кнопкой Mini App, /card — карта дня текстом.

Запуск: BOT_TOKEN=... python bot.py
"""
import asyncio
import logging
import os
import random

import data as d
import astro
import geo
import prompts
from aiogram import Bot, Dispatcher, F
from aiogram.filters import Command
from aiogram.types import Message, ReplyKeyboardMarkup, KeyboardButton, WebAppInfo
from db import get_conn

logging.basicConfig(level=logging.INFO)

BOT_TOKEN = os.environ.get("BOT_TOKEN", "")
WEBAPP_URL = os.environ.get("WEBAPP_URL", "https://example.com/")  # базовый URL Mini App


def main_menu(webapp_url: str) -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text="🌙 Открыть LUNA AI", web_app=WebAppInfo(url=webapp_url))]],
        resize_keyboard=True,
    )


async def cmd_start(message: Message, bot: Bot):
    await message.answer(
        prompts.bot_start(message.from_user.first_name or "Искатель"),
        reply_markup=main_menu(WEBAPP_URL),
    )


async def cmd_help(message: Message, bot: Bot):
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


async def cmd_card(message: Message, bot: Bot):
    deck = d.tarot()
    card = random.choice(deck)
    await message.answer(format_card(card, "tarot"))


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
        return ("🌙 Чтобы я рассчитал вашу Большую тройку, откройте Mini App и заполните "
                "дату рождения (кнопка «Открыть LUNA AI»), либо укажите её в профиле.")
    place = geo.geocode(row["city"] or "") if row["birth_time"] else None
    chart = astro.natal_chart(row["birth_date"], row["birth_time"],
                              place["lat"] if place else None, place["lon"] if place else None)
    lines = ["✨ Ваша Большая тройка",
             f"☉ Солнце: {chart['sun']['position']}",
             f"☽ Луна: {chart['moon']['position']}"]
    if chart["ascendant"]:
        lines.append(f"↑ Асцендент: {chart['ascendant']['position']}")
    else:
        lines.append("↑ Асцендент: зависит от времени рождения — укажите приблизительное в Mini App")
    n, keywords = destiny_arcana(row["birth_date"])
    lines += ["", f"🔮 Бонус — Аркан Судьбы №{n}: " + " · ".join(keywords)]
    return "\n".join(lines)


def format_tarot_card(name: str, keywords: list, meaning: str, is_reversed: bool, question: str) -> str:
    return (f"🎴 *{name}* {'(перев.)' if is_reversed else '(прям.)'}\n"
            f"▪ {', '.join(keywords)}\n💡 {meaning}\n❓ _{question}_")


def three_times_reading() -> str:
    """«Три Времени» из spreads.json — общий модуль с Mini App."""
    import random

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
    import random

    card = random.choice(d.mac())
    return (f"🧩 *МАК-Самоанализ*\n\n*{card['title']}* ({card['category']})\n"
            f"_{card['metaphor']}_\n\n❓ {card['guidingQuestions'][0]}\n\n"
            f"💬 Полная сессия с отзеркаливанием — в Mini App ({WEBAPP_URL}mac).")


async def cmd_tarot(message: Message, bot: Bot):
    await message.answer(three_times_reading(), parse_mode="Markdown")


async def cmd_mac(message: Message, bot: Bot):
    await message.answer(mac_session(), parse_mode="Markdown")


async def cmd_destiny(message: Message, bot: Bot):
    await message.answer(format_destiny(str(message.from_user.id)))


async def on_fallback(message: Message):
    """Свободный вопрос -> Gemini (если есть ключ), иначе статичная подсказка."""
    import ai
    import prompts.tones as tones

    with get_conn() as conn:
        row = conn.execute("SELECT tone FROM users WHERE tg_id = ?", (str(message.from_user.id),)).fetchone()
    system = tones.build_system(prompts.SYSTEM_BOT, row["tone"] if row else None)
    reply = ai.generate_text(
        prompts.bot_free_question(message.from_user.first_name or "Искатель", message.text),
        system,
    )
    await message.answer(reply or "🌙 Карты советуют начать с /start или вытянуть карту через /card.")


def register_handlers(dp: Dispatcher) -> Dispatcher:
    """Регистрация хендлеров — общий модуль для polling и webhook (main.py)."""
    dp.message.register(cmd_start, Command("start"))
    dp.message.register(cmd_help, Command("help"))
    dp.message.register(cmd_card, Command("card"))
    dp.message.register(cmd_tarot, Command("tarot"))
    dp.message.register(cmd_mac, Command("mac"))
    dp.message.register(cmd_destiny, Command("destiny"))
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
            allowed_updates=["message"],
            drop_pending_updates=True,
        )
        print(f"Webhook установлен: {webhook_url}")
        await bot.session.close()
        return
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
