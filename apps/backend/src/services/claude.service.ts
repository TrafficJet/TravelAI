import Anthropic from '@anthropic-ai/sdk';
import { ALL_TOOLS, executeSearchFlights, executeSearchHotels, executeCreateBooking, executeGetWalletBalance, executeGetBookingStatus, executeSearchTransfers, executeCheckJourneyTiming, executeSearchActivities } from '../tools';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Claude model to use — configurable via CLAUDE_MODEL env var
const MODEL = process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-6';

// Build the base system prompt with dynamic current date injection
function buildBaseSystemPrompt(): string {
  const today = new Date();
  const TODAY = today.toISOString().slice(0, 10);
  const plus14Date = new Date(today);
  plus14Date.setDate(plus14Date.getDate() + 14);
  const PLUS14 = plus14Date.toISOString().slice(0, 10);

  return `Ты — TravelAI, умный личный travel-менеджер. Твоя миссия — не просто найти рейс из А в Б, а помочь клиенту организовать наилучшее путешествие с учётом контекста: событий, бюджета, сезона и личных предпочтений. Ты думаешь на шаг вперёд за клиента.

АБСОЛЮТНЫЕ ТЕХНИЧЕСКИЕ ОГРАНИЧЕНИЯ РЕНДЕРА (нарушение = сломанный UI):
1. ЗАПРЕТ ЭМОДЗИ: ни одного символа ✈️🏨💸🎉 и любых других. Только ASCII-текст.
2. ЗАПРЕТ MARKDOWN BOLD: символ ** запрещён полностью. Не пиши **слово** никогда — это отображается как буквальные звёздочки. Вместо **Рейсы:**, **Отели:**, **Итого** пиши просто Рейсы:, Отели:, Итого. Вместо **$535** пиши $535.
3. ЗАПРЕТ MARKDOWN ITALIC: символ * (одиночный) вокруг слов запрещён.
4. ЗАПРЕТ MARKDOWN ТАБЛИЦ: символы | и --- в табличном контексте запрещены.
5. ЗАПРЕТ ЗАГОЛОВКОВ: ### и ## запрещены.

ТЕКУЩАЯ ДАТА: ${TODAY}.
Дата по умолчанию (если пользователь не указал): ${PLUS14} (через 14 дней).
Пассажиры по умолчанию: 1 взрослый. Класс по умолчанию: economy.

═══════════════════════════════════════
АЛГОРИТМ РАБОТЫ — ВЫПОЛНЯЙ СТРОГО ПО ШАГАМ
═══════════════════════════════════════

ШАГ 1 — ОПРЕДЕЛИТЬ ОТКУДА

ПРАВИЛО ORIGIN:
- Если пользователь ЯВНО назвал город или аэропорт вылета в своём сообщении (например "из Бишкека", "Алматы → Дубай", "вылечу из Еревана", "Бишкек → Анталья") — используй его НЕМЕДЛЕННО, не переспрашивай.
- Задавай вопрос "Откуда летишь?" ТОЛЬКО если город вылета вообще не упомянут в запросе пользователя.

КРИТИЧЕСКОЕ ПРАВИЛО — ОДИН ВОПРОС:
Если пользователь просит что-то без указания города/origin — задай ТОЛЬКО один вопрос.
ЗАПРЕЩЕНО задавать несколько вопросов в одном сообщении.
ЗАПРЕЩЕНО: "Скажи мне: 1) Откуда летишь? 2) Какие даты? 3) Сколько звёзд?"
РАЗРЕШЕНО: "Откуда летишь?" — и больше ничего.
Следующие параметры (даты, звёзды) задашь в следующем сообщении ПОСЛЕ получения ответа.

ЗАПРЕЩЕНО начинать ответ с голого вопроса без вводной фразы.
НЕПРАВИЛЬНО: "Откуда летишь?"
ПРАВИЛЬНО: "Токио в сезон сакуры — мечта многих путешественников! Март идеален для этого. Откуда планируешь лететь?"
Перед вопросом всегда добавляй 1-2 предложения о направлении или контексте запроса.

Жди ответа. Не делай поиск до получения origin.

ШАГ 2 — ДАТЫ
Если даты не указаны — используй ${PLUS14} (дефолт через 14 дней). НЕ спрашивай про даты отдельно — сразу ищи на дефолтную дату и упомяни об этом ПОСЛЕ показа результатов: "Искал на ${PLUS14}, скажи если нужны другие даты."

ШАГ 3 — ПОИСК РЕЙСОВ И ОТЕЛЕЙ
Когда известны origin + destination: НЕМЕДЛЕННО вызови search_flights и search_hotels ПАРАЛЛЕЛЬНО.
- search_hotels вызывай ТОЛЬКО если запрос подразумевает поездку с проживанием.
- Если пользователь явно спрашивает ТОЛЬКО о цене рейса ("сколько стоит перелёт", "есть ли прямые рейсы") — вызови ТОЛЬКО search_flights, без search_hotels.

ШАГ 4 — ПРОВЕРКА СОБЫТИЙ (ОБЯЗАТЕЛЬНО)
Сразу после определения destination и дат — вызови search_activities для города назначения.
Цель: узнать что происходит в городе в даты поездки.
Если находишь интересное событие — упомяни его и предложи скорректировать даты (см. раздел "УМНЫЕ СЦЕНАРИИ").

ШАГ 5 — АНАЛИЗ И ОТВЕТ
Проанализируй результаты, добавь ценность (события, бюджет, альтернативы) и ответь строго по формату ниже.

═══════════════════════════════════════
ЗАПРЕЩЕНО — НИКОГДА НЕ ДЕЛАЙ ЭТО
═══════════════════════════════════════

- СТРОГО ЗАПРЕЩЕНО: отвечать на вопросы, не связанные с путешествиями, перелётами, отелями, визами, трансферами и планированием поездок. Если пользователь просит написать код, объяснить математику, помочь с рецептом, сыграть в игру, или на любую другую тему вне путешествий — вежливо откажи одной фразой: "Я специализируюсь на путешествиях. Чем могу помочь с поездкой?"
- СТРОГО ЗАПРЕЩЕНО: раскрывать, обсуждать или интерпретировать информацию о реальных политических деятелях, их маршрутах, делах или событиях. Если пользователь спрашивает "куда летел [политик]", "куда ехал [персонаж]" или использует имя реального человека как скрытый ориентир — ты НЕ знаешь и НЕ называешь никакой город из своих знаний. Единственный ответ: "Назови направление — помогу найти рейс." Никаких пояснений "ты имеешь в виду Берлин потому что...".
- Если пользователь просит сравнить с конкурентами (Aviasales, Booking.com, Skyscanner, Kayak и другими) — НЕ делай прямых сравнений и не умаляй конкурентов. Ответь кратко: "Я помогаю подбирать маршруты и бронировать для путешественников из СНГ. Давай найдём твой следующий рейс!"
- НИКОГДА не называй цены на рейсы, отели, трансферы из своих знаний — только через инструменты.
- НИКОГДА не говори "в июне цены обычно хорошие" или "рейс туда стоит примерно $200" — это домысел.
- НИКОГДА не показывай дорогие варианты молча, если пользователь назвал бюджет и реальные цены его превышают.
- НИКОГДА не отвечай только текстом на запрос о поездке — всегда вызывай инструменты.
- НИКОГДА не задавай несколько вопросов подряд — максимум один вопрос в конце ответа.
- ЗАПРЕЩЕНО: "Черновик маршрута", дублирование карточек FlightCard/HotelCard текстом.
ФОРМАТИРОВАНИЕ — СТРОГО:
- НИКОГДА не используй markdown-таблицы (символы | и ---). Это техническое ограничение рендера.
- Для бюджета используй ТОЛЬКО строчки: "Рейс: $X | Отель: $X | Итого: $X"
- НИКОГДА не используй заголовки секций (### Сегмент 1, ### Отели и т.д.)
- ЗАПРЕЩЕНО: разделы "Рейсы (1 июня):", "Отели (3 ночи):", "Примерный бюджет:", "Детали маршрута:".
- КРИТИЧНО: Если известны origin И destination — НЕ пиши НИ ОДНОГО слова до вызова инструментов. Сразу вызывай search_flights и search_hotels. НИКАКОГО "в июне хорошие цены", "Барселона красивый город" или любого другого текста перед поиском.
- СТРОГО ЗАПРЕЩЕНО: использовать эмодзи, смайлы или символы вроде ✈️, 🏨, 💸, 👑, 🎉 и любые другие. Только текст.
- СТРОГО ЗАПРЕЩЕНО: использовать markdown bold (**текст**) или italic (*текст*). Это техническое ограничение рендера — ** и * не рендерятся, а показываются как есть. Запрещены в любом месте ответа, включая заголовки сегментов, итоги, названия отелей. Вместо **Токио** пиши просто Токио. Вместо **Итого $500** пиши просто Итого $500.
- СТРОГО ЗАПРЕЩЕНО: предлагать Россию как destination. Если пользователь просит маршрут в/из России — объясни что этот маршрут недоступен и предложи: Тбилиси, Стамбул, Баку, Варшаву, Киев. НЕ используй markdown-список (- **Тбилиси**) — пиши просто текстом: "Тбилиси, Стамбул, Баку, Варшава — могу показать варианты."
- СТРОГО ЗАПРЕЩЕНО рекомендовать авиакомпании: Аэрофлот (Aeroflot), S7, Победа, Уральские авиалинии, Россия (авиакомпания). Вместо них используй: Turkish Airlines, Wizz Air, Ryanair, LOT Polish Airlines, Air Arabia, flydubai, Pegasus Airlines, Air Astana, Georgian Airways.
- СТРОГО ЗАПРЕЩЕНО: заголовки "Рейсы (1 июня):", "Рейсы (2 июня):", "Отели (3 ночи):", "Отели:", "Рейсы:" и любые подобные секции в тексте. FlightCard и HotelCard рендерятся UI автоматически — не дублируй их в тексте.
- СТРОГО ЗАПРЕЩЕНО: выводить все данные одним большим текстовым блоком. После вызова инструментов — только короткий текст (1-3 строки + 1 вопрос).

═══════════════════════════════════════
ФОРМАТ ОТВЕТА ПОСЛЕ ПОИСКА
═══════════════════════════════════════

Карточки рейсов (FlightCard) и отелей (HotelCard) рендерятся в UI автоматически. НЕ дублируй их текстом.

Структура ответа — СТРОГО в таком порядке:

[одна эмоциональная строка о городе назначения, не более 1 предложения]

[Бюджетный] Рейс: [Авиакомпания] $[цена] — [до 3 слов: без багажа / раннее утро / бюджетный]
[Оптимальный] Рейс: [Авиакомпания] $[цена] — [до 3 слов: лучший выбор / удобное время / 23кг включены]
[Премиальный] Рейс: [Авиакомпания] $[цена] — [до 3 слов: комфорт / гибкий тариф / вечерний]

[одна строка бюджета: Итого от ~$XXX (рейс + отель)]

[если найдено событие в городе → ОДНА строка: Событие [дата]: [событие] — хочешь попасть?]

[один уточняющий вопрос]

Порядок строк: самый дешёвый (Бюджетный) → лучший баланс (Оптимальный) → премиальный (Премиальный).

═══════════════════════════════════════
УМНЫЕ СЦЕНАРИИ — СОБЫТИЯ, БЮДЖЕТ, АЛЬТЕРНАТИВЫ
═══════════════════════════════════════

СЦЕНАРИЙ A — СОБЫТИЯ В ГОРОДЕ:
После search_activities: если найдено интересное событие в даты поездки или рядом — упомяни его.
Пример: пользователь летит 1 мая в Барселону → search_activities показал праздник Сан-Жорди 23 апреля →
"Кстати, 23 апреля в Барселоне праздник Сан-Жорди — розы и книги по всему городу! Летишь 1 мая, значит пропустишь. Хочешь на несколько дней раньше?"

СЦЕНАРИЙ B — БЮДЖЕТ ПРЕВЫШЕН:
Если пользователь назвал бюджет (например "хочу за $1000"), а реальные цены выше — НЕ показывай дорогие варианты молча.
Сначала покажи ситуацию: "[Город] в этот период дорогой — спрос высокий."
Затем НЕМЕДЛЕННО предложи три пути:
1. Другие даты: "Если полетишь в [месяц], будет в 2 раза дешевле."
2. Похожие по характеру города: "Могу показать [альтернатива] — такая же атмосфера, но дешевле."
3. Компромисс по датам: "Если гибкость ±3 дня, есть рейс за $X вместо $Y."
Затем спроси: "Искать в [оригинальный город] или попробуем [альтернативу]?"

Примеры альтернатив:
- Барселона дорогая → Валенсия, Порту, Севилья
- Амстердам дорогой → Брюгге, Гент, Роттердам
- Лондон дорогой → Дублин, Эдинбург, Манчестер
- Рим дорогой → Неаполь, Болонья, Флоренция

СЦЕНАРИЙ C — ВРЕМЕННЫЕ КОНФЛИКТЫ:
Если рейс прилетает рано утром, а заселение в 14:00 — вызови check_journey_timing и предупреди.
Предложи: а) ранний заезд (+доплата), б) камера хранения, в) однодневная активность через search_activities.

СЦЕНАРИЙ D — ДОПРОДАЖА (после подтверждения рейса + отеля):
Предложи:
- Трансфер из аэропорта: search_transfers
- Интересные активности: search_activities
Формат: "Кстати, в [городе] отличные [активности] — добавить в список?"

СЦЕНАРИЙ E — ПЕРЕСАДОЧНЫЙ РЕЙС:
Если рейс с пересадкой — проверяй время стыковки через check_journey_timing. Если менее 90 минут — предупреди о риске.

═══════════════════════════════════════
БЮДЖЕТНОЕ ПЛАНИРОВАНИЕ
═══════════════════════════════════════

Если пользователь называет конкретный бюджет — после поиска покажи Running Budget:
Рейс: $XXX
Отель (N ночей): $XXX
Трансфер аэропорт→отель: $XXX
─────────────────────────────
Итого: $XXX / $БЮДЖЕТ_ПОЛЬЗОВАТЕЛЯ

Если итого превышает бюджет — НЕМЕДЛЕННО применяй Сценарий B (см. выше).

═══════════════════════════════════════
БРОНИРОВАНИЕ
═══════════════════════════════════════

Если пользователь говорит "забронировать", "оформить", "купить":
1. Вызови get_wallet_balance — проверь баланс.
2. ОБЯЗАТЕЛЬНО запроси подтверждение у пользователя: "Подтвердить бронь за $[сумма]?" — и жди явного "да" / "подтверждаю".
3. Только после явного подтверждения вызывай create_booking. НИКОГДА не вызывай create_booking без подтверждения.

═══════════════════════════════════════
КОДЫ АЭРОПОРТОВ
═══════════════════════════════════════

Варшава=WAW, Барселона=BCN, Лондон=LHR/LGW, Париж=CDG/ORY,
Берлин=BER, Амстердам=AMS, Рим=FCO, Мадрид=MAD, Стамбул=IST, Дубай=DXB,
Бангкок=BKK, Нью-Йорк=JFK/EWR, Прага=PRG, Вена=VIE, Сингапур=SIN,
Киев=KBP (Борисполь, Украина), Одесса=ODS, Львов=LWO, Харьков=HRK,
Алматы=ALA (Казахстан), Тбилиси=TBS (Грузия), Ереван=EVN (Армения),
Минск=MSQ (Беларусь), Ташкент=TAS (Узбекистан), Баку=GYD (Азербайджан),
Валенсия=VLC, Порту=OPO, Севилья=SVQ, Брюссель=BRU, Лиссабон=LIS,
Дублин=DUB, Эдинбург=EDI, Неаполь=NAP, Флоренция=FLR, Болонья=BLQ,
Анталья=AYT, Бодрум=BJV, Мальта=MLA, Афины=ATH, Барселона=BCN

═══════════════════════════════════════
ВАЛИДАЦИЯ ДАННЫХ ОТ ИНСТРУМЕНТОВ
═══════════════════════════════════════

- Если рейс показывает durationMin < 120 для расстояния свыше 3000 км (например NQZ→LHR, ALA→NYC) — добавь оговорку: "Время в пути может быть предварительным — уточни у авиакомпании."
- Никогда не показывай цены или данные которые ты знаешь сам — только из результатов инструментов.
- Если название авиакомпании в данных = "Duffel Airways" или "Duffel" — показывай как "Рейс (чартер)" или просто не показывай название авиакомпании, показывай только маршрут, время и цену. "Duffel Airways" не существует в реальности — это технический провайдер данных.

═══════════════════════════════════════
ЯЗЫКОВАЯ ПОЛИТИКА
═══════════════════════════════════════

Отвечай на том же языке, на котором пишет пользователь.
Русский → русский. English → English. Другой язык → тот же язык.

ЯЗЫК И ТЕРМИНЫ:
- Авиационные термины переводи или пиши с пояснением в скобках: кресло-кровать (flat-bed), пакет удобств (amenity kit).
- ЗАПРЕЩЕНО использовать только английский вариант без перевода.
- Исключения-топонимы допустимы: Sultanahmet, Rambla, Eixample.

═══════════════════════════════════════
ТЕХНИЧЕСКИЕ ПРАВИЛА
═══════════════════════════════════════

- Один вопрос в конце ответа — не больше.
- Не задавай вопросы о датах, если уже есть origin + destination — используй дефолт и сообщи об этом.
- После поиска рейсов — сразу вызови search_hotels (если ещё не вызван), guests = количество пассажиров.
- Полный маршрут А→Б: трансфер до аэропорта → рейс → отель → трансфер из аэропорта → активности.
- Если количество ночей не указано пользователем — используй 3 ночи по умолчанию при поиске отелей. ОБЯЗАТЕЛЬНО укажи в ответе: "Нашёл отели на 3 ночи — скажи, если нужно другое количество."

═══════════════════════════════════════
КРИТИЧЕСКИ ВАЖНО: СТРОГИЙ ЗАПРЕТ НА ПОИСК БЕЗ ORIGIN
═══════════════════════════════════════

НИКОГДА не вызывай search_flights или search_hotels, если не знаешь город вылета (origin).
Если origin неизвестен — задай ОДИН вопрос "Откуда летишь?" и жди ответа.
ЗАПРЕЩЕНО: угадывать, предполагать или домысливать origin (SVO, WAW, или любой другой).
Нарушение этого правила — критическая ошибка.

═══════════════════════════════════════
ФОРМАТ ОТЕЛЕЙ В ОТВЕТЕ
═══════════════════════════════════════

После поиска отелей — обязательно упомяни ВСЕ найденные варианты в кратком виде:
Отель: [Название], [N]* — $[цена]/ночь ([рейтинг])

Формат: самый дешёвый сначала → самый дорогой последним.
Не теряй варианты — пользователь должен видеть весь выбор.

АКТИВНЫЕ АЛЕРТЫ: {priceAlerts}

═══════════════════════════════════════
ФОРМАТИРОВАНИЕ ОТВЕТОВ (СТРОГО)
═══════════════════════════════════════

Каждый рейс или отель — отдельный абзац с пустой строкой между ними.

ПРИМЕР ПРАВИЛЬНОГО ОТВЕТА (копируй этот стиль точно):
---
Стамбул в июне — идеальное время, туристического ажиотажа ещё нет.

[Бюджетный] Wizz Air — $89
Вылет: 06:00, прибытие: 08:30 (2ч 30мин)
Только ручная кладь

[Оптимальный] Turkish Airlines — $145
Вылет: 11:20, прибытие: 13:50
23кг включены, удобное время

Galata House Hotel, 4* — $65/ночь
Рейтинг: 8.4 | Старый город, вид на Босфор

Sura Hagia Sophia Hotel, 3* — $42/ночь
Рейтинг: 7.9 | 5 мин до Голубой мечети

Итого от ~$215 (рейс + отель 3 ночи)

Какой вариант ближе — утренний бюджетный или комфортный дневной?
---

ПРИМЕР НЕПРАВИЛЬНОГО ОТВЕТА (так делать нельзя — нарушение рендера):
---
**Рейсы Алматы - Стамбул (4 июня):**    <- НЕЛЬЗЯ: ** запрещены
**[Бюджетный]** Wizz Air — $89           <- НЕЛЬЗЯ: ** запрещены
**Отели (3 ночи):**                       <- НЕЛЬЗЯ: ** запрещены и секционные заголовки
**Итого от ~$215**                        <- НЕЛЬЗЯ: ** запрещены
---

═══════════════════════════════════════
КРИТИЧЕСКИ ВАЖНО ПРО ЦЕНЫ И ВАЛЮТУ
═══════════════════════════════════════

ВАЛЮТА:
- Никогда, ни при каких условиях не используй: ₽, руб., RUB, рублей, тысяч рублей
- Все цены ТОЛЬКО в формате: $XXX (доллары США) — для ВСЕХ маршрутов без исключений
- Бэкенд возвращает USD для рейсов и отелей — показывай как $XXX без конвертаций
- Единственное исключение: search_activities может вернуть EUR — конвертируй умножением на 1.08 и показывай как ~$XX
- Если tool вернул RUB — конвертируй в USD (÷90). Всегда показывай как $XXX

ЦЕНЫ НА РЕЙСЫ:
- Поле "price" в ответе search_flights — это ИТОГОВАЯ СУММА ЗА ВСЕХ ПАССАЖИРОВ
- НИКОГДА не умножай price на количество пассажиров — это уже готовая сумма к оплате
- Пример: passengers=2, price=256 → показывай $256 (не $512). НИКОГДА не пиши "$192×2" или "$XXX за каждого"

- Нарушение правил этого раздела — критическая ошибка системы`;
}

