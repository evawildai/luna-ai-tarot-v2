"""Тесты валидации Telegram initData: валидная и невалидная подпись, replay, мусор.

Запуск: python tests/test_tg.py
"""
import hashlib
import hmac
import json
import os
import sys
import time
from urllib.parse import quote

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from tg import validate_init_data  # noqa: E402

BOT_TOKEN = "7000000000:TEST-token-abc"
USER = {"id": 424242, "first_name": "Искатель", "username": "seeker"}
AUTH_DATE = int(time.time())


def sign_init_data(user: dict, auth_date: int, token: str = BOT_TOKEN) -> str:
    # Telegram передаёт значения initData URL-энкодом — подписываются они в этом же виде.
    pairs = {"auth_date": str(auth_date), "query_id": "AAtest",
             "user": quote(json.dumps(user, ensure_ascii=False))}
    dcs = "\n".join(f"{k}={v}" for k, v in sorted(pairs.items()))
    secret = hmac.new(b"WebAppData", token.encode(), hashlib.sha256).digest()
    pairs["hash"] = hmac.new(secret, dcs.encode(), hashlib.sha256).hexdigest()
    return "&".join(f"{k}={v}" for k, v in pairs.items())


def check(name: str, cond: bool) -> bool:
    print(("PASS" if cond else "FAIL"), name)
    return cond


def run() -> bool:
    ok = True
    # 1. Валидная подпись от реального бота — принимается.
    valid = sign_init_data(USER, AUTH_DATE)
    u = validate_init_data(valid, BOT_TOKEN)
    ok &= check("валидная подпись принимается", u is not None and u.id == 424242)
    ok &= check("username распознан", u is not None and u.username == "seeker")

    # 2. Подпись другим токеном — отклоняется.
    u = validate_init_data(sign_init_data(USER, AUTH_DATE, "999:other"), BOT_TOKEN)
    ok &= check("подпись чужим токеном отклоняется", u is None)

    # 3. Подделанное поле user (валидный hash, изменённое тело) — отклоняется.
    tampered = valid.replace(quote(json.dumps(USER, ensure_ascii=False)), quote(json.dumps({**USER, "id": 1}, ensure_ascii=False)))
    ok &= check("подделка тела отклоняется", validate_init_data(tampered, BOT_TOKEN) is None)

    # 4. Старый auth_date (replay) — отклоняется.
    ok &= check("просроченный auth_date отклоняется",
                validate_init_data(sign_init_data(USER, AUTH_DATE - 25 * 3600), BOT_TOKEN) is None)

    # 5. Мусор / пусто / без hash — отклоняется.
    ok &= check("мусор отклоняется", validate_init_data("abc=def&x=1", BOT_TOKEN) is None)
    ok &= check("пустая строка отклоняется", validate_init_data("", BOT_TOKEN) is None)
    ok &= check("пустой токен бота отклоняется", validate_init_data(valid, "") is None)

    # 6. Пользователь с кириллицей и спецсимволами.
    u = validate_init_data(sign_init_data({"id": 7, "first_name": "Луна✨"}, AUTH_DATE), BOT_TOKEN)
    ok &= check("кириллица/emoji в user", u is not None and u.first_name == "Луна✨")

    print("ALL OK" if ok else "SOME FAILED")
    return ok


if __name__ == "__main__":
    sys.exit(0 if run() else 1)
