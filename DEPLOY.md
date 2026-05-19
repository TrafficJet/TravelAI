# Travel AI / SVIT — Deploy Guide (Railway)

## Overview

The backend is a Fastify + Prisma + PostgreSQL application packaged as a Docker image.
Railway builds it from `apps/backend/Dockerfile` (multi-stage, node:20-alpine).

Production URL: https://travel-ai-backend-production-90a0.up.railway.app

---

## Первый деплой (First Deploy)

### Шаг 1. Создать Railway проект

1. Зайди на https://railway.app, войди через GitHub.
2. Нажми **New Project** → **Empty Project**, назови `travel-ai`.

### Шаг 2. Добавить PostgreSQL

1. В дашборде проекта нажми **+ Add Service** → **Database** → **PostgreSQL**.
2. Railway автоматически создаст переменную `DATABASE_URL` и прокинет её в сервис — не нужно задавать вручную.

### Шаг 3. Создать backend-сервис

1. Нажми **+ Add Service** → **Empty Service**, назови `travel-ai-backend`.
2. В настройках сервиса: **Settings** → **Source** → подключи GitHub репозиторий.
   Railway автоматически обнаружит `railway.toml` в корне и использует `apps/backend/Dockerfile`.

### Шаг 4. Задать env vars

**Способ А — через CLI (рекомендуется для первичной настройки):**

```bash
brew install railway       # установить Railway CLI
railway login              # войти
railway link               # привязать локальный репозиторий к проекту

# Отредактируй скрипт, подставив реальные значения вместо YOUR_...
nano scripts/railway-env-setup.sh

# Запусти
bash scripts/railway-env-setup.sh
```

**Способ Б — через Railway Dashboard:**

В сервисе открой вкладку **Variables**, нажми **Raw Editor** и вставь:

```
JWT_ACCESS_SECRET=<openssl rand -hex 32>
JWT_REFRESH_SECRET=<openssl rand -hex 32>
ADMIN_SECRET=<any-hard-secret>
ANTHROPIC_API_KEY=sk-ant-...
DUFFEL_API_KEY=duffel_test_...
AVIASALES_TOKEN=...
AVIASALES_MARKER=...
AMADEUS_CLIENT_ID=...
AMADEUS_CLIENT_SECRET=...
AMADEUS_BASE_URL=https://test.api.amadeus.com
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
YOOKASSA_SHOP_ID=381764
YOOKASSA_SECRET_KEY=test_OTE4NDM2NTE0MDk4NzI0MA==
YOOKASSA_RETURN_URL=https://travel-ai-backend-production-90a0.up.railway.app/payment/return
PAYMENT_MOCK_MODE=false
EXPO_ACCESS_TOKEN=...
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
CORS_ORIGIN=*
```

Полный справочник где брать каждый ключ — см. раздел **"Получение API ключей"** ниже.

### Шаг 5. Запустить деплой

После сохранения переменных Railway автоматически начнёт первый деплой.
`start.sh` при запуске выполняет `prisma migrate deploy` — миграции применяются автоматически.

Проверить результат:

```bash
railway logs --tail
curl https://travel-ai-backend-production-90a0.up.railway.app/health
```

---

## Обновление env vars (Update Environment Variables)

### Через Railway Dashboard

1. Открой сервис в Railway → вкладка **Variables**.
2. Нажми **+ New Variable**, введи имя и значение, нажми **Add**.
3. Railway автоматически перезапустит сервис — деплой не нужен.

### Через Railway CLI

```bash
# Задать одну переменную
railway variables set MY_NEW_KEY=my_new_value

# Задать несколько
railway variables set KEY1=value1 KEY2=value2

# Посмотреть все текущие переменные
railway variables

# Удалить переменную
railway variables delete MY_OLD_KEY
```

### Bulk-обновление через скрипт

```bash
# Отредактируй scripts/railway-env-setup.sh, добавь новую переменную
# Запусти — Railway перезапишет только те ключи, которые указаны в скрипте
bash scripts/railway-env-setup.sh
```

