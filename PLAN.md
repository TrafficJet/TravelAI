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

## Текущая фаза: 22 — Деплой на Railway (пересборка — фикс Prisma permissions)
**Исполнитель:** mobile-dev (два батча параллельно)
**Цель:** Все 27 экранов используют токены дизайн-системы (Colors, Typography, Spacing)

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
