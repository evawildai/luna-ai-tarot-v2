import pathlib

BASE = pathlib.Path("/opt/luna-ai-py")

# ---------- bot.py ----------
p = BASE / "bot.py"
s = p.read_text(encoding="utf-8")

# импорт InlineKeyboardMarkup/Button/WebAppInfo
old_imp = ("from aiogram.types import (Message, CallbackQuery, InlineKeyboardMarkup,\n"
           "                           InlineKeyboardButton)")
new_imp = ("from aiogram.types import (Message, CallbackQuery, InlineKeyboardMarkup,\n"
           "                           InlineKeyboardButton, WebAppInfo)")
assert old_imp in s
s = s.replace(old_imp, new_imp)

# хелперы кнопок + правки текстов
old_mac = '''def mac_session() -> str:
    """МАК-карта + первый вопрос — общий модуль (данные из data/mac.json)."""
    card = random.choice(d.mac())
    return (f"🪞 *МАК-Самоанализ*\\n\\n*{card['title']}* ({card['category']})\\n"
            f"_{card['metaphor']}_\\n\\n✦ {card['guidingQuestions'][0]}\\n\\n"
            f"💬 Полная сессия с отзеркаливанием — в Mini App ({WEBAPP_URL}mac).")'''
new_mac = '''def mac_session() -> str:
    """МАК-карта + первый вопрос — общий модуль (данные из data/mac.json)."""
    card = random.choice(d.mac())
    return (f"🪞 *МАК-Самоанализ*\\n\\n*{card['title']}* ({card['category']})\\n"
            f"_{card['metaphor']}_\\n\\n✦ {card['guidingQuestions'][0]}")


def kb_full_session(path: str) -> InlineKeyboardMarkup:
    """[💬 Полная сессия] -> web_app на страницу Mini App."""
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="💬 Полная сессия",
                             web_app=WebAppInfo(url=WEBAPP_URL.rstrip("/") + path)),
    ]])


def kb_open_app(path: str = "/") -> InlineKeyboardMarkup:
    """[☾ Открыть в Mini App] -> нужная страница."""
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="☾ Открыть в Mini App",
                             web_app=WebAppInfo(url=WEBAPP_URL.rstrip("/") + path)),
    ]])'''
assert old_mac in s, "mac_session not found"
s = s.replace(old_mac, new_mac)

# cmd_mac отправляет с кнопкой
old_cmd = '''async def cmd_mac(message: Message, bot: Bot):
    _event(message, "bot_mac")
    await message.answer(mac_session(), parse_mode="Markdown")'''
new_cmd = '''async def cmd_mac(message: Message, bot: Bot):
    _event(message, "bot_mac")
    await message.answer(mac_session(), parse_mode="Markdown", reply_markup=kb_full_session("/mac"))'''
assert old_cmd in s
s = s.replace(old_cmd, new_cmd)

# on_menu: ветка mac тоже с кнопкой
old_menu = '''    elif action == "mac":
        await message.answer(mac_session(), parse_mode="Markdown")'''
new_menu = '''    elif action == "mac":
        await message.answer(mac_session(), parse_mode="Markdown", reply_markup=kb_full_session("/mac"))'''
assert old_menu in s
s = s.replace(old_menu, new_menu)

# фолбэк: голый URL -> inline-кнопка
old_fb = '''    _event(message, "bot_free_fallback")
    await message.answer(
        "☾ Карты сейчас хранят молчание — но я всегда рядом. Задай вопрос позже или "
        f"открой полную сессию в Mini App: {WEBAPP_URL}")'''
new_fb = '''    _event(message, "bot_free_fallback")
    await message.answer(
        "☾ Карты сейчас хранят молчание — но я всегда рядом. Задай вопрос позже "
        "или открой полную сессию в Mini App.",
        reply_markup=kb_open_app("/"))'''
assert old_fb in s
s = s.replace(old_fb, new_fb)

p.write_text(s, encoding="utf-8")
print("bot.py patched")

# ---------- prompts: голых URL нет, проверяем ----------
import re
for f in (BASE / "prompts").glob("*.py"):
    t = f.read_text(encoding="utf-8")
    hits = re.findall(r"https?://\S+", t)
    print(f.name, "urls:", hits or "нет")
