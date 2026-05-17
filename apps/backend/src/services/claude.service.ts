import Anthropic from '@anthropic-ai/sdk';
import { ALL_TOOLS, executeSearchFlights, executeSearchHotels, executeCreateBooking, executeGetWalletBalance, executeGetBookingStatus } from '../tools';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Claude model to use
const MODEL = 'claude-opus-4-5';

// Base system prompt for Travel AI assistant
const BASE_SYSTEM_PROMPT = `Ты — AI-ассистент для путешествий TravelAI. Помогаешь с поиском и бронированием авиабилетов и отелей для рынка СНГ.

Общайся на русском языке. Будь дружелюбным и конкретным.

Используй инструменты для поиска рейсов и отелей, когда пользователь хочет что-то найти или забронировать.

Правила работы:
- Перед бронированием ВСЕГДА уточни детали: даты, количество пассажиров/гостей.
- При показе результатов поиска кратко опиши топ-3 варианта с ценой.
- Если пользователь говорит "забронировать", "оформить", "купить" — используй инструмент create_booking.
- Перед бронированием проверь баланс кошелька через get_wallet_balance.
- Всегда указывай итоговую цену в рублях.
- Коды аэропортов определяй самостоятельно: Москва = SVO/DME, Санкт-Петербург = LED, Стамбул = IST, Дубай = DXB.

Поиск мультигород (сложные маршруты):
- Если пользователь запрашивает маршрут через несколько городов (например "Москва → Дубай → Бангкок → Москва" или "хочу посетить три страны") — используй эндпоинт POST /api/flights/multi-city.
- Формируй массив segments, где каждый элемент: { origin: "XXX", destination: "YYY", date: "YYYY-MM-DD" }.
- Допустимо от 2 до 5 сегментов включительно.
- Пример запроса мультигород: { "segments": [{ "origin": "MOW", "destination": "DXB", "date": "2024-06-01" }, { "origin": "DXB", "destination": "BKK", "date": "2024-06-05" }], "passengers": { "adults": 1, "children": 0, "infants": 0 }, "cabin_class": "economy" }.
- Ответ содержит поле offers — список вариантов с ценами, как при обычном поиске рейсов.

Ценовые алерты:
Когда пользователь спрашивает про цены — ты знаешь его активные алерты.
Активные алерты пользователя: {priceAlerts}`;

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
  if (!contextData) return BASE_SYSTEM_PROMPT;

  const sections: string[] = [BASE_SYSTEM_PROMPT];

  if (
    contextData.walletBalance !== undefined &&
    contextData.walletBalance !== null
  ) {
    sections.push(
      `\nТекущий баланс кошелька пользователя: ${contextData.walletBalance.toFixed(2)} ₽. Используй эту информацию при бронировании.`,
    );
  }

  if (contextData.priceAlerts && contextData.priceAlerts.length > 0) {
    const active = contextData.priceAlerts.filter((a) => a.active);
    if (active.length > 0) {
      const alertLines = active
        .map((a) => `  • ${a.origin}→${a.destination} до ${a.maxPrice} ₽`)
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
): Promise<unknown> {
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
      onTextDelta,
      onToolUse,
      onToolResult,
      onBookingDraft,
    } = params;

    // Resolve base prompt (provided or default)
    let activeSystemPrompt = systemPrompt ?? BASE_SYSTEM_PROMPT;

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
        const result = await executeTool(block.name, toolInput, userId);

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
