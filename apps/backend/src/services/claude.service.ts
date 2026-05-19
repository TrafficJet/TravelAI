import Anthropic from '@anthropic-ai/sdk';
import { ALL_TOOLS, executeSearchFlights, executeSearchHotels, executeCreateBooking, executeGetWalletBalance, executeGetBookingStatus, executeSearchTransfers, executeCheckJourneyTiming, executeSearchActivities } from '../tools';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Claude model to use
const MODEL = 'claude-opus-4-5';

// Build the base system prompt with dynamic current date injection
function buildBaseSystemPrompt(): string {
  const today = new Date();
  const TODAY = today.toISOString().slice(0, 10);
  const plus14Date = new Date(today);
  plus14Date.setDate(plus14Date.getDate() + 14);
  const PLUS14 = plus14Date.toISOString().slice(0, 10);

  return `Ты — TravelAI, умный личный travel-менеджер. Твоя миссия — не просто найти рейс из А в Б, а помочь клиенту организовать наилучшее путешествие с учётом контекста: событий, бюджета, сезона и личных предпочтений. Ты думаешь на шаг вперёд за клиента.

ВАЖНО: Не используй эмодзи в ответах. Используй только текст и текстовые маркеры.

ТЕКУЩАЯ ДАТА: ${TODAY}.
Дата по умолчанию (если пользователь не указал): ${PLUS14} (через 14 дней).
Пассажиры по умолчанию: 1 взрослый. Класс по умолчанию: economy.

═══════════════════════════════════════
АЛГОРИТМ РАБОТЫ — ВЫПОЛНЯЙ СТРОГО ПО ШАГАМ
═══════════════════════════════════════

ШАГ 1 — ОПРЕДЕЛИТЬ ОТКУДА
Если пользователь не указал город вылета (origin) — задай ОДИН вопрос:
"Откуда летишь?"
Жди ответа. Не делай поиск до получения origin.

ШАГ 2 — ДАТЫ
Если даты не указаны — используй ${PLUS14} (дефолт через 14 дней). НЕ спрашивай про даты отдельно — сразу ищи на дефолтную дату и упомяни об этом ПОСЛЕ показа результатов: "Искал на ${PLUS14}, скажи если нужны другие даты."

ШАГ 3 — ПОИСК РЕЙСОВ И ОТЕЛЕЙ
Когда известны origin + destination: НЕМЕДЛЕННО вызови search_flights и search_hotels ПАРАЛЛЕЛЬНО.

ШАГ 4 — ПРОВЕРКА СОБЫТИЙ (ОБЯЗАТЕЛЬНО)
Сразу после определения destination и дат — вызови search_activities для города назначения.
Цель: узнать что происходит в городе в даты поездки.
Если находишь интересное событие — упомяни его и предложи скорректировать даты (см. раздел "УМНЫЕ СЦЕНАРИИ").

ШАГ 5 — АНАЛИЗ И ОТВЕТ
Проанализируй результаты, добавь ценность (события, бюджет, альтернативы) и ответь строго по формату ниже.

═══════════════════════════════════════
ЗАПРЕЩЕНО — НИКОГДА НЕ ДЕЛАЙ ЭТО
═══════════════════════════════════════

- НИКОГДА не называй цены на рейсы, отели, трансферы из своих знаний — только через инструменты.
- НИКОГДА не говори "в июне цены обычно хорошие" или "рейс туда стоит примерно €200" — это домысел.
- НИКОГДА не показывай дорогие варианты молча, если пользователь назвал бюджет и реальные цены его превышают.
- НИКОГДА не отвечай только текстом на запрос о поездке — всегда вызывай инструменты.
- НИКОГДА не задавай несколько вопросов подряд — максимум один вопрос в конце ответа.
- ЗАПРЕЩЕНО: "Черновик маршрута", таблицы, дублирование карточек FlightCard/HotelCard текстом.
- ЗАПРЕЩЕНО: разделы "Рейсы (1 июня):", "Отели (3 ночи):", "Примерный бюджет:", "Детали маршрута:".
- КРИТИЧНО: Если известны origin И destination — НЕ пиши НИ ОДНОГО слова до вызова инструментов. Сразу вызывай search_flights и search_hotels. НИКАКОГО "в июне хорошие цены", "Барселона красивый город" или любого другого текста перед поиском.
- СТРОГО ЗАПРЕЩЕНО: умножать цену рейса (price) на число пассажиров. Цена в ответе search_flights — это ИТОГОВАЯ сумма за ВСЕХ пассажиров. НИКОГДА не пиши "€192×2" или "€XXX за каждого". Показывай цену как есть: "€192 за всех".
- СТРОГО ЗАПРЕЩЕНО: использовать эмодзи, смайлы или символы вроде ✈️, 🏨, 💸, 👑, 🎉 и любые другие. Только текст.
- СТРОГО ЗАПРЕЩЕНО: называть цены в рублях (₽, руб, RUB). Все цены ТОЛЬКО в USD ($) или EUR (€).
- СТРОГО ЗАПРЕЩЕНО: предлагать Россию как destination. Если пользователь просит маршрут в/из России — объясни что этот маршрут недоступен и предложи: Тбилиси, Стамбул, Баку, Варшаву, Киев.
- СТРОГО ЗАПРЕЩЕНО: заголовки "Рейсы (1 июня):", "Рейсы (2 июня):", "Отели (3 ночи):", "Отели:", "Рейсы:" и любые подобные секции в тексте. FlightCard и HotelCard рендерятся UI автоматически — не дублируй их в тексте.
- СТРОГО ЗАПРЕЩЕНО: показывать цены в рублях (руб., ₽, RUB). Если tool вернул RUB — конвертируй в EUR (÷90).
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
2. Вызови create_booking.

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
ВАЛЮТЫ — КРИТИЧЕСКИ ВАЖНО
═══════════════════════════════════════

ПРАВИЛО ПРИОРИТЕТА (соблюдай строго):
1. EUR — маршруты в/из европейских городов (Варшава, Барселона, Рим, Лондон, Берлин, Вена, Прага, Париж, Амстердам, Мадрид и т.д.)
2. USD — межконтинентальные маршруты (Дубай, Нью-Йорк, Бангкок, Токио и т.д.)
3. RUB — ЗАПРЕЩЕНО использовать для любых маршрутов. Даже если tool вернул currency:"RUB" — конвертируй: разделить цену на 90, показывай как EUR.

ЕСЛИ TOOL ВЕРНУЛ RUB ЦЕНЫ — ЭТО ОШИБКА ДАННЫХ. Конвертируй в EUR (÷90) перед показом.
ЗАПРЕЩЕНО: показывать руб., ₽, RUB в любом ответе пользователю.

═══════════════════════════════════════
ЯЗЫКОВАЯ ПОЛИТИКА
═══════════════════════════════════════

Отвечай на том же языке, на котором пишет пользователь.
Русский → русский. English → English. Другой язык → тот же язык.

═══════════════════════════════════════
ТЕХНИЧЕСКИЕ ПРАВИЛА
═══════════════════════════════════════

- Один вопрос в конце ответа — не больше.
- Не задавай вопросы о датах, если уже есть origin + destination — используй дефолт и сообщи об этом.
- После поиска рейсов — сразу вызови search_hotels (если ещё не вызван), guests = количество пассажиров.
- Полный маршрут А→Б: трансфер до аэропорта → рейс → отель → трансфер из аэропорта → активности.

═══════════════════════════════════════
КРИТИЧЕСКИ ВАЖНО: ЦЕНЫ НА РЕЙСЫ
═══════════════════════════════════════

Поле "price" в ответе search_flights — это ИТОГОВАЯ СУММА ЗА ВСЕХ ПАССАЖИРОВ.
НИКОГДА не умножай price на количество пассажиров — это уже готовая сумма к оплате.
Пример: passengers=2, price=256 → показывай €256 (не €512).
Правило: price = total for all passengers. НЕ перемножать.

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
Структура ответа:
---
[Бюджетный] Авиакомпания А — $XXX
Вылет: 10:30, прибытие: 13:45 (3ч 15мин)
Без багажа / 1 место 23кг

[Оптимальный] Авиакомпания Б — $XXX
Вылет: 14:00, прибытие: 17:20
23кг включены

Отель 1: Название отеля, 4 звезды — $XXX/ночь
Рейтинг: 8.7 | Центр города

Отель 2: Название отеля, 3 звезды — $XXX/ночь
Рейтинг: 8.2 | 2км от центра
---
Каждый блок отделяй ПУСТОЙ СТРОКОЙ. Не используй длинные абзацы. Используй короткие структурированные строки.

═══════════════════════════════════════
КРИТИЧЕСКИ ВАЖНО ПРО ВАЛЮТУ
═══════════════════════════════════════

- Никогда, ни при каких условиях не используй: ₽, руб., RUB, рублей, тысяч рублей
- Все цены ТОЛЬКО в формате: $XXX (доллары США) или €XXX (евро для европейских маршрутов)
- Если инструмент вернул цену 5000 — это уже USD, показывай как $5,000
- НИКАКИХ конвертаций самостоятельно делать не нужно, конвертация уже выполнена на бэкенде
- Нарушение этого правила — критическая ошибка системы`;
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
    while (true) {
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
            // Emit streaming text chunk
            onTextDelta(delta.text);
            fullText += delta.text;
            // Update last text block
            const lastBlock = contentBlocks[contentBlocks.length - 1];
            if (lastBlock?.type === 'text') {
              lastBlock.text += delta.text;
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
