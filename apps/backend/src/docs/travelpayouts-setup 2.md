# Travelpayouts API — инструкция по подключению

Один API-ключ (`TRAVELPAYOUTS_API_KEY`) закрывает и рейсы (Aviasales), и отели (Hotellook / Booking.com, Hotels.com, Ostrovok).

## Регистрация (5 минут, бесплатно)

1. Перейти на https://travelpayouts.com
2. Нажать **Sign Up** — зарегистрироваться через email или Google.
3. В личном кабинете перейти: **Dashboard → API** (левое меню).
4. Скопировать **API Token** (он же `X-Access-Token` для рейсов и `token` для отелей).

## Установка переменной окружения

### Локально

```bash
# backend/.env
TRAVELPAYOUTS_API_KEY=ваш_токен_здесь
```

### Railway (продакшн)

В проекте Railway:

1. Открыть сервис backend.
2. Перейти **Variables → New Variable**.
3. Добавить:
   - Name: `TRAVELPAYOUTS_API_KEY`
   - Value: ваш токен

Больше никаких переменных для рейсов и отелей не нужно.

## Использованные API

### Рейсы — Aviasales v3 prices_for_dates

```
GET https://api.travelpayouts.com/aviasales/v3/prices_for_dates
Headers: X-Access-Token: YOUR_TOKEN
Params:
  origin=MOW          # IATA-код аэропорта вылета
  destination=JFK     # IATA-код аэропорта прилёта
  departure_at=2026-06-01
  currency=rub
  limit=10
  one_way=true
  sorting=price
```

### Отели — Hotellook cache.json

```
GET https://engine.hotellook.com/api/v2/cache.json
Params:
  location=Moscow     # город или IATA-код
  currency=rub
  checkIn=2026-06-01
  checkOut=2026-06-03
  adultsCount=2
  lang=ru
  token=YOUR_TOKEN
  limit=10
```

## Graceful fallback

Если `TRAVELPAYOUTS_API_KEY` не задан или API вернул ошибку, сервис автоматически
возвращает моковые данные. Приложение работает в оффлайн-режиме без каких-либо
крашей.

## Покрытие СНГ

- Рейсы: Аэрофлот, S7, Победа, Уральские авиалинии, Turkish Airlines, Emirates и 100+ авиакомпаний.
- Отели: агрегирует Booking.com, Hotels.com, Ostrovok, Expedia и десятки других источников.
- Города: Москва, Санкт-Петербург, Алматы, Ташкент, Баку, Тбилиси, Минск, Ереван и весь СНГ-регион.
