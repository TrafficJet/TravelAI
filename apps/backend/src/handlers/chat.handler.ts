import { FastifyRequest, FastifyReply } from 'fastify';
import type Anthropic from '@anthropic-ai/sdk';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { Errors } from '../lib/errors';
import { claudeService, buildSystemPrompt, SessionContextData } from '../services/claude.service';

// Fire-and-forget: persist a search tool call to SearchHistory
function saveSearchHistory(
  userId: string,
  query: string,
  type: 'flight' | 'hotel',
  results: unknown,
): void {
  const top3 = Array.isArray(results) ? results.slice(0, 3) : results;
  prisma.searchHistory
    .create({
      data: {
        userId,
        query,
        type,
        results: top3 as Prisma.InputJsonValue,
      },
    })
    .then(() => {
      // Fire-and-forget: trim history to the last 100 records per user
      return prisma.searchHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: 100,
        select: { id: true },
      }).then(old => {
        if (old.length > 0) {
          return prisma.searchHistory.deleteMany({
            where: { id: { in: old.map(r => r.id) } },
          });
        }
      });
    })
    .catch(() => {
      // Non-blocking: ignore errors to not impact chat response
    });
}

interface CreateSessionBody {
  title?: string;
  contextData?: SessionContextData;
}

interface SendMessageBody {
  content: string;
}

interface SessionParams {
  id: string;
}

interface SessionsQuery {
  page?: number;
  limit?: number;
}

interface MessagesQuery {
  page?: number;
  limit?: number;
}

// Build chat session DTO
async function buildSessionDTO(session: {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  _count?: { messages: number };
}) {
  return {
    id: session.id,
    title: session.title,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    messageCount: session._count?.messages ?? 0,
  };
}

// Convert DB messages to Anthropic MessageParam format for Claude context
function buildAnthropicHistory(
  messages: Array<{
    role: string;
    content: string;
    toolName: string | null;
    toolInput: unknown;
    toolResult: unknown;
    toolUseId: string | null;
  }>,
): Anthropic.MessageParam[] {
  const result: Anthropic.MessageParam[] = [];
  let i = 0;

  while (i < messages.length) {
    const msg = messages[i];

    if (msg.role === 'USER') {
      result.push({ role: 'user', content: msg.content });
      i++;
    } else if (msg.role === 'ASSISTANT') {
      result.push({ role: 'assistant', content: msg.content });
      i++;
    } else if (msg.role === 'TOOL_USE') {
      // Group TOOL_USE + following TOOL_RESULT blocks
      const assistantContent: Anthropic.ContentBlock[] = [];
      const toolResultContent: Anthropic.ToolResultBlockParam[] = [];

      while (i < messages.length && messages[i].role === 'TOOL_USE') {
        const tu = messages[i];
        assistantContent.push({
          type: 'tool_use',
          id: tu.toolUseId ?? '',
          name: tu.toolName ?? '',
          input: (tu.toolInput as Record<string, unknown>) ?? {},
        });
        i++;
      }

      result.push({ role: 'assistant', content: assistantContent });

      while (i < messages.length && messages[i].role === 'TOOL_RESULT') {
        const tr = messages[i];
        toolResultContent.push({
          type: 'tool_result',
          tool_use_id: tr.toolUseId ?? '',
          content: typeof tr.toolResult === 'string' ? tr.toolResult : JSON.stringify(tr.toolResult),
        });
        i++;
      }

      if (toolResultContent.length > 0) {
        result.push({ role: 'user', content: toolResultContent });
      }
    } else {
      i++;
    }
  }

  return result;
}

// POST /api/chat/sessions — create new chat session
// Accepts optional contextData to enrich the Claude system prompt with
// user-specific info (priceAlerts, recentSearches, walletBalance).
export async function createSession(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.userId;
  const { title, contextData } = (request.body as CreateSessionBody) ?? {};

  // Build an enriched system prompt if context data is provided
  const systemPrompt = contextData ? buildSystemPrompt(contextData) : null;

  const session = await prisma.chatSession.create({
    data: {
      userId,
      title: title ?? 'Новый чат',
      ...(systemPrompt ? { systemPrompt } : {}),
    },
    include: { _count: { select: { messages: true } } },
  });

  return reply.status(201).send({
    session: await buildSessionDTO(session),
  });
}

// GET /api/chat/sessions — list user sessions sorted by updatedAt DESC
export async function getSessions(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.userId;
  const query = request.query as SessionsQuery;

  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  const [sessions, total] = await Promise.all([
    prisma.chatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
      include: { _count: { select: { messages: true } } },
    }),
    prisma.chatSession.count({ where: { userId } }),
  ]);

  return reply.send({
    data: await Promise.all(sessions.map(buildSessionDTO)),
    pagination: { total, page, limit, hasNext: skip + limit < total },
  });
}

