import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Duffel } from '@duffel/api';
import type { Offer, CabinClass, CreateOfferRequestPassenger, CreateOfferRequestSlice } from '@duffel/api/types';
import { authenticate } from '../middleware/auth.middleware';
import { Errors } from '../lib/errors';
import { FlightOffer } from '../services/duffel.service';

interface PriceHistoryQuery {
  origin: string;
  destination: string;
}

// ---------------------------------------------------------------------------
// In-memory offer cache — TTL: 5 minutes
// ---------------------------------------------------------------------------

interface CacheEntry {
  data: Record<string, unknown>;
  expires: number;
}

const offerCache = new Map<string, CacheEntry>();
const OFFER_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCachedOffer(key: string): Record<string, unknown> | null {
  const entry = offerCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    offerCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCachedOffer(key: string, data: Record<string, unknown>): void {
  offerCache.set(key, { data, expires: Date.now() + OFFER_CACHE_TTL_MS });
}

// Export for testing
export { offerCache };

// ---------------------------------------------------------------------------
// Multi-city search cache — TTL: 10 minutes
// ---------------------------------------------------------------------------

const multiCityCache = new Map<string, CacheEntry>();
const MULTI_CITY_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getMultiCityCached(key: string): Record<string, unknown> | null {
  const entry = multiCityCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    multiCityCache.delete(key);
    return null;
  }
  return entry.data;
}

function setMultiCityCached(key: string, data: Record<string, unknown>): void {
  multiCityCache.set(key, { data, expires: Date.now() + MULTI_CITY_CACHE_TTL_MS });
}

// Export for testing
export { multiCityCache };

// ---------------------------------------------------------------------------
// Multi-city types
// ---------------------------------------------------------------------------

interface MultiCitySegment {
  origin: string;
  destination: string;
  date: string;
}

interface MultiCityPassengers {
  adults: number;
  children: number;
  infants: number;
}

interface MultiCityBody {
  segments: MultiCitySegment[];
  passengers: MultiCityPassengers;
  cabin_class: string;
}

// ---------------------------------------------------------------------------
// Multi-city mock offers builder
// ---------------------------------------------------------------------------

function buildMultiCityMockOffers(
  segments: MultiCitySegment[],
  passengers: MultiCityPassengers,
  cabinClass: string,
): FlightOffer[] {
  const basePrice =
    segments.reduce((acc, seg) => {
      const seed = [...`${seg.origin}${seg.destination}`].reduce(
        (s, c) => s + c.charCodeAt(0),
        0,
      );
      return acc + 8000 + (seed % 15000);
    }, 0) * (passengers.adults + passengers.children * 0.75 + passengers.infants * 0.1);

  const priceMultipliers = [1, 1.18, 1.35];

  return priceMultipliers.map((mult, idx) => {
    const totalPrice = Math.round(basePrice * mult);
    const flightSegments = segments.map((seg, segIdx) => {
      const [year, month, day] = seg.date.split('-').map(Number);
      const departure = new Date(year, month - 1, day, 7 + idx * 5 + segIdx * 2, 0, 0);
      const durationMin = 180 + segIdx * 30 + idx * 15;
      const arrival = new Date(departure.getTime() + durationMin * 60 * 1000);
      return {
        origin: seg.origin.toUpperCase(),
        destination: seg.destination.toUpperCase(),
        departureAt: departure.toISOString(),
        arrivalAt: arrival.toISOString(),
        airline: idx === 0 ? 'Аэрофлот' : idx === 1 ? 'Emirates' : 'Turkish Airlines',
        flightNumber: `${idx === 0 ? 'SU' : idx === 1 ? 'EK' : 'TK'} ${200 + idx * 50 + segIdx}`,
        duration: durationMin,
      };
    });

    const cab: FlightOffer['cabinClass'] =
      cabinClass === 'business' ? 'business' : cabinClass === 'first' ? 'first' : 'economy';

    return {
      offerId: `multi-mock-${idx}-${Date.now()}`,
      provider: 'DUFFEL' as const,
      totalPrice: totalPrice.toFixed(2),
      currency: 'USD',
      cabinClass: cab,
      segments: flightSegments,
      baggage: cab === 'economy' ? '1 место 23 кг' : '2 места 32 кг',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    } satisfies FlightOffer;
  });
}

