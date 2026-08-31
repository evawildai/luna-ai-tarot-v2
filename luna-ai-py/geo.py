"""Геокодинг города: локальный JSON крупных городов + Nominatim с кэшем в SQLite.

Повторные запросы по одному городу внешних вызовов не делают — только кэш/локальный справочник.
"""
import json
import sqlite3
import urllib.parse
import urllib.request
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent / "data"
LOCAL_CITIES = json.loads((DATA_DIR / "cities.json").read_text(encoding="utf-8"))

GEOCACHE_SCHEMA = """
CREATE TABLE IF NOT EXISTS geocache (
    city  TEXT PRIMARY KEY,
    lat   REAL NOT NULL,
    lon   REAL NOT NULL,
    tz    TEXT,
    source TEXT NOT NULL,
    ts    TEXT NOT NULL DEFAULT (datetime('now'))
);
"""

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search?format=json&limit=1&q="
USER_AGENT = "LunaAI/0.2 (natal chart mini app)"  # Nominatim требует осмысленный User-Agent


def ensure_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(GEOCACHE_SCHEMA)
    cols = {r["name"] for r in conn.execute("PRAGMA table_info(geocache)")}
    if "tz" not in cols:
        conn.execute("ALTER TABLE geocache ADD COLUMN tz TEXT")


def geocode(city: str) -> dict | None:
    """{'name', 'lat', 'lon', 'source': 'local'|'cache'|'nominatim'} или None."""
    city = (city or "").strip().lower()
    if not city:
        return None
    if city in LOCAL_CITIES:
        return {**LOCAL_CITIES[city], "source": "local"}

    from db import get_conn

    with get_conn() as conn:
        ensure_schema(conn)
        row = conn.execute("SELECT city, lat, lon, tz FROM geocache WHERE city = ?", (city,)).fetchone()
        if row:
            return {"name": row["city"], "lat": row["lat"], "lon": row["lon"], "tz": row["tz"], "source": "cache"}

    # Внешний вызов — только при промахе по локальному справочнику и кэшу.
    result = _nominatim(city)
    if result:
        with get_conn() as conn:
            ensure_schema(conn)
            conn.execute(
                "INSERT OR REPLACE INTO geocache (city, lat, lon, tz, source) VALUES (?, ?, ?, ?, 'nominatim')",
                (city, result["lat"], result["lon"], result.get("tz")),
            )
    return result


def _nominatim(city: str) -> dict | None:
    try:
        url = NOMINATIM_URL + urllib.parse.quote(city)
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=8) as resp:
            items = json.loads(resp.read().decode("utf-8"))
        if not items:
            return None
        first = items[0]
        return {
            "name": first.get("display_name", city).split(",")[0],
            "lat": float(first["lat"]),
            "lon": float(first["lon"]),
            "tz": first.get("timezone"),  # Nominatim отдаёт IANA-зону, если она есть в данных OSM
            "source": "nominatim",
        }
    except (urllib.error.URLError, KeyError, ValueError, TimeoutError):
        return None
