"""Валидация Telegram WebApp initData по официальной документации.

https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
secret_key = HMAC_SHA256(key=b"WebAppData", msg=bot_token)
hash       = hex(HMAC_SHA256(key=secret_key, msg=data_check_string))
data_check_string = sorted "\n".join("k=v") без поля hash.
"""
import hashlib
import hmac
import json
import os
import time
from dataclasses import dataclass
from urllib.parse import unquote

BOT_TOKEN = os.environ.get("BOT_TOKEN", "")
# Окно свежести auth_date (сек): защита от replay-атак.
MAX_AUTH_AGE = 24 * 3600


@dataclass
class TgUser:
    id: int
    username: str | None = None
    first_name: str | None = None


def validate_init_data(init_data: str, bot_token: str = BOT_TOKEN, now: float | None = None) -> TgUser | None:
    """Возвращает TgUser, если подпись валидна и auth_date свежая; иначе None."""
    if not init_data or not bot_token:
        return None
    try:
        pairs = dict(p.split("=", 1) for p in init_data.split("&"))
    except ValueError:
        return None
    received_hash = pairs.pop("hash", None)
    if not received_hash:
        return None
    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(pairs.items()))
    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    calculated = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(calculated, received_hash):
        return None
    try:
        auth_date = int(float(pairs.get("auth_date", "0")))
    except ValueError:
        return None
    if now is None:
        now = time.time()
    if auth_date <= 0 or now - auth_date > MAX_AUTH_AGE:
        return None
    try:
        # Значения в initData URL-энкодены (Telegram), в data_check_string идут как есть,
        # а для чтения user их нужно раскодировать.
        user_raw = json.loads(unquote(pairs.get("user", "{}")))
    except json.JSONDecodeError:
        return None
    if not isinstance(user_raw, dict) or "id" not in user_raw:
        return None
    return TgUser(
        id=int(user_raw["id"]),
        username=user_raw.get("username"),
        first_name=user_raw.get("first_name"),
    )
