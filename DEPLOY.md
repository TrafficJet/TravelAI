# Travel AI — Deploy Guide (Railway)

## Overview

The backend is a Fastify + Prisma + PostgreSQL application packaged as a Docker image.
Railway builds it from `apps/backend/Dockerfile` (multi-stage, node:20-alpine).

Automated CI/CD is configured in `.github/workflows/deploy.yml`:
lint → tests → build Docker image → deploy to Railway on every push to `main`.

---

## 1. One-time Railway setup

### 1.1 Create a Railway project

1. Go to https://railway.app and sign in (GitHub account recommended).
2. Click **New Project** → **Empty Project**.
3. Name it `travel-ai`.

### 1.2 Add PostgreSQL

1. In the project dashboard click **+ Add Service** → **Database** → **PostgreSQL**.
2. Railway provisions the database and automatically creates the `DATABASE_URL`
   environment variable — it is injected into your service at runtime.

### 1.3 Create the backend service

1. Click **+ Add Service** → **Empty Service**, name it `travel-ai-backend`.
2. In the service settings go to **Settings** → **Source** → connect your GitHub repo.
   Railway will detect `railway.toml` in the root and use `apps/backend/Dockerfile`.

### 1.4 Set environment variables

In the service **Variables** tab add:

| Variable | Value | How to get |
|---|---|---|
| `DATABASE_URL` | set automatically by Railway PostgreSQL plugin | — |
| `JWT_ACCESS_SECRET` | random string, min 32 chars | `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | different random string, min 32 chars | `openssl rand -hex 32` |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | see section 2.1 |
| `DUFFEL_API_KEY` | `duffel_test_...` | see section 2.2 |
| `AVIASALES_TOKEN` | token string | see section 2.3 |
| `YOOKASSA_SHOP_ID` | numeric shop ID | see section 2.4 |
| `YOOKASSA_SECRET_KEY` | `test_...` or `live_...` | see section 2.4 |
| `NODE_ENV` | `production` | — |
| `PORT` | `3000` | — |
| `LOG_LEVEL` | `info` | — |
| `PAYMENT_MOCK_MODE` | `false` (real payments) or `true` (mock) | — |
| `CORS_ORIGIN` | your mobile/web app origin | — |

### 1.5 Run database migrations on first deploy

After the first successful build connect to the service shell via Railway CLI:

```bash
railway run --service travel-ai-backend npx prisma migrate deploy
```

Subsequent deploys run migrations automatically if you add this to your start command.
Alternatively update `railway.toml` `startCommand`:

```
startCommand = "npx prisma migrate deploy && node dist/server.js"
```

---

## 2. Getting API keys

### 2.1 Anthropic (Claude AI)

1. Go to https://console.anthropic.com
2. Sign in or create an account.
3. Open **API Keys** in the left sidebar.
4. Click **Create Key**, give it a name (e.g. `travel-ai-prod`).
5. Copy the key — it starts with `sk-ant-`.
   It is shown only once; store it immediately.

### 2.2 Duffel (flight search and booking)

1. Go to https://app.duffel.com → Sign Up (or Log In).
2. Navigate to **Settings** → **API Tokens** (direct URL: https://app.duffel.com/settings/api-tokens).
3. Click **Create token**.
4. For testing choose **Test** environment — the token starts with `duffel_test_`.
5. For production choose **Live** — token starts with `duffel_live_`.
   Live tokens require Duffel to approve your account for production access.

### 2.3 Aviasales / Travelpayouts (flight price data)

1. Go to https://www.travelpayouts.com and register.
2. In the partner dashboard go to **Tools** → **API** → **Get token**
   (Russian interface: Инструменты → API → Получить токен).
3. Your API token appears on that page.
4. The `AVIASALES_MARKER` value (affiliate marker) is shown in your partner profile.

### 2.4 YooKassa (payments)

**Test credentials (ready to use, no registration required):**

```
YOOKASSA_SHOP_ID=381764
YOOKASSA_SECRET_KEY=test_OTE4NDM2NTE0MDk4NzI0MA==
```

These are official YooKassa test credentials. Payments go through but no real money moves.

**Production credentials:**

1. Register at https://yookassa.ru → go to **My shop** (Мой магазин).
2. Navigate to **Integration** → **Security** (Подключение → Безопасность).
   Direct URL: https://yookassa.ru/my/shop-settings/main
3. Your `SHOP_ID` is shown at the top of the page.
4. Click **Issue secret key** (Выпустить секретный ключ) to generate `SECRET_KEY`.

Note: production YooKassa requires passing merchant verification (KYC).
For MVP use the test credentials above with `PAYMENT_MOCK_MODE=false`.

---

## 3. Manual deploy (Railway CLI)

```bash
# Install Railway CLI
brew install railway

# Authenticate
railway login

# Link to the project (run once from monorepo root)
railway link

# Deploy
bash scripts/deploy-railway.sh
```

Or directly:

```bash
railway up --detach
```

Check deploy status:

```bash
railway status
railway logs --tail
```

---

## 4. GitHub Actions CI/CD

The workflow in `.github/workflows/deploy.yml` handles:
- lint and type-check on every PR
- tests against a real PostgreSQL (GitHub-hosted)
- Docker image build and push to GHCR on merge to `main`
- Railway deploy triggered after successful image push

Required secrets in GitHub repository (**Settings → Secrets and variables → Actions**):

| Secret | Description |
|---|---|
| `RAILWAY_TOKEN` | Railway project token (Railway dashboard → Settings → Tokens) |
| `ANTHROPIC_API_KEY` | Used in CI integration tests |

Required repository variable:

| Variable | Description |
|---|---|
| `RAILWAY_PUBLIC_URL` | Public URL of the Railway service (shown in Railway dashboard) |

---

## 5. Health check

Railway monitors `GET /health`. The endpoint returns:

```json
{ "status": "ok", "uptime": 123.4 }
```

Timeout is set to 300 seconds to allow Prisma migrations to complete on cold start.

---

## 6. Local Docker build (smoke test before deploy)

```bash
cd apps/backend

docker build -t travel-ai-backend:local .

docker run --rm \
  -e DATABASE_URL="postgresql://travelai:password@host.docker.internal:5432/travelai_dev" \
  -e JWT_ACCESS_SECRET="local-test-secret-min-32-chars-xx" \
  -e JWT_REFRESH_SECRET="local-test-refresh-min-32-chars-x" \
  -e ANTHROPIC_API_KEY="sk-ant-..." \
  -p 3000:3000 \
  travel-ai-backend:local
```

---

## 7. File structure reference

```
travel-ai/
  railway.toml                    # Railway build + deploy config
  scripts/
    deploy-railway.sh             # CLI deploy helper
  apps/
    backend/
      Dockerfile                  # Multi-stage Docker build
      prisma/
        schema.prisma
        migrations/
      src/
        server.ts
        routes/
        services/
        lib/
```