// GET /api/chat/sessions/:id/messages — paginated message history
export async function getMessages(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.userId;
  const { id } = request.params as SessionParams;
  const query = request.query as MessagesQuery;

  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
  const skip = (page - 1) * limit;

  const session = await prisma.chatSession.findUnique({
    where: { id },
    include: { _count: { select: { messages: true } } },
  });

  if (!session) throw Errors.notFound('Сессия чата');
  if (session.userId !== userId) throw Errors.forbidden('Доступ к чужой сессии запрещён');

  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where: { sessionId: id },
      orderBy: { createdAt: 'asc' },
      skip,
      take: limit,
    }),
    prisma.message.count({ where: { sessionId: id } }),
  ]);

  return reply.send({
    session: await buildSessionDTO(session),
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      toolName: m.toolName,
      toolInput: m.toolInput,
      toolResult: m.toolResult,
      toolUseId: m.toolUseId,
      createdAt: m.createdAt.toISOString(),
    })),
    pagination: { total, page, limit, hasNext: skip + limit < total },
  });
}

// DELETE /api/chat/sessions/:id/messages — clear all messages in session (keeps session itself)
export async function clearMessages(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.userId;
  const { id: sessionId } = request.params as SessionParams;
  const session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
  if (!session) throw Errors.notFound('Сессия чата');
  if (session.userId !== userId) throw Errors.forbidden('Доступ запрещён');
  await prisma.message.deleteMany({ where: { sessionId } });
  return reply.send({ success: true });
}

// DELETE /api/chat/sessions/:id — delete session and its messages (CASCADE)
export async function deleteSession(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.userId;
  const { id } = request.params as SessionParams;

  const session = await prisma.chatSession.findUnique({ where: { id } });
  if (!session) throw Errors.notFound('Сессия чата');
  if (session.userId !== userId) throw Errors.forbidden('Удаление чужой сессии запрещено');

  // Messages are removed automatically via onDelete: Cascade in Prisma schema
  await prisma.chatSession.delete({ where: { id } });

  return reply.send({ success: true });
}

// Sanitize user message: strip null bytes, trim whitespace, cap at 2000 chars
function sanitizeMessage(raw: string): string {
  // eslint-disable-next-line no-control-regex
  return raw.replace(/\0/g, '').trim().slice(0, 2000);
}

/**
 * Extract a short human-readable title from a chat message.
 * Recognises route patterns: "из X в Y", "X → Y", "X - Y", "X to Y".
 * Returns "✈️ X → Y" (max 50 chars) when a route is found, or the first
 * 40 characters of the message otherwise.
 */
function extractTitleFromMessage(message: string): string | null {
  if (!message || message.trim().length === 0) return null;

  // Pattern: "из <origin> в <destination>" (Russian)
  const ruMatch = message.match(/из\s+(.+?)\s+в\s+(.+?)(?:[,!?.]|$)/i);
  if (ruMatch) {
    const origin = ruMatch[1].trim();
    const dest = ruMatch[2].trim();
    return `✈️ ${origin} → ${dest}`.slice(0, 50);
  }

  // Pattern: "X → Y" (arrow with unicode or ASCII)
  const arrowMatch = message.match(/(.+?)\s*(?:→|->|=>)\s*(.+?)(?:[,!?.]|$)/);
  if (arrowMatch) {
    const origin = arrowMatch[1].trim();
    const dest = arrowMatch[2].trim();
    return `✈️ ${origin} → ${dest}`.slice(0, 50);
  }

  // Pattern: "X to Y" (English)
  const toMatch = message.match(/(.+?)\s+to\s+(.+?)(?:[,!?.]|$)/i);
  if (toMatch) {
    const origin = toMatch[1].trim();
    const dest = toMatch[2].trim();
    return `✈️ ${origin} → ${dest}`.slice(0, 50);
  }

  // Pattern: "X - Y" (dash separator, at least 3 chars each side)
  const dashMatch = message.match(/([A-Za-zА-Яа-яЁё]{3,})\s+-\s+([A-Za-zА-Яа-яЁё]{3,})/);
  if (dashMatch) {
    const origin = dashMatch[1].trim();
    const dest = dashMatch[2].trim();
    return `✈️ ${origin} → ${dest}`.slice(0, 50);
  }

  // Fallback: first 40 characters of the message
  const fallback = message.trim().slice(0, 40);
  return fallback.length > 0 ? fallback : null;
}

