"""Дневник, профиль (тон, streak, рефералка-заглушка)."""
import datetime as dt
import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

import data as d
from db import get_conn, log_event
from routers.auth import CurrentUser, get_current_user

router = APIRouter(prefix="/api")

TONES = ["мягко", "честно", "провокативно", "достигатор"]


def _require_user(user: CurrentUser) -> str:
    if user.is_guest:
        raise HTTPException(401, "Гостевой режим: профиль хранится локально в браузере")
    return user.tg_id


@router.get("/journal")
def journal(user: CurrentUser = Depends(get_current_user)):
    """История событий пользователя: карты, расклады, МАК, наталка."""
    if user.is_guest:
        return {"guest": True, "entries": []}
    tg = _require_user(user)
    with get_conn() as conn:
        row = conn.execute("SELECT id FROM users WHERE tg_id = ?", (tg,)).fetchone()
        if not row:
            return {"guest": False, "entries": []}
        rows = conn.execute(
            "SELECT type, payload, ts FROM events WHERE user_id = ? ORDER BY id DESC LIMIT 100",
            (row["id"],),
        ).fetchall()
    titles = {
        "card_drawn": "🃏 Карта дня",
        "spread_done": "🔮 Расклад",
        "mac_done": "🧩 МАК-сессия",
        "natal_viewed": "✨ Натальная карта",
        "onboarding_done": "🌙 Знакомство",
    }
    entries = []
    for r in rows:
        payload = {}
        try:
            payload = json.loads(r["payload"] or "{}")
        except json.JSONDecodeError:
            pass
        label = titles.get(r["type"], r["type"])
        detail = ""
        if r["type"] == "spread_done" and payload.get("cards"):
            deck = d.tarot() + d.mac()
            names = [next((c.get("nameRu") or c.get("title") for c in deck if c["id"] == cid), cid)
                     for cid in payload["cards"]]
            detail = " · ".join(names)
        elif r["type"] == "card_drawn" and payload.get("card_id"):
            deck = d.tarot() + d.mac()
            detail = next((c.get("nameRu") or c.get("title") for c in deck
                           if c["id"] == payload["card_id"]), payload["card_id"])
        entries.append({"type": r["type"], "title": label, "detail": detail, "ts": r["ts"]})
    return {"guest": False, "entries": entries}


@router.get("/profile")
def profile(user: CurrentUser = Depends(get_current_user)):
    if user.is_guest:
        return {"guest": True, "tone": "мягко", "streak": 0, "tones": TONES}
    tg = _require_user(user)
    with get_conn() as conn:
        row = conn.execute(
            "SELECT birth_date, birth_time, city, tone, natal FROM users WHERE tg_id = ?", (tg,)
        ).fetchone()
        uid_row = conn.execute("SELECT id FROM users WHERE tg_id = ?", (tg,)).fetchone()
    streak = 0
    if uid_row:
        days = [r["d"] for r in get_conn().execute(
            "SELECT DISTINCT substr(ts, 1, 10) AS d FROM events WHERE user_id = ? ORDER BY d DESC",
            (uid_row["id"],))]
        # streak: серия подряд идущих дней, начиная с сегодня/вчера
        if days:
            cur = dt.date.today()
            if days[0] == cur.isoformat() or days[0] == (cur - dt.timedelta(days=1)).isoformat():
                streak = 1
                prev = dt.date.fromisoformat(days[0])
                for day in days[1:]:
                    prev = prev - dt.timedelta(days=1)
                    if day == prev.isoformat():
                        streak += 1
                    else:
                        break
    return {
        "guest": False,
        "birth_date": row["birth_date"] if row else None,
        "birth_time": row["birth_time"] if row else None,
        "city": row["city"] if row else None,
        "natal": json.loads(row["natal"]) if row and row["natal"] else None,
        "tone": (row["tone"] if row else None) or "мягко",
        "tones": TONES,
        "streak": streak,
        "referral": "RC-LUNA-2026",  # заглушка
    }


class ProfileRequest(BaseModel):
    birth_date: str | None = None
    birth_time: str | None = None
    city: str | None = None
    tone: str | None = None


@router.post("/profile")
def update_profile(payload: ProfileRequest, user: CurrentUser = Depends(get_current_user)):
    tg = _require_user(user)
    if payload.tone and payload.tone not in TONES:
        raise HTTPException(400, f"tone должен быть одним из: {', '.join(TONES)}")
    tg = _require_user(user)
    with get_conn() as conn:
        conn.execute(
            "UPDATE users SET birth_date = COALESCE(?, birth_date), birth_time = COALESCE(?, birth_time), "
            "city = COALESCE(?, city), tone = COALESCE(?, tone) WHERE tg_id = ?",
            (payload.birth_date, payload.birth_time, payload.city, payload.tone, tg),
        )
    log_event(None, "profile_updated", json.dumps({"tone": payload.tone}))
    return {"ok": True}

