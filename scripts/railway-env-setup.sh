#!/usr/bin/env bash
# =============================================================================
# Travel AI / SVIT — Railway production env vars setup
# =============================================================================
# Usage:
#   1. Install Railway CLI:    brew install railway
#   2. Authenticate:           railway login
#   3. Link project:           railway link
#   4. Fill in real values below (replace YOUR_... placeholders)
#   5. Run:                    bash scripts/railway-env-setup.sh
#
# Each variable is set individually so you can safely re-run the script
# to update a subset of values — Railway will overwrite only what is listed.
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Guard — Railway CLI must be available and linked
# ---------------------------------------------------------------------------
if ! command -v railway &>/dev/null; then
  echo "ERROR: Railway CLI not found."
  echo "       Install with: brew install railway"
  exit 1
fi

echo "=== Travel AI — Setting Railway production env vars ==="
echo ""

# ---------------------------------------------------------------------------
# Helper: wraps railway variables set and prints progress
# ---------------------------------------------------------------------------
set_var() {
  local KEY="$1"
  local VALUE="$2"
  echo "  Setting ${KEY}..."
  railway variables set "${KEY}=${VALUE}"
}

# ---------------------------------------------------------------------------
# DATABASE
# Railroad PostgreSQL plugin injects DATABASE_URL automatically.
# Only override if you are using an external Postgres instance.
# ---------------------------------------------------------------------------
# set_var DATABASE_URL "postgresql://USER:PASSWORD@HOST:5432/DBNAME"

# ---------------------------------------------------------------------------
# AUTH — generate with: openssl rand -hex 32
# ---------------------------------------------------------------------------
set_var JWT_ACCESS_SECRET  "YOUR_JWT_ACCESS_SECRET_MIN_32_CHARS"
set_var JWT_REFRESH_SECRET "YOUR_JWT_REFRESH_SECRET_MIN_32_CHARS"

# Admin endpoints secret — any hard-to-guess string
# Used for /admin/* routes
set_var ADMIN_SECRET "YOUR_ADMIN_SECRET_CHANGE_BEFORE_DEPLOY"

# ---------------------------------------------------------------------------
# AI — Anthropic Claude
# Get key: https://console.anthropic.com → API Keys → Create Key
# Key starts with: sk-ant-
# ---------------------------------------------------------------------------
set_var ANTHROPIC_API_KEY "YOUR_ANTHROPIC_API_KEY"

# ---------------------------------------------------------------------------
# FLIGHTS — Duffel (international routes)
# Get key: https://app.duffel.com → Settings → API Tokens
# Test key starts with:  duffel_test_
# Live key starts with:  duffel_live_  (requires Duffel production approval)
# ---------------------------------------------------------------------------
set_var DUFFEL_API_KEY "YOUR_DUFFEL_API_KEY"

# ---------------------------------------------------------------------------
# FLIGHTS — Aviasales / Travelpayouts (CIS routes)
# Register at: https://www.travelpayouts.com
# Token path: Tools → API → Get token
# Marker:     shown in partner profile dashboard
# ---------------------------------------------------------------------------
set_var AVIASALES_TOKEN  "YOUR_AVIASALES_TOKEN"
set_var AVIASALES_MARKER "YOUR_AVIASALES_MARKER"

# ---------------------------------------------------------------------------
# HOTELS / FLIGHTS — Amadeus (free sandbox available)
# Register at: https://developers.amadeus.com
# Create app: Self-Service → My Apps → Create new app
# Sandbox URL (free): https://test.api.amadeus.com
# Production URL:     https://api.amadeus.com
# ---------------------------------------------------------------------------
set_var AMADEUS_CLIENT_ID     "YOUR_AMADEUS_CLIENT_ID"
set_var AMADEUS_CLIENT_SECRET "YOUR_AMADEUS_CLIENT_SECRET"
set_var AMADEUS_BASE_URL      "https://test.api.amadeus.com"

# ---------------------------------------------------------------------------
# PAYMENTS — Stripe (primary, international users)
# Dashboard: https://dashboard.stripe.com → Developers → API Keys
# Test key starts with:  sk_test_
# Live key starts with:  sk_live_  (requires activated Stripe account)
#
# Webhook secret:
#   Dashboard → Developers → Webhooks → Add endpoint
#   URL: https://travel-ai-backend-production-90a0.up.railway.app/api/stripe/webhook
#   Events: payment_intent.succeeded
#   Copy the signing secret (starts with whsec_)
# ---------------------------------------------------------------------------
set_var STRIPE_SECRET_KEY      "YOUR_STRIPE_SECRET_KEY"
set_var STRIPE_WEBHOOK_SECRET  "YOUR_STRIPE_WEBHOOK_SECRET"

# ---------------------------------------------------------------------------
# PAYMENTS — YooKassa (fallback, Russian users)
# Used only when STRIPE_SECRET_KEY is not set.
# Dashboard: https://yookassa.ru/my/shop-settings/main
#
# Ready-to-use test credentials (official YooKassa sandbox):
#   SHOP_ID:    381764
#   SECRET_KEY: test_OTE4NDM2NTE0MDk4NzI0MA==
# Production credentials require KYC (merchant verification).
# ---------------------------------------------------------------------------
set_var YOOKASSA_SHOP_ID    "381764"
set_var YOOKASSA_SECRET_KEY "test_OTE4NDM2NTE0MDk4NzI0MA=="
set_var YOOKASSA_RETURN_URL "https://travel-ai-backend-production-90a0.up.railway.app/payment/return"

# Payment mock mode — set to "true" only for local dev / smoke tests
set_var PAYMENT_MOCK_MODE "false"

# ---------------------------------------------------------------------------
# PUSH NOTIFICATIONS — Expo
# Get token: https://expo.dev → Account Settings → Access Tokens
# ---------------------------------------------------------------------------
set_var EXPO_ACCESS_TOKEN "YOUR_EXPO_ACCESS_TOKEN"

# ---------------------------------------------------------------------------
# RUNTIME
# ---------------------------------------------------------------------------
set_var NODE_ENV   "production"
set_var PORT       "3000"
set_var LOG_LEVEL  "info"

# CORS_ORIGIN — set to your exact mobile/web app origin or keep * for open access
set_var CORS_ORIGIN "*"

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
echo ""
echo "=== All variables set. ==="
echo ""
echo "Next steps:"
echo "  1. Verify in Railway dashboard: service → Variables tab"
echo "  2. Trigger a new deploy: railway up --detach"
echo "     (or push to main branch — CI/CD will deploy automatically)"
echo "  3. Check health:"
echo "     curl https://travel-ai-backend-production-90a0.up.railway.app/health"
echo "  4. Check providers status:"
echo "     curl https://travel-ai-backend-production-90a0.up.railway.app/health/providers"
