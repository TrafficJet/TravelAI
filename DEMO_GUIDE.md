# TravelAI — Demo Guide (MVP Presentation)

**Backend URL:** `https://travel-ai-backend-production-90a0.up.railway.app`
**Verified:** 2026-05-17

---

## Demo Account

| Field     | Value                  |
|-----------|------------------------|
| Email     | demo@travelai.app      |
| Password  | Demo1234!              |
| Name      | Demo User              |
| Plan      | FREE / ACTIVE          |

The account is already created in the Railway production database.

---

## Quick Start: Get a JWT Token

```bash
curl -s -X POST https://travel-ai-backend-production-90a0.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@travelai.app","password":"Demo1234!"}' | python3 -m json.tool
```

Save `accessToken` from the response and use it as `Bearer <token>` in the Authorization header for all protected endpoints.

---

## API Endpoints

### Public (no auth required)

#### GET /health
```bash
curl https://travel-ai-backend-production-90a0.up.railway.app/health
```
Response:
```json
{
  "status": "ok",
  "uptime": 18307,
  "version": "4.24.2",
  "db": "ok",
  "timestamp": "...",
  "websocketConnections": 0,
  "cacheSize": 0,
  "activeAlerts": 0
}
```

#### GET /api/flights/popular
```bash
curl https://travel-ai-backend-production-90a0.up.railway.app/api/flights/popular
```
Returns top-5 flight routes (Москва-Дубай, Москва-Анталья, Питер-Барселона, Москва-Бангкок, Москва-Коломбо).

#### GET /api/hotels/popular
```bash
curl https://travel-ai-backend-production-90a0.up.railway.app/api/hotels/popular
```
Returns top-4 hotel cities (Дубай, Бали, Анталья, Бангкок).

---

### Auth Endpoints

#### POST /api/auth/register
Create a new user. Requires `email`, `password` (min 8 chars), `name` (min 2 chars).
```bash
curl -s -X POST https://travel-ai-backend-production-90a0.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@travelai.app","password":"Demo1234!","name":"Demo User"}'
```
Response `201`: `{ accessToken, refreshToken, user: { id, email, name, phone, createdAt } }`
If user already exists: `409 Conflict`.

#### POST /api/auth/login
```bash
curl -s -X POST https://travel-ai-backend-production-90a0.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@travelai.app","password":"Demo1234!"}'
```
Response `200`: `{ accessToken, refreshToken, user: { id, email, name, phone, createdAt } }`

#### POST /api/auth/refresh
Exchange a refreshToken for a new accessToken.
```bash
curl -s -X POST https://travel-ai-backend-production-90a0.up.railway.app/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<your-refresh-token>"}'
```

#### POST /api/auth/logout
Requires auth + `refreshToken` in body. Invalidates the refresh token.

---

### Search (requires JWT)

#### POST /api/search/flights
Search for flight offers. Mock data is returned when Duffel API key is absent.
```bash
curl -s -X POST https://travel-ai-backend-production-90a0.up.railway.app/api/search/flights \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "origin": "MOW",
    "destination": "DXB",
    "departure_date": "2026-06-15",
    "passengers": 1,
    "cabin_class": "economy"
  }'
```
Response: `{ offers: [ { offerId, provider, totalPrice, currency, cabinClass, segments, baggage, expiresAt } ] }`

Optional body fields: `return_date`, `max_price`, `max_stops`, `departure_time_from`, `departure_time_to`, `sort_by` (price/duration/departure), `sort_order` (asc/desc).

#### POST /api/search/hotels
```bash
curl -s -X POST https://travel-ai-backend-production-90a0.up.railway.app/api/search/hotels \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "city": "Dubai",
    "check_in": "2026-06-15",
    "check_out": "2026-06-20",
    "guests": 2
  }'
```
Response: `{ offers: [ { offerId, provider, hotelName, address, starRating, rating, reviewCount, roomType, totalPrice, pricePerNight, currency, amenities, imageUrl, expiresAt } ] }`

Optional body fields: `stars` (array of 1-5), `max_price_per_night`.

---

### Flights (requires JWT for most)

#### GET /api/flights/price-history?origin=MOW&destination=DXB
Price history for a route over the last 7 days (deterministic mock data).
```bash
curl -s "https://travel-ai-backend-production-90a0.up.railway.app/api/flights/price-history?origin=MOW&destination=DXB" \
  -H "Authorization: Bearer <token>"
```
Response: `{ origin, destination, currency, history: [ { date, price } ] }`

#### POST /api/flights/multi-city
Multi-city search (2-5 segments). Uses Duffel if key present, otherwise mock.
```bash
curl -s -X POST https://travel-ai-backend-production-90a0.up.railway.app/api/flights/multi-city \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "segments": [
      {"origin": "MOW", "destination": "DXB", "date": "2026-06-15"},
      {"origin": "DXB", "destination": "BKK", "date": "2026-06-20"}
    ],
    "passengers": {"adults": 1, "children": 0, "infants": 0},
    "cabin_class": "economy"
  }'
```
Response: `{ offers: [...], totalResults: 3 }`

#### GET /api/flights/:offerId
Get a specific offer by ID (flat shape, 5-min in-memory cache).
```bash
curl -s https://travel-ai-backend-production-90a0.up.railway.app/api/flights/some-offer-id \
  -H "Authorization: Bearer <token>"
```

---

### User Profile (requires JWT)

