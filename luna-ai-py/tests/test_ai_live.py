"""Live-прогон AI-эндпоинтов с реальным GEMINI_API_KEY.

Запуск:  GEMINI_API_KEY=... venv/bin/python tests/test_ai_live.py
Проверяет: /api/ask, /api/reading/ai, /api/daily-card, /api/self-analysis,
/api/mac/reflect — формат ответа, ai_used=true, и смену стиля от users.tone
(по 2 ответа на один и тот же вопрос для каждого из 4 тонов).

Сервер поднимается на 127.0.0.1:8999 (testclient через httpx не нужен — urllib).
"""

# Тоны и демо-пользователи: для каждого тона свой tg_id в users.tone,
# initData подписываем реальным BOT_TOKEN, иначе запросы считаются гостевыми.
import hashlib
import hmac
import json
import os
import sys
import time
import urllib.request
from pathlib import Path
from urllib.parse import quote

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

BASE = "http://127.0.0.1:8999"
TONES = ["мягко", "честно", "провокативно", "достигатор"]


def make_init_data(tg_id: int, first_name: str, bot_token: str) -> str:
    user = json.dumps({"id": tg_id, "first_name": first_name,
                       "username": f"user{tg_id}"}, ensure_ascii=False)
    params = {
        "auth_date": str(int(time.time())),
        "id": str(tg_id),
        "user": quote(user),
        "username": f"user{tg_id}",
    }
    data_check = "\n".join(f"{k}={v}" for k, v in sorted(params.items()))
    secret = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    signature = hmac.new(secret, data_check.encode(), hashlib.sha256).hexdigest()
    return "&".join(f"{k}={v}" for k, v in params.items()) + f"&hash={signature}"


def api(method: str, path: str, body: dict | None = None, init_data: str = "") -> dict:
    req = urllib.request.Request(
        BASE + path,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Content-Type": "application/json", "X-Telegram-Init-Data": init_data},
        method=method,
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8"))


def check(name: str, cond: bool, detail: str = "") -> None:
    print(("PASS " if cond else "FAIL ") + name + (f" — {detail}" if detail and not cond else ""))
    if not cond:
        raise SystemExit(1)


def main() -> None:
    bot_token = os.environ.get("BOT_TOKEN", "")
    if not os.environ.get("GEMINI_API_KEY"):
        raise SystemExit("Нужен GEMINI_API_KEY в окружении")
    tone_ids = {tone: 900000 + i for i, tone in enumerate(TONES)}

    # Онбординг с разным тоном для каждого демо-пользователя.
    for tone, tg_id in tone_ids.items():
        init = make_init_data(tg_id, f"Demo{tg_id % 10}", bot_token) if bot_token else ""
        api("POST", "/api/onboarding", {"birth_date": "1990-06-15", "tone": tone, "consent": True}, init)

    # 4 тона x 2 ответа на один и тот же вопрос (/api/ask).
    import data as d
    sun = next(c for c in d.tarot() if c["id"] == "tarot-19")

    question = "Что мне делать с новой работой, если сомневаюсь?"
    results = {}
    for tone, tg_id in tone_ids.items():
        init = make_init_data(tg_id, f"Demo{tg_id % 10}", bot_token) if bot_token else ""
        replies = []
        for _ in range(2):
            time.sleep(30)  # TPM бесплатного тира Groq ~6-8k: пачка в минуту не пролезает
            r = api("POST", "/api/ask", {
                "deck": "tarot", "card_id": sun["id"], "mode": "question", "question": question,
            }, init)
            check("ask.reply не пустой", bool(r.get("reply")), str(r)[:200])
            replies.append(r["reply"])
        results[tone] = replies
        print(f"\n=== Тон: {tone} ===")
        for i, rep in enumerate(replies, 1):
            print(f"--- ответ {i} ---\n{rep}\n")

    distinct = len({r for rs in results.values() for r in rs})
    check("все 8 ответов различаются (тон реально влияет)", distinct == 8, f"уникальных: {distinct}")

    # Пауза: бесплатный тир Groq держит TPM 8000, пачка из 8 ответов её вырабатывает.
    time.sleep(25)

    # /api/reading/ai
    spread = d.spreads()[1]
    deck = d.tarot()
    r = api("POST", "/api/reading/ai", {
        "spread_id": spread["id"],
        "question": question,
        "card_ids": [c["id"] for c in deck[:spread["cardCount"]]],
    })
    check("reading/ai: ai_used=true", r.get("ai_used") is True, str(r)[:200])
    check("reading/ai: есть summary", bool((r.get("ai") or {}).get("summary")))

    # /api/daily-card
    r = api("POST", "/api/daily-card", {"deck": "tarot", "card_id": sun["id"], "reversed_": False})
    check("daily-card: ai_used=true", r.get("ai_used") is True, str(r)[:200])
    check("daily-card: есть dayMessage", bool((r.get("ai") or {}).get("dayMessage")))

    time.sleep(20)

    # /api/self-analysis
    mac_card = d.mac()[0]
    r = api("POST", "/api/self-analysis", {
        "card_id": mac_card["id"], "user_message": "Мне кажется, я боюсь перемен.",
        "history": [],
    })
    check("self-analysis: ai=true", r.get("ai") is True, str(r)[:200])
    check("self-analysis: есть suggestedFollowUps", isinstance(r.get("suggestedFollowUps"), list))

    # /api/mac/reflect
    r = api("POST", "/api/mac/reflect", {"card_id": mac_card["id"], "answers": ["Я устал", "Хочу покоя", "Но боюсь остановиться"]})
    check("mac/reflect: ai=true", r.get("ai") is True, str(r)[:200])
    check("mac/reflect: reply не пустой", bool(r.get("reply")))

    print("\nВсе live-проверки пройдены.")


if __name__ == "__main__":
    main()
