"""LUNA AI — Telegram Mini App + сайт: FastAPI раздаёт статику и API."""
import os
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

import bot as bot_module
from db import init_db
from routers.admin import router as admin_router
from routers.ai_router import router as ai_router
from routers.api import router as api_router
from routers.natal import router as natal_router
from routers.profile import router as profile_router

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

app = FastAPI(title="LUNA AI", version="0.3.0")
app.include_router(api_router)
app.include_router(natal_router)
app.include_router(ai_router)
app.include_router(profile_router)
app.include_router(admin_router)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

PAGES = {
    "/": "index.html",
    "/today": "today.html",
    "/spreads": "spreads.html",
    "/mac": "mac.html",
    "/natal": "natal.html",
    "/journal": "journal.html",
    "/profile": "profile.html",
    "/policy": "policy.html",
}


@app.get("/", include_in_schema=False)
def index():
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/{page}", include_in_schema=False)
def page(page: str):
    filename = PAGES.get(f"/{page}")
    if filename is None:
        return FileResponse(STATIC_DIR / "404.html", status_code=404)
    return FileResponse(STATIC_DIR / filename)


@app.on_event("startup")
def startup() -> None:
    init_db()


# --- Telegram webhook (VPS-режим) -------------------------------------------
# init боту не нужен: initData — для Mini App; вебхук защищён заголовком
# X-Telegram-Bot-Api-Secret-Token (задаётся в WEBHOOK_SECRET и в set_webhook).
WEBHOOK_SECRET = os.environ.get("WEBHOOK_SECRET", "")
_dp = None
_aiogram_bot = None


@app.post("/telegram/webhook", include_in_schema=False)
async def telegram_webhook(request: Request,
                           x_telegram_bot_api_secret_token: str | None = Header(default=None)):
    if not WEBHOOK_SECRET:
        raise HTTPException(503, "Webhook не настроен")
    if x_telegram_bot_api_secret_token != WEBHOOK_SECRET:
        raise HTTPException(403, "Неверный secret token")
    global _dp, _aiogram_bot
    if _dp is None:
        from aiogram import Bot, Dispatcher
        from aiogram.types import Update
        if not bot_module.BOT_TOKEN:
            raise HTTPException(503, "BOT_TOKEN не настроен")
        _aiogram_bot = Bot(token=bot_module.BOT_TOKEN)
        _dp = bot_module.register_handlers(Dispatcher())
    update = Update.model_validate(await request.json())
    await _dp.feed_webhook_update(_aiogram_bot, update)
    return {"ok": True}