// ---------------------------------------------------------------------------
// Multi-city real Duffel search
// ---------------------------------------------------------------------------

async function searchMultiCityDuffel(
  segments: MultiCitySegment[],
  passengers: MultiCityPassengers,
  cabinClass: string,
): Promise<FlightOffer[]> {
  const apiKey = process.env.DUFFEL_API_KEY;
  if (!apiKey) {
    return buildMultiCityMockOffers(segments, passengers, cabinClass);
  }

  const client = new Duffel({ token: apiKey });

  const cabinClassMap: Record<string, CabinClass> = {
    economy: 'economy',
    premium_economy: 'premium_economy',
    business: 'business',
    first: 'first',
  };
  const resolvedCabin: CabinClass = cabinClassMap[cabinClass] ?? 'economy';

  const slices: CreateOfferRequestSlice[] = segments.map((seg) => ({
    origin: seg.origin.toUpperCase(),
    destination: seg.destination.toUpperCase(),
    departure_date: seg.date,
    arrival_time: null,
    departure_time: null,
  }));

  const passengerList: CreateOfferRequestPassenger[] = [];
  for (let i = 0; i < passengers.adults; i++) passengerList.push({ type: 'adult' });
  for (let i = 0; i < passengers.children; i++) passengerList.push({ age: 10 });
  for (let i = 0; i < passengers.infants; i++) passengerList.push({ age: 1 });

  try {
    const response = await client.offerRequests.create({
      slices,
      passengers: passengerList,
      cabin_class: resolvedCabin,
      return_offers: true,
    });

    const offers = response.data.offers as Offer[];
    const sorted = [...offers].sort(
      (a, b) => parseFloat(a.total_amount) - parseFloat(b.total_amount),
    );

    return sorted.slice(0, 5).map((offer) => {
      const seg = offer.slices[0]?.segments[0];
      const cab: FlightOffer['cabinClass'] =
        (seg?.passengers[0]?.cabin_class_marketing_name?.toLowerCase() === 'business'
          ? 'business'
          : seg?.passengers[0]?.cabin_class_marketing_name?.toLowerCase() === 'first'
            ? 'first'
            : 'economy');

      const mappedSegments = offer.slices.map((slice) => {
        const firstSeg = slice.segments[0];
        const lastSeg = slice.segments[slice.segments.length - 1];
        const durationMin = slice.segments.reduce((acc, s) => {
          const m = (s.duration ?? '').match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
          return acc + (m ? parseInt(m[1] ?? '0', 10) * 60 + parseInt(m[2] ?? '0', 10) : 0);
        }, 0);
        return {
          origin: firstSeg?.origin.iata_code ?? '',
          destination: lastSeg?.destination.iata_code ?? '',
          departureAt: firstSeg?.departing_at ?? '',
          arrivalAt: lastSeg?.arriving_at ?? '',
          airline: firstSeg?.operating_carrier.name ?? '',
          flightNumber: firstSeg?.operating_carrier_flight_number ?? '',
          duration: durationMin,
        };
      });

      return {
        offerId: offer.id,
        provider: 'DUFFEL' as const,
        totalPrice: offer.total_amount,
        currency: offer.total_currency,
        cabinClass: cab,
        segments: mappedSegments,
        baggage: '1 место 23 кг',
        expiresAt: offer.expires_at,
      } satisfies FlightOffer;
    });
  } catch (error) {
    console.error('[Duffel] multi-city search failed, returning mock:', error);
    return buildMultiCityMockOffers(segments, passengers, cabinClass);
  }
}

