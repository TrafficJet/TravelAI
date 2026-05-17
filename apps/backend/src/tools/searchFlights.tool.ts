import type Anthropic from '@anthropic-ai/sdk';
import { searchFlights } from '../services/duffel.service';
import { searchFlightsCIS } from '../services/aviasales.service';
import type { FlightOffer } from '../services/duffel.service';
import { searchCache, getCacheKey } from '../lib/searchCache';

// ---------------------------------------------------------------------------
// Filter / sort parameters
// ---------------------------------------------------------------------------

export interface FlightFilters {
  maxPrice?: number;          // maximum total price (in the offer currency)
  maxStops?: number;          // 0 = direct only, 1 = max 1 stop, etc.
  cabinClass?: 'economy' | 'business' | 'first';
  departureTimeFrom?: string; // "HH:MM" — lower bound for local departure time
  departureTimeTo?: string;   // "HH:MM" — upper bound for local departure time
  sortBy?: 'price' | 'duration' | 'departure';
  sortOrder?: 'asc' | 'desc';
}

// Claude tool definition for searching flights
export const searchFlightsTool: Anthropic.Tool = {
  name: 'search_flights',
  description:
    'Поиск авиарейсов по заданным параметрам. Используй этот инструмент когда пользователь хочет найти перелёт.',
  input_schema: {
    type: 'object' as const,
    properties: {
      origin: {
        type: 'string',
        description: 'Код IATA аэропорта вылета (например, SVO, DME, LED)',
      },
      destination: {
        type: 'string',
        description: 'Код IATA аэропорта назначения (например, IST, DXB, AYT)',
      },
      departure_date: {
        type: 'string',
        description: 'Дата вылета в формате YYYY-MM-DD',
      },
      return_date: {
        type: 'string',
        description: 'Дата обратного вылета в формате YYYY-MM-DD (опционально, для туда-обратно)',
      },
      passengers: {
        type: 'number',
        description: 'Количество пассажиров (взрослые, по умолчанию 1)',
      },
      cabin_class: {
        type: 'string',
        enum: ['economy', 'business', 'first'],
        description: 'Класс обслуживания (по умолчанию economy)',
      },
      max_price: {
        type: 'number',
        description: 'Максимальная цена билета (в рублях)',
      },
      max_stops: {
        type: 'number',
        description: 'Максимальное количество пересадок (0 — только прямые рейсы)',
      },
      departure_time_from: {
        type: 'string',
        description: 'Нижняя граница времени вылета в формате HH:MM (например, "06:00")',
      },
      departure_time_to: {
        type: 'string',
        description: 'Верхняя граница времени вылета в формате HH:MM (например, "12:00")',
      },
      sort_by: {
        type: 'string',
        enum: ['price', 'duration', 'departure'],
        description: 'Поле для сортировки результатов',
      },
      sort_order: {
        type: 'string',
        enum: ['asc', 'desc'],
        description: 'Порядок сортировки: asc — по возрастанию, desc — по убыванию',
      },
    },
    required: ['origin', 'destination', 'departure_date'],
  },
};

export interface SearchFlightsInput {
  origin: string;
  destination: string;
  departure_date: string;
  return_date?: string;
  passengers?: number;
  cabin_class?: string;
  // Filter fields (flat — Claude passes them at the top level)
  max_price?: number;
  max_stops?: number;
  departure_time_from?: string;
  departure_time_to?: string;
  sort_by?: 'price' | 'duration' | 'departure';
  sort_order?: 'asc' | 'desc';
}

// ---------------------------------------------------------------------------
// Filter + sort helpers
// ---------------------------------------------------------------------------