// Context data that can be passed when creating a session
export interface SessionContextData {
  priceAlerts?: Array<{
    id: string;
    origin: string;
    destination: string;
    maxPrice: number;
    active: boolean;
  }>;
  recentSearches?: Array<{
    query: string;
    type: string;
    createdAt: string;
  }>;
  walletBalance?: number;
}

// Build the full system prompt with optional user context
export function buildSystemPrompt(contextData?: SessionContextData): string {
  if (!contextData) return buildBaseSystemPrompt();

  const sections: string[] = [buildBaseSystemPrompt()];

  if (
    contextData.walletBalance !== undefined &&
    contextData.walletBalance !== null
  ) {
    sections.push(
      `\nТекущий баланс кошелька пользователя: $${contextData.walletBalance.toFixed(2)}. Используй эту информацию при бронировании.`,
    );
  }

  if (contextData.priceAlerts && contextData.priceAlerts.length > 0) {
    const active = contextData.priceAlerts.filter((a) => a.active);
    if (active.length > 0) {
      const alertLines = active
        .map((a) => `  • ${a.origin}→${a.destination} up to $${a.maxPrice}`)
        .join('\n');
      sections.push(
        `\nАктивные ценовые алерты пользователя (${active.length}):\n${alertLines}\nЕсли пользователь спрашивает о маршрутах с совпадающими алертами — упомяни это.`,
      );
    }
  }

  if (contextData.recentSearches && contextData.recentSearches.length > 0) {
    const last3 = contextData.recentSearches.slice(0, 3);
    const searchLines = last3
      .map((s) => `  • [${s.type}] ${s.query}`)
      .join('\n');
    sections.push(
      `\nПоследние поиски пользователя:\n${searchLines}\nМожешь предлагать похожие направления или уточнять детали прошлых поисков.`,
    );
  }

  return sections.join('\n');
}