---

## Мониторинг (Monitoring)

### Health check

Railway автоматически опрашивает `GET /health` каждые 30 секунд (таймаут 300s, задан в `railway.toml`).

```bash
# Полный статус сервиса
curl https://travel-ai-backend-production-90a0.up.railway.app/health

# Пример ответа:
# {
#   "status": "ok",
#   "db": "ok",
#   "version": "2.1.0",
#   "timestamp": "2026-05-19T15:54:04.510Z",
#   "services": { "database": "connected", "ai": "available", "cache": "active" },
#   "uptime": 10557.59,
#   "websocketConnections": 0,
#   "cacheSize": 0,
#   "activeAlerts": 1
# }

# Статус внешних провайдеров (Duffel / Aviasales / YooKassa / Stripe)
curl https://travel-ai-backend-production-90a0.up.railway.app/health/providers
```

Если `status != "ok"` или `db != "ok"` — Railway покажет красный индикатор и остановит трафик на сервис.

### Логи

```bash
# Живые логи через CLI
railway logs --tail

# Последние 100 строк
railway logs -n 100

# В Railway Dashboard
# Открой сервис → вкладка "Deployments" → выбери деплой → "View Logs"
```

### Алерты

Railway по умолчанию присылает email при падении сервиса (crash / healthcheck fail).
Настройка: Railway Dashboard → Project Settings → Notifications.

Для продвинутого мониторинга можно подключить:
- **UptimeRobot** (бесплатный tier): мониторит `/health` каждые 5 минут, шлёт алерт в Telegram/Email.
- **Sentry** (если настроен `SENTRY_DSN` в env): отлавливает ошибки в runtime.

---

## CI/CD

### Как устроен автоматический деплой

Конфигурация: `.github/workflows/deploy.yml`

Деплой запускается автоматически при каждом **push в ветку `main`** при условии, что изменения затрагивают `apps/backend/**`.

Пайплайн состоит из 4 jobs, которые выполняются последовательно:

```
push to main
    │
    ▼
Job 1: lint & type-check (TypeScript)
    │
    ▼
Job 2: unit tests (против реального PostgreSQL в GitHub-hosted runner)
    │
    ▼
Job 3: build Docker image → push to GitHub Container Registry (GHCR)
    │
    ▼
Job 4: deploy to Railway (GraphQL API — serviceInstanceUpdate + serviceInstanceDeployV2)
```

На Pull Request запускаются только Job 1 (lint) и Job 2 (tests). Docker build и deploy — только на merge в main.

Дополнительно в `.github/workflows/deploy-railway.yml` есть упрощённый workflow:
- Запускается при push в main с изменениями в `apps/backend/**`
- Запускает `railway up --service backend` напрямую (без Docker/GHCR)

### Необходимые секреты в GitHub

Настройка: **GitHub repo → Settings → Secrets and variables → Actions**

| Secret | Описание |
|---|---|
| `RAILWAY_TOKEN` | Railway Account Token: Railway Dashboard → Account Settings → Tokens → Create token |
| `ANTHROPIC_API_KEY` | Anthropic API key — используется в CI-тестах |

Необходимые переменные (не секреты):

| Variable | Описание |
|---|---|
| `RAILWAY_PUBLIC_URL` | Публичный URL сервиса: `https://travel-ai-backend-production-90a0.up.railway.app` |

### Ручной деплой (без GitHub Actions)

```bash
railway login
railway link

# ВАЖНО: запускать из корня репозитория, а НЕ из apps/backend/
# railway.toml задаёт rootDirectory="apps/backend" — если запустить из apps/backend/,
# builder попытается найти apps/backend/ внутри уже урезанного снапшота и упадёт с ошибкой
# "no such file or directory"
cd /path/to/travel-ai   # корень репозитория
railway up --detach

# Или через существующий скрипт
bash scripts/deploy-railway.sh
```

### Известные проблемы CI (задокументировано 2026-05-19)

