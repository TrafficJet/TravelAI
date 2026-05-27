/**
 * Unit tests for executeCreateBooking (createBooking.tool.ts)
 *
 * Covers:
 *   - Happy path FLIGHT: booking stored with correct defaults
 *   - Currency default: 'USD' is used when currency is omitted
 *   - Currency explicit: caller-supplied value is respected
 *   - FLIGHT with flat details: origin/destination at top level
 *   - FLIGHT with segments: origin/destination normalised from first/last segment
 *   - HOTEL: hotelName + checkIn/checkOut surfaced in summary
 *   - Invalid total_price: throws instead of storing NaN
 *
 * Run: npx jest --testPathPattern="createBooking-tool" --runInBand
 */

process.env.JWT_ACCESS_SECRET = 'test-access-secret-32chars!!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32chars!!';

import { executeCreateBooking, type CreateBookingInput } from '../tools/createBooking.tool';

// ─── Mock Prisma ─────────────────────────────────────────────────────────────

const mockBookingCreate = jest.fn();

jest.mock('../lib/prisma', () => ({
  prisma: {
    booking: {
      create: (...args: unknown[]) => mockBookingCreate(...args),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({ pushToken: null }),
    },
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeFlightInput(overrides: Partial<CreateBookingInput> = {}): CreateBookingInput {
  return {
    type: 'FLIGHT',
    offer_id: 'offer-123',
    provider: 'DUFFEL',
    total_price: '15000.00',
    details: {
      origin: 'VKO',
      destination: 'BCN',
      segments: [
        {
          origin: 'VKO',
          destination: 'BCN',
          departureAt: '2026-06-15T10:00:00Z',
          flightNumber: 'SU123',
          marketingCarrier: 'Aeroflot',
        },
      ],
    },
    ...overrides,
  };
}

function makeHotelInput(overrides: Partial<CreateBookingInput> = {}): CreateBookingInput {
  return {
    type: 'HOTEL',
    offer_id: 'hotel-456',
    provider: 'BOOKING',
    total_price: '5000.00',
    details: {
      hotelName: 'Hotel Barcelona Beach',
      checkIn: '2026-06-15',
      checkOut: '2026-06-20',
    },
    ...overrides,
  };
}

// Return value that prisma.booking.create resolves with
function makeCreatedBooking(input: CreateBookingInput, currency: string) {
  return {
    id: 'booking-id-001',
    userId: 'user-1',
    type: input.type,
    status: 'PENDING',
    provider: input.provider,
    externalId: input.offer_id,
    details: input.details,
    totalPrice: parseFloat(input.total_price),
    currency,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('executeCreateBooking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Currency default ──────────────────────────────────────────────────────

  it('uses USD as default currency when not provided', async () => {
    const input = makeFlightInput(); // no currency field
    mockBookingCreate.mockResolvedValueOnce(makeCreatedBooking(input, 'USD'));

    const result = await executeCreateBooking(input, 'user-1');

    expect(mockBookingCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ currency: 'USD' }),
      }),
    );
    expect(result.currency).toBe('USD');
  });

  it('respects explicitly provided currency', async () => {
    const input = makeFlightInput({ currency: 'EUR' });
    mockBookingCreate.mockResolvedValueOnce(makeCreatedBooking(input, 'EUR'));

    const result = await executeCreateBooking(input, 'user-1');

    expect(mockBookingCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ currency: 'EUR' }),
      }),
    );
    expect(result.currency).toBe('EUR');
  });

  // ── FLIGHT happy path ─────────────────────────────────────────────────────

  it('creates PENDING FLIGHT booking and returns expected shape', async () => {
    const input = makeFlightInput();
    mockBookingCreate.mockResolvedValueOnce(makeCreatedBooking(input, 'USD'));

    const result = await executeCreateBooking(input, 'user-1');

    expect(result.bookingId).toBe('booking-id-001');
    expect(result.type).toBe('FLIGHT');
    expect(result.status).toBe('PENDING');
    expect(result.totalPrice).toBe(15000);
    expect(result.summary.title).toMatch(/VKO.*BCN/);
  });

  it('normalises origin/destination from segments when not present at top level', async () => {
    const input = makeFlightInput({
      details: {
        // no top-level origin/destination
        segments: [
          { origin: 'SVO', destination: 'AMS', departureAt: '2026-07-01T08:00:00Z' },
          { origin: 'AMS', destination: 'JFK', departureAt: '2026-07-01T12:00:00Z' },
        ],
      },
    });
    // prisma.create receives details with normalised origin/destination
    mockBookingCreate.mockImplementationOnce(({ data }: { data: { details: Record<string, unknown> } }) =>
      Promise.resolve(makeCreatedBooking(input, 'USD'))
    );

    await executeCreateBooking(input, 'user-1');

    const calledWith = mockBookingCreate.mock.calls[0][0].data.details;
    expect(calledWith.origin).toBe('SVO');
    expect(calledWith.destination).toBe('JFK');
  });

  // ── HOTEL happy path ──────────────────────────────────────────────────────

  it('creates PENDING HOTEL booking with correct summary', async () => {
    const input = makeHotelInput();
    mockBookingCreate.mockResolvedValueOnce(makeCreatedBooking(input, 'USD'));

    const result = await executeCreateBooking(input, 'user-1');

    expect(result.type).toBe('HOTEL');
    expect(result.summary.title).toBe('Hotel Barcelona Beach');
    expect(result.summary.subtitle).toBe('2026-06-15 – 2026-06-20');
  });

  // ── Invalid price ─────────────────────────────────────────────────────────

  it('throws when total_price is not a valid number', async () => {
    const input = makeFlightInput({ total_price: 'not-a-number' });

    await expect(executeCreateBooking(input, 'user-1')).rejects.toThrow(
      'Invalid total_price',
    );
    expect(mockBookingCreate).not.toHaveBeenCalled();
  });
});
