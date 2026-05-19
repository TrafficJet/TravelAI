# TravelAI / SVIT — Project Plan

## Статус: Фаза 21 в работе

## 📌 Брендинг — решения принятые 19.05.2026

### Название
- **Выбрано: SVIT** (від "світ" — мир/свет; звучит и по-украински, и по-английски)
- Логотип: **Abstract Symbol (Concept C)** ✅ УТВЕРЖДЁН пользователем 19.05.2026
  - Компас + буква S из двух кривых Безье, монохромный
  - 3 версии: Full Lockup Light / Icon Only 1024×1024 / Dark Background
  - Файл: `marketing/logos/svit_concepts.html`
- Цвета логотипа: #6C63FF (Indigo), #00B4D8 (Teal), #FFB347 (Gold), #1A1A2E (Deep Navy), #1A1A1A (Near Black)

### Домен
- **getsvit.com** — ✅ свободен по состоянию на 19.05.2026, цена ~$13/год
- Зарегистрировать на: namecheap.com / nic.ua / reg.ua
- ⏳ Регистрация отложена — сделать при запуске

### Занятые домены (для справки)
- svit.com ❌ (Корея, парковый с 2003)
- svit.app ❌ (парковый)
- svit.travel ❌
- svitai.com ❌ (до авг. 2026)
- flysvit.com ✅ — запасной вариант

### Юридические риски
- ⚠️ **SVIT-TRAVEL PP** (Украина) — турагентство, прямое совпадение категорий
- ⚠️ **SVIT Schweiz** (Швейцария) — недвижимость, другая категория
- Перед запуском: консультация IP-адвоката (особенно по Украине)

---

## Завершённые фазы
- ✅ Фаза 1-10: Архитектура, бэкенд API, мобильное приложение, аутентификация
- ✅ Фаза 11-13: AI-чат, бронирование, платёжная система
- ✅ Фаза 14: 125/125 тестов
- ✅ Фаза 15: hotel-detail, booking-success, email-уведомления
- ✅ Фаза 16: forgot-password, reset-password, settings, explore, 154/154 тестов
- ✅ Фаза 17: Анимации, скелетоны, плавные переходы (reanimated)
- ✅ Фаза 18: Избранное, карта отелей, мультигород, 191/191 тестов
- ✅ Фаза 19: Google + Apple OAuth, 204/204 тестов
- ✅ Фаза 20: Брендбук + дизайн-система (colors, typography, spacing, radius, shadows)

## ✅ Фаза 21 завершена — Применение брендинга на все экраны (TypeScript 0 ошибок)

## ✅ Фаза 22 завершена — Деплой на Railway
URL: https://travel-ai-backend-production-90a0.up.railway.app (status: ok, db: ok)

## ✅ Фаза 23 — EAS Build Android (запущен 19.05.2026)
Build ID: db0be556-550d-42c9-8121-87651100207f
https://expo.dev/accounts/forza22/projects/travel-ai/builds/db0be556-550d-42c9-8121-87651100207f

## ✅ Фаза 24 — App Store скриншоты (7 экранов)
Файл: marketing/screenshots/app-store-screenshots.html (62KB)

## ✅ Фаза 25 — API интеграции (infrastructure ready)
- Amadeus, Duffel, Aviasales сервисы реализованы, работают на моке без ключей
- OAuth token caching в amadeus.service.ts (30 мин TTL)
- Endpoint: GET /api/integrations/status — показывает статус каждой интеграции
- scripts/railway-env-setup.sh — скрипт для выставления prod env vars
- INTEGRATIONS_SETUP.md — гайд по получению всех API ключей
- DEPLOY.md — полная документация деплоя
- tsc: 0 ошибок ✅

### Что нужно сделать вручную для перехода с mock → real:
| Сервис | Env var | Где взять |
|---|---|---|
| Amadeus (отели) | AMADEUS_CLIENT_ID + CLIENT_SECRET | developers.amadeus.com (бесплатно) |
| Duffel (рейсы) | DUFFEL_API_KEY | app.duffel.com → Settings → API Tokens |
| Aviasales (СНГ) | AVIASALES_TOKEN + MARKER | travelpayouts.com |
| YooKassa | YOOKASSA_SECRET_KEY | yookassa.ru |
| Stripe | STRIPE_SECRET_KEY | dashboard.stripe.com |

## 📋 Фаза 26 — iOS Build (требует Apple Developer Account $99/год)

## 📋 Фаза 27 — App Store скриншоты (очередь)
**Исполнитель:** ui-designer + copywriter
**Цель:** 7 скриншотов для iOS/Android (тексты готовы в marketing/appstore-copy.md)

## 📋 Фаза 25 — iOS Build (требует Apple Developer Account)
**Исполнитель:** devops
**Цель:** IPA для TestFlight

### Батч A (auth + tabs):
- (auth)/login.tsx, register.tsx, forgot-password.tsx, reset-password.tsx
- (tabs)/index.tsx, bookings.tsx, favorites.tsx, explore.tsx
- (tabs)/notifications.tsx, profile.tsx, wallet.tsx, search-history.tsx

### Батч B (standalone + components):
- hotel-detail.tsx, flight-detail.tsx, booking-success.tsx
- settings.tsx, bookings/[bookingId].tsx, hotels-map.tsx, onboarding.tsx
- components/chat/FlightCard.tsx, HotelCard.tsx, ChatInput.tsx
- components/booking/FlightCard.tsx, HotelCard.tsx
- components/wallet/BalanceDisplay.tsx, TransactionItem.tsx
- Layouts: _layout.tsx, (auth)/_layout.tsx, (tabs)/_layout.tsx

## Фаза 22 — Деплой на Railway
**Исполнитель:** backend-dev
**Цель:** Бэкенд работает в продакшне на Railway
- railway.toml конфиг
- Переменные окружения
- railway up

## Фаза 23 — EAS Build
**Исполнитель:** mobile-dev + devops
**Цель:** APK для Android, IPA для iOS
- app.json настройка
- eas.json конфиг
- eas build
