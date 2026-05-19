import { v4 as uuidv4 } from 'uuid';
import type { FlightOffer, FlightSegment, SearchFlightsParams } from './duffel.service';

// Aviasales service — CIS / domestic flight search.
// Uses the real Travelpayouts v2 Partner API when AVIASALES_TOKEN is set in env.
// Falls back to mock data when the token is absent or the API call fails.
//
// Affiliate link format (Aviasales via TravelPayouts):
//   https://www.aviasales.ru/?marker={TRAVELPAYOUTS_MARKER}&...
//
// Env vars:
//   TRAVELPAYOUTS_TOKEN  — API token for data requests.
//   TRAVELPAYOUTS_MARKER — affiliate partner/marker ID (default: 530860).

// Exchange rate for RUB → USD conversion (1 USD = 90 RUB, hardcoded for MVP)
const RUB_TO_USD = 90;

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
    const totalPriceUsd = Math.round((basePrice * (1 + idx * 0.12) * passengerCount) / RUB_TO_USD);

    return {
      offerId: uuidv4(),
      provider: 'AVIASALES' as const,
      totalPrice: totalPriceUsd.toFixed(2),
      currency: 'USD',
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
// Travelpayouts v1/prices/cheap API types
// Response shape: { success: true, data: { [dest]: { [idx]: ticket } }, currency: "rub" }
// ---------------------------------------------------------------------------

interface TravelpayoutsCheapTicket {
  airline: string;
  flight_number: number;
  departure_at: string;   // ISO 8601 e.g. "2026-06-01T05:55:00+03:00"
  return_at?: string;
  number_of_changes: number;
  price: number;          // price in requested currency (rub)
  duration?: number;      // total flight duration in minutes
  duration_to?: number;
  duration_back?: number;
}

interface TravelpayoutsCheapResponse {
  success: boolean;
  data: Record<string, Record<string, TravelpayoutsCheapTicket>>;
  currency: string;
}

// ---------------------------------------------------------------------------
// Real Travelpayouts v1/prices/cheap API call
// Endpoint: GET https://api.travelpayouts.com/v1/prices/cheap
// Doc: https://support.travelpayouts.com/hc/en-us/articles/203956163
// ---------------------------------------------------------------------------

/**
 * Build an Aviasales affiliate search URL including the partner marker.
 * Example: https://www.aviasales.ru/search/MOW1206IST1?marker=530860
 */
function buildAviasalesAffiliateUrl(
  origin: string,
  destination: string,
  departureDate: string,
  adults: number,
): string {
  const marker = process.env.TRAVELPAYOUTS_MARKER ?? '530860';
  // Short date format: DDMM (e.g. "1206" for 2026-06-12)
  const [, month, day] = departureDate.slice(0, 10).split('-');
  const shortDate = `${day}${month}`;
  const url = new URL(
    `https://www.aviasales.ru/search/${origin.toUpperCase()}${shortDate}${destination.toUpperCase()}${adults}`,
  );
  url.searchParams.set('marker', marker);
  return url.toString();
}

async function searchFlightsCISReal(params: SearchFlightsParams): Promise<FlightOffer[]> {
  const token = process.env.TRAVELPAYOUTS_TOKEN ?? '';
  const { origin, destination, departureDate, passengers } = params;

  // v1/prices/cheap returns cheapest tickets for each number of stops
  const url = new URL('https://api.travelpayouts.com/v1/prices/cheap');
  url.searchParams.set('origin', origin.toUpperCase());
  url.searchParams.set('destination', destination.toUpperCase());
  url.searchParams.set('depart_date', departureDate.slice(0, 10)); // YYYY-MM-DD
  url.searchParams.set('currency', 'rub');
  url.searchParams.set('token', token);

  console.log('[Aviasales] Calling v1/prices/cheap:', url.toString().replace(token, '***'));

  const res = await fetch(url.toString(), {
    headers: { 'Accept': 'application/json' },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Travelpayouts API returned HTTP ${res.status}: ${body}`);
  }

  const json = (await res.json()) as TravelpayoutsCheapResponse;

  if (!json.success) {
    throw new Error('Travelpayouts API returned success:false');
  }

  // data is a dict: { "IST": { "0": ticket, "1": ticket, ... } }
  const destData = json.data?.[destination.toUpperCase()];

  if (!destData || Object.keys(destData).length === 0) {
    throw new Error(`Travelpayouts API returned empty data for destination ${destination}`);
  }

  const passengerCount = passengers.adults + (passengers.children ?? 0);
  // API returns prices in RUB — convert to USD for display
  const apiCurrency = (json.currency ?? 'rub').toLowerCase();
  const isRub = apiCurrency === 'rub';

  // Convert dict entries to array, sorted by price ascending
  const tickets = Object.values(destData).sort((a, b) => a.price - b.price);

  return tickets.slice(0, 5).map((ticket): FlightOffer => {
    // departure_at is full ISO with timezone offset
    const departureAt = ticket.departure_at.includes('T')
      ? ticket.departure_at
      : `${ticket.departure_at}T00:00:00`;

    // Arrival = departure + duration (fallback 2 h)
    const durationMinutes = ticket.duration ?? ticket.duration_to ?? 120;
    const departureMs = new Date(departureAt).getTime();
    const arrivalAt = new Date(departureMs + durationMinutes * 60 * 1000).toISOString();

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const airlineName = AIRLINE_NAMES[ticket.airline] ?? ticket.airline;
    const rawPrice    = ticket.price * passengerCount;
    const priceInUsd  = isRub
      ? (rawPrice / RUB_TO_USD)
      : rawPrice;
    // Sanity check: realistic flight prices
    const cabinClassValue = params.cabinClass ?? 'economy';
    const sanitizedPrice = Math.min(priceInUsd, cabinClassValue === 'economy' ? 2500 : 8000);
    const totalPrice  = sanitizedPrice.toFixed(2);
    const baggageLabel = ticket.number_of_changes === 0 ? 'Только ручная кладь' : '1 место 23 кг';

    // Affiliate booking URL — directs user to Aviasales with partner marker
    const bookingUrl = buildAviasalesAffiliateUrl(
      origin,
      destination,
      departureDate,
      passengers.adults,
    );

    return {
      offerId: uuidv4(),
      provider: 'AVIASALES',
      totalPrice,
      currency: 'USD',
      cabinClass: 'economy' as const,
      segments: [
        {
          origin: origin.toUpperCase(),
          destination: destination.toUpperCase(),
          departureAt,
          arrivalAt,
          airline: airlineName,
          flightNumber: `${ticket.airline} ${ticket.flight_number}`,
          duration: durationMinutes,
        } satisfies FlightSegment,
      ],
      baggage: baggageLabel,
      expiresAt,
      bookingUrl,
    } satisfies FlightOffer;
  });
}

// ---------------------------------------------------------------------------
// Public entry point — uses real API when TRAVELPAYOUTS_TOKEN is set
// ---------------------------------------------------------------------------

export async function searchFlightsCIS(params: SearchFlightsParams): Promise<FlightOffer[]> {
  const token = process.env.TRAVELPAYOUTS_TOKEN;

  if (!token) {
    console.log('[Aviasales] TRAVELPAYOUTS_TOKEN not set, using mock');
    return searchFlightsCISMock(params);
  }

  console.log('[Aviasales] TRAVELPAYOUTS_TOKEN present — calling real API');

  try {
    return await searchFlightsCISReal(params);
  } catch (error) {
    console.error('[Aviasales] Real API call failed, falling back to mock:', error);
    return searchFlightsCISMock(params);
  }
}
