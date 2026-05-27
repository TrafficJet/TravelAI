# External Integrations Setup

This document describes how to obtain API credentials for each external service
used by TravelAI and how to configure them in `.env`.

---

## 1. Amadeus (Hotels + Flights — Self-Service API)

Amadeus provides free sandbox access with realistic test data.

### Registration

1. Go to https://developers.amadeus.com and click **Sign Up**.
2. Fill in your name, email, and password. Verify the email.
3. In your dashboard, click **My Apps** → **Create new app**.
4. Give the app any name (e.g. "TravelAI"). Select **Self-Service** tier.
5. After creation, open the app — you will see **Client ID** and **Client Secret**.

### Environment variables

```
AMADEUS_CLIENT_ID=<your Client ID>
AMADEUS_CLIENT_SECRET=<your Client Secret>
AMADEUS_BASE_URL=https://test.api.amadeus.com   # sandbox (default)
```

### Switching to Production

1. In the Amadeus dashboard, click **Move to Production** on your app.
2. Agree to the usage terms. Production approval is usually instant for Self-Service.
3. Update the env var:

```
AMADEUS_BASE_URL=https://api.amadeus.com
```

The app automatically detects sandbox vs. production from the base URL and
reports it at `/api/integrations/status`.

### OAuth token

Amadeus uses the `client_credentials` flow. The backend caches the token
in memory and refreshes it automatically when less than 60 seconds remain
before expiry (tokens live 30 minutes). No manual renewal is needed.

### Endpoints used

- `POST /v1/security/oauth2/token` — token fetch
- `GET  /v1/reference-data/locations/hotels/by-city` — hotel list by IATA code
- `GET  /v3/shopping/hotel-offers` — hotel availability + pricing
- `GET  /v2/shopping/flight-offers` — flight search

---

## 2. Duffel (International Flights)

Duffel offers a sandbox environment that works with a test API key — no
real money, real airline content.

### Registration

1. Go to https://app.duffel.com/join and create an account.
2. After sign-in, open **Settings** → **Access tokens**.
3. Click **Create token**, give it a name, set **Test** mode.
4. Copy the token that starts with `duffel_test_...`.

### Environment variable

```
DUFFEL_API_KEY=duffel_test_<your token>
```

### Going Live

Live keys require Duffel account verification (business registration,
signed agreement). Go to **Settings** → **Access tokens** → select **Live**.
This is reflected in the `duffelLive.note` field of `/api/integrations/status`.

---

## 3. Aviasales / Travelpayouts (CIS Flights)

Travelpayouts is the partner program that provides Aviasales flight data via API.

### Registration

1. Go to https://www.travelpayouts.com and click **Sign up**.
2. After email verification, open **Tools** → **API** → **Flight Data API**.
3. Your **API token** (Partner token) is shown on that page.

### Environment variable

```
AVIASALES_TOKEN=<your partner token>
```

### Notes

- The free tier provides cached price data (not real-time availability).
- For real-time search, apply for Data API access in your Travelpayouts dashboard.

---

## 4. YooKassa (Payments — Russia/CIS)

YooKassa provides a sandbox environment with test shop credentials.

### Sandbox credentials (ready to use, no registration needed)

YooKassa publishes fixed sandbox credentials in their documentation:

```
YOOKASSA_SHOP_ID=381764678
YOOKASSA_SECRET_KEY=test_dChjswW8WXXqEDsLrsRpH4tqOeEcJdXb0r6RBOaC0bA
```

These credentials are public and intended for testing.

### Production credentials

1. Register at https://yookassa.ru/joinups (legal entity required for production).
2. After approval, open **Integration** → **HTTP-notification** → **API keys**.
3. Copy **Shop ID** and **Secret key**.

```
YOOKASSA_SHOP_ID=<your production shop ID>
YOOKASSA_SECRET_KEY=<your production secret key>
```

---

## Checking integration status

After setting env vars and restarting the server, call:

```bash
curl -s https://travel-ai-backend-production-90a0.up.railway.app/api/integrations/status | python3 -m json.tool
```

Or locally:

```bash
curl -s http://localhost:3000/api/integrations/status | python3 -m json.tool
```

Expected response when Amadeus sandbox is configured:

```json
{
  "amadeus": {
    "configured": true,
    "mode": "sandbox",
    "base_url": "https://test.api.amadeus.com"
  },
  "duffel": { "configured": false, "mode": "mock" },
  "aviasales": { "configured": false, "mode": "mock" },
  "yookassa": { "configured": false, "mode": "mock" },
  "duffelLive": { "note": "Requires account verification at duffel.com" }
}
```