/** Parse "HH:MM" → total minutes since midnight */
function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Apply FlightFilters to an array of offers and return a filtered + sorted copy */
export function applyFilters(offers: FlightOffer[], filters: FlightFilters): FlightOffer[] {
  let result = offers.slice();

  // maxPrice filter
  if (filters.maxPrice !== undefined) {
    result = result.filter((o) => Number(o.totalPrice) <= filters.maxPrice!);
  }

  // maxStops filter — we use segments.length - 1 as the number of stops
  if (filters.maxStops !== undefined) {
    result = result.filter((o) => o.segments.length - 1 <= filters.maxStops!);
  }

  // cabinClass filter
  if (filters.cabinClass !== undefined) {
    result = result.filter((o) => o.cabinClass === filters.cabinClass);
  }

  // departureTimeFrom / departureTimeTo — compare against first segment departure
  if (filters.departureTimeFrom !== undefined || filters.departureTimeTo !== undefined) {
    const fromMinutes = filters.departureTimeFrom
      ? timeToMinutes(filters.departureTimeFrom)
      : 0;
    const toMinutes = filters.departureTimeTo
      ? timeToMinutes(filters.departureTimeTo)
      : 24 * 60 - 1;

    result = result.filter((o) => {
      const dep = o.segments[0]?.departureAt;
      if (!dep) return true; // no segment data — keep
      const depDate = new Date(dep);
      // Время вылета сравнивается по local time сервера.
      // При деплое установи TZ=Europe/Moscow в env.
      const depMinutes = depDate.getHours() * 60 + depDate.getMinutes();
      return depMinutes >= fromMinutes && depMinutes <= toMinutes;
    });
  }

  // sortBy + sortOrder
  if (filters.sortBy) {
    const order = filters.sortOrder === 'desc' ? -1 : 1;

    result.sort((a, b) => {
      switch (filters.sortBy) {
        case 'price':
          return order * (Number(a.totalPrice) - Number(b.totalPrice));

        case 'duration': {
          // total trip duration = sum of all segment durations
          const durA = a.segments.reduce((acc, s) => acc + s.duration, 0);
          const durB = b.segments.reduce((acc, s) => acc + s.duration, 0);
          return order * (durA - durB);
        }

        case 'departure': {
          const depA = new Date(a.segments[0]?.departureAt ?? 0).getTime();
          const depB = new Date(b.segments[0]?.departureAt ?? 0).getTime();
          return order * (depA - depB);
        }

        default:
          return 0;
      }
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Executor: calls appropriate service, then applies filters
// ---------------------------------------------------------------------------

// CIS airport codes (simple heuristic)
const CIS_AIRPORTS = new Set([
  'SVO', 'DME', 'VKO', 'LED', 'OVB', 'SVX', 'KZN', 'ROV', 'AER', 'UFA',
  'KJA', 'IKT', 'MMK', 'KHV', 'VVO', 'ASF', 'VOG', 'SAR', 'PEE', 'PEZ',
  'GYD', 'ALA', 'TSE', 'TAS', 'FRU', 'MSQ', 'KBP', 'ODS', 'LWO',
]);

export async function executeSearchFlights(
  input: SearchFlightsInput,
): Promise<ReturnType<typeof buildFlightResult> & { searchId: string; cacheHit: boolean }> {
  // Fill in default departure date: 14 days from today — without mutating input
  const defaultDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  })();

  const resolvedInput = {
    ...input,
    departure_date: input.departure_date || defaultDate,
  };

  const cacheKey = getCacheKey('flight', resolvedInput);
  const cached = searchCache.get(cacheKey);
  if (cached) {
    return { ...(cached as ReturnType<typeof buildFlightResult>), searchId: `search_${Date.now()}`, cacheHit: true };
  }

  const params = {
    origin: resolvedInput.origin,
    destination: resolvedInput.destination,
    departureDate: resolvedInput.departure_date,
    returnDate: resolvedInput.return_date,
    passengers: { adults: resolvedInput.passengers ?? 1 },
    cabinClass: resolvedInput.cabin_class as FlightFilters['cabinClass'],
  };

  const isCIS =
    CIS_AIRPORTS.has(resolvedInput.origin.toUpperCase()) &&
    CIS_AIRPORTS.has(resolvedInput.destination.toUpperCase());

  const [intlOffers, cisOffers] = await Promise.all([
    isCIS ? Promise.resolve([]) : searchFlights(params),
    isCIS ? searchFlightsCIS(params) : Promise.resolve([]),
  ]);

  const allOffers = [...intlOffers, ...cisOffers];

  // Build filters from resolvedInput
  const filters: FlightFilters = {
    maxPrice: resolvedInput.max_price,
    maxStops: resolvedInput.max_stops,
    cabinClass: resolvedInput.cabin_class as FlightFilters['cabinClass'],
    departureTimeFrom: resolvedInput.departure_time_from,
    departureTimeTo: resolvedInput.departure_time_to,
    sortBy: resolvedInput.sort_by,
    sortOrder: resolvedInput.sort_order,
  };

  const filtered = applyFilters(allOffers, filters);
  const result = buildFlightResult(resolvedInput, filtered, allOffers.length, filters);

  searchCache.set(cacheKey, result);
  return { ...result, searchId: `search_${Date.now()}`, cacheHit: false };
}

// Normalise a raw FlightOffer (duffel/aviasales shape) into the flat
// MobileFlightOffer shape that FlightCard in the mobile app expects.
function normaliseMobileOffer(
  offer: FlightOffer,
  origin: string,
  destination: string,
): Record<string, unknown> {
  const firstSeg = offer.segments[0];
  const lastSeg  = offer.segments[offer.segments.length - 1];
  const totalDuration = offer.segments.reduce((acc, s) => acc + s.duration, 0);

  return {
    id:            offer.offerId,
    origin:        origin.toUpperCase(),
    destination:   destination.toUpperCase(),
    departureDate: firstSeg?.departureAt?.split('T')[0] ?? '',
    airline:       firstSeg?.airline ?? '',
    flightNumber:  firstSeg?.flightNumber ?? '',
    cabin:         offer.cabinClass,
    stops:         offer.segments.length - 1,
    durationMin:   totalDuration,
    price:         Number(offer.totalPrice),       // mobile FlightCard expects price:number
    currency:      offer.currency,
    departureTime: firstSeg?.departureAt?.split('T')[1]?.slice(0, 5) ?? undefined,
    arrivalTime:   lastSeg?.arrivalAt?.split('T')[1]?.slice(0, 5) ?? undefined,
    baggage:       offer.baggage,
    provider:      offer.provider,
    offerId:       offer.offerId,                  // kept for booking creation
    expiresAt:     offer.expiresAt,
  };
}

function buildFlightResult(
  input: SearchFlightsInput,
  filtered: FlightOffer[],
  totalFound: number,
  filters: FlightFilters,
) {
  const normalised = filtered.map((o) =>
    normaliseMobileOffer(o, input.origin, input.destination),
  );

  return {
    offers: normalised,
    count: normalised.length,
    totalFound,
    route: `${input.origin.toUpperCase()} → ${input.destination.toUpperCase()}`,
    date: input.departure_date,
    filtersApplied: Object.values(filters).some((v) => v !== undefined),
  };
}
