"""AI-эндпоинты: /api/ask (чат с картой), AI-синтез расклада, /api/mac/reflect.

Без GEMINI_API_KEY все функции возвращают локальные толкования (приложение не падает).
"""
import json

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

import ai
import data as d
import prompts
import prompts.tones as tones
from db import get_conn, log_event
from routers.api import _db_user_id
from routers.auth import CurrentUser, get_current_user

router = APIRouter(prefix="/api")


def user_context(user: CurrentUser) -> str:
    if user.is_guest:
        return "Имя: Искатель"
    with get_conn() as conn:
        row = conn.execute("SELECT birth_date FROM users WHERE tg_id = ?", (user.tg_id,)).fetchone()
    if not row:
        return "Имя: Искатель"
    return (f"Имя: {user.first_name or 'Искатель'}, "
            f"Дата рождения: {row['birth_date'] or 'не указана'}.")


def user_tone(user: CurrentUser) -> str:
    if user.is_guest:
        return "мягко"
    with get_conn() as conn:
        row = conn.execute("SELECT tone FROM users WHERE tg_id = ?", (user.tg_id,)).fetchone()
    return (row["tone"] if row and row["tone"] else "мягко")


def check_rate(user: CurrentUser, request: Request) -> None:
    key = user.tg_id or (request.client.host if request.client else "unknown")
    if ai.is_rate_limited(key):
        raise HTTPException(429, prompts.RATE_LIMIT_MESSAGE)


def find_card(deck: str, card_id: str) -> dict | None:
    pool = d.tarot() if deck == "tarot" else d.mac()
    return next((c for c in pool if c["id"] == card_id), None)


class AskRequest(BaseModel):
    deck: str = "tarot"
    card_id: str
    mode: str = "explain"  # explain | question
    question: str | None = None
    chat: list[dict] = []


@router.post("/ask")
def ask(payload: AskRequest, request: Request, user: CurrentUser = Depends(get_current_user)):
    card = find_card(payload.deck, payload.card_id)
    if card is None:
        raise HTTPException(400, "Карта не найдена")
    check_rate(user, request)
    card_name = card.get("nameRu") or card.get("title", "")
    if payload.deck == "tarot":
        card_meta = (f"Карта Таро \"{card_name}\". Ключевые слова: {', '.join(card.get('keywords', []))}. "
                     f"Символизм: {card.get('symbolism', '')}")
    else:
        card_meta = (f"МАК-карта \"{card_name}\" (Категория: {card.get('category')}). "
                     f"Метафора: {card.get('metaphor')}. Описание: {card.get('description')}")
    history = "\n".join(f"{'Пользователь' if m.get('sender') == 'user' else 'Луна'}: {m.get('text', '')}"
                        for m in payload.chat)
    intent = (prompts.ASK_INTENT_EXPLAIN if payload.mode == "explain"
              else prompts.ask_intent_question(payload.question or ""))
    reply = ai.generate(
        prompts.ask(card_meta, user.first_name or "Искатель", history, intent),
        tones.build_system(prompts.SYSTEM_TAROLOGIST, user_tone(user)), temperature=0.8,
    )
    return {"reply": (reply or {}).get("reply") or prompts.AI_SILENCE,
            "ai": reply is not None,
            "ai_provider": (reply or {}).get("ai_provider", "local")}


class ReadingAIRequest(BaseModel):
    spread_id: str
    question: str | None = None
    card_ids: list[str]


@router.post("/reading/ai")
def reading_ai(payload: ReadingAIRequest, request: Request,
               user: CurrentUser = Depends(get_current_user)):
    """AI-синтез уже вытянутого расклада. Без ключа возвращает локальный синтез."""
    spread = next((s for s in d.spreads() if s["id"] == payload.spread_id), None)
    if spread is None:
        raise HTTPException(400, "Неизвестная схема расклада")
    deck = d.mac() if spread["category"] == "mac" else d.tarot()
    cards = [c for c in deck if c["id"] in payload.card_ids]
    if not cards:
        raise HTTPException(400, "Карты не найдены")

    cards_desc = "\n".join(
        f"Позиция {i + 1} [{pos['title']}]: Карта \"{c.get('nameRu') or c.get('title')}\". "
        f"Архетип/Категория: {c.get('psychologicalArchetype') or c.get('category')}. "
        f"Ключевые слова: {', '.join(c.get('keywords') or [c.get('metaphor')])}."
        for i, (pos, c) in enumerate(zip(spread["positions"], cards)))

    synthesis = ai.generate(
        prompts.reading("Таро" if spread["category"] != "mac" else "Метафорические карты (МАК)",
                        spread["title"], payload.question, user_context(user), cards_desc),
        tones.build_system(prompts.SYSTEM_TAROLOGIST, user_tone(user)),
    )
    if synthesis:
        return {"ai": synthesis, "ai_used": True}

    # Локальный фолбэк: значения карт из JSON без AI.
    return {
        "ai_used": False,
        "fallback": {
            "summary": "Карты говорят напрямую — прочтите их значения по позициям.",
            "cardAnalyses": [
                {"cardName": c.get("nameRu") or c.get("title"),
                 "positionTitle": spread["positions"][i]["title"] if i < len(spread["positions"]) else "",
                 "meaning": c.get("meaningUpright") or c.get("metaphor"),
                 "psychologicalInsight": c.get("psychologicalArchetype") or c.get("psychologicalFocus", "")}
                for i, c in enumerate(cards)
            ],
            "practicalAdvice": [c.get("coachingQuestion") for c in cards if c.get("coachingQuestion")],
            "affirmation": next((c.get("affirmation") for c in cards if c.get("affirmation")),
                                "Я доверяю мудрости своих карт."),
        },
    }


