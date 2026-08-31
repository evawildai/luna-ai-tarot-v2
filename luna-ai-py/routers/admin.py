"""Админ-статистика: GET /api/admin/stats?days=7 под заголовком x-admin-secret.

Директорский дашборд: новые пользователи, счётчики событий, воронка, топ тонов.
"""
import datetime as dt
import json
import os

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from db import get_conn

router = APIRouter(prefix="/api")

ADMIN_SECRET = os.environ.get("ADMIN_SECRET", "")

FUNNEL = ["onboarding_done", "card_drawn", "spread_done", "mac_done", "natal_viewed"]


class StatsResponse(BaseModel):
    days: int
    new_users: int
    event_counts: dict[str, int]
    funnel: dict[str, int]
    top_tones: list


def require_admin(x_admin_secret: str | None) -> None:
    if not ADMIN_SECRET:
        raise HTTPException(503, "ADMIN_SECRET не настроен на сервере")
    if not x_admin_secret or x_admin_secret != ADMIN_SECRET:
        raise HTTPException(401, "Неверный x-admin-secret")


@router.get("/admin/stats")
def stats(days: int = 7, x_admin_secret: str | None = Header(default=None)):
    require_admin(x_admin_secret)
    days = max(1, min(days, 365))
    since = (dt.datetime.utcnow() - dt.timedelta(days=days)).strftime("%Y-%m-%d %H:%M:%S")

    with get_conn() as conn:
        new_users = conn.execute(
            "SELECT COUNT(*) AS n FROM users WHERE created_at >= ?", (since,)
        ).fetchone()["n"]

        event_counts = {
            r["type"]: r["n"]
            for r in conn.execute(
                "SELECT type, COUNT(*) AS n FROM events WHERE ts >= ? GROUP BY type ORDER BY n DESC",
                (since,),
            )
        }

        # Воронка: пользователи, дошедшие до каждого шага за период.
        funnel = {}
        for step in FUNNEL:
            row = conn.execute(
                "SELECT COUNT(DISTINCT user_id) AS n FROM events "
                "WHERE type = ? AND ts >= ? AND user_id IS NOT NULL",
                (step, since),
            ).fetchone()
            funnel[step] = row["n"]

        # Топ тонов: текущее значение users.tone + выбор в событиях онбординга.
        tones_db = {
            r["tone"] if r["tone"] else "(не выбран)": r["n"]
            for r in conn.execute(
                "SELECT tone, COUNT(*) AS n FROM users WHERE created_at >= ? GROUP BY tone",
                (since,),
            )
        }
        tones_events: dict[str, int] = {}
        for r in conn.execute(
            "SELECT payload FROM events WHERE type = 'profile_updated' AND ts >= ? AND payload IS NOT NULL",
            (since,),
        ):
            try:
                tone = (json.loads(r["payload"]) or {}).get("tone")
            except json.JSONDecodeError:
                continue
            if tone:
                tones_events[tone] = tones_events.get(tone, 0) + 1

    merged: dict[str, int] = dict(tones_db)
    for tone, n in tones_events.items():
        merged[tone] = merged.get(tone, 0) + n
    top_tones = sorted(merged.items(), key=lambda kv: -kv[1])

    return {
        "days": days,
        "new_users": new_users,
        "event_counts": event_counts,
        "funnel": funnel,
        "top_tones": top_tones,
    }
