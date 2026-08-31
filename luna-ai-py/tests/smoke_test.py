"""Смоук-тест живого LUNA AI: онбординг -> карта -> расклад -> наталка.

Запуск: BASE_URL=https://домен venv/bin/python tests/smoke_test.py
Гостевой режим (без initData) — никаких токенов не нужно.
"""
import json
import os
import sys
import urllib.request

BASE = (os.environ.get("BASE_URL") or "http://127.0.0.1:8000").rstrip("/")


def call(method: str, path: str, body: dict | None = None) -> dict:
    req = urllib.request.Request(
        BASE + path,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Content-Type": "application/json"},
        method=method,
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def head(path: str) -> tuple[int, str]:
    """HTTP-код и Content-Type (без body) — для статики."""
    try:
        with urllib.request.urlopen(BASE + path, timeout=30) as resp:
            return resp.status, resp.headers.get("Content-Type", "")
    except urllib.error.HTTPError as e:
        return e.code, ""


def step(name: str, cond: bool, detail: str = "") -> None:
    print(("PASS " if cond else "FAIL ") + name + (f" — {detail[:200]}" if not cond else ""))
    if not cond:
        raise SystemExit(1)


def main() -> None:
    print(f"Базовый URL: {BASE}")

    # 1. Онбординг (гость: consent+дата сохраняются локально, но API должен принять)
    r = call("POST", "/api/onboarding", {"birth_date": "1993-03-21", "consent": True})
    step("онбординг", r.get("ok") is True)

    # 2. Карта дня
    r = call("POST", "/api/draw", {"deck": "tarot"})
    step("карта дня", bool(r.get("id")), str(r))

    # 3. Расклад
    spreads = call("GET", "/api/meta")["spreads"]
    spread = next(s for s in spreads if s["id"] == "three-cards-timeline")
    r = call("POST", "/api/reading", {"spread_id": spread["id"], "question": "smoke"})
    step("расклад: 3 карты", len(r.get("positions", [])) == spread["cardCount"])

    # 4. Наталка
    r = call("POST", "/api/natal", {"birth_date": "1993-03-21", "birth_time": "14:30", "city": "Москва"})
    step("наталка: Солнце/Луна", bool(r.get("sun") and r.get("moon")), str(r))

    # 5. Статика: css и js отдаются с 200 и правильным MIME
    # (классическая ошибка nginx: root вместо alias — /static двоится в путь).
    for path, mime in [("/static/css/luna.css", "text/css"),
                       ("/static/js/tg.js", "javascript")]:
        status, ctype = head(path)
        step(f"статика {path} -> 200 {mime}", status == 200 and mime in ctype,
             f"code={status} ctype={ctype!r}")

    print("SMOKE OK")


if __name__ == "__main__":
    main()
