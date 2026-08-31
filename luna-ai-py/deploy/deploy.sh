#!/usr/bin/env bash
# LUNA AI — развёртывание на свежем Ubuntu/Debian VPS.
# Запуск: DOMAIN=1-2-3-4.sslip.io bash deploy/deploy.sh   (из /opt/luna-ai-py)
set -euo pipefail

DOMAIN="${DOMAIN:?Задайте DOMAIN=ваш-домен (или 1-2-3-4.sslip.io)}"
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WEBHOOK_SECRET="${WEBHOOK_SECRET:-$(head -c 24 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 32)}"

echo "==> Пакеты"
apt-get update -qq
apt-get install -y -qq python3-venv python3-pip nginx certbot python3-certbot-nginx >/dev/null

echo "==> venv + зависимости"
cd "$APP_DIR"
# Сборка pyswisseph на VPS с <1ГБ RAM падает по OOM — страховочный swap.
if [ "$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)" -lt 1500 ] && [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q swapfile /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "    добавлен swap 2G (для сборки pyswisseph)"
fi
python3 -m venv venv
venv/bin/pip install --quiet --upgrade pip
venv/bin/pip install --quiet -r requirements.txt
ENGINE="$(venv/bin/python -c 'import astro; print(astro.ENGINE)')"
echo "    astro engine: $ENGINE (ожидаем swisseph на Linux)"

if [ "$ENGINE" != "swisseph" ]; then
  echo "ВНИМАНИЕ: swisseph не подхватился, работает fallback ephem"; fi

echo "==> .env"
if [ ! -f .env ]; then
  cat > .env <<EOF
GEMINI_API_KEY=${GEMINI_API_KEY:-}
GEMINI_MODEL=gemini-2.0-flash
BOT_TOKEN=${BOT_TOKEN:-}
WEBAPP_URL=https://${DOMAIN}/
ADMIN_SECRET=${ADMIN_SECRET:-$(head -c 16 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 24)}
WEBHOOK_SECRET=${WEBHOOK_SECRET}
LOG_MAX_EVENTS=5000
EOF
  chmod 600 .env
fi
# WEBAPP_URL актуализируем под выбранный домен
sed -i "s|^WEBAPP_URL=.*|WEBAPP_URL=https://${DOMAIN}/|" .env

echo "==> systemd"
# Сервис работает от www-data: .env должен быть читаем, БД — записываема.
touch luna.db
chown www-data:www-data .env luna.db
sed "s|/opt/luna-ai-py|${APP_DIR}|g" deploy/luna-ai.service > /etc/systemd/system/luna-ai.service
sed "s|/opt/luna-ai-py|${APP_DIR}|g" deploy/luna-ai-bot-webhook.service > /etc/systemd/system/luna-ai-bot-webhook.service
systemctl daemon-reload
systemctl enable --now luna-ai

echo "==> nginx"
sed "s|luna.example.com|${DOMAIN}|g; s|/opt/luna-ai-py|${APP_DIR}|g" \
  deploy/nginx-luna.conf > /etc/nginx/sites-available/luna
ln -sf /etc/nginx/sites-available/luna /etc/nginx/sites-enabled/luna
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "==> HTTPS (Let's Encrypt)"
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email || \
  echo "certbot не прошёл — проверьте DNS A-запись для ${DOMAIN}"

echo "==> Вебхук бота (set_webhook + secret_token)"
grep -q '^WEBHOOK_SECRET=' .env || echo "WEBHOOK_SECRET=${WEBHOOK_SECRET}" >> .env
if grep -q '^BOT_TOKEN=.\+' .env; then
  set -a; . ./.env; set +a
  WEBHOOK_URL="https://${DOMAIN}/telegram/webhook" venv/bin/python bot.py
  systemctl enable luna-ai-bot-webhook.service 2>/dev/null || true
else
  echo "BOT_TOKEN не задан — вебхук пропущен (занесите в .env и повторите шаг)."
fi

echo "Готово. Сайт: https://${DOMAIN}"
echo "Админ-статистика: curl -s 'https://${DOMAIN}/api/admin/stats?days=7' -H \"x-admin-secret: \$(grep ADMIN_SECRET .env | cut -d= -f2)\""
echo "Смоук-тест: BASE_URL=https://${DOMAIN} venv/bin/python tests/smoke_test.py"
