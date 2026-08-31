"""SQLite: схема users/events + доступ к соединению."""
import os
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "luna.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    tg_id       TEXT UNIQUE,
    birth_date  TEXT,
    birth_time  TEXT,
    city        TEXT,
    tone        TEXT,
    consent     INTEGER NOT NULL DEFAULT 0,
    natal       TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS events (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    type    TEXT NOT NULL,
    payload TEXT,
    ts      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_events_user ON events(user_id);
"""


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    with get_conn() as conn:
        conn.executescript(SCHEMA)
        # Мягкая миграция для БД, созданных до появления новых колонок.
        cols = {r["name"] for r in conn.execute("PRAGMA table_info(users)")}
        if "natal" not in cols:
            conn.execute("ALTER TABLE users ADD COLUMN natal TEXT")


def log_event(user_id: int | None, type_: str, payload: str | None = None) -> None:
    max_events = int(os.environ.get("LOG_MAX_EVENTS", "5000"))  # 0 = без ротации
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO events (user_id, type, payload) VALUES (?, ?, ?)",
            (user_id, type_, payload),
        )
        if max_events > 0:
            # Ротация: держим не больше LOG_MAX_EVENTS свежих записей.
            conn.execute(
                "DELETE FROM events WHERE id NOT IN "
                "(SELECT id FROM events ORDER BY id DESC LIMIT ?)",
                (max_events,),
            )
