# LUNA AI — деплой на VPS (Linux)

Полный подъём с нуля: системные пакеты, venv, pyswisseph, systemd, nginx, HTTPS (Let's Encrypt),
бот в webhook-режиме. Домен — свой, либо бесплатный `sslip.io` (IP в имени: `1-2-3-4.sslip.io`).

## Быстрый путь (deploy.sh)

```bash
# на локальной машине — скопировать проект на сервер:
rsync -av --exclude venv --exclude .git --exclude '*.db' --exclude .env \
    ./luna-ai-py/ user@YOUR_SERVER_IP:/opt/luna-ai-py/

# на сервере:
ssh user@YOUR_SERVER_IP
cd /opt/luna-ai-py
DOMAIN=1-2-3-4.sslip.io bash deploy/deploy.sh
```

`deploy.sh` спросит секреты (или возьмёт из окружения): `GEMINI_API_KEY`, `BOT_TOKEN`,
`ADMIN_SECRET`, `WEBHOOK_SECRET` (генерируется, если пусто) — и запишет их в `/opt/luna-ai-py/.env`.

## Что делает deploy.sh

1. `apt install python3-venv python3-pip nginx certbot python3-certbot-nginx`
2. `python3 -m venv venv && venv/bin/pip install -r requirements.txt` — на Linux у
   pyswisseph есть wheel, `astro.py` сам подхватит swisseph вместо ephem (проверка: `ENGINE`).
3. Создаёт `.env` и два systemd-юнита: `luna-ai.service` (API + статика через uvicorn)
   и `luna-ai-webhook.timer`/`oneshot` (регистрация webhook бота, см. ниже).
4. Ставит nginx-конфиг (API проксируется на 127.0.0.1:8000, статика отдаётся напрямую),
   затем `certbot --nginx -d $DOMAIN` — HTTPS.
5. Регистрирует вебхук бота: `BOT_TOKEN=... WEBHOOK_URL=https://$DOMAIN/telegram/webhook
   WEBHOOK_SECRET=... venv/bin/python bot.py` (set_webhook с secret_token; процесс завершается).
   Mini App initData боту не нужна — вебхук защищён только заголовком secret_token.

## Юниты (примеры — кладутся deploy.sh)

`/etc/systemd/system/luna-ai.service` и `/etc/systemd/system/luna-ai-bot-webhook.service`
смотреть в `deploy/luna-ai.service` и `deploy/luna-ai-bot-webhook.service`.

Вебхук-юнит — `Type=oneshot` (только set_webhook + выход), апдейты принимает
`POST /telegram/webhook` внутри основного приложения (проверка `X-Telegram-Bot-Api-Secret-Token`).

## Проверка swisseph

```bash
venv/bin/python -c "import astro; print(astro.ENGINE)"   # должно быть: swisseph
```

## Смоук-тест живого сайта

```bash
BASE_URL=https://$DOMAIN venv/bin/python tests/smoke_test.py
# онбординг -> карта -> расклад -> наталка; итог: SMOKE OK
```

## Админ-статистика

```bash
curl -s "https://$DOMAIN/api/admin/stats?days=7" -H "x-admin-secret: $ADMIN_SECRET"
```