**Проблема: деплои `73e4bebc` и `94dea303` упали — Railway не смог получить образ из GHCR**

`deploy.yml` (Job 4) пишет образ в `ghcr.io/TrafficJet/TravelAI/travel-ai-backend:latest` и отдаёт Railway команду на деплой через GraphQL API. Railway пытается подтянуть образ из GHCR, но пакет приватный — нет credentials для `ghcr.io` в настройках Railway сервиса.

Варианты решения:
1. **Рекомендуется** — сделать пакет GHCR публичным: GitHub → Packages → `travel-ai-backend` → Package Settings → Make public
2. Добавить `GHCR_PAT` (Personal Access Token с `read:packages`) в Railway переменные: `railway variables set GHCR_PAT=ghp_...`, затем настроить `imageCredentials` через Railway GraphQL API
3. Перейти на `railway up --detach` в CI вместо GHCR (уже настроено в `deploy-railway.yml`)

**Проблема: `deploy-railway.yml` запускал `railway up --service backend` из `apps/backend/`**

Исправлено: теперь команда — `railway up --service travel-ai-backend --detach` (без смены директории, запускается из корня репозитория где лежит `railway.toml`).

### Railway IDs (для GraphQL API в CI)

```
Service ID:     9b7ed984-302f-4713-aed0-442452c53f9a
Environment ID: 4e70a63d-d982-4f87-8be4-210c7a8aa0fa
```

---

## Получение API ключей

### Anthropic (Claude AI)

1. https://console.anthropic.com → sign in
2. Левая панель → **API Keys** → **Create Key**
3. Ключ начинается с `sk-ant-` — скопировать сразу (показывается один раз)

### Duffel (поиск и бронирование рейсов)

1. https://app.duffel.com → Sign Up
2. **Settings** → **API Tokens** → **Create token**
3. Test-ключ: `duffel_test_...` (sandbox, бесплатно)
4. Live-ключ: `duffel_live_...` — требует approval от Duffel

### Aviasales / Travelpayouts (цены на рейсы, СНГ)

1. https://www.travelpayouts.com → регистрация
2. **Tools** → **API** → **Get token**
3. `AVIASALES_MARKER` — партнёрский маркер, виден в профиле партнёра

### Amadeus (отели + рейсы, free sandbox)

1. https://developers.amadeus.com → регистрация
2. **My Self-Service Workspace** → **Create new app**
3. Получишь Client ID и Client Secret
4. Sandbox бесплатный: `AMADEUS_BASE_URL=https://test.api.amadeus.com`
5. Production: `AMADEUS_BASE_URL=https://api.amadeus.com` (нужна отдельная заявка)

### Stripe (платежи, международные пользователи)

1. https://dashboard.stripe.com → вверху переключи в **Test mode**
2. **Developers** → **API Keys** → скопируй Secret key (`sk_test_...`)
3. Для webhook: **Developers** → **Webhooks** → **Add endpoint**
   - URL: `https://travel-ai-backend-production-90a0.up.railway.app/api/stripe/webhook`
   - Events: `payment_intent.succeeded`
   - Скопируй Signing secret (`whsec_...`)

### YooKassa (платежи, Россия)

**Тестовые credentials (официальные, работают без регистрации):**
```
YOOKASSA_SHOP_ID=381764
YOOKASSA_SECRET_KEY=test_OTE4NDM2NTE0MDk4NzI0MA==
```

**Production**: регистрация на https://yookassa.ru → KYC-верификация → **Интеграция** → **Безопасность**.

### Expo (push-уведомления)

1. https://expo.dev → Account Settings → Access Tokens → Create
2. Ключ вида `expo_...`

---

## Конфигурация Railway (railway.toml)

```toml
[build]
builder = "DOCKERFILE"
rootDirectory = "apps/backend"
dockerfilePath = "Dockerfile"

[deploy]
startCommand = "/app/start.sh"
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

Файл `apps/backend/start.sh` при запуске:
1. Выполняет `prisma migrate deploy` (с обработкой baseline P3005)
2. Запускает `node dist/server.js`

---

## Локальная сборка Docker (smoke test перед деплоем)

```bash
cd apps/backend

