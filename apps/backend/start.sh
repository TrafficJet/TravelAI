#!/bin/sh
# Startup wrapper — ensures all output is flushed immediately
# and any crash is visible in Railway logs.

set -e

echo "[start.sh] Running prisma migrate deploy..."
npx prisma migrate deploy

echo "[start.sh] Migrations complete. Starting node server..."
exec node dist/server.js