// Generate mock price-history data for the last N days
function buildPriceHistory(
  origin: string,
  destination: string,
  days = 7,
): Array<{ date: string; price: number }> {
  // Seed a pseudo-random base price from the route string so results are stable
  // per (origin, destination) pair within a single day.
  const seed = [...`${origin}${destination}`].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const basePrice = 15000 + (seed % 10000); // 15 000 – 24 999 RUB

  const today = new Date();
  const result: Array<{ date: string; price: number }> = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10); // YYYY-MM-DD

    // Small deterministic fluctuation based on day-of-year + seed
    const dayOfYear = Math.floor(
      (d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86_400_000,
    );
    const fluctuation = Math.round(
      Math.sin((dayOfYear + seed) * 0.7) * 2000,
    );

    result.push({ date: dateStr, price: basePrice + fluctuation });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Flat offer shape (as required by the mobile app)
// ---------------------------------------------------------------------------

interface FlatOffer {
  id: string;
  origin: string;
  destination: string;
  departureDate: string;
  departureTime: string;
  arrivalTime: string;
  airline: string;
  flightNumber: string;
  cabin: string;
  stops: number;
  durationMin: number;
  price: number;
  currency: string;
  availableSeats: number;
}

// ---------------------------------------------------------------------------
// Mock offer detail (fallback when Duffel key is absent)
// ---------------------------------------------------------------------------

function buildMockOfferDetail(offerId: string): FlatOffer {
  const now = new Date();
  const departure = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const arrival = new Date(departure.getTime() + 4 * 60 * 60 * 1000);

  return {
    id: offerId,
    origin: 'IST',
    destination: 'DXB',
    departureDate: departure.toISOString().slice(0, 10),
    departureTime: departure.toISOString().slice(11, 16),
    arrivalTime: arrival.toISOString().slice(11, 16),
    airline: 'Аэрофлот',
    flightNumber: 'SU 101',
    cabin: 'economy',
    stops: 0,
    durationMin: 240,
    price: 25000,
    currency: 'USD',
    availableSeats: 12,
  };
}

// Parse ISO 8601 duration (e.g. "PT3H30M") into total minutes
function parseDurationToMin(duration: string | undefined | null): number {
  if (!duration) return 0;
  const m = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return 0;
  return parseInt(m[1] ?? '0', 10) * 60 + parseInt(m[2] ?? '0', 10);
}

// Fetch real offer from Duffel API and normalise to FlatOffer shape
async function fetchDuffelOffer(offerId: string): Promise<FlatOffer> {
  const apiKey = process.env.DUFFEL_API_KEY;
  if (!apiKey) {
    return buildMockOfferDetail(offerId);
  }

  const client = new Duffel({ token: apiKey });

  try {
    const response = await client.offers.get(offerId);
    const offer = response.data as Offer;

    // Use first slice + segment for the flat summary
    const firstSlice = offer.slices[0];
    const firstSeg = firstSlice?.segments[0];
    const lastSeg = firstSlice?.segments[firstSlice.segments.length - 1];
    const stops = firstSlice ? Math.max(0, firstSlice.segments.length - 1) : 0;

    const totalDurationMin = (firstSlice?.segments ?? []).reduce(
      (acc, seg) => acc + parseDurationToMin(seg.duration),
      0,
    );

    const depAt = firstSeg?.departing_at ?? '';
    const arrAt = lastSeg?.arriving_at ?? '';

    return {
      id: offer.id,
      origin: firstSeg?.origin.iata_code ?? '',
      destination: lastSeg?.destination.iata_code ?? '',
      departureDate: depAt.slice(0, 10),
      departureTime: depAt.slice(11, 16),
      arrivalTime: arrAt.slice(11, 16),
      airline: firstSeg?.operating_carrier.name ?? '',
      flightNumber: firstSeg?.operating_carrier_flight_number ?? '',
      cabin: firstSeg?.passengers[0]?.cabin_class_marketing_name?.toLowerCase() ?? 'economy',
      stops,
      durationMin: totalDurationMin,
      price: Math.round(parseFloat(offer.total_amount ?? '0')),
      currency: offer.total_currency ?? 'USD',
      availableSeats: typeof (offer as unknown as { available_seats?: number }).available_seats === 'number'
        ? (offer as unknown as { available_seats: number }).available_seats
        : 9,
    };
  } catch (error) {
    // On any Duffel error fall back to mock rather than crashing
    console.error('[Duffel] getOffer failed, returning mock:', error);
    return buildMockOfferDetail(offerId);
  }
}

// Default popular destinations fallback (shown when SearchHistory is empty or DB unavailable)
const FALLBACK_POPULAR_FLIGHTS = [
  { origin: 'IST', destination: 'DXB', label: 'Стамбул → Дубай', count: 1250 },
  { origin: 'WAW', destination: 'AYT', label: 'Варшава → Анталья', count: 980 },
  { origin: 'KBP', destination: 'BCN', label: 'Киев → Барселона', count: 750 },
  { origin: 'TBS', destination: 'BKK', label: 'Тбилиси → Бангкок', count: 680 },
  { origin: 'EVN', destination: 'DXB', label: 'Ереван → Дубай', count: 520 },
];

// Handler for GET /api/flights/popular — exported for testing
export async function popularFlightsHandler(_request: FastifyRequest, reply: FastifyReply) {
  try {
    const { prisma } = await import('../lib/prisma');

    // Aggregate flight search history by origin+destination
    const rows = await prisma.searchHistory.findMany({
      where: { type: 'flight' },
      select: { query: true },
      take: 1000,
      orderBy: { createdAt: 'desc' },
    });

    if (rows.length === 0) {
      return reply.send(FALLBACK_POPULAR_FLIGHTS);
    }

    // Parse queries and count origin+destination pairs
    const counts = new Map<string, { origin: string; destination: string; count: number }>();
    for (const row of rows) {
      try {
        const q = JSON.parse(row.query) as { origin?: string; destination?: string };
        if (!q.origin || !q.destination) continue;
        const key = `${q.origin.toUpperCase()}:${q.destination.toUpperCase()}`;
        const existing = counts.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          counts.set(key, {
            origin: q.origin.toUpperCase(),
            destination: q.destination.toUpperCase(),
            count: 1,
          });
        }
      } catch {
        // Skip unparseable queries
      }
    }

    if (counts.size === 0) {
      return reply.send(FALLBACK_POPULAR_FLIGHTS);
    }

    const sorted = [...counts.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(({ origin, destination, count }) => ({
        origin,
        destination,
        label: `${origin} → ${destination}`,
        count,
      }));

    return reply.send(sorted);
  } catch {
    // On DB error — return hardcoded fallback so public endpoint never fails
    return reply.send(FALLBACK_POPULAR_FLIGHTS);
  }
}

// Flights routes
export async function flightsRoutes(fastify: FastifyInstance) {
  // GET /api/flights/popular — top-10 flight routes from search history (public, no auth required)
  fastify.get('/popular', popularFlightsHandler);

  // All routes below require authentication
  fastify.register(async (protectedScope) => {
    protectedScope.addHook('preHandler', authenticate);

    // GET /api/flights/price-history — mock price history for a route over the last 7 days.
    // Ready to be replaced with real data (e.g. from Aviasales historical prices API).
    protectedScope.get('/price-history', {
      schema: {
        querystring: {
          type: 'object',
          required: ['origin', 'destination'],
          properties: {
            origin: { type: 'string', minLength: 3, maxLength: 3 },
            destination: { type: 'string', minLength: 3, maxLength: 3 },
          },
        },
      },
      handler: async (request, reply) => {
        const { origin, destination } = request.query as PriceHistoryQuery;

        const history = buildPriceHistory(
          origin.toUpperCase(),
          destination.toUpperCase(),
        );

        return reply.send({
          origin: origin.toUpperCase(),
          destination: destination.toUpperCase(),
          currency: 'USD',
          history,
        });
      },
    });

    // POST /api/flights/multi-city — поиск мультигород (2-5 сегментов)
    // Кэш 10 минут; использует Duffel API если есть ключ, иначе mock данные
    protectedScope.post('/multi-city', {
      schema: {
        body: {
          type: 'object',
          required: ['segments', 'passengers', 'cabin_class'],
          properties: {
            segments: {
              type: 'array',
              minItems: 2,
              maxItems: 5,
              items: {
                type: 'object',
                required: ['origin', 'destination', 'date'],
                properties: {
                  origin: { type: 'string', minLength: 3, maxLength: 3 },
                  destination: { type: 'string', minLength: 3, maxLength: 3 },
                  date: { type: 'string', minLength: 10, maxLength: 10 },
                },
              },
            },
            passengers: {
              type: 'object',
              required: ['adults'],
              properties: {
                adults: { type: 'integer', minimum: 1 },
                children: { type: 'integer', minimum: 0 },
                infants: { type: 'integer', minimum: 0 },
              },
            },
            cabin_class: { type: 'string', enum: ['economy', 'business', 'first'] },
          },
        },
      },
      handler: async (request: FastifyRequest, reply: FastifyReply) => {
        const body = request.body as MultiCityBody;
        const { segments, passengers, cabin_class } = body;

        // Нормализация пассажиров с дефолтными значениями
        const normalizedPassengers: MultiCityPassengers = {
          adults: passengers.adults,
          children: passengers.children ?? 0,
          infants: passengers.infants ?? 0,
        };

        // Валидация: сегменты должны быть 2-5
        if (segments.length < 2 || segments.length > 5) {
          throw Errors.validation('Количество сегментов должно быть от 2 до 5');
        }

        // Валидация IATA кодов и дат
        const iataRegex = /^[A-Za-z]{3}$/;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < segments.length; i++) {
          const seg = segments[i];

          if (!iataRegex.test(seg.origin) || !iataRegex.test(seg.destination)) {
            throw Errors.validation(
              `Сегмент ${i + 1}: коды аэропортов должны содержать ровно 3 буквы`,
            );
          }

          const dateObj = new Date(seg.date);
          if (isNaN(dateObj.getTime())) {
            throw Errors.validation(`Сегмент ${i + 1}: неверный формат даты (ожидается YYYY-MM-DD)`);
          }

          if (dateObj < today) {
            throw Errors.validation(`Сегмент ${i + 1}: дата должна быть в будущем`);
          }
        }

        // Ключ кэша
        const cacheKey = JSON.stringify({ segments, passengers: normalizedPassengers, cabin_class });
        const cached = getMultiCityCached(cacheKey);
        if (cached) {
          return reply.send(cached);
        }

        const offers = await searchMultiCityDuffel(segments, normalizedPassengers, cabin_class);

        const result: Record<string, unknown> = { offers, totalResults: offers.length };
        setMultiCityCached(cacheKey, result);

        return reply.send(result);
      },
    });

    // GET /api/flights/:offerId — flat offer summary (cached 5 min in memory)
    protectedScope.get('/:offerId', {
      schema: {
        params: {
          type: 'object',
          required: ['offerId'],
          properties: {
            offerId: { type: 'string', minLength: 1 },
          },
        },
      },
      handler: async (request, reply) => {
        const { offerId } = request.params as { offerId: string };

        if (!offerId || offerId.trim().length === 0) {
          throw Errors.validation('offerId не может быть пустым');
        }

        const cacheKey = offerId.trim();

        // Return from cache if fresh
        const cached = getCachedOffer(cacheKey);
        if (cached) {
          return reply.send(cached);
        }

        const offer = await fetchDuffelOffer(cacheKey);

        // Cache the result
        setCachedOffer(cacheKey, offer as unknown as Record<string, unknown>);

        return reply.send(offer);
      },
    });
  });
}
