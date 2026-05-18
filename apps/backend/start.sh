#!/bin/sh
# Startup wrapper — ensures all output is flushed immediately
# and any crash is visible in Railway logs.

set -e

echo "[start.sh] Running prisma migrate deploy..."

# Run migrate deploy; if P3005 (database has schema but no migration history),
# baseline all existing migrations as already-applied and retry.
if ! DEPLOY_OUT=$(npx prisma migrate deploy 2>&1); then
  echo "$DEPLOY_OUT"
  if echo "$DEPLOY_OUT" | grep -q "P3005"; then
    echo "[start.sh] P3005 detected — baselining existing database migrations..."
    for migration in \
      20260513153258_init \
      20260513192638_add_wallet_transaction_status \
      20260513224127_add_wallet_transaction_external_id \
      20260514024919_add_analytics_events \
      20260514034547_add_search_history_and_price_alerts \
      20260514090334_add_notifications \
      20260514100000_rename_analytics_events_table \
      20260514153154_add_chat_session_system_prompt \
      20260515063039_add_password_reset \
      20260515130040_add_user_features \
      20260515150437_add_favorites \
      20260517160000_add_oauth_fields \
      20260517170000_add_user_profile_fields; do
      echo "[start.sh] Marking $migration as applied..."
      npx prisma migrate resolve --applied "$migration"
    done
    echo "[start.sh] Baseline complete. Running migrate deploy..."
    npx prisma migrate deploy
  else
    echo "[start.sh] migrate deploy failed with unexpected error — aborting."
    exit 1
  fi
else
  echo "$DEPLOY_OUT"
fi

echo "[start.sh] Migrations complete."

# Run demo seed if SEED_DEMO=true (safe to run — idempotent)
if [ "$SEED_DEMO" = "true" ]; then
  echo "[start.sh] Running demo seed..."
  npx ts-node prisma/seed-demo.ts || echo "[start.sh] Seed failed (non-fatal)"
fi

echo "[start.sh] Starting node server..."
exec node dist/server.js
