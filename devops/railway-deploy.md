# SVIT Backend — Railway Deploy Guide

## Pre-flight checklist (already done)

- [x] Dockerfile (multi-stage, node:20-alpine)
- [x] railway.toml (builder=DOCKERFILE, healthcheck=/health, restartPolicy)
- [x] start.sh (runs prisma migrate deploy then node dist/server.js)
- [x] tsconfig.json has outDir=./dist
- [x] npm run build — passes with zero errors
- [x] /health endpoint returns 200 + JSON
- [x] .dockerignore excludes node_modules, dist, .env
- [x] .env.example has all 34 required variables documented

## Step 1 — Create Railway project

1. Go to https://railway.app → New Project → Empty Project
2. Name it: **svit-backend**

## Step 2 — Add PostgreSQL

Inside the project: + New → Database → PostgreSQL
Railway will auto-set DATABASE_URL in the service's env.

## Step 3 — Add the backend service

+ New → GitHub Repo → select your repo
- Root Directory: `apps/backend`
- Railway auto-detects the Dockerfile via railway.toml

## Step 4 — Set environment variables

In the service → Variables tab, add every key from the list below.
DATABASE_URL is injected automatically by the Postgres plugin — do NOT set it manually.

### Required (app will crash without these)
| Variable | Notes |
|---|---|
| JWT_ACCESS_SECRET | min 32 random chars |
| JWT_REFRESH_SECRET | min 32 random chars, different from ACCESS |
| ANTHROPIC_API_KEY | sk-ant-... |
| ADMIN_SECRET | strong random string |
| NODE_ENV | production |
| API_BASE_URL | https://your-service.railway.app |
| APP_URL | https://your-frontend.app (used in emails) |

### Payments (set the ones you use)
| Variable | Notes |
|---|---|
| STRIPE_SECRET_KEY | sk_live_... |
| STRIPE_PUBLISHABLE_KEY | pk_live_... |
| STRIPE_WEBHOOK_SECRET | whsec_... |
| YOOKASSA_SHOP_ID | |
| YOOKASSA_SECRET_KEY | |
| YOOKASSA_RETURN_URL | |
| NOWPAYMENTS_API_KEY | |
| NOWPAYMENTS_IPN_SECRET | |
| NOWPAYMENTS_SANDBOX | false |
| WEBHOOK_SECRET | |

### External APIs
| Variable | Notes |
|---|---|
| DUFFEL_API_KEY | |
| AVIASALES_TOKEN | |
| AVIASALES_MARKER | |
| AMADEUS_CLIENT_ID | |
| AMADEUS_CLIENT_SECRET | |
| AMADEUS_BASE_URL | https://api.amadeus.com (prod) |
| GOOGLE_CLIENT_ID | for Google OAuth |

### Email
| Variable | Notes |
|---|---|
| SMTP_HOST | e.g. smtp.gmail.com |
| SMTP_PORT | 465 |
| SMTP_SECURE | true |
| SMTP_USER | |
| SMTP_PASS | app password |
| SMTP_FROM | noreply@svit.app |

### Monitoring (optional)
| Variable | Notes |
|---|---|
| SENTRY_DSN | |

## Step 5 — Deploy

Railway triggers a build automatically when the service is linked to the repo.
Or manually: railway up (from apps/backend/)

## Step 6 — Post-deploy checks

1. Open the Railway service URL + /health
   Expected: {"status":"ok","db":"ok",...}
2. Check deploy logs for:
   "[start.sh] Migrations complete."
   "[start.sh] Starting node server..."
3. If migration fails with P3005, start.sh handles it automatically (baselines init migration).

## Step 7 — Custom domain (optional)

Service → Settings → Networking → Generate Domain
or add your own CNAME.

## Deploy via CLI (alternative to GitHub integration)

```bash
# from apps/backend/
/opt/homebrew/bin/railway login
/opt/homebrew/bin/railway link   # select project + service
/opt/homebrew/bin/railway up     # deploys current directory
```

## Rollback

Railway keeps previous deployments. In the dashboard:
Deployments tab → pick an older build → Redeploy.
