# Amadeus Self-Service API — инструкция по подключению

## 1. Регистрация на developers.amadeus.com

1. Перейдите на https://developers.amadeus.com и нажмите **Create account**.
2. Заполните форму: имя, email, пароль. Подтвердите email (письмо придёт в течение 1–2 минут).
3. После входа нажмите **My Self-Service Workspace** в правом верхнем углу.
4. Нажмите **Create new app** → введите любое название (например, `travel-ai`).
5. В поле **APIs** добавьте:
   - Hotel Search (v3) — поиск отелей
   - Flight Offers Search (v2) — поиск авиабилетов
   - Hotel List (v1, Reference Data) — список отелей по городу
6. Нажмите **Create**. Приложение появится в списке.
7. На странице приложения скопируйте **API Key** (это `AMADEUS_CLIENT_ID`) и **API Secret** (это `AMADEUS_CLIENT_SECRET`).

Sandbox аккаунт бесплатный и не требует ввода карты. Лимит: 2 000 запросов в месяц.


## 2. Переменные окружения в Railway

Перейдите на https://railway.app → ваш проект → вкладка **Variables** и добавьте:

| Переменная             | Значение                                      |
|------------------------|-----------------------------------------------|
| `AMADEUS_CLIENT_ID`    | API Key из личного кабинета Amadeus           |
| `AMADEUS_CLIENT_SECRET`| API Secret из личного кабинета Amadeus        |
| `AMADEUS_BASE_URL`     | `https://test.api.amadeus.com` (для sandbox)  |

Для перехода в production замените `AMADEUS_BASE_URL` на `https://api.amadeus.com`.
Production требует отдельного одобрения Amadeus (кнопка **Move to Production** в личном кабинете).

После добавления переменных Railway автоматически перезапустит сервис.


## 3. Проверка интеграции

### Шаг 1 — убедитесь, что переменные приняты

```bash
curl https://travel-ai-backend-production-90a0.up.railway.app/api/integrations/status
```

Ожидаемый ответ при правильной настройке:

```json
{
  "amadeus": {
    "configured": true,
    "mode": "sandbox",
    "base_url": "https://test.api.amadeus.com"
  },
  ...
}
```

Если `configured: false` — переменные не подхватились, проверьте Railway Variables.

### Шаг 2 — реальный поиск отелей

```bash
curl -X POST https://travel-ai-backend-production-90a0.up.railway.app/api/hotels/search \
  -H "Content-Type: application/json" \
  -d '{
    "city": "Dubai",
    "checkIn": "2025-09-01",
    "checkOut": "2025-09-05",
    "guests": { "adults": 2 }
  }'
```

В ответе должен быть массив отелей с реальными ценами.
В логах Railway появится строка `[Amadeus] Token refreshed, expires in 1799 s`.

### Шаг 3 — реальный поиск рейсов

```bash
curl -X POST https://travel-ai-backend-production-90a0.up.railway.app/api/flights/search \
  -H "Content-Type: application/json" \
  -d '{
    "origin": "MAD",
    "destination": "NYC",
    "departureDate": "2025-09-01",
    "passengers": { "adults": 1 }
  }'
```

### Диагностика ошибок

| Ошибка в логах                              | Причина                                   | Решение                                  |
|---------------------------------------------|-------------------------------------------|------------------------------------------|
| `Token request failed (401)`                | Неверный CLIENT_ID или CLIENT_SECRET      | Перепроверьте значения в Railway         |
| `Token request failed (429)`                | Превышен лимит запросов токенов           | Подождите — токен кешируется на 30 минут |
| `Hotel list failed (400)` с `INVALID_FORMAT`| Неподдерживаемый IATA код в sandbox       | Используйте коды из списка ниже          |
| `No hotels found for cityCode=XXX`          | Город не найден в CITY_TO_IATA маппинге   | Передайте IATA код напрямую (например, `"city": "MAD"`) |
| `Falling back to mock`                      | Amadeus вернул ошибку → мок подставился   | Смотрите следующую строку лога с причиной|


## 4. Ограничения Amadeus Sandbox

Sandbox — это тестовая среда с синтетическими данными. Реальных бронирований нет.

### IATA коды, гарантированно работающие в sandbox

Отели:
```
MAD  — Мадрид
BCN  — Барселона
PAR  — Париж (все аэропорты)
LON  — Лондон (все аэропорты)
NYC  — Нью-Йорк (все аэропорты)
DXB  — Дубай
SIN  — Сингапур
TYO  — Токио
BKK  — Бангкок
AMS  — Амстердам
```

Рейсы (Flight Offers Search):
```
MAD → NYC  (Madrid → New York)
BCN → LON  (Barcelona → London)
PAR → DXB  (Paris → Dubai)
JFK → CDG  (New York → Paris)
```

### Что НЕ работает в sandbox

- Коды городов СНГ (MOW, LED, ALA, TAS) — данных нет или возвращается пустой массив.
- Реальные цены и наличие — цифры синтетические.
- Booking/оплата — endpoint `/v1/booking/hotel-orders` недоступен в sandbox без партнёрского статуса.

### Переход в Production

1. В личном кабинете Amadeus нажмите **Move to Production**.
2. Заполните форму (URL вашего сайта, описание проекта).
3. Amadeus вышлет production ключи на email в течение 1–3 рабочих дней.
4. Обновите `AMADEUS_BASE_URL` в Railway на `https://api.amadeus.com`.


## 5. Механизм кеширования токена

OAuth2 токен Amadeus живёт 1799 секунд (~30 минут).
Сервис кеширует его в памяти и обновляет автоматически за 60 секунд до истечения.
При рестарте процесса (Railway deploy) кеш сбрасывается — первый запрос к Amadeus
после рестарта займёт на ~300 мс дольше из-за получения нового токена.
