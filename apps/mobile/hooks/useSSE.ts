import { useCallback, useRef } from 'react';
import { API_BASE_URL } from '../constants/config';
import { useAuthStore } from '../stores/authStore';
import type { BookingDraft, SSEEvent } from '../types';
import type { FlightFilters } from '../components/chat/FlightFilters';
import type { HotelFilters } from '../components/chat/HotelFiltersSheet';

interface SSEHandlers {
  onTextDelta: (delta: string) => void;
  onToolUse: (toolName: string, toolInput: unknown, toolUseId: string) => void;
  onToolResult: (toolUseId: string, result: unknown) => void;
  onBookingDraft: (booking: BookingDraft, bookingId: string) => void;
  onDone: () => void;
  onError: (message: string) => void;
}

export interface StreamFilters {
  flight?: FlightFilters;
  hotel?: HotelFilters;
}

function parseSSELine(line: string): SSEEvent | null {
  if (!line.startsWith('data:')) return null;

  const jsonStr = line.slice('data:'.length).trim();
  if (!jsonStr || jsonStr === '[DONE]') return null;

  try {
    return JSON.parse(jsonStr) as SSEEvent;
  } catch {
    return null;
  }
}

/**
 * Parses newly arrived SSE text and dispatches events to handlers.
 * Returns true when a "done" event is encountered (stream complete).
 */
function processSSEChunk(
  chunk: string,
  handlers: SSEHandlers,
  buffer: { value: string },
): boolean {
  buffer.value += chunk;

  // SSE messages are separated by double newlines
  const parts = buffer.value.split('\n\n');
  // The last element may be an incomplete message — keep it in the buffer
  buffer.value = parts.pop() ?? '';

  for (const part of parts) {
    const lines = part.split('\n');
    for (const line of lines) {
      const event = parseSSELine(line.trim());
      if (!event) continue;

      switch (event.type) {
        case 'text_delta':
          handlers.onTextDelta(event.delta);
          break;
        case 'tool_use':
          handlers.onToolUse(event.toolName, event.toolInput, event.toolUseId);
          break;
        case 'tool_result':
          handlers.onToolResult(event.toolUseId, event.result);
          break;
        case 'booking_draft':
          handlers.onBookingDraft(event.booking, event.bookingId);
          break;
        case 'done':
          handlers.onDone();
          return true;
        case 'error':
          handlers.onError(event.message);
          break;
      }
    }
  }

  return false;
}

/** Build a compact filters payload — omit undefined fields */
function buildFiltersPayload(
  filters: StreamFilters,
): Record<string, unknown> | undefined {
  const result: Record<string, unknown> = {};

  if (filters.flight) {
    const f = filters.flight;
    const flightPayload: Record<string, unknown> = {};
    if (f.maxPrice !== undefined) flightPayload.maxPrice = f.maxPrice;
    if (f.maxStops !== undefined) flightPayload.maxStops = f.maxStops;
    if (f.cabinClass !== undefined) flightPayload.cabinClass = f.cabinClass;
    if (f.sortBy !== undefined) flightPayload.sortBy = f.sortBy;
    if (f.sortOrder !== undefined) flightPayload.sortOrder = f.sortOrder;
    if (f.departureTimeFrom !== undefined) flightPayload.departureTimeFrom = f.departureTimeFrom;
    if (f.departureTimeTo !== undefined) flightPayload.departureTimeTo = f.departureTimeTo;
    if (Object.keys(flightPayload).length > 0) result.flight = flightPayload;
  }

  if (filters.hotel) {
    const h = filters.hotel;
    const hotelPayload: Record<string, unknown> = {};
    if (h.maxPrice !== undefined) hotelPayload.maxPrice = h.maxPrice;
    if (h.stars !== undefined) hotelPayload.stars = h.stars;
    if (h.amenities && h.amenities.length > 0) hotelPayload.amenities = h.amenities;
    if (h.sortBy !== undefined) hotelPayload.sortBy = h.sortBy;
    if (Object.keys(hotelPayload).length > 0) result.hotel = hotelPayload;
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useSSE() {
  const accessToken = useAuthStore((state) => state.accessToken);
  // Ref holds the active XHR so callers can abort it (e.g. on unmount)
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const cancelStream = useCallback(() => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
  }, []);

  /**
   * Execute a single XHR SSE request. Returns a promise that resolves on
   * success/done or rejects with an Error on network failure.
   */
  const executeRequest = useCallback(
    (
      sessionId: string,
      content: string,
      handlers: SSEHandlers,
      filters?: StreamFilters,
    ): Promise<void> => {
      const url = `${API_BASE_URL}/chat/sessions/${sessionId}/messages`;

      return new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;

        xhr.open('POST', url);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Accept', 'text/event-stream');
        if (accessToken) {
          xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
        }

        // Carry-over buffer for incomplete SSE messages between onprogress calls
        const buffer = { value: '' };
        // How many characters of responseText have already been processed
        let processedLength = 0;
        // Ensure resolve/reject is called only once
        let settled = false;

        function settle(err?: string): void {
          if (settled) return;
          settled = true;
          xhrRef.current = null;
          if (err !== undefined) {
            reject(new Error(err));
          } else {
            resolve();
          }
        }

        xhr.onprogress = () => {
          const newChunk = xhr.responseText.slice(processedLength);
          processedLength = xhr.responseText.length;

          if (!newChunk) return;

          const isDone = processSSEChunk(newChunk, handlers, buffer);
          if (isDone) {
            settle();
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 400) {
            if (xhr.status === 401) {
              useAuthStore.getState().logout();
              handlers.onError('Сессия истекла. Войдите снова.');
              settle();
              return;
            }
            let message: string;
            try {
              const parsed = JSON.parse(xhr.responseText) as { error?: { message?: string } };
              message = parsed?.error?.message ?? `Ошибка сервера (${xhr.status})`;
            } catch {
              message = `Ошибка сервера (${xhr.status})`;
            }
            handlers.onError(message);
            settle(message);
            return;
          }

          // Flush any remaining text that arrived after the last onprogress call
          if (processedLength < xhr.responseText.length) {
            const tail = xhr.responseText.slice(processedLength);
            processSSEChunk(tail, handlers, buffer);
          }

          // Resolve even if the server closed the connection without a "done" event
          settle();
        };

        xhr.onerror = () => {
          settle('Network error');
        };

        xhr.onabort = () => {
          // Aborted intentionally (e.g. component unmount) — resolve silently
          settle();
        };

        xhr.ontimeout = () => {
          settle('Request timed out');
        };

        const filtersPayload = filters ? buildFiltersPayload(filters) : undefined;
        const body: Record<string, unknown> = { content };
        if (filtersPayload) body.filters = filtersPayload;

        xhr.send(JSON.stringify(body));
      });
    },
    [accessToken],
  );

  const streamMessage = useCallback(
    async (
      sessionId: string,
      content: string,
      handlers: SSEHandlers,
      filters?: StreamFilters,
    ): Promise<void> => {
      // Cancel any previous in-flight request
      cancelStream();

      let attempt = 0;
      while (attempt <= MAX_RETRIES) {
        try {
          await executeRequest(sessionId, content, handlers, filters);
          return;
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Network error';
          const isNetworkError = message === 'Network error' || message === 'Request timed out';

          attempt++;
          if (isNetworkError && attempt <= MAX_RETRIES) {
            await delay(RETRY_DELAY_MS);
            // continue loop — retry
          } else {
            // Non-network error or retries exhausted
            throw err;
          }
        }
      }
    },
    [cancelStream, executeRequest],
  );

  return { streamMessage, cancelStream };
}
