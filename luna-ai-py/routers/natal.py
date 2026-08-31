"""API натальной карты: Большая тройка (Солнце, Луна, асцендент) + камни по Солнцу/Луне."""
import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

import astro
import data as d
import geo
from db import get_conn, log_event
from routers.auth import CurrentUser, get_current_user

router = APIRouter(prefix="/api")


class NatalRequest(BaseModel):
    birth_date: str   # YYYY-MM-DD
    birth_time: str | None = None  # HH:MM
    city: str


@router.post("/natal")
def natal(payload: NatalRequest, user: CurrentUser = Depends(get_current_user)):
    import datetime as dt

    try:
        dt.date.fromisoformat(payload.birth_date)
    except ValueError:
        raise HTTPException(400, "Некорректная дата рождения (нужна YYYY-MM-DD)")
    if payload.birth_time:
        try:
            dt.datetime.strptime(payload.birth_time, "%H:%M")
        except ValueError:
            raise HTTPException(400, "Некорректное время рождения (нужное HH:MM)")
    place = geo.geocode(payload.city)
    if place is None:
        raise HTTPException(400, "Город не найден — попробуйте крупный город поблизости")

    chart = astro.natal_chart(payload.birth_date, payload.birth_time,
                              place["lat"], place["lon"], place.get("tz"))
    result = {
        **chart,
        "place": {"name": place["name"], "lat": place["lat"], "lon": place["lon"], "source": place["source"],
                  "tz": place.get("tz")},
        "time_provided": bool(payload.birth_time),
        "note": None if payload.birth_time
        else "Асцендент зависит от времени рождения — укажите хотя бы приблизительное, чтобы рассчитать его.",
        "tz_note": None if (payload.birth_time and chart.get("tz_known", True))
        else "Часовой пояс города неизвестен — время принято как UTC. Укажите город из списка крупных городов для точности.",
        "stones": {
            "sun": d.stone_by_sign(chart["sun"]["sign"]),
            "moon": d.stone_by_sign(chart["moon"]["sign"]),
        },
    }

    # Сохраняем наталку пользователю (гости получают расчёт без записи в БД).
    if not user.is_guest:
        with get_conn() as conn:
            conn.execute(
                "UPDATE users SET birth_date = ?, birth_time = ?, city = ?, natal = ? WHERE tg_id = ?",
                (payload.birth_date, payload.birth_time, place["name"], json.dumps(chart, ensure_ascii=False),
                 user.tg_id),
            )
        row = get_conn().execute("SELECT id FROM users WHERE tg_id = ?", (user.tg_id,)).fetchone()
        log_event(row["id"] if row else None, "natal_viewed",
                  json.dumps({"city": place["name"]}, ensure_ascii=False))
    return result
