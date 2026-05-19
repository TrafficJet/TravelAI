# Travel AI — Переменные окружения

---

## Backend (`apps/backend/.env`)

```bash
# ─── Сервер ──────────────────────────────────────────────────────────────────

# Порт, на котором запускается Fastify
PORT=3000

# Окружение: development | production | test
NODE_ENV=development

# CORS: список разрешённых origins через запятую
# В prod — домен вашего CDN/фронтенда; в dev — localhost Expo
CORS_ORIGIN=http://localhost:8081,exp://localhost:8081

# ─── База данных ──────────────────────────────────────────────────────────────

# Строка подключения к PostgreSQL
# Формат: postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
DATABASE_URL=postgresql://travelai:password@localhost:5432/travelai_dev?schema=public

# ─── JWT ─────────────────────────────────────────────────────────────────────

# Секрет для подписи access token (минимум 32 символа, используй openssl rand -hex 32)
JWT_ACCESS_SECRET=your_access_token_secret_min_32_chars

# Секрет для подписи refresh token (другой секрет)
JWT_REFRESH_SECRET=your_refresh_token_secret_min_32_chars

# Время жизни access token (формат ms/jsonwebtoken: "15m", "1h")
JWT_ACCESS_EXPIRES_IN=15m

# Время жизни refresh token
JWT_REFRESH_EXPIRES_IN=30d

# ─── Anthropic / Claude ───────────────────────────────────────────────────────

# API ключ Anthropic (получить на https://console.anthropic.com)
ANTHROPIC_API_KEY=sk-ant-...

# Модель Claude для чата
ANTHROPIC_MODEL=claude-opus-4-5

# Максимальное количество токенов в ответе Claude
ANTHROPIC_MAX_TOKENS=4096

# ─── Duffel API (авиа) ────────────────────────────────────────────────────────

# API ключ Duffel (https://duffel.com/docs)
# В тестовом режиме ключ начинается с duffel_test_
DUFFEL_API_KEY=duffel_test_...

# Базовый URL Duffel API
DUFFEL_BASE_URL=https://api.duffel.com

# ─── Aviasales API (авиа, резервный) ─────────────────────────────────────────

# Token для Aviasales Travel Payouts API
# Получить на https://www.travelpayouts.com
AVIASALES_API_TOKEN=your_aviasales_token

# Marker (партнёрский ID) Aviasales
AVIASALES_MARKER=your_marker

# Базовый URL API
AVIASALES_BASE_URL=https://api.travelpayouts.com

# ─── Amadeus Hotel + Flight API ──────────────────────────────────────────────

# Amadeus Self-Service API (бесплатный sandbox — до 2000 запросов/месяц)
# 1. Зарегистрируйтесь на https://developers.amadeus.com
# 2. Создайте приложение в разделе "My Self-Service Workspace"
# 3. Скопируйте Client ID и Client Secret из страницы приложения
# 4. Sandbox работает сразу; для production замените BASE_URL на https://api.amadeus.com
#    и переведите приложение в production-режим в дашборде Amadeus
AMADEUS_CLIENT_ID=
AMADEUS_CLIENT_SECRET=

# Базовый URL Amadeus API (sandbox по умолчанию)
AMADEUS_BASE_URL=https://test.api.amadeus.com

# ─── Платёжный шлюз (заглушка в MVP) ─────────────────────────────────────────

# Признак заглушки: в режиме mock деньги не списываются реально
PAYMENT_MOCK_MODE=true

# Когда будет реальный эквайринг — добавить ключи (например, Stripe / ЮKassa)
# YOKASSA_SHOP_ID=
# YOKASSA_SECRET_KEY=

# ─── Rate limiting ────────────────────────────────────────────────────────────

# Максимум запросов к /api/* для одного IP за 1 минуту (защита от ботов)
RATE_LIMIT_MAX=100

# Максимум сообщений в день для FREE tier пользователей
FREE_TIER_MESSAGES_PER_DAY=10

# Максимум активных сессий для FREE tier
FREE_TIER_MAX_SESSIONS=3

# Максимум броней в месяц для FREE tier
FREE_TIER_BOOKINGS_PER_MONTH=2

# ─── Логирование ─────────────────────────────────────────────────────────────

# Уровень логов Pino: trace | debug | info | warn | error
LOG_LEVEL=info
```

---

## Mobile (`apps/mobile/.env` / `apps/mobile/.env.local`)

Переменные для Expo используют префикс `EXPO_PUBLIC_` — только они
доступны в клиентском коде. Секреты в мобильном приложении не хранятся.

```bash
# ─── API ─────────────────────────────────────────────────────────────────────

# Базовый URL бэкенда (без trailing slash)
# В dev — локальный IP вашей машины в сети (не localhost: эмулятор Android его не видит)
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:3000/api

# В production:
# EXPO_PUBLIC_API_BASE_URL=https://api.travel-ai.app/api

# ─── Приложение ──────────────────────────────────────────────────────────────

# Название окружения для отображения в dev-меню
EXPO_PUBLIC_APP_ENV=development

# Версия приложения (дублирует app.json, используется в about-экране)
EXPO_PUBLIC_APP_VERSION=1.0.0

# ─── Feature flags ───────────────────────────────────────────────────────────

# Показывать ли dev-инструменты (логи, debug панель)
EXPO_PUBLIC_ENABLE_DEBUG=true

# Включить экспериментальный voice input (не в MVP)
EXPO_PUBLIC_ENABLE_VOICE=false
```

---

## Переменные по окружениям

| Переменная | Development | Production |
|---|---|---|
| `NODE_ENV` | `development` | `production` |
| `DATABASE_URL` | локальный PostgreSQL | managed DB (Supabase / Railway / RDS) |
| `DUFFEL_API_KEY` | `duffel_test_...` | `duffel_live_...` |
| `PAYMENT_MOCK_MODE` | `true` | `false` |
| `LOG_LEVEL` | `debug` | `info` |
| `EXPO_PUBLIC_API_BASE_URL` | `http://192.168.x.x:3000/api` | `https://api.travel-ai.app/api` |
| `CORS_ORIGIN` | `localhost:8081` | домен prod-фронтенда |

---

## Управление секретами

- В репозитории хранить только `.env.example` и `ENV_TEMPLATE.md` — без реальных значений.
- `.env` и `.env.local` добавить в `.gitignore`.
- В production использовать переменные окружения хостинга (Railway / Render / Fly.io)
  или секрет-менеджер (AWS Secrets Manager / Doppler).
- Для Expo EAS Build — настроить через `eas secret:create` (EAS Secrets).
- Ротацию `JWT_ACCESS_SECRET` и `JWT_REFRESH_SECRET` выполнять одновременно
  (все пользователи будут разлогинены).

---

## Быстрый старт (dev)

```bash
# Скопировать шаблон
cp apps/backend/.env.example apps/backend/.env
cp apps/mobile/.env.example apps/mobile/.env.local

# Заполнить: DATABASE_URL, ANTHROPIC_API_KEY, DUFFEL_API_KEY
# Остальные можно оставить как есть для локальной разработки

# Запустить PostgreSQL
docker run -d --name travelai-pg \
  -e POSTGRES_USER=travelai \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=travelai_dev \
  -p 5432:5432 postgres:16

# Применить миграции
cd apps/backend && npx prisma migrate dev
```
