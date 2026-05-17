# Travel AI — Claude Tool Definitions

Инструменты передаются в Anthropic Messages API в поле `tools`.
Claude вызывает их когда пользователь просит найти рейсы, отели или
получить информацию о брони/кошельке.

После получения `tool_use` блока от Claude бэкенд:
1. Выполняет соответствующий вызов (`/api/search/flights` и т.д.)
2. Записывает `TOOL_USE` и `TOOL_RESULT` сообщения в БД
3. Отправляет результат обратно в Claude (`role: "user"`, `content: [{type: "tool_result", ...}]`)
4. Продолжает стрим ответа Claude клиенту

---

## Tool: `search_flights`

Поиск авиарейсов по параметрам пользователя.

```json
{
  "name": "search_flights",
  "description": "Ищет доступные авиарейсы по заданным параметрам. Используй этот инструмент когда пользователь хочет найти перелёт. Возвращает список офферов с ценами и расписанием.",
  "input_schema": {
    "type": "object",
    "properties": {
      "origin": {
        "type": "string",
        "description": "IATA-код аэропорта или города отправления. Примеры: SVO (Шереметьево), LED (Пулково), DME (Домодедово). Если пользователь назвал город — используй основной аэропорт.",
        "pattern": "^[A-Z]{3}$"
      },
      "destination": {
        "type": "string",
        "description": "IATA-код аэропорта или города назначения.",
        "pattern": "^[A-Z]{3}$"
      },
      "departure_date": {
        "type": "string",
        "description": "Дата вылета в формате YYYY-MM-DD. Если пользователь сказал 'через неделю' — рассчитай дату от сегодня.",
        "pattern": "^\\d{4}-\\d{2}-\\d{2}$"
      },
      "return_date": {
        "type": "string",
        "description": "Дата обратного вылета в формате YYYY-MM-DD. Указывай только для перелётов туда-обратно. Если пользователь не упомянул возврат — не указывай это поле.",
        "pattern": "^\\d{4}-\\d{2}-\\d{2}$"
      },
      "adults": {
        "type": "integer",
        "description": "Количество взрослых пассажиров (старше 12 лет). Минимум 1.",
        "minimum": 1,
        "maximum": 9,
        "default": 1
      },
      "children": {
        "type": "integer",
        "description": "Количество детей от 2 до 12 лет.",
        "minimum": 0,
        "maximum": 8,
        "default": 0
      },
      "infants": {
        "type": "integer",
        "description": "Количество младенцев до 2 лет (без отдельного места).",
        "minimum": 0,
        "maximum": 4,
        "default": 0
      },
      "cabin_class": {
        "type": "string",
        "description": "Класс кабины. Используй ECONOMY если пользователь не уточнил.",
        "enum": ["ECONOMY", "BUSINESS", "FIRST"],
        "default": "ECONOMY"
      }
    },
    "required": ["origin", "destination", "departure_date"]
  }
}
```

**Пример вызова**
```json
{
  "name": "search_flights",
  "input": {
    "origin": "SVO",
    "destination": "IST",
    "departure_date": "2025-06-10",
    "return_date": "2025-06-20",
    "adults": 2,
    "cabin_class": "ECONOMY"
  }
}
```

---

## Tool: `search_hotels`

Поиск отелей в заданном городе на указанные даты.

