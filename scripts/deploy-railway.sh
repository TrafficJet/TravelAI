#!/bin/bash
set -e

echo "=== Travel AI — Railway Deploy ==="
echo ""
echo "Prerequisites:"
echo "  1. Install Railway CLI: brew install railway"
echo "  2. Login: railway login"
echo "  3. Link project: railway link"
echo ""
echo "Environment variables to set in Railway dashboard:"
echo "  DATABASE_URL         — automatically provided by Railway PostgreSQL plugin"
echo "  JWT_ACCESS_SECRET    — minimum 32 characters"
echo "  JWT_REFRESH_SECRET   — minimum 32 characters"
echo "  ANTHROPIC_API_KEY    — https://console.anthropic.com"
echo "  ADMIN_SECRET         — any secret for /admin endpoints"
echo ""
echo "Optional (for real payments and flights):"
echo "  YOOKASSA_SHOP_ID     — https://yookassa.ru/my/shop-settings/main"
echo "  YOOKASSA_SECRET_KEY  — same page, Security section"
echo "  DUFFEL_API_KEY       — https://app.duffel.com/settings/api-tokens"
echo "  AVIASALES_TOKEN      — https://www.travelpayouts.com/developers/api"
echo ""

if ! command -v railway &> /dev/null; then
    echo "ERROR: Railway CLI not found. Install: brew install railway"
    exit 1
fi

echo "Deploying to Railway..."
railway up --detach

echo ""
echo "Deploy started! Check status: railway status"
echo "   Logs: railway logs --tail"
