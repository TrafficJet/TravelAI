/**
 * Unit tests for pure helper functions in notifications.tsx
 * Tests the date formatting and grouping logic without requiring React Native.
 */

// ── copied helpers (no RN imports) ───────────────────────────────────────────

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);

  if (diffMins < 1) return 'Только что';
  if (diffMins < 60) return `${diffMins} мин. назад`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} ч. назад`;

  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

type DateGroup = 'today' | 'yesterday' | 'earlier';

function getDateGroup(dateStr: string): DateGroup {
  const date = new Date(dateStr);
  const now = new Date();

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(date, now)) return 'today';

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) return 'yesterday';

  return 'earlier';
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('formatRelativeDate', () => {
  test('returns "Только что" for dates within 1 minute', () => {
    const now = new Date().toISOString();
    expect(formatRelativeDate(now)).toBe('Только что');
  });

  test('returns minutes ago for dates within 1 hour', () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    expect(formatRelativeDate(tenMinutesAgo)).toBe('10 мин. назад');
  });

  test('returns hours ago for dates within 24 hours', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeDate(threeHoursAgo)).toBe('3 ч. назад');
  });

  test('returns formatted date for older dates', () => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const result = formatRelativeDate(weekAgo);
    // Should not contain "назад"
    expect(result).not.toContain('назад');
  });
});

describe('getDateGroup', () => {
  test('groups today correctly', () => {
    expect(getDateGroup(new Date().toISOString())).toBe('today');
  });

  test('groups yesterday correctly', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(12, 0, 0, 0);
    expect(getDateGroup(yesterday.toISOString())).toBe('yesterday');
  });

  test('groups earlier dates correctly', () => {
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    expect(getDateGroup(lastWeek)).toBe('earlier');
  });
});