docker build -t travel-ai-backend:local .

docker run --rm \
  -e DATABASE_URL="postgresql://travelai:password@host.docker.internal:5432/travelai_dev" \
  -e JWT_ACCESS_SECRET="local-test-secret-min-32-chars-xxx" \
  -e JWT_REFRESH_SECRET="local-test-refresh-min-32-chars-xx" \
  -e ANTHROPIC_API_KEY="sk-ant-..." \
  -p 3000:3000 \
  travel-ai-backend:local

curl http://localhost:3000/health
```

---

## NOWPayments

### Текущее состояние (проверено 2026-05-19)

**ВНИМАНИЕ: SANDBOX=false в production — реальные платежи активны.**

Railway переменные (подтверждено `railway variables`):
```
NOWPAYMENTS_API_KEY   = 0VJDPPE-QBP4CNA-NYZT2C5-7DZ33DR
NOWPAYMENTS_SANDBOX   = false
NOWPAYMENTS_IPN_SECRET = 506109f2-7181-4f67-9169-1bfd6e676993
```

Логика в `apps/backend/src/services/nowpayments.service.ts`, строка 4–7:
```ts
const SANDBOX = process.env.NOWPAYMENTS_SANDBOX === 'true';
const BASE_URL = SANDBOX
  ? 'https://api.sandbox.nowpayments.io/v1'
  : 'https://api.nowpayments.io/v1';
```

`NOWPAYMENTS_SANDBOX=false` → приложение звонит в `https://api.nowpayments.io/v1` (production API).

### Оценка риска

| Вопрос | Ответ |
|---|---|
| Реальные деньги возможны? | Да. Любой `POST /api/payments/crypto` создаёт реальный платёж. |
| API ключ уже в Railway? | Да — `0VJDPPE-QBP4CNA-NYZT2C5-7DZ33DR` задан в production. |
| IPN webhook настроен? | Да — `NOWPAYMENTS_IPN_SECRET` задан, webhook верификация работает. |
| Пользователи уже могут платить? | Да, если интеграция доступна в мобильном приложении. |

### Рекомендации

**Если приложение ещё не в публичном доступе (beta/soft launch):**
Немедленной угрозы нет, но нужно убедиться что у NOWPayments ключ — production, а не test.
Проверь на https://nowpayments.io/login → API Keys: если ключ `0VJDPPE-...` там виден,
это production ключ и всё верно.

**Если нужно вернуться в sandbox для тестирования:**
```bash
railway variables set NOWPAYMENTS_SANDBOX=true
# Railway автоматически перезапустит сервис
```

**Минимальные защитные меры (уже реализованы в коде):**
- HMAC-SHA512 верификация IPN webhook (`verifyWebhookSignature`)
- Таймаут API клиента 15 секунд
- `is_fixed_rate: false` — курс фиксируется NOWPayments, не нами

**Рекомендуется добавить:**
- Лимит максимальной суммы платежа (защита от ошибок)
- Логирование каждого созданного платежа с `payment_id` и `order_id`
- Алерт (Sentry/Telegram) при статусе `failed` или `expired`

---

## Структура файлов

```
travel-ai/
  railway.toml                         # Railway build + deploy config
  DEPLOY.md                            # этот файл
  .github/
    workflows/
      deploy.yml                       # основной CI/CD: lint → test → docker → railway
      deploy-railway.yml               # упрощённый: railway up напрямую
  scripts/
    deploy-railway.sh                  # CLI deploy helper (ручной деплой)
    railway-env-setup.sh               # bulk-установка env vars через Railway CLI
  apps/
    backend/
      Dockerfile                       # multi-stage Docker build (node:20-alpine)
      start.sh                         # entrypoint: migrate + start node
      .env.example                     # шаблон переменных для локальной разработки
      prisma/
        schema.prisma
        migrations/
      src/
        server.ts
```
