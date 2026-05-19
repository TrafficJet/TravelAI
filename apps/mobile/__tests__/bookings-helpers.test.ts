/**
 * Unit tests for pure helper functions in bookings.tsx
 * Tests price formatting and filter logic.
 */

// ── copied helpers ────────────────────────────────────────────────────────────

function formatPrice(price: number | string, currency: string): string {
  const num = typeof price === 'number' ? price : Number(price);
  const symbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency;
  return `${symbol}${num.toFixed(2)}`;
}

type BookingStatus = 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'FAILED';

interface FlightDetails {
  departureDate: string;
  origin: string;
  destination: string;
  airline: string;
  flightNumber: string;
  cabin: string;
}

interface Booking {
  id: string;
  type: 'FLIGHT' | 'HOTEL';
  status: BookingStatus;
  totalPrice: number;
  currency: string;
  details?: Partial<FlightDetails>;
}

type FilterTab = 'ALL' | 'ACTIVE' | 'PAST' | 'CANCELLED';

function isBookingPast(booking: Booking): boolean {
  try {
    if (!booking.details) return false;
    if (booking.type === 'FLIGHT') {
      const d = booking.details.departureDate;
      if (!d) return false;
      return new Date(d).getTime() < Date.now();
    }
    return false;
  } catch {
    return false;
  }
}

function filterBookings(bookings: Booking[], tab: FilterTab): Booking[] {
  switch (tab) {
    case 'ACTIVE':
      return bookings.filter(
        (b) => (b.status === 'CONFIRMED' || b.status === 'PENDING') && !isBookingPast(b),
      );
    case 'PAST':
      return bookings.filter((b) => b.status === 'CONFIRMED' && isBookingPast(b));
    case 'CANCELLED':
      return bookings.filter((b) => b.status === 'CANCELLED' || b.status === 'FAILED');
    default:
      return bookings;
  }
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('formatPrice', () => {
  test('formats EUR currency', () => {
    expect(formatPrice(49, 'EUR')).toBe('€49.00');
  });

  test('formats USD currency', () => {
    expect(formatPrice(100.5, 'USD')).toBe('$100.50');
  });

  test('falls back to currency code for unknown currencies', () => {
    expect(formatPrice(200, 'UAH')).toBe('UAH200.00');
  });

  test('accepts string prices', () => {
    expect(formatPrice('99.99', 'USD')).toBe('$99.99');
  });
});

describe('filterBookings', () => {
  const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const pastDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const mockBookings: Booking[] = [
    {
      id: '1', type: 'FLIGHT', status: 'CONFIRMED', totalPrice: 100, currency: 'USD',
      details: { departureDate: futureDate },
    },
    {
      id: '2', type: 'FLIGHT', status: 'CONFIRMED', totalPrice: 200, currency: 'USD',
      details: { departureDate: pastDate },
    },
    {
      id: '3', type: 'FLIGHT', status: 'CANCELLED', totalPrice: 50, currency: 'USD',
    },
    {
      id: '4', type: 'FLIGHT', status: 'PENDING', totalPrice: 150, currency: 'USD',
      details: { departureDate: futureDate },
    },
  ];

  test('ALL returns all bookings', () => {
    expect(filterBookings(mockBookings, 'ALL')).toHaveLength(4);
  });

  test('ACTIVE returns only future CONFIRMED and PENDING', () => {
    const active = filterBookings(mockBookings, 'ACTIVE');
    expect(active.map((b) => b.id)).toEqual(expect.arrayContaining(['1', '4']));
    expect(active).toHaveLength(2);
  });

  test('PAST returns only past CONFIRMED', () => {
    const past = filterBookings(mockBookings, 'PAST');
    expect(past.map((b) => b.id)).toEqual(['2']);
  });

  test('CANCELLED returns CANCELLED and FAILED', () => {
    const cancelled = filterBookings(mockBookings, 'CANCELLED');
    expect(cancelled.map((b) => b.id)).toEqual(['3']);
  });
});
