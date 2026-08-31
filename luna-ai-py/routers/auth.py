"""Зависимости аутентификации: валидный Telegram initData или гостевой режим.

Браузер вне Telegram не шлёт initData -> guest (локальный профиль, без записи в users).
"""
from dataclasses import dataclass

from fastapi import Header

import tg


@dataclass
class CurrentUser:
    tg_id: str | None  # None -> гость
    username: str | None = None
    first_name: str | None = None

    @property
    def is_guest(self) -> bool:
        return self.tg_id is None


def get_current_user(
    x_telegram_init_data: str | None = Header(default=None),
    authorization: str | None = Header(default=None),
) -> CurrentUser:
    init_data = x_telegram_init_data
    if not init_data and authorization and authorization.startswith("tma "):
        init_data = authorization[4:]
    user = tg.validate_init_data(init_data or "")
    if user:
        return CurrentUser(str(user.id), user.username, user.first_name)
    return CurrentUser(None)  # гость: невалидная/отсутствующая подпись