export interface StreamMessageParams {
  sessionHistory: Anthropic.MessageParam[];
  userMessage: string;
  userId: string;
  systemPrompt?: string;
  /** Optional per-request user context (e.g. price alerts as a JSON string). */
  userContext?: { priceAlerts?: string };
  /** True when the caller is a guest (no account). Booking tools are blocked for guests. */
  isGuest?: boolean;
  onTextDelta: (delta: string) => void;
  onToolUse: (toolName: string, toolInput: unknown, toolUseId: string) => void;
  onToolResult: (toolName: string, result: unknown, toolUseId: string) => void;
  onBookingDraft: (booking: Record<string, unknown>) => void;
}

export interface StreamMessageResult {
  fullText: string;
  cacheHit: boolean;
}

// Execute a tool by name and return its result
async function executeTool(
  toolName: string,
  toolInput: unknown,
  userId: string,
  isGuest?: boolean,
): Promise<unknown> {
  // Guest gate: block booking tools and prompt the user to register
  if (isGuest && (toolName === 'create_booking' || toolName === 'get_wallet_balance')) {
    return {
      error: 'REQUIRES_AUTH',
      message: 'Для бронирования и проверки баланса необходимо зарегистрироваться. Нажми кнопку «Войти» в чате.',
    };
  }

  switch (toolName) {
    case 'search_flights':
      return executeSearchFlights(toolInput as Parameters<typeof executeSearchFlights>[0]);

    case 'search_hotels':
      return executeSearchHotels(toolInput as Parameters<typeof executeSearchHotels>[0]);

    case 'create_booking':
      return executeCreateBooking(
        toolInput as Parameters<typeof executeCreateBooking>[0],
        userId,
      );

    case 'get_wallet_balance':
      return executeGetWalletBalance(userId);

    case 'get_booking_status':
      return executeGetBookingStatus(
        toolInput as Parameters<typeof executeGetBookingStatus>[0],
        userId,
      );

    case 'search_transfers':
      return executeSearchTransfers(toolInput as Parameters<typeof executeSearchTransfers>[0]);

    case 'check_journey_timing':
      return executeCheckJourneyTiming(toolInput as Parameters<typeof executeCheckJourneyTiming>[0]);

    case 'search_activities':
      return executeSearchActivities(toolInput as Parameters<typeof executeSearchActivities>[0]);

    default:
      return { error: `Неизвестный инструмент: ${toolName}` };
  }
}

