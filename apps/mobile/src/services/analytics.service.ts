/**
 * Analytics Service — SVIT TravelAI
 *
 * Кастомный аналитический сервис без Firebase SDK (несовместим с Expo Go).
 * Отправляет события на собственный бэкенд: POST /api/analytics/events
 *
 * Возможности:
 * - Батчинг: flush каждые 30 сек или при накоплении 20 событий
 * - Оффлайн-буфер: события сохраняются в AsyncStorage и отправляются при reconnect
 * - Идентификация пользователя: userId прикрепляется ко всем последующим событиям
 * - Singleton: единственный экземпляр на всё приложение
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { safeStorage } from '../../utils/safeStorage';

// ── Типы ──────────────────────────────────────────────────────────────────────

interface AnalyticsEventPayload {
  event: string;
  properties?: Record<string, unknown>;
  sessionId?: string;
  platform?: string;
  appVersion?: string;
  timestamp?: string;
}

// ── Конфигурация ──────────────────────────────────────────────────────────────

const FLUSH_INTERVAL_MS = 30_000; // 30 секунд
const BATCH_SIZE_LIMIT = 20;      // максимум событий до принудительного flush
const OFFLINE_QUEUE_KEY = 'analytics_offline_queue';
const API_URL = (process.env['EXPO_PUBLIC_API_URL'] ?? 'https://travel-ai-backend-production-90a0.up.railway.app/api') + '/analytics/events';

// ── Singleton ─────────────────────────────────────────────────────────────────

class AnalyticsService {
  private queue: AnalyticsEventPayload[] = [];
  private userId: string | null = null;
  private userTraits: Record<string, unknown> = {};
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private isFlushing = false;

  private readonly platform: string;
  private readonly appVersion: string;

  constructor() {
    this.platform = Platform.OS;
    this.appVersion =
      (Constants.expoConfig?.version as string | undefined) ?? '1.0.0';

    this.startFlushTimer();
    // Восстановить оффлайн-очередь из хранилища при старте
    void this.restoreOfflineQueue();
  }

  // ── Публичный API ──────────────────────────────────────────────────────────

  /**
   * Трекинг произвольного события.
   * @param event - название события (используйте константы из analytics-events.ts)
   * @param properties - произвольные свойства события
   */
  track(event: string, properties?: Record<string, unknown>): void {
    const payload: AnalyticsEventPayload = {
      event,
      properties: {
        ...properties,
        ...(this.userId ? { userId: this.userId } : {}),
      },
      platform: this.platform,
      appVersion: this.appVersion,
      timestamp: new Date().toISOString(),
    };

    this.queue.push(payload);

    if (this.queue.length >= BATCH_SIZE_LIMIT) {
      void this.flush();
    }
  }

  /**
   * Идентификация пользователя. Прикрепляет userId ко всем последующим событиям.
   * @param userId - уникальный ID пользователя
   * @param traits - дополнительные атрибуты пользователя
   */
  identify(userId: string, traits?: Record<string, unknown>): void {
    this.userId = userId;
    this.userTraits = traits ?? {};

    this.track('user_identified', {
      userId,
      ...this.userTraits,
    });
  }

  /**
   * Трекинг перехода на экран (аналог pageview).
   * @param name - название экрана
   * @param properties - дополнительные свойства
   */
  page(name: string, properties?: Record<string, unknown>): void {
    this.track('screen_view', {
      name,
      ...properties,
    });
  }

  /**
   * Сброс сессии: очищает userId и traits (например, при logout).
   */
  reset(): void {
    this.userId = null;
    this.userTraits = {};
    // Принудительный flush перед сбросом, чтобы не потерять финальные события
    void this.flush();
  }

  // ── Приватные методы ───────────────────────────────────────────────────────

  private startFlushTimer(): void {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => {
      void this.flush();
    }, FLUSH_INTERVAL_MS);
  }

  /**
   * Отправить накопленные события на бэкенд.
   * При ошибке сохраняет события в AsyncStorage для повторной отправки.
   */
  async flush(): Promise<void> {
    if (this.isFlushing || this.queue.length === 0) return;
    this.isFlushing = true;

    const batch = this.queue.splice(0, BATCH_SIZE_LIMIT);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: batch }),
      });

      if (!response.ok) {
        // Сервер вернул ошибку — сохранить в оффлайн-очередь
        await this.saveToOfflineQueue(batch);
      }
    } catch {
      // Сетевая ошибка (нет интернета) — сохранить для последующей отправки
      await this.saveToOfflineQueue(batch);
    } finally {
      this.isFlushing = false;
    }
  }

  private async saveToOfflineQueue(
    events: AnalyticsEventPayload[],
  ): Promise<void> {
    try {
      const existing = await safeStorage.getItem(OFFLINE_QUEUE_KEY);
      const current: AnalyticsEventPayload[] = existing
        ? (JSON.parse(existing) as AnalyticsEventPayload[])
        : [];

      // Ограничиваем оффлайн-очередь: max 200 событий, чтобы не переполнить хранилище
      const merged = [...current, ...events].slice(-200);
      await safeStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(merged));
    } catch {
      // AsyncStorage недоступен — события теряются, не критично
    }
  }

  private async restoreOfflineQueue(): Promise<void> {
    try {
      const stored = await safeStorage.getItem(OFFLINE_QUEUE_KEY);
      if (!stored) return;

      const offlineEvents = JSON.parse(stored) as AnalyticsEventPayload[];
      if (offlineEvents.length === 0) return;

      // Добавить оффлайн-события в начало очереди
      this.queue.unshift(...offlineEvents);
      await safeStorage.removeItem(OFFLINE_QUEUE_KEY);

      // Сразу попробовать отправить
      void this.flush();
    } catch {
      // Не критично — просто не восстановим оффлайн-данные
    }
  }
}

// Экспорт синглтона
export const analyticsService = new AnalyticsService();