```json
{
  "name": "search_hotels",
  "description": "Ищет доступные отели по городу и датам проживания. Используй когда пользователь ищет жильё для поездки. Возвращает список отелей с ценами, рейтингами и удобствами.",
  "input_schema": {
    "type": "object",
    "properties": {
      "city": {
        "type": "string",
        "description": "Название города на английском языке (используется для API Booking.com). Примеры: Istanbul, Dubai, Bali, Paris. Переводи русские названия в английские."
      },
      "check_in": {
        "type": "string",
        "description": "Дата заезда в формате YYYY-MM-DD.",
        "pattern": "^\\d{4}-\\d{2}-\\d{2}$"
      },
      "check_out": {
        "type": "string",
        "description": "Дата выезда в формате YYYY-MM-DD. Должна быть позже check_in.",
        "pattern": "^\\d{4}-\\d{2}-\\d{2}$"
      },
      "adults": {
        "type": "integer",
        "description": "Количество взрослых гостей.",
        "minimum": 1,
        "maximum": 30,
        "default": 2
      },
      "children": {
        "type": "integer",
        "description": "Количество детей.",
        "minimum": 0,
        "maximum": 10,
        "default": 0
      },
      "rooms": {
        "type": "integer",
        "description": "Количество номеров. Обычно 1, если пользователь не уточнил.",
        "minimum": 1,
        "maximum": 30,
        "default": 1
      },
      "star_rating": {
        "type": "array",
        "description": "Фильтр по звёздности. Передавай массив допустимых значений. Пример: [3, 4] для 3–4 звезды. Если пользователь не уточнил — не передавай.",
        "items": {
          "type": "integer",
          "enum": [1, 2, 3, 4, 5]
        }
      },
      "max_price_per_night": {
        "type": "number",
        "description": "Максимальная цена за ночь в рублях. Передавай только если пользователь назвал бюджет."
      }
    },
    "required": ["city", "check_in", "check_out"]
  }
}
```

**Пример вызова**
```json
{
  "name": "search_hotels",
  "input": {
    "city": "Istanbul",
    "check_in": "2025-06-10",
    "check_out": "2025-06-15",
    "adults": 2,
    "rooms": 1,
    "star_rating": [4, 5]
  }
}
```

---

## Tool: `create_booking`

Создаёт черновик брони по выбранному офферу. Бронь сохраняется в БД
со статусом `PENDING` и затем подтверждается пользователем через
`POST /api/bookings/confirm`.

```json
{
  "name": "create_booking",
  "description": "Создаёт предварительную бронь (статус PENDING) для выбранного пользователем рейса или отеля. Вызывай только после явного подтверждения от пользователя ('Да, бронируй', 'Оформи', и т.п.). После вызова пользователю покажется карточка для оплаты с кошелька.",
  "input_schema": {
    "type": "object",
    "properties": {
      "type": {
        "type": "string",
        "description": "Тип брони: FLIGHT или HOTEL.",
        "enum": ["FLIGHT", "HOTEL"]
      },
      "offer_id": {
        "type": "string",
        "description": "ID оффера из результатов search_flights или search_hotels. Скопируй точное значение offerId из результата поиска."
      },
      "passengers": {
        "type": "array",
        "description": "Список пассажиров. Обязателен для FLIGHT. Попроси пользователя предоставить данные если они не были указаны.",
        "items": {
          "type": "object",
          "properties": {
            "first_name": {
              "type": "string",
              "description": "Имя латиницей (как в паспорте). Пример: IVAN"
            },
            "last_name": {
              "type": "string",
              "description": "Фамилия латиницей. Пример: PETROV"
            },
            "birth_date": {
              "type": "string",
              "description": "Дата рождения в формате YYYY-MM-DD.",
              "pattern": "^\\d{4}-\\d{2}-\\d{2}$"
            },
            "passport": {
              "type": "string",
              "description": "Номер паспорта (международного). Пример: 7700123456"
            },
            "passport_expiry": {
              "type": "string",
              "description": "Срок действия паспорта в формате YYYY-MM-DD.",
              "pattern": "^\\d{4}-\\d{2}-\\d{2}$"
            }
          },
          "required": ["first_name", "last_name", "birth_date", "passport", "passport_expiry"]
        }
      },
      "guests": {
        "type": "array",
        "description": "Список гостей. Обязателен для HOTEL.",
        "items": {
          "type": "object",
          "properties": {
            "first_name": {
              "type": "string",
              "description": "Имя гостя (основного контактного лица)."
            },
            "last_name": {
              "type": "string",
              "description": "Фамилия гостя."
            }
          },
          "required": ["first_name", "last_name"]
        }
      },
      "contact_email": {
        "type": "string",
        "description": "Email для отправки подтверждения брони. Если пользователь не назвал — используй email из его профиля.",
        "format": "email"
      },
      "contact_phone": {
        "type": "string",
        "description": "Телефон для связи. Формат E.164: +79001234567"
      }
    },
    "required": ["type", "offer_id", "contact_email"]
  }
}
```

