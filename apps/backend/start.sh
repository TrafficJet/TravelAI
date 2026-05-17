#!/bin/sh
# Startup wrapper — ensures all output is flushed immediately
# and any crash is visible in Railway logs.

set -e

echo "[start.sh] Running prisma migrate deploy..."
npx prisma migrate deploy

echo "[start.sh] Migrations complete."

# Run demo seed if SEED_DEMO=true (safe to run — idempotent)
if [ "$SEED_DEMO" = "true" ]; then
  echo "[start.sh] Running demo seed..."
  npx ts-node prisma/seed-demo.ts || echo "[start.sh] Seed failed (non-fatal)"
fi

echo "[start.sh] Starting node server..."
exec node dist/server.js
