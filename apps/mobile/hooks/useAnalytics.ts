/**
 * useAnalytics — React hook для трекинга событий в компонентах.
 *
 * Обёртка над analyticsService с удобным API:
 * - track(event, properties) — трекинг события
 * - identify(userId, traits) — идентификация пользователя
 * - page(name, properties) — трекинг перехода на экран
 * - reset() — сброс при logout
 *
 * Пример использования:
 *   const { track } = useAnalytics();
 *   track(AnalyticsEvents.AUTH.LOGIN, { method: 'email' });
 */

import { useCallback } from 'react';
import { analyticsService } from '../src/services/analytics.service';
import type { AnalyticsEventName } from '../src/constants/analytics-events';

export function useAnalytics() {
  const track = useCallback(
    (event: AnalyticsEventName | string, properties?: Record<string, unknown>) => {
      analyticsService.track(event, properties);
    },
    [],
  );

  const identify = useCallback(
    (userId: string, traits?: Record<string, unknown>) => {
      analyticsService.identify(userId, traits);
    },
    [],
  );

  const page = useCallback(
    (name: string, properties?: Record<string, unknown>) => {
      analyticsService.page(name, properties);
    },
    [],
  );

  const reset = useCallback(() => {
    analyticsService.reset();
  }, []);

  return { track, identify, page, reset };
}
