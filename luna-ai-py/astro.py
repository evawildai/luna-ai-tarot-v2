"""Астрономия: Луна и натальные позиции.

Движок: pyswisseph, при отсутствии — pyephem (fallback по ТЗ).
ephem под Windows без компилятора — единственный вариант с готовыми wheel.
"""
import datetime as dt
from functools import lru_cache

try:
    import swisseph as swe  # type: ignore
    ENGINE = "swisseph"
except ImportError:
    import ephem  # type: ignore
    ENGINE = "ephem"

SIGNS = [
    "Овен", "Телец", "Близнецы", "Рак", "Лев", "Дева",
    "Весы", "Скорпион", "Стрелец", "Козерог", "Водолей", "Рыбы",
]
SIGN_SYMBOLS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"]


def _sign_of(lon: float) -> dict:
    idx = int(lon // 30) % 12
    deg_in = lon % 30
    return {
        "sign": SIGNS[idx],
        "symbol": SIGN_SYMBOLS[idx],
        "degree": round(deg_in, 1),
        "position": f"{int(deg_in)}° {SIGNS[idx]}",
    }


def _utc(d: dt.datetime) -> dt.datetime:
    if d.tzinfo is None:
        return d.replace(tzinfo=dt.timezone.utc)
    return d.astimezone(dt.timezone.utc)


# --- Луна ---

def moon_state(now: dt.datetime | None = None) -> dict:
    """Фаза, освещённость, лунный день, знак Луны. Сигнатура /api/moon не меняется."""
    now = _utc(now or dt.datetime.now(dt.timezone.utc))
    if ENGINE == "swisseph":
        return _moon_swisseph(now)
    return _moon_ephem(now)


def _moon_swisseph(now: dt.datetime) -> dict:
    jd = swe.julday(now.year, now.month, now.day, now.hour + now.minute / 60 + now.second / 3600)
    sun = swe.calc_ut(jd, swe.SUN)[0][0]
    moon = swe.calc_ut(jd, swe.MOON)[0][0]
    return _compose(now, sun_lon=sun, moon_lon=moon, phase=None)


def _moon_ephem(now: dt.datetime) -> dict:
    d = now
    sun, moon = ephem.Sun(), ephem.Moon()
    sun.compute(d)
    moon.compute(d)
    sun_lon = math_deg(ephem.Ecliptic(sun).lon)
    moon_lon = math_deg(ephem.Ecliptic(moon).lon)
    return _compose(now, sun_lon=sun_lon, moon_lon=moon_lon, phase=moon.phase)


def math_deg(rad: float) -> float:
    import math
    return math.degrees(rad) % 360.0


def _compose(now: dt.datetime, sun_lon: float, moon_lon: float, phase: float | None) -> dict:
    import math
    elong = (moon_lon - sun_lon) % 360.0
    if phase is None:
        illumination = round((1 - math.cos(math.radians(elong))) / 2 * 100)
    else:
        illumination = round(phase)
    # Титхи: лунный день = (луна - солнце) / 12°, 1-й день начинается в новолуние.
    tithi = elong / 12.0
    lunar_day = int(tithi) + 1
    idx = int(round((elong / 45.0) + 0.5)) % 8  # 0..7: новолуние, раст., 1ч, раст., полн., уб., 4ч, уб.
    names = ["Новолуние", "Растущая Луна", "Первая четверть", "Растущая Луна",
             "Полнолуние", "Убывающая Луна", "Последняя четверть", "Убывающая Луна"]
    emojis = ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"]
    age = elong / 360.0 * 29.530588853
    return {
        "phase": names[idx],
        "emoji": emojis[idx],
        "illumination": illumination,
        "age_days": round(age, 1),
        "lunar_day": lunar_day,
        "total": 30,
        "moon_sign": _sign_of(moon_lon),
    }


# --- Натал: Солнце, Луна, асцендент ---

def _sun_moon_signs(when_utc: dt.datetime) -> tuple[dict, dict]:
    if ENGINE == "swisseph":
        jd = swe.julday(when_utc.year, when_utc.month, when_utc.day,
                        when_utc.hour + when_utc.minute / 60)
        sun = _sign_of(swe.calc_ut(jd, swe.SUN)[0][0])
        moon = _sign_of(swe.calc_ut(jd, swe.MOON)[0][0])
    else:
        sun, moon = ephem.Sun(), ephem.Moon()
        sun.compute(when_utc)
        moon.compute(when_utc)
        sun = _sign_of(math_deg(ephem.Ecliptic(sun).lon))
        moon = _sign_of(math_deg(ephem.Ecliptic(moon).lon))
    return sun, moon


def _ascendant(when_utc: dt.datetime, lat: float, lon: float) -> dict | None:
    if ENGINE == "swisseph":
        jd = swe.julday(when_utc.year, when_utc.month, when_utc.day,
                        when_utc.hour + when_utc.minute / 60)
        return _sign_of(swe.houses(jd, lat, lon, b'P')[0][0])
    # ephem: RAMC -> асцендент по формуле восхождения.
    import math
    obs = ephem.Observer()
    obs.date = when_utc
    obs.lat, obs.lon = str(lat), str(lon)
    lst = float(obs.sidereal_time())  # радианы
    # Наклон эклиптики на дату: 23.4393° (J2000) минус ~0.0130°/век.
    years = when_utc.year + when_utc.timetuple().tm_yday / 365.25 - 2000
    eps = math.radians(23.4393 - 0.0130 * years / 100)
    ramc = lst
    #Asc = atan2(cos(RAMC), -(sin(eps)*tan(lat) + cos(eps)*sin(RAMC)))
    asc = math.degrees(math.atan2(
        math.cos(ramc),
        -(math.sin(eps) * math.tan(math.radians(lat)) + math.cos(eps) * math.sin(ramc)),
    )) % 360.0
    return _sign_of(asc)


def local_to_utc(date_str: str, time_str: str | None, tz_name: str | None) -> tuple[dt.datetime, bool]:
    """Локальное время рождения -> UTC (исторические правила через zoneinfo).

    Возвращает (utc_datetime, tz_known). Если tz неизвестен, время считается UTC.
    """
    y, m, d = (int(x) for x in date_str.split("-"))
    hh, mm = (int(x) for x in (time_str or "12:00").split(":")[:2])
    local = dt.datetime(y, m, d, hh, mm)
    if not tz_name or not time_str:
        # Без времени рождения полдень берётся лишь как точка отсчёта для Солнца/Луны.
        return local.replace(tzinfo=dt.timezone.utc), bool(tz_name)
    try:
        from zoneinfo import ZoneInfo
        tz = ZoneInfo(tz_name)
    except Exception:  # неизвестная зона на этой системе
        return local.replace(tzinfo=dt.timezone.utc), False
    return local.replace(tzinfo=tz).astimezone(dt.timezone.utc), True


@lru_cache(maxsize=None)
def natal_chart(date_str: str, time_str: str | None, lat: float | None, lon: float | None,
                tz_name: str | None = None) -> dict:
    """Большая тройка. time/lat/lon None -> асцендент None. tz_name — IANA-зона места рождения."""
    when, tz_known = local_to_utc(date_str, time_str, tz_name)
    sun, moon = _sun_moon_signs(when)
    asc = _ascendant(when, lat, lon) if (time_str and lat is not None and lon is not None) else None
    return {"sun": sun, "moon": moon, "ascendant": asc, "tz_known": tz_known}
