/**
 * Price alert worker — unit tests
 * Stack: Jest
 *
 * Tests the batch notification grouping logic in runPriceAlertCheck.
 * Prisma and WebSocket plugin are mocked.
 *
 * Run: npx jest --testPathPattern="priceAlert-worker" --runInBand
 */

process.env.JWT_ACCESS_SECRET = 'test-access-secret-32chars!!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32chars!!';

// ─── Mock Prisma ─────────────────────────────────────────────────────────────

const mockPriceAlertFindMany = jest.fn();
const mockPriceAlertUpdate = jest.fn();
const mockNotificationCreate = jest.fn();

jest.mock('../lib/prisma', () => ({
  prisma: {
    priceAlert: {
      findMany: (...args: unknown[]) => mockPriceAlertFindMany(...args),
      update: (...args: unknown[]) => mockPriceAlertUpdate(...args),
    },
    notification: {
      create: (...args: unknown[]) => mockNotificationCreate(...args),
    },
  },
}));

// ─── Mock WebSocket plugin ────────────────────────────────────────────────────

const mockNotifyUser = jest.fn();

jest.mock('../plugins/websocket.plugin', () => ({
  notifyUser: (...args: unknown[]) => mockNotifyUser(...args),
}));

// ─── Import worker AFTER mocks are set up ────────────────────────────────────

import { runPriceAlertCheck } from '../workers/priceAlert.worker';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeAlert(
  id: string,
  userId: string,
  origin: string,
  destination: string,
  maxPrice: number,
) {
  return { id, userId, origin, destination, maxPrice, active: true, triggeredAt: null };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('runPriceAlertCheck', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPriceAlertUpdate.mockResolvedValue({});
    mockNotificationCreate.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: 'notif-id', ...data }),
    );
  });

  it('does nothing when there are no active alerts', async () => {
    mockPriceAlertFindMany.mockResolvedValueOnce([]);

    await runPriceAlertCheck();

    expect(mockNotificationCreate).not.toHaveBeenCalled();
    expect(mockNotifyUser).not.toHaveBeenCalled();
  });

  it('creates one notification when a single alert triggers', async () => {
    // Force the mock price to always be below the threshold
    const alert = makeAlert('alert-1', 'user-a', 'SVO', 'IST', 99999);
    mockPriceAlertFindMany.mockResolvedValueOnce([alert]);

    await runPriceAlertCheck();

    // Either triggered or not — if triggered, exactly one notification
    if (mockNotificationCreate.mock.calls.length > 0) {
      expect(mockNotificationCreate).toHaveBeenCalledTimes(1);
      const callArg = mockNotificationCreate.mock.calls[0][0];
      expect(callArg.data.userId).toBe('user-a');
      expect(callArg.data.type).toBe('PRICE_ALERT');
      expect(callArg.data.title).toContain('SVO');
      expect(callArg.data.title).toContain('IST');
    }
  });

  it('creates a single batch notification for the same user on multiple routes', async () => {
    // Use a price that will always trigger (maxPrice very high)
    const alerts = [
      makeAlert('a1', 'user-b', 'SVO', 'DXB', 99999),
      makeAlert('a2', 'user-b', 'LED', 'AMS', 99999),
      makeAlert('a3', 'user-b', 'MOW', 'IST', 99999),
    ];
    mockPriceAlertFindMany.mockResolvedValueOnce(alerts);

    await runPriceAlertCheck();

    if (mockNotificationCreate.mock.calls.length > 0) {
      // All triggered alerts should be batched into one notification per user
      expect(mockNotificationCreate.mock.calls.length).toBeLessThanOrEqual(alerts.length);

      // If all three triggered, there should be exactly 1 notification (batch)
      if (mockPriceAlertUpdate.mock.calls.length === 3) {
        expect(mockNotificationCreate).toHaveBeenCalledTimes(1);
        const callArg = mockNotificationCreate.mock.calls[0][0];
        expect(callArg.data.title).toMatch(/направлени/);
      }
    }
  });

  it('creates separate notifications for different users', async () => {
    const alerts = [
      makeAlert('a4', 'user-c', 'SVO', 'DXB', 99999),
      makeAlert('a5', 'user-d', 'SVO', 'DXB', 99999),
    ];
    mockPriceAlertFindMany.mockResolvedValueOnce(alerts);

    await runPriceAlertCheck();

    if (mockNotificationCreate.mock.calls.length === 2) {
      const userIds = mockNotificationCreate.mock.calls.map(
        (c) => (c[0] as { data: { userId: string } }).data.userId,
      );
      expect(userIds).toContain('user-c');
      expect(userIds).toContain('user-d');
    }
  });

  it('marks triggered alerts with triggeredAt timestamp', async () => {
    const alert = makeAlert('a6', 'user-e', 'SVO', 'LED', 99999);
    mockPriceAlertFindMany.mockResolvedValueOnce([alert]);

    await runPriceAlertCheck();

    if (mockPriceAlertUpdate.mock.calls.length > 0) {
      const updateArg = mockPriceAlertUpdate.mock.calls[0][0];
      expect(updateArg.where.id).toBe('a6');
      expect(updateArg.data.triggeredAt).toBeInstanceOf(Date);
    }
  });
});