class DailyCardRequest(BaseModel):
    deck: str = "tarot"
    card_id: str | None = None  # None -> тянем новую карту
    reversed_: bool | None = None


@router.post("/daily-card")
def daily_card(payload: DailyCardRequest, request: Request,
               user: CurrentUser = Depends(get_current_user)):
    """AI-трактовка карты дня. Без card_id карта тянется здесь (и пишется в дневник)."""
    import random

    card = None
    if payload.card_id:
        card = find_card(payload.deck, payload.card_id)
        if card is None:
            raise HTTPException(400, "Карта не найдена")
        card = dict(card)
        card["reversed"] = bool(payload.reversed_)
    else:
        deck = d.tarot() if payload.deck == "tarot" else d.mac()
        card = dict(random.choice(deck))
        card["reversed"] = random.random() < 0.33
        log_event(
            _db_user_id(user),
            "card_drawn",
            json.dumps({"deck": payload.deck, "card_id": card["id"], "reversed": card["reversed"]},
                       ensure_ascii=False),
        )
    check_rate(user, request)
    name = card.get("nameRu") or card.get("title", "")
    interpretation = ai.generate(
        prompts.daily_card(
            deck_label="Таро" if payload.deck == "tarot" else "Метафорические карты (МАК)",
            card_name=name,
            orientation="Перевёрнутое положение" if card.get("reversed") else "Прямое положение",
            archetype=card.get("psychologicalArchetype") or card.get("category", ""),
            symbolism=card.get("symbolism") or card.get("metaphor", ""),
            user_context=user_context(user),
        ),
        tones.build_system(prompts.SYSTEM_TAROLOGIST, user_tone(user)),
    )
    return {"card": card, "ai": interpretation, "ai_used": interpretation is not None}


class SelfAnalysisRequest(BaseModel):
    card_id: str
    theme: str | None = None
    user_message: str
    history: list[dict] = []  # [{sender: 'user'|'ai', text}]


@router.post("/self-analysis")
def self_analysis(payload: SelfAnalysisRequest, request: Request,
                  user: CurrentUser = Depends(get_current_user)):
    """Диалог самоанализа по МАК-карте (порт /api/tarot/self-analysis)."""
    card = find_card("mac", payload.card_id)
    if card is None:
        raise HTTPException(400, "МАК-карта не найдена")
    if not payload.user_message.strip():
        raise HTTPException(400, "Пустое сообщение")
    check_rate(user, request)
    history_text = "\n".join(
        f"{'Клиент' if m.get('sender') == 'user' else 'Психолог'}: {m.get('text', '')}"
        for m in payload.history)
    result = ai.generate(
        prompts.self_analysis(
            theme=payload.theme, card_title=card.get("title"),
            card_category=card.get("category"), card_metaphor=card.get("metaphor"),
            card_description=card.get("description", ""), user_name=user.first_name or "Искатель",
            history_text=history_text, user_message=payload.user_message,
        ),
        tones.build_system(prompts.SYSTEM_PSYCHOLOGIST, user_tone(user)),
    )
    if result and result.get("replyText"):
        return {"replyText": result["replyText"],
                "suggestedFollowUps": result.get("suggestedFollowUps") or [],
                "ai": True, "ai_provider": result.get("ai_provider", "local")}
    return {"replyText": prompts.MAC_FALLBACK_REPLY, "suggestedFollowUps": [], "ai": False}


class ReflectRequest(BaseModel):
    card_id: str
    answers: list[str]


@router.post("/mac/reflect")
def mac_reflect(payload: ReflectRequest, request: Request,
                user: CurrentUser = Depends(get_current_user)):
    card = find_card("mac", payload.card_id)
    if card is None:
        raise HTTPException(400, "МАК-карта не найдена")
    check_rate(user, request)
    reflection = " ".join(a for a in payload.answers if a.strip())
    reply = ai.generate(
        prompts.mac_reflect(
            user_line=f"{user.first_name or 'Искатель'} (Тон: {user_tone(user)})",
            card_title=card.get("title"), card_category=card.get("category"),
            card_metaphor=card.get("metaphor"), card_focus=card.get("psychologicalFocus"),
            history_text="", user_reflection=reflection,
        ),
        tones.build_system(prompts.SYSTEM_MAC_COACH, user_tone(user)),
    )
    if reply and reply.get("reply"):
        mirror = reply["reply"]
    else:
        mirror = prompts.MAC_FALLBACK_REPLY2
    with get_conn() as conn:
        row = None if user.is_guest else conn.execute(
            "SELECT id FROM users WHERE tg_id = ?", (user.tg_id,)).fetchone()
    log_event(row["id"] if row else None, "mac_done",
              json.dumps({"card_id": card["id"], "answers": payload.answers,
                          "ai": reply is not None}, ensure_ascii=False))
    return {"reply": mirror, "ai": reply is not None,
            "ai_provider": (reply or {}).get("ai_provider", "local")}
