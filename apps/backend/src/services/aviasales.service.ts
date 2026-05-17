import { v4 as uuidv4 } from 'uuid';
import type { FlightOffer, FlightSegment, SearchFlightsParams } from './duffel.service';

// Aviasales service — CIS / domestic flight search.
// Uses the real Travelpayouts v2 Partner API when AVIASALES_TOKEN is set in env.
// Falls back to mock data when the token is absent or the API call fails.

// ---------------------------------------------------------------------------
// Mock data (kept as graceful fallback — do not remove)
// ---------------------------------------------------------------------------

const CIS_AIRLINES = [
  { name: 'Победа', code: 'DP' },
  { name: 'Уральские авиалинии', code: 'U6' },
  { name: 'Smartavia', code: '5N' },
  { name: 'NordStar', code: 'Y7' },
];

const CIS_ROUTES: Record<string, { duration: number }> = {
  'SVO-VKO': { duration: 20 },
  'SVO-DME': { duration: 20 },
  'LED-MOW': { duration: 75 },
  'SVO-AER': { duration: 150 },
  'MOW-AER': { duration: 150 },
  'SVO-KZN': { duration: 75 },
  'LED-KZN': { duration: 105 },
  'SVO-UFA': { duration: 130 },
  'SVO-SVX': { duration: 150 },
  DEFAULT: { duration: 120 },
};

// Known airline IATA codes → human-readable names
const AIRLINE_NAMES: Record<string, string> = {
  SU: 'Аэрофлот',
  S7: 'S7 Airlines',
  DP: 'Победа',
  U6: 'Уральские авиалинии',
  '5N': 'Smartavia',
  Y7: 'NordStar',
  N4: 'Нордавиа',
  UT: 'ЮТэйр',
  '6H': 'Прямой рейс',
  PS: 'МАУ',
};

function resolveCISRouteData(origin: string, destination: string) {
  const key = `${origin.toUpperCase()}-${destination.toUpperCase()}`;
  return CIS_ROUTES[key] ?? CIS_ROUTES.DEFAULT;
}

export async function searchFlightsCISMock(params: SearchFlightsParams): Promise<FlightOffer[]> {
  const { origin, destination, departureDate, passengers, cabinClass } = params;
  const route = resolveCISRouteData(origin, destination);
  const passengerCount = passengers.adults + (passengers.children ?? 0);
  const basePrice = 3500 + Math.floor(Math.random() * 8000);

  const selected = CIS_AIRLINES.slice(0, 3);

  return selected.map((airline, idx) => {
    const departureTimes = ['06:30', '11:00', '20:15'];
    const [hour, min] = departureTimes[idx].split(':').map(Number);
    const departure = new Date(
      `${departureDate}T${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`,
    );
    const arrival = new Date(departure.getTime() + (route.duration + idx * 10) * 60 * 1000);
    const totalPrice = Math.round(basePrice * (1 + idx * 0.12) * passengerCount);

    return {
      offerId: uuidv4(),
      provider: 'AVIASALES' as const,
      totalPrice: totalPrice.toFixed(2),
      currency: 'RUB',
      cabinClass: (cabinClass === 'business' || cabinClass === 'first' ? cabinClass : 'economy') as 'economy' | 'business' | 'first',
      segments: [
        {
          origin: origin.toUpperCase(),
          destination: destination.toUpperCase(),
          departureAt: departure.toISOString(),
          arrivalAt: arrival.toISOString(),
          airline: airline.name,
          flightNumber: `${airline.code} ${200 + idx * 41}`,
          duration: route.duration + idx * 10,
        } satisfies FlightSegment,
      ],
      baggage: idx === 0 ? 'Только ручная кладь' : '1 место 23 кг',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    } satisfies FlightOffer;
  });
}

// ---------------------------------------------------------------------------
// Aviasales / Travelpayouts Partner API v3 types
// ---------------------------------------------------------------------------

interface AviasalesV3Ticket {
  origin: string;
  destination: string;
  airline: string;
  flight_number: number;
  departure_at: string;  // ISO 8601 datetime string or YYYY-MM-DD
  return_at?: string;
  expires_at: string;
  number_of_changes: number;
  price: number;
  found_at: string;     // ISO 8601 datetime string
  transfers: number;
  duration?: number;    // flight duration in minutes, may be absent
  duration_to?: number;
  duration_back?: number;
}