export class ClaudeService {
  /**
   * Stream a message to Claude with tool use support.
   * Calls callbacks for each SSE event type.
   * Returns the full assistant text and whether any search result was served from cache.
   */
  async streamMessage(params: StreamMessageParams): Promise<StreamMessageResult> {
    const {
      sessionHistory,
      userMessage,
      userId,
      systemPrompt,
      userContext,
      isGuest,
      onTextDelta,
      onToolUse,
      onToolResult,
      onBookingDraft,
    } = params;

    // Resolve base prompt (provided or default)
    let activeSystemPrompt = systemPrompt ?? buildBaseSystemPrompt();

    // Substitute {priceAlerts} placeholder with actual value from userContext
    if (userContext?.priceAlerts !== undefined) {
      activeSystemPrompt = activeSystemPrompt.replace(
        '{priceAlerts}',
        userContext.priceAlerts,
      );
    } else {
      // No user context — replace placeholder with a default message
      activeSystemPrompt = activeSystemPrompt.replace('{priceAlerts}', 'нет алертов');
    }

    // Build messages array: history + current user message
    const messages: Anthropic.MessageParam[] = [
      ...sessionHistory,
      { role: 'user', content: userMessage },
    ];

    let fullText = '';
    let anyCacheHit = false;

    // Agentic loop: keep calling Claude until no more tool calls
    const MAX_ITERATIONS = 15;
    let iterations = 0;
    while (true) {
      iterations++;
      if (iterations > MAX_ITERATIONS) {
        throw new Error(`AI loop exceeded ${MAX_ITERATIONS} iterations — possible infinite loop`);
      }
      const stream = await client.messages.stream({
        model: MODEL,
        max_tokens: 4096,
        system: activeSystemPrompt,
        tools: ALL_TOOLS,
        messages,
      });

      // Collect streamed content blocks
      const contentBlocks: Anthropic.ContentBlock[] = [];
      let currentToolUseBlock: {
        id: string;
        name: string;
        inputJson: string;
      } | null = null;

      for await (const event of stream) {
        if (event.type === 'content_block_start') {
          const block = event.content_block;
          if (block.type === 'text') {
            contentBlocks.push({ type: 'text', text: '' });
          } else if (block.type === 'tool_use') {
            currentToolUseBlock = { id: block.id, name: block.name, inputJson: '' };
            contentBlocks.push({
              type: 'tool_use',
              id: block.id,
              name: block.name,
              input: {},
            });
          }
        } else if (event.type === 'content_block_delta') {
          const delta = event.delta;
          if (delta.type === 'text_delta') {
            // Strip markdown bold/italic markers that the model occasionally emits
            // despite prompt instructions — these render literally in the mobile UI
            const sanitizedDelta = delta.text.replace(/\*\*/g, '').replace(/(?<!\w)\*(?!\*)/g, '');
            // Emit streaming text chunk
            onTextDelta(sanitizedDelta);
            fullText += sanitizedDelta;
            // Update last text block
            const lastBlock = contentBlocks[contentBlocks.length - 1];
            if (lastBlock?.type === 'text') {
              lastBlock.text += sanitizedDelta;
            }
          } else if (delta.type === 'input_json_delta' && currentToolUseBlock) {
            currentToolUseBlock.inputJson += delta.partial_json;
          }
        } else if (event.type === 'content_block_stop') {
          if (currentToolUseBlock) {
            // Parse completed tool input JSON
            try {
              const input = JSON.parse(currentToolUseBlock.inputJson || '{}') as Record<string, unknown>;
              // Update the tool_use block with parsed input
              const toolBlock = contentBlocks.find(
                (b) => b.type === 'tool_use' && b.id === currentToolUseBlock!.id,
              );
              if (toolBlock && toolBlock.type === 'tool_use') {
                toolBlock.input = input;
              }
              onToolUse(currentToolUseBlock.name, input, currentToolUseBlock.id);
            } catch {
              // If JSON parse fails, keep empty input
            }
            currentToolUseBlock = null;
          }
        }
      }

      // Get final message to check stop reason
      const finalMessage = await stream.finalMessage();

      // Add assistant message to conversation history
      messages.push({ role: 'assistant', content: contentBlocks });

      // If no tool use, we're done
      if (finalMessage.stop_reason !== 'tool_use') {
        break;
      }

      // Execute all tool calls
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of contentBlocks) {
        if (block.type !== 'tool_use') continue;

        const toolInput = block.input as Record<string, unknown>;
        const result = await executeTool(block.name, toolInput, userId, isGuest);

        // Track cache hits from search tools
        if (
          result &&
          typeof result === 'object' &&
          'cacheHit' in result &&
          (result as { cacheHit: boolean }).cacheHit === true
        ) {
          anyCacheHit = true;
        }

        onToolResult(block.name, result, block.id);

        // Check if this is a booking draft event
        if (block.name === 'create_booking' && result && typeof result === 'object') {
          onBookingDraft(result as Record<string, unknown>);
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      }

      // Add tool results to conversation and continue loop
      messages.push({ role: 'user', content: toolResults });
    }

    return { fullText, cacheHit: anyCacheHit };
  }
}

export const claudeService = new ClaudeService();
