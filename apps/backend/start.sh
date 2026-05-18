#!/bin/sh
# Startup wrapper — ensures all output is flushed immediately
# and any crash is visible in Railway logs.

set -e

echo "[start.sh] Running prisma migrate deploy..."

# Run migrate deploy.
# If P3005 is returned (DB has data/schema but no _prisma_migrations table),
# baseline ONLY the init migration and re-run deploy so all subsequent
# migrations execute their SQL for real.
if ! DEPLOY_OUT=$(npx prisma migrate deploy 2>&1); then
  echo "$DEPLOY_OUT"
  if echo "$DEPLOY_OUT" | grep -q "P3005"; then
    echo "[start.sh] P3005 detected — baselining ONLY the init migration..."
    echo "[start.sh] All later migrations will run their SQL via migrate deploy."
    npx prisma migrate resolve --applied "20260513153258_init"
    echo "[start.sh] Baseline of init complete. Running migrate deploy for remaining migrations..."
    npx prisma migrate deploy
  else
    echo "[start.sh] migrate deploy failed with unexpected error — aborting."
    exit 1
  fi
else
  echo "$DEPLOY_OUT"
fi

echo "[start.sh] Migrations complete."

# Always run demo seed to ensure demo user exists with PREMIUM subscription
echo "[start.sh] Running demo seed (idempotent — safe to run on every deploy)..."
npx ts-node prisma/seed-demo.ts || echo "[start.sh] Seed failed (non-fatal)"

echo "[start.sh] Starting node server..."
exec node dist/server.js
