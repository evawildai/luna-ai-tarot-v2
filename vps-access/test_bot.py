"""Smoke-тест хендлеров bot.py без сети: фейковый Message пишет ответы в список."""
import asyncio, json, sys
sys.path.insert(0, "/opt/luna-ai-py")
import os
for line in open("/opt/luna-ai-py/.env", encoding="utf-8"):
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"'))

import bot


class FakeUser:
    def __init__(self, uid=777001, first_name="Тестер"):
        self.id = uid
        self.first_name = first_name


class FakeMessage:
    def __init__(self, uid=777001, first_name="Тестер", text=""):
        self.from_user = FakeUser(uid, first_name)
        self.text = text
        self.replies = []

    async def answer(self, text, **kw):
        self.replies.append({"text": text, **kw})
        return self


class FakeCallback:
    def __init__(self, data, uid=777001, first_name="Тестер"):
        from types import SimpleNamespace
        self.data = data
        self.from_user = FakeUser(uid, first_name)
        self.message = FakeMessage(uid, first_name)
        self.answered = False

    async def answer(self):
        self.answered = True


async def main():
    out = {}
    m = FakeMessage()
    await bot.cmd_start(m, None)
    kb = m.replies[0].get("reply_markup")
    out["start_text"] = m.replies[0]["text"]
    out["start_buttons"] = [[b.text for b in row] for row in kb.inline_keyboard]
    out["start_has_webapp"] = any(
        getattr(b, "web_app", None) for row in kb.inline_keyboard for b in row)

    m = FakeMessage()
    await bot.cmd_card(m, None)
    out["card"] = m.replies[0]["text"][:300]

    m = FakeMessage()
    await bot.cmd_tarot(m, None)
    out["tarot"] = m.replies[0]["text"][:200]

    m = FakeMessage()
    await bot.cmd_mac(m, None)
    out["mac"] = m.replies[0]["text"][:200]

    m = FakeMessage()
    await bot.cmd_destiny(m, None)
    out["destiny_ask"] = m.replies[0]["text"]
    out["awaiting"] = str(m.from_user.id) in bot._awaiting_birth

    m = FakeMessage(text="01.01.1990")
    await bot.on_birth_date(m)
    out["destiny_after_date"] = [r["text"] for r in m.replies]
    out["awaiting_cleared"] = str(m.from_user.id) not in bot._awaiting_birth

    m = FakeMessage(text="hello")
    await bot.on_birth_date(m) if str(m.from_user.id) in bot._awaiting_birth else None
    # возврат в awaiting + неверный формат
    bot._awaiting_birth.add("777001")
    m = FakeMessage(text="не дата")
    await bot.on_birth_date(m)
    out["bad_date_reply"] = m.replies[0]["text"][:120]
    bot._awaiting_birth.discard("777001")

    # фолбэк: без AI-ответа (эмулируем отсутствие ключей)
    import ai
    orig = ai.generate_text
    ai.generate_text = lambda *a, **k: None
    m = FakeMessage(text="Что меня ждёт?")
    await bot.on_fallback(m)
    out["fallback"] = m.replies[0]["text"]
    ai.generate_text = orig

    # rate limit: забиваем бакет
    for _ in range(12):
        ai.is_rate_limited("tg:999")
    m = FakeMessage(uid=999, text="ещё вопрос")
    await bot.on_fallback(m)
    out["rate_limited"] = m.replies[0]["text"]

    m = FakeMessage()
    await bot.cmd_help(m, None)
    out["help"] = m.replies[0]["text"]

    print(json.dumps(out, ensure_ascii=False, indent=1))


asyncio.run(main())