// POST /api/chat/sessions/:id/messages — SSE streaming with Claude
export async function sendMessage(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.userId;
  const { id: sessionId } = request.params as SessionParams;
  const { content: rawContent } = request.body as SendMessageBody;
  const content = sanitizeMessage(rawContent);
  if (content.length === 0) {
    return reply.status(400).send({ error: 'MESSAGE_EMPTY', message: 'Сообщение не может быть пустым' });
  }

  // Validate session ownership
  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
    select: { id: true, userId: true, systemPrompt: true },
  });
  if (!session) throw Errors.notFound('Сессия чата');
  if (session.userId !== userId) throw Errors.forbidden('Доступ к чужой сессии запрещён');

  // Set SSE headers; X-Cache will be reported via SSE event cache_status
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable Nginx buffering
    'X-Cache': 'MISS',          // Default; overridden by cache_status SSE event
  });

  // Helper to write SSE event
  const sendEvent = (data: Record<string, unknown>) => {
    reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // Save user message to DB
    const isFirstMessage = (await prisma.message.count({ where: { sessionId } })) === 0;

    const savedMessage = await prisma.message.create({
      data: {
        sessionId,
        role: 'USER',
        content,
      },
    });

    // If first message and content is meaningful — generate a short title
    if (isFirstMessage && content.length > 3) {
      const shortTitle = extractTitleFromMessage(content);
      if (shortTitle) {
        // fire-and-forget: do not block SSE stream on this update
        prisma.chatSession.update({
          where: { id: sessionId },
          data: { title: shortTitle },
        }).then(() => {
          // Notify mobile client in real-time so the UI can update immediately
          sendEvent({ type: 'session_title_update', title: shortTitle });
        }).catch(() => {});
      }
    }

    // Load session history for Claude context (exclude the just-added user message)
    const historyMessages = await prisma.message.findMany({
      where: { sessionId, NOT: { id: savedMessage.id } },
      orderBy: { createdAt: 'asc' },
    });

    const sessionHistory = buildAnthropicHistory(
      historyMessages.map((m) => ({
        role: m.role,
        content: m.content,
        toolName: m.toolName,
        toolInput: m.toolInput,
        toolResult: m.toolResult,
        toolUseId: m.toolUseId,
      })),
    );

    // Track tool calls for DB persistence
    const toolUseRecords: Array<{
      name: string;
      input: unknown;
      toolUseId: string;
    }> = [];
    const toolResultRecords: Array<{
      name: string;
      result: unknown;
      toolUseId: string;
    }> = [];

    // Stream from Claude — pass session-level system prompt if available
    const { fullText, cacheHit } = await claudeService.streamMessage({
      sessionHistory,
      userMessage: content,
      userId,
      ...(session.systemPrompt ? { systemPrompt: session.systemPrompt } : {}),
      onTextDelta: (delta) => {
        sendEvent({ type: 'text_delta', delta });
      },
      onToolUse: (toolName, toolInput, toolUseId) => {
        toolUseRecords.push({ name: toolName, input: toolInput, toolUseId });
        sendEvent({ type: 'tool_use', toolName, toolInput, toolUseId });
      },
      onToolResult: (toolName, result, toolUseId) => {
        toolResultRecords.push({ name: toolName, result, toolUseId });
        sendEvent({ type: 'tool_result', toolUseId, result });

        // Persist search results to SearchHistory (fire-and-forget)
        if (toolName === 'search_flights' || toolName === 'search_hotels') {
          const type = toolName === 'search_flights' ? 'flight' : 'hotel';
          // Find the matching tool use input for the query string
          const tu = toolUseRecords.find((r) => r.toolUseId === toolUseId);
          const queryText = tu
            ? JSON.stringify(tu.input)
            : toolName;
          saveSearchHistory(userId, queryText, type, result);
        }
      },
      onBookingDraft: (bookingResult) => {
        const result = bookingResult as Record<string, unknown>;
        const { bookingId, ...bookingData } = result;
        const safeBookingId = typeof bookingId === 'string' ? bookingId : null;
        if (!safeBookingId) {
          console.error('[chat] booking_draft missing bookingId', bookingResult);
          return;
        }
        sendEvent({ type: 'booking_draft', booking: bookingData, bookingId: safeBookingId });
      },
    });

    // Emit cache status as SSE event so clients can observe it
    sendEvent({ type: 'cache_status', xCache: cacheHit ? 'HIT' : 'MISS' });

    // Persist assistant message and tool records to DB
    const assistantMessage = await prisma.message.create({
      data: {
        sessionId,
        role: 'ASSISTANT',
        content: fullText,
      },
    });

    // Persist tool use/result messages
    for (const tu of toolUseRecords) {
      await prisma.message.create({
        data: {
          sessionId,
          role: 'TOOL_USE',
          content: tu.name,
          toolName: tu.name,
          toolInput: tu.input as Prisma.InputJsonValue,
          toolUseId: tu.toolUseId,
        },
      });
    }

    for (const tr of toolResultRecords) {
      await prisma.message.create({
        data: {
          sessionId,
          role: 'TOOL_RESULT',
          content: tr.name,
          toolName: tr.name,
          toolResult: tr.result as Prisma.InputJsonValue,
          toolUseId: tr.toolUseId,
        },
      });
    }

    // Touch session updatedAt
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    sendEvent({ type: 'done', messageId: assistantMessage.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ошибка сервера';
    sendEvent({ type: 'error', code: 'STREAM_ERROR', message });
  } finally {
    reply.raw.end();
  }
}
