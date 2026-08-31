"""API: онбординг, карта дня, луна, натальная карта. Пользователь — через валидацию initData."""
import json
import random

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

import astro
import data as d
from db import get_conn, log_event
from routers.auth import CurrentUser, get_current_user

router = APIRouter(prefix="/api")


class Onboarding(BaseModel):
    birth_date: str | None = None
    birth_time: str | None = None
    city: str | None = None
    tone: str | None = None
    consent: bool = Field(default=False)
    tg_id: str | None = None  # игнорируется: tg_id берётся только из подписанного initData


class DrawRequest(BaseModel):
    deck: str = "tarot"  # tarot | mac


class ReadingRequest(BaseModel):
    spread_id: str
    question: str | None = None


@router.post("/reading")
def reading(payload: ReadingRequest, user: CurrentUser = Depends(get_current_user)):
    spread = next((s for s in d.spreads() if s["id"] == payload.spread_id), None)
    if spread is None:
        raise HTTPException(400, "Неизвестная схема расклада")
    # МАК-расклады тянут из колоды МАК, остальные — из Таро.
    deck = d.mac() if spread["category"] == "mac" else d.tarot()
    cards = random.sample(deck, k=min(spread["cardCount"], len(deck)))
    drawn = []
    for pos, card in zip(spread["positions"], cards):
        card = dict(card)
        card["reversed"] = random.random() < 0.33
        meaning = (card.get("meaningReversed") if card.get("reversed") and card.get("meaningReversed")
                   else card.get("meaningUpright") or card.get("metaphor"))
        drawn.append({
            "position_id": pos["id"],
            "position_title": pos["title"],
            "position_hint": pos["hint"],
            "card": card,
            "meaning": meaning,
        })
    log_event(
        _db_user_id(user),
        "spread_done",
        json.dumps({"spread_id": spread["id"], "question": payload.question,
                    "cards": [c["card"]["id"] for c in drawn]}, ensure_ascii=False),
    )
    return {"spread": spread, "question": payload.question, "positions": drawn}


def _db_user_id(user: CurrentUser, birth_date: str | None = None) -> int | None:
    """id пользователя в БД по подписанному tg_id; для гостя — None."""
    if user.is_guest:
        return None
    with get_conn() as conn:
        row = conn.execute("SELECT id FROM users WHERE tg_id = ?", (user.tg_id,)).fetchone()
        if row:
            return row["id"]
        cur = conn.execute(
            "INSERT INTO users (tg_id, birth_date, consent) VALUES (?, ?, 1)",
            (user.tg_id, birth_date),
        )
        return cur.lastrowid


@router.post("/onboarding")
def save_onboarding(payload: Onboarding, user: CurrentUser = Depends(get_current_user)):
    if not payload.consent:
        raise HTTPException(400, "Необходимо согласие на обработку персональных данных")
    if payload.birth_date:
        try:
            from datetime import date

            date.fromisoformat(payload.birth_date)
        except ValueError:
            raise HTTPException(400, "Некорректная дата рождения")
    if user.is_guest:
        # Гостевой режим: профиль живёт локально в браузере, в БД не пишем.
        return {"ok": True, "guest": True}
    with get_conn() as conn:
        conn.execute(
            "UPDATE users SET birth_date = ?, birth_time = ?, city = ?, tone = ?, consent = 1 WHERE id = ?",
            (payload.birth_date, payload.birth_time, payload.city, payload.tone,
             _db_user_id(user, payload.birth_date)),
        )
    log_event(_db_user_id(user), "onboarding_done", json.dumps({"city": payload.city}, ensure_ascii=False))
    return {"ok": True, "user_id": _db_user_id(user)}


@router.post("/draw")
def draw_card(payload: DrawRequest, user: CurrentUser = Depends(get_current_user)):
    deck = d.tarot() if payload.deck == "tarot" else d.mac() if payload.deck == "mac" else None
    if deck is None:
        raise HTTPException(400, "deck должен быть 'tarot' или 'mac'")
    card = dict(random.choice(deck))
    card["reversed"] = random.random() < 0.33
    log_event(
        _db_user_id(user),
        "card_drawn",
        json.dumps({"deck": payload.deck, "card_id": card["id"], "reversed": card["reversed"]}, ensure_ascii=False),
    )
    return card


@router.get("/moon")
def moon(birth_date: str | None = None, user: CurrentUser = Depends(get_current_user)):
    if birth_date is None and not user.is_guest:
        with get_conn() as conn:
            row = conn.execute("SELECT birth_date FROM users WHERE id = ?", (_db_user_id(user),)).fetchone()
            birth_date = row["birth_date"] if row else None
    return {**astro.moon_state(), "birthstone": d.birthstone_for(birth_date)}


@router.get("/meta")
def meta():
    return {
        "tarot_count": len(d.tarot()),
        "mac_count": len(d.mac()),
        "spreads": d.spreads(),
    }


class EventRequest(BaseModel):
    type: str
    payload: dict = Field(default_factory=dict)


# Разрешённые клиентские события — всё остальное отклоняется.
CLIENT_EVENTS = {"share_clicked"}


@router.post("/event")
def event(payload: EventRequest, user: CurrentUser = Depends(get_current_user)):
    if payload.type not in CLIENT_EVENTS:
        raise HTTPException(400, f"Событие не разрешено: {payload.type}")
    log_event(
        _db_user_id(user),
        payload.type,
        json.dumps(payload.payload, ensure_ascii=False),
    )
    return {"ok": True}
