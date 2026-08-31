"""Загрузка JSON-данных колод и раскладов; лунный календарь и камень дня (локально, без внешних API)."""
import datetime as dt
import json
import math
from functools import lru_cache
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent / "data"


@lru_cache(maxsize=None)
def load(name: str) -> list:
    return json.loads((DATA_DIR / f"{name}.json").read_text(encoding="utf-8"))


def tarot() -> list:
    return load("tarot")


def mac() -> list:
    return load("mac")


def spreads() -> list:
    return load("spreads")


# --- Луна: фаза и лунный день по простому алгоритму (синодический месяц) ---

SYNODIC_MONTH = 29.530588853
# Известное новолуние: 2000-01-06 18:14 UTC
KNOWN_NEW_MOON = dt.datetime(2000, 1, 6, 18, 14, tzinfo=dt.timezone.utc)

PHASES = [
    ("Новолуние", "🌑"),
    ("Растущая Луна", "🌒"),
    ("Первая четверть", "🌓"),
    ("Растущая Луна", "🌔"),
    ("Полнолуние", "🌕"),
    ("Убывающая Луна", "🌖"),
    ("Последняя четверть", "🌗"),
    ("Убывающая Луна", "🌘"),
]


def moon_phase(now: dt.datetime | None = None) -> dict:
    """Возвращает {'phase': название, 'emoji': символ, 'illumination': %, 'age_days': float}."""
    now = now or dt.datetime.now(dt.timezone.utc)
    age = (now - KNOWN_NEW_MOON).total_seconds() / 86400 % SYNODIC_MONTH
    frac = age / SYNODIC_MONTH
    illumination = round((1 - math.cos(2 * math.pi * frac)) / 2 * 100)
    idx = int(round(frac * 8)) % 8
    name, emoji = PHASES[idx]
    return {"phase": name, "emoji": emoji, "illumination": illumination, "age_days": round(age, 1)}


def lunar_day(now: dt.datetime | None = None) -> dict:
    """Лунный день: отсчёт с новолуния, 1-й день начинается в момент новолуния."""
    now = now or dt.datetime.now(dt.timezone.utc)
    age = (now - KNOWN_NEW_MOON).total_seconds() / 86400
    day = int(age % SYNODIC_MONTH) + 1
    return {"lunar_day": day, "total": 30}


# --- Камень дня: статичная таблица по знакам зодиака ---

BIRTHSTONES = [
    {"sign": "Овен", "symbol": "♈", "from": (3, 21), "to": (4, 19), "stone": "Алмаз", "meaning": "Ясность намерения и смелость начала."},
    {"sign": "Телец", "symbol": "♉", "from": (4, 20), "to": (5, 20), "stone": "Изумруд", "meaning": "Стабильность, изобилие и забота о себе."},
    {"sign": "Близнецы", "symbol": "♊", "from": (5, 21), "to": (6, 20), "stone": "Агат", "meaning": "Ясность мысли и лёгкость в общении."},
    {"sign": "Рак", "symbol": "♋", "from": (6, 21), "to": (7, 22), "stone": "Лунный камень", "meaning": "Связь с интуицией и мягкость к своим чувствам."},
    {"sign": "Лев", "symbol": "♌", "from": (7, 23), "to": (8, 22), "stone": "Янтарь", "meaning": "Тепло, витальность и уверенное сияние."},
    {"sign": "Дева", "symbol": "♍", "from": (8, 23), "to": (9, 22), "stone": "Сапфир", "meaning": "Точность, порядок и здоровая дисциплина."},
    {"sign": "Весы", "symbol": "♎", "from": (9, 23), "to": (10, 22), "stone": "Опал", "meaning": "Гармония, красота и равновесие в отношениях."},
    {"sign": "Скорпион", "symbol": "♏", "from": (10, 23), "to": (11, 21), "stone": "Топаз", "meaning": "Глубина, трансформация и внутренняя сила."},
    {"sign": "Стрелец", "symbol": "♐", "from": (11, 22), "to": (12, 21), "stone": "Бирюза", "meaning": "Оптимизм, дальний путь и вера в лучшее."},
    {"sign": "Козерог", "symbol": "♑", "from": (12, 22), "to": (1, 19), "stone": "Гранат", "meaning": "Выдержка, цель и надёжная опора."},
    {"sign": "Водолей", "symbol": "♒", "from": (1, 20), "to": (2, 18), "stone": "Аметист", "meaning": "Свежий взгляд, вдохновение и свобода мысли."},
    {"sign": "Рыбы", "symbol": "♓", "from": (2, 19), "to": (3, 20), "stone": "Аквамарин", "meaning": "Чувствительность, поток и доверие течению."},
]

SIGN_EMOJI = {b["sign"]: b["symbol"] for b in BIRTHSTONES}


def stone_by_sign(sign: str) -> dict | None:
    """Камень по названию знака зодиака (из статичной таблицы BIRTHSTONES)."""
    for b in BIRTHSTONES:
        if b["sign"] == sign:
            return {k: b[k] for k in ("sign", "symbol", "stone", "meaning")}
    return None


def zodiac_sign(date_str: str) -> str | None:
    """Знак зодиака по дате рождения 'YYYY-MM-DD'."""
    try:
        d = dt.date.fromisoformat(date_str)
    except (TypeError, ValueError):
        return None
    md = (d.month, d.day)
    for b in BIRTHSTONES:
        f, t = b["from"], b["to"]
        if (md >= f and md <= t) or (f > t and (md >= f or md <= t)):
            return b["sign"]
    return None


def birthstone_for(date_str: str | None, now: dt.datetime | None = None) -> dict:
    """Камень дня: по знаку пользователя, иначе — камень по солнечному знаку текущего дня."""
    now = now or dt.datetime.now()
    md = (now.month, now.day)
    sign = zodiac_sign(date_str) if date_str else None
    if sign is None:
        for b in BIRTHSTONES:
            f, t = b["from"], b["to"]
            if (md >= f and md <= t) or (f > t and (md >= f or md <= t)):
                return {k: b[k] for k in ("sign", "symbol", "stone", "meaning")}
    for b in BIRTHSTONES:
        if b["sign"] == sign:
            return {k: b[k] for k in ("sign", "symbol", "stone", "meaning")}
    return {}