**Пример вызова (рейс)**
```json
{
  "name": "create_booking",
  "input": {
    "type": "FLIGHT",
    "offer_id": "off_0001abc",
    "contact_email": "ivan@example.com",
    "contact_phone": "+79001234567",
    "passengers": [
      {
        "first_name": "IVAN",
        "last_name": "PETROV",
        "birth_date": "1990-05-15",
        "passport": "7700123456",
        "passport_expiry": "2030-01-01"
      }
    ]
  }
}
```

---

## Tool: `get_wallet_balance`

Возвращает текущий баланс кошелька пользователя. Вызывается когда
пользователь спрашивает о балансе или перед бронированием.

```json
{
  "name": "get_wallet_balance",
  "description": "Возвращает текущий баланс внутреннего кошелька пользователя. Используй когда пользователь спрашивает сколько у него денег, или когда нужно проверить хватит ли средств перед оформлением брони.",
  "input_schema": {
    "type": "object",
    "properties": {},
    "required": []
  }
}
```

**Пример вызова**
```json
{
  "name": "get_wallet_balance",
  "input": {}
}
```

**Пример результата (tool_result)**
```json
{
  "balance": "3500.00",
  "currency": "RUB",
  "lastTopupAt": "2025-05-10T12:00:00Z"
}
```

---

## Tool: `get_booking_status`

Возвращает статус и детали существующей брони пользователя.

```json
{
  "name": "get_booking_status",
  "description": "Возвращает текущий статус и детали брони. Используй когда пользователь спрашивает о статусе своей брони, хочет узнать детали перелёта/отеля или уточнить подтверждение.",
  "input_schema": {
    "type": "object",
    "properties": {
      "booking_id": {
        "type": "string",
        "description": "UUID брони из системы Travel AI. Если пользователь не назвал ID — уточни или предложи показать список броней."
      }
    },
    "required": ["booking_id"]
  }
}
```

**Пример вызова**
```json
{
  "name": "get_booking_status",
  "input": {
    "booking_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Пример результата (tool_result)**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "FLIGHT",
  "status": "CONFIRMED",
  "provider": "DUFFEL",
  "totalPrice": "15000.00",
  "currency": "RUB",
  "createdAt": "2025-05-10T10:00:00Z",
  "details": {
    "segments": [
      {
        "origin": "SVO",
        "destination": "IST",
        "departureAt": "2025-06-10T08:00:00Z",
        "arrivalAt": "2025-06-10T11:30:00Z",
        "airline": "Аэрофлот",
        "flightNumber": "SU 100"
      }
    ],
    "bookingReference": "ABCDEF"
  }
}
```

---

## Системный промпт Claude

Передаётся как `system` в каждом запросе к Messages API:

```
Ты — AI-ассистент для путешествий Travel AI, работающий на русском языке.
Помогаешь пользователям из стран СНГ планировать поездки, находить рейсы и
отели, оформлять брони.

Правила:
1. Отвечай ТОЛЬКО на русском языке.
2. Будь дружелюбным, конкретным и лаконичным. Не нужны лишние формальности.
3. Используй инструменты (tools) для поиска реальных данных — не выдумывай рейсы и цены.
4. Перед бронированием ВСЕГДА уточни у пользователя данные пассажиров/гостей.
5. Перед вызовом create_booking ОБЯЗАТЕЛЬНО получи явное подтверждение от пользователя.
6. Если баланс кошелька недостаточен — сообщи об этом и предложи пополнить.
7. При поиске рейсов всегда уточняй: туда и обратно или только туда.
8. Показывай не более 3–5 лучших вариантов из результатов поиска.
9. Форматируй цены в рублях с разделителями: 15 000 ₽.
10. Если не знаешь IATA-код города — используй search_flights с очевидным кодом
    (например, MOW для Москвы, LED для Санкт-Петербурга).

Контекст пользователя передаётся системой автоматически.
```