#### GET /api/users/me
```bash
curl -s https://travel-ai-backend-production-90a0.up.railway.app/api/users/me \
  -H "Authorization: Bearer <token>"
```
Response: `{ user: { id, email, name, phone, createdAt }, wallet: { balance, currency }, subscription: { plan, status, expiresAt } }`

#### GET /api/users/me/stats
```bash
curl -s https://travel-ai-backend-production-90a0.up.railway.app/api/users/me/stats \
  -H "Authorization: Bearer <token>"
```
Response: `{ totalBookings, totalSpent, totalFlights, bonusBalance, memberSince }`

#### GET /api/users/me/preferences
```bash
curl -s https://travel-ai-backend-production-90a0.up.railway.app/api/users/me/preferences \
  -H "Authorization: Bearer <token>"
```
Response: `{ preferences: { theme, language, notifications: { priceAlerts, bookings, system } } }`

#### PATCH /api/users/me
Update name.
```bash
curl -s -X PATCH https://travel-ai-backend-production-90a0.up.railway.app/api/users/me \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name": "New Name"}'
```

#### PATCH /api/users/me/preferences
```bash
curl -s -X PATCH https://travel-ai-backend-production-90a0.up.railway.app/api/users/me/preferences \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"theme": "dark", "language": "ru"}'
```

---

### Favorites (requires JWT)

Prefix: `/api/users/me/favorites`

#### GET /api/users/me/favorites
```bash
curl -s https://travel-ai-backend-production-90a0.up.railway.app/api/users/me/favorites \
  -H "Authorization: Bearer <token>"
```
Optional query: `?type=hotel` or `?type=flight`.

#### POST /api/users/me/favorites
```bash
curl -s -X POST https://travel-ai-backend-production-90a0.up.railway.app/api/users/me/favorites \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"type":"hotel","itemId":"atlantis-dxb","itemData":{"name":"Atlantis The Palm","city":"Dubai"}}'
```

#### DELETE /api/users/me/favorites/:itemId?type=hotel
```bash
curl -s -X DELETE "https://travel-ai-backend-production-90a0.up.railway.app/api/users/me/favorites/atlantis-dxb?type=hotel" \
  -H "Authorization: Bearer <token>"
```

#### GET /api/users/me/favorites/check/:itemId?type=hotel
```bash
curl -s "https://travel-ai-backend-production-90a0.up.railway.app/api/users/me/favorites/check/atlantis-dxb?type=hotel" \
  -H "Authorization: Bearer <token>"
```
Response: `{ isFavorite: false }`

---

### Bookings (requires JWT)

#### GET /api/bookings
```bash
curl -s https://travel-ai-backend-production-90a0.up.railway.app/api/bookings \
  -H "Authorization: Bearer <token>"
```
Query params: `page`, `limit`, `type` (FLIGHT/HOTEL), `status` (PENDING/CONFIRMED/CANCELLED/FAILED), `from`, `to`.
Response: `{ bookings: [], total: 0, page: 1, totalPages: 0 }`

#### GET /api/bookings/:id
Get booking by UUID.

#### POST /api/bookings/:id/cancel
Cancel a PENDING booking.

#### POST /api/bookings/confirm
```bash
curl -s -X POST https://travel-ai-backend-production-90a0.up.railway.app/api/bookings/confirm \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"bookingId":"<uuid>","payFromWallet":false}'
```

---

### Wallet (requires JWT)

#### GET /api/wallet
```bash
curl -s https://travel-ai-backend-production-90a0.up.railway.app/api/wallet \
  -H "Authorization: Bearer <token>"
```
Response: `{ balance: "0", currency: "RUB", transactions: [] }`

---

### Price Alerts (requires JWT)

#### POST /api/price-alerts
```bash
curl -s -X POST https://travel-ai-backend-production-90a0.up.railway.app/api/price-alerts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"origin":"MOW","destination":"DXB","maxPrice":22000}'
```
Limit: 5 active alerts per user.

#### GET /api/price-alerts
```bash
curl -s https://travel-ai-backend-production-90a0.up.railway.app/api/price-alerts \
  -H "Authorization: Bearer <token>"
```

#### DELETE /api/price-alerts/:id
Soft-delete (deactivates the alert).

---

### Notifications (requires JWT)

#### GET /api/notifications
```bash
curl -s https://travel-ai-backend-production-90a0.up.railway.app/api/notifications \
  -H "Authorization: Bearer <token>"
```
Response: `{ data: [], meta: { page, pageSize, total, totalPages } }`

---

### Search History (requires JWT)

#### GET /api/search-history
Also available at `/api/search/history` (alias).
```bash
curl -s https://travel-ai-backend-production-90a0.up.railway.app/api/search-history \
  -H "Authorization: Bearer <token>"
```
Response: `{ data: [] }`

---

## Demo Seed Data Already in DB

- **Price alert:** MOW -> DXB, maxPrice 22000 RUB (active)
- **Demo user:** demo@travelai.app, plan FREE, wallet 0 RUB

---

## Notes for Presenter

- All flight/hotel search endpoints return **mock data** in MVP (real Duffel/Booking.com API keys not wired to production).
- Rate limit: 100 req/min global, 10 req/min on `/api/auth/*`.
- JWT `accessToken` expires in 15 minutes. Use `refreshToken` to get a new one.
- WebSocket is available for real-time chat (connect to `wss://travel-ai-backend-production-90a0.up.railway.app`).
- The `/api/chat` endpoint powers the AI travel assistant (requires auth).
