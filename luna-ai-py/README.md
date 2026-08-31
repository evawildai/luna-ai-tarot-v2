# LUNA AI (luna-ai-py)

Telegram Mini App + сайт + TG-бот: фаза Луны, лунный день, камень дня и карта дня (Таро / МАК).

Стек: Python 3.11+ (FastAPI + aiogram 3 + SQLite), фронтенд — статичные HTML/CSS/vanilla JS + Tailwind CDN, без сборки.

## Структура

```
luna-ai-py/
├── main.py            # FastAPI: API + раздача страниц /, /today, /natal, /policy
├── db.py              # SQLite: users, events, geocache
├── data.py            # JSON-колоды + камни дня (таблица по знакам)
├── astro.py           # ephem/swisseph: фаза Луны, лунный день, знак Луны, натальные позиции
├── tg.py              # валидация Telegram initData (HMAC-SHA256 по докам Telegram)
├── geo.py             # геокодинг: локальный JSON городов + Nominatim с кэшем в SQLite
├── bot.py             # aiogram 3: /start, /card, /destiny (Большая тройка + Аркан)
├── convert_data.py    # одноразовая конвертация данных из старого проекта
├── routers/
│   ├── api.py         # POST /api/onboarding, /api/draw, GET /api/moon, /api/meta
│   ├── auth.py        # Depends(get_current_user): подписанный tg_id или гость
│   └── natal.py       # POST /api/natal: Большая тройка + камни по Солнцу/Луне
├── data/*.json        # tarot.json (26), mac.json (12), spreads.json (6), cities.json (34)
├── tests/test_tg.py   # тесты initData: валидная подпись, подделка, replay
├── static/
│   ├── css/luna.css   # дизайн-токены: чёрный фон, фиолетовые акценты, серебро, свечение
│   ├── js/tg.js       # Telegram WebApp init (тема, initData), гостевой режим в браузере
│   ├── index.html     # онбординг: согласие на ПДн + дата/время/город рождения
│   ├── today.html     # «Сегодня»: луна + тянуть карту (Таро/МАК) + камень дня + share
│   ├── natal.html     # натальная карта: Большая тройка + камни по Солнцу/Луне
│   ├── policy.html    # политика конфиденциальности + дисклеймер
│   └── 404.html
└── requirements.txt
```

## Запуск (Windows / любая ОС)

```bash
python -m venv venv
venv\Scripts\pip install -r requirements.txt   # Linux/macOS: venv/bin/pip
venv\Scripts\uvicorn main:app --host 0.0.0.0 --port 8000
```

Открыть http://localhost:8000 — онбординг, `/today` — карта дня, `/policy` — политика.

## Бот

```bash
BOT_TOKEN=123:ABC WEBAPP_URL=https://ваш-домен/ venv/bin/python bot.py
```

- `/start` — приветствие + кнопка Mini App (WebApp URL из `WEBAPP_URL`).
- `/card` — карта дня текстом из `data/tarot.json`.
- `/destiny` — Большая тройка (Солнце/Луна/асцендент) по данным профиля + бонусом нумерология Аркана Судьбы.
- Без `BOT_TOKEN` скрипт завершается dry-run-ошибкой (конфигурация проверена).

> Тот же `BOT_TOKEN` нужен серверу (`BOT_TOKEN=... uvicorn main:app`) — им проверяется подпись initData Mini App. Без него все запросы считаются гостевыми.

## Аутентификация Mini App

Фронт шлёт заголовок `X-Telegram-Init-Data: <initData>` (см. `static/js/tg.js`). Бэкенд (`tg.py`) валидирует подпись строго по документации Telegram: `secret = HMAC_SHA256("WebAppData", BOT_TOKEN)`, `hash = HMAC_SHA256(secret, data_check_string)`, плюс свежесть `auth_date` (24 ч). Тесты: `python tests/test_tg.py`. Вне Telegram — гостевой режим (профиль локальный, в БД не пишется).

## Астрономия

Движок: `pyswisseph`, при отсутствии — `pyephem` (fallback; в этом окружении используется он, т.к. у pyswisseph нет wheel под Windows и сборка требует MSVC). Луна: фаза, освещённость, лунный день (титхи), знак Луны — всё локально, без внешних API. Наталка: Солнце, Луна, асцендент (формула RAMC). Геокодинг: 34 крупных города в `data/cities.json`, остальные — Nominatim с кэшем в таблице `geocache` (повторные запросы внешних вызовов не делают).

## VPS: systemd + nginx

`/etc/systemd/system/luna-ai.service`:

```ini
[Unit]
Description=LUNA AI
After=network.target

[Service]
User=www-data
WorkingDirectory=/opt/luna-ai-py
Environment=WEBAPP_URL=https://luna.example.com/
ExecStart=/opt/luna-ai-py/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

`systemctl enable --now luna-ai`

nginx (сайт + прокси API):

```nginx
server {
    listen 443 ssl;
    server_name luna.example.com;
    root /opt/luna-ai-py/static;

    location /api/ { proxy_pass http://127.0.0.1:8000; }
    location = /     { try_files /index.html =404; }
    location = /today{ try_files /today.html =404; }
    location = /policy{ try_files /policy.html =404; }
    location /static/ { expires 7d; }
}
```

HTTPS обязателен — Telegram Mini App работает только по HTTPS.

## Бот как systemd-юнит

Отдельный юнит `luna-ai-bot.service` с `Environment=BOT_TOKEN=...` и `ExecStart=/opt/luna-ai-py/venv/bin/python bot.py`.

## Данные

Источник — старый проект (`src/data/*.ts`), конвертация без потерь (`convert_data.py`):
- `tarot.json` — **26 карт** (22 старших аркана + 4 туза; в старом проекте полная колода из 78 отсутствует).
- `mac.json` — 12 МАК-карт.
- `spreads.json` — 6 раскладов.

Луна считается локально (синодический месяц от эталонного новолуния 2000-01-06), без внешних API.