interface AviasalesV3Response {
  success: boolean;
  data: AviasalesV3Ticket[];
  currency: string;
}

// ---------------------------------------------------------------------------
// Real Aviasales / Travelpayouts v3 API call
// Doc: https://support.travelpayouts.com/hc/en-us/articles/360004731452
// ---------------------------------------------------------------------------

async function searchFlightsCISReal(params: SearchFlightsParams): Promise<FlightOffer[]> {
  const token = process.env.AVIASALES_TOKEN ?? '';
  const marker = process.env.AVIASALES_MARKER ?? '728401';
  const { origin, destination, departureDate, passengers } = params;

  // Travelpayouts v3 "best prices" endpoint — returns the cheapest ticket per
  // each number of transfers for the given route / departure month.
  const url = new URL('https://api.travelpayouts.com/v3/prices/best');
  url.searchParams.set('origin', origin.toUpperCase());
  url.searchParams.set('destination', destination.toUpperCase());
  // v3 accepts YYYY-MM or YYYY-MM-DD
  url.searchParams.set('departure_at', departureDate.slice(0, 7));
  url.searchParams.set('currency', 'rub');
  url.searchParams.set('limit', '10');
  url.searchParams.set('sorting', 'price');
  url.searchParams.set('marker', marker);
  url.searchParams.set('token', token);

  const res = await fetch(url.toString(), {
    headers: {
      'X-Access-Token': token,
      'Accept': 'application/json',
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Aviasales API returned HTTP ${res.status}: ${body}`);
  }

  const json = (await res.json()) as AviasalesV3Response;

  if (!json.success || !Array.isArray(json.data)) {
    throw new Error('Aviasales API unexpected response shape');
  }

  if (json.data.length === 0) {
    // No data for the route — fall through to mock
    throw new Error('Aviasales API returned empty data array');
  }

  const passengerCount = passengers.adults + (passengers.children ?? 0);
  const currency = json.currency?.toUpperCase() ?? 'RUB';

  return json.data.slice(0, 5).map((ticket): FlightOffer => {
    // departure_at may be full ISO or just YYYY-MM-DD
    const departureAt = ticket.departure_at.includes('T')
      ? ticket.departure_at
      : `${ticket.departure_at}T00:00:00`;

    // Arrival = departure + duration (or fallback to +2 h)
    const durationMinutes = ticket.duration ?? ticket.duration_to ?? 120;
    const departureDate_ = new Date(departureAt);
    const arrivalAt = new Date(
      departureDate_.getTime() + durationMinutes * 60 * 1000,
    ).toISOString();

    // expiresAt = found_at + 30 minutes
    const foundAt = new Date(ticket.found_at);
    const expiresAt = new Date(foundAt.getTime() + 30 * 60 * 1000).toISOString();

    const airlineName = AIRLINE_NAMES[ticket.airline] ?? ticket.airline;
    const totalPrice = (ticket.price * passengerCount).toFixed(2);

    const baggageLabel =
      ticket.transfers === 0 ? 'Только ручная кладь' : '1 место 23 кг';

    return {
      offerId: uuidv4(),
      provider: 'AVIASALES',
      totalPrice,
      currency,
      // Travelpayouts API does not return cabin class; default to economy
      cabinClass: 'economy' as const,
      segments: [
        {
          origin: ticket.origin.toUpperCase(),
          destination: ticket.destination.toUpperCase(),
          departureAt,
          arrivalAt,
          airline: airlineName,
          flightNumber: `${ticket.airline} ${ticket.flight_number}`,
          duration: durationMinutes,
        } satisfies FlightSegment,
      ],
      baggage: baggageLabel,
      expiresAt,
    } satisfies FlightOffer;
  });
}

// ---------------------------------------------------------------------------
// Public entry point — selects real API when AVIASALES_TOKEN is set
// ---------------------------------------------------------------------------

export async function searchFlightsCIS(params: SearchFlightsParams): Promise<FlightOffer[]> {
  const token = process.env.AVIASALES_TOKEN;

  if (!token) {
    console.log('[Aviasales] API token not set, using mock');
    return searchFlightsCISMock(params);
  }

  console.log('[Aviasales] Using real API');

  try {
    return await searchFlightsCISReal(params);
  } catch (error) {
    console.error('[Aviasales] Real API call failed, falling back to mock:', error);
    return searchFlightsCISMock(params);
  }
}
