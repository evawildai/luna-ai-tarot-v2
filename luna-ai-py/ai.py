"""Загрузка .env (без внешних зависимостей) и AI-провайдеры с rate limit.

Цепочка провайдеров: GROQ (llama-3.3-70b-versatile, OpenAI-совместимый REST)
-> GEMINI -> None (callers используют локальные толкования, фолбэк).
Переход к следующему провайдеру: сетевая ошибка, 401, 429, таймаут,
неудачный парсинг ответа.
"""
import json
import os
import time
import urllib.request
from pathlib import Path
from threading import Lock

import prompts

BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / ".env"

# Rate limit как в старом проекте (server.ts): 10 запросов / 60 сек на пользователя.
RATE_LIMIT_MAX = int(os.environ.get("AI_RATE_LIMIT_MAX", "10"))
RATE_LIMIT_WINDOW = float(os.environ.get("AI_RATE_LIMIT_WINDOW", "60"))
_buckets: dict[str, list[float]] = {}
_lock = Lock()


def _load_env() -> None:
    if not ENV_PATH.exists():
        return
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


_load_env()
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.6-flash")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


def is_rate_limited(user_key: str) -> bool:
    now = time.time()
    with _lock:
        hits = [t for t in _buckets.get(user_key, []) if t > now - RATE_LIMIT_WINDOW]
        limited = len(hits) >= RATE_LIMIT_MAX
        if not limited:
            hits.append(now)
        _buckets[user_key] = hits
        if len(_buckets) > 5000:  # защита от роста словаря
            cutoff = now - RATE_LIMIT_WINDOW * 2
            for k in [k for k, v in _buckets.items() if not v or v[-1] < cutoff]:
                _buckets.pop(k, None)
    return limited


def _extract_text(data: dict) -> str | None:
    """Достаёт текст ответа из тела generateContent (учитывая finishReason и части)."""
    try:
        cand = data["candidates"][0]
        text = "".join(p.get("text", "") for p in cand["content"]["parts"])
        return text or None
    except (KeyError, IndexError, TypeError):
        return None


def parse_json_loose(text: str) -> dict | None:
    """Терпимый парсер ответов модели: ```json-заборы, мусор до/после, обрыв JSON.

    Обрыв (finishReason=MAX_TOKENS / сбой сети) чинится дозакрытием скобок/кавычек.
    Возвращает dict или None, если осмысленный JSON извлечь не удалось.
    """
    if not text:
        return None
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:]
        cleaned = cleaned.strip()
    try:
        result = json.loads(cleaned)
        return result if isinstance(result, dict) else None
    except json.JSONDecodeError:
        pass
    # Ремонт обрыва: срезаем хвост с конца и дозакрываем кавычки/скобки,
    # пока не получится валидный JSON (модель может оборвать ответ на середине строки).
    for cut in range(len(cleaned), max(len(cleaned) - 400, 0), -1):
        s = cleaned[:cut]
        stack, in_str, esc = [], False, False
        for ch in s:
            if in_str:
                if esc:
                    esc = False
                elif ch == "\\":
                    esc = True
                elif ch == '"':
                    in_str = False
                continue
            if ch == '"':
                in_str = True
            elif ch in "{[":
                stack.append(ch)
            elif ch in "}]":
                if stack:
                    stack.pop()
        if in_str:
            if esc:
                s = s[:-1]
            s += '"'
        t = s.rstrip().rstrip(",")
        if t.endswith(":"):
            continue
        t += "".join("}" if ch == "{" else "]" for ch in reversed(stack))
        try:
            result = json.loads(t)
        except json.JSONDecodeError:
            continue
        return result if isinstance(result, dict) else None
    return None


def _call_groq(prompt: str, system: str, temperature: float,
               json_response: bool) -> str | None:
    """OpenAI-совместимый REST Groq. Текст ответа или None (любая ошибка -> след. провайдер).

    429 (лимит Groq) ретраится с паузой до 3 попыток, прежде чем уйти к след. провайдеру.
    """
    body = {
        "model": GROQ_MODEL,
        "messages": [{"role": "system", "content": system},
                     {"role": "user", "content": prompt}],
        "temperature": temperature,
    }
    if json_response:
        body["response_format"] = {"type": "json_object"}
    headers = {"Content-Type": "application/json",
               "Authorization": f"Bearer {GROQ_API_KEY}",
               # Cloudflare у Groq режет дефолтный User-Agent urllib (error 1010).
               "User-Agent": "luna-ai/1.0"}
    for attempt in range(4):
        try:
            req = urllib.request.Request(GROQ_URL, data=json.dumps(body).encode(),
                                         headers=headers)
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            return data["choices"][0]["message"]["content"] or None
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < 3:
                time.sleep(float(e.headers.get("Retry-After") or (attempt + 1) * 4))
                continue
            return None
        except (urllib.error.URLError, KeyError, IndexError,
                TypeError, json.JSONDecodeError, TimeoutError, OSError):
            return None


def _call_gemini(prompt: str, system: str, temperature: float,
                 json_response: bool) -> str | None:
    """Вызов Gemini generateContent. Текст ответа или None (любая ошибка -> след. провайдер)."""
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": temperature},
        "systemInstruction": {"parts": [{"text": system}]},
    }
    if json_response:
        body["generationConfig"]["responseMimeType"] = "application/json"
    url = (f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"
           f"?key={GEMINI_API_KEY}")
    try:
        req = urllib.request.Request(url, data=json.dumps(body).encode(),
                                     headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, KeyError, IndexError,
            json.JSONDecodeError, TimeoutError, OSError):
        return None
    return _extract_text(data)


def _providers() -> list[tuple[str, object]]:
    """Доступные провайдеры по приоритету: GROQ -> GEMINI."""
    chain = []
    if GROQ_API_KEY:
        chain.append(("groq", _call_groq))
    if GEMINI_API_KEY:
        chain.append(("gemini", _call_gemini))
    return chain


def generate(prompt: str, system: str, temperature: float = 0.7,
             json_response: bool = True) -> dict | None:
    """Цепочка провайдеров GROQ -> GEMINI. Возвращает parsed JSON с полем
    ai_provider или None (нет ключей/все провайдеры упали) -> локальный фолбэк."""
    for provider, call in _providers():
        text = call(prompt, system, temperature, json_response)
        if not text:
            continue
        if not json_response:
            return {"text": text, "ai_provider": provider}
        result = parse_json_loose(text)
        if result:
            result["ai_provider"] = provider
            return result
    return None


def generate_text(prompt: str, system: str, temperature: float = 0.7) -> str | None:
    """Текстовый ответ цепочки провайдеров; None -> фолбэк на локальные толкования."""
    result = generate(prompt, system, temperature, json_response=False)
    return result["text"] if result else None
