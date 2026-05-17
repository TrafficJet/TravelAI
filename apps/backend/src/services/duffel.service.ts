import { v4 as uuidv4 } from 'uuid';
import { Duffel } from '@duffel/api';
import type {
  Offer,
  OfferSliceSegment,
  OfferSliceSegmentPassengerBaggage,
  CabinClass,
  CreateOfferRequestSlice,
  CreateOfferRequestPassenger,
} from '@duffel/api/types';

// Duffel service — international flight search.
// Uses the real Duffel REST API when DUFFEL_API_KEY is set in env.
// Falls back to mock data when the key is absent or the API call fails.

export interface FlightOffer {
  offerId: string;
  provider: 'DUFFEL' | 'AVIASALES';
  totalPrice: string;
  currency: string;
  cabinClass: 'economy' | 'business' | 'first';
  segments: FlightSegment[];
  baggage: string;
  expiresAt: string;
}

export interface FlightSegment {
  origin: string;
  destination: string;
  departureAt: string;
  arrivalAt: string;
  airline: string;
  flightNumber: string;
  duration: number; // minutes
}

export interface SearchFlightsParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: { adults: number; children?: number; infants?: number };
  cabinClass?: string;
}

// ---------------------------------------------------------------------------
// Mock data (kept as graceful fallback — do not remove)
// ---------------------------------------------------------------------------

const AIRLINES: Record<string, { name: string; code: string }> = {
  SU: { name: 'Аэрофлот', code: 'SU' },
  TK: { name: 'Turkish Airlines', code: 'TK' },
  FZ: { name: 'Flydubai', code: 'FZ' },
  EK: { name: 'Emirates', code: 'EK' },
  S7: { name: 'S7 Airlines', code: 'S7' },
  U6: { name: 'Уральские авиалинии', code: 'U6' },
  LO: { name: 'LOT Polish Airlines', code: 'LO' },
  VY: { name: 'Vueling', code: 'VY' },
  FR: { name: 'Ryanair', code: 'FR' },
  W6: { name: 'Wizz Air', code: 'W6' },
  IB: { name: 'Iberia', code: 'IB' },
  BA: { name: 'British Airways', code: 'BA' },
  AF: { name: 'Air France', code: 'AF' },
  KL: { name: 'KLM', code: 'KL' },
  OS: { name: 'Austrian Airlines', code: 'OS' },
  EW: { name: 'Eurowings', code: 'EW' },
  LH: { name: 'Lufthansa', code: 'LH' },
  PS: { name: 'МАУ (Ukraine International)', code: 'PS' },
};

// Approximate flight routes with typical duration in minutes and realistic price ranges (EUR)
// priceRange: [min, max] per person in EUR (used for European routes)
const ROUTE_DATA: Record<string, { duration: number; airlines: string[]; priceRange?: [number, number] }> = {
  // Moscow routes
  'SVO-IST': { duration: 200, airlines: ['SU', 'TK'] },
  'SVO-DXB': { duration: 265, airlines: ['SU', 'EK', 'FZ'] },
  'SVO-LED': { duration: 75,  airlines: ['SU', 'S7'] },
  'DME-IST': { duration: 195, airlines: ['TK', 'U6'] },
  'LED-IST': { duration: 225, airlines: ['TK', 'S7'] },
  // Warsaw (WAW) routes — prices in EUR
  'WAW-BCN': { duration: 180, airlines: ['W6', 'FR', 'LO', 'VY'], priceRange: [49, 180] },  // 3h00m
  'WAW-MAD': { duration: 195, airlines: ['LO', 'FR', 'IB'],        priceRange: [55, 200] },
  'WAW-LHR': { duration: 160, airlines: ['LO', 'BA', 'W6'],        priceRange: [49, 160] },  // 2h40m
  'WAW-CDG': { duration: 160, airlines: ['LO', 'AF', 'FR'],         priceRange: [55, 170] },
  'WAW-AMS': { duration: 130, airlines: ['LO', 'KL', 'W6'],         priceRange: [49, 150] },
  'WAW-FCO': { duration: 165, airlines: ['LO', 'FR', 'W6'],         priceRange: [49, 165] },
  'WAW-VIE': { duration: 100, airlines: ['LO', 'OS'],               priceRange: [55, 130] },
  'WAW-BER': { duration: 95,  airlines: ['LO', 'EW', 'FR'],         priceRange: [45, 120] },
  'WAW-DXB': { duration: 380, airlines: ['EK', 'LH', 'TK'],         priceRange: [350, 600] }, // 6h20m
  'WAW-IST': { duration: 185, airlines: ['TK', 'LO', 'W6'],         priceRange: [120, 320] },
  // Kyiv Boryspil (KBP) routes — prices in EUR
  'KBP-BCN': { duration: 210, airlines: ['W6', 'PS', 'FR'],         priceRange: [59, 200] },  // 3h30m
  'KBP-DXB': { duration: 390, airlines: ['EK', 'PS', 'TK'],         priceRange: [350, 580] }, // 6h30m
  'KBP-IST': { duration: 140, airlines: ['TK', 'PS', 'W6'],         priceRange: [80, 250] },
  'KBP-LHR': { duration: 195, airlines: ['PS', 'BA', 'W6'],         priceRange: [90, 280] },
  'KBP-WAW': { duration: 90,  airlines: ['LO', 'PS', 'W6'],         priceRange: [49, 130] },
  DEFAULT: { duration: 180, airlines: ['SU', 'S7'] },
};

function getRouteData(origin: string, destination: string) {
  const key = `${origin.toUpperCase()}-${destination.toUpperCase()}`;
  return ROUTE_DATA[key] ?? ROUTE_DATA.DEFAULT;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function formatISO(date: Date): string {
  return date.toISOString();
}

// EUR_ORIGIN_AIRPORTS is defined in searchFlightsMock below

// KBP and other European CIS airports use EUR pricing
const EUR_ORIGIN_AIRPORTS = new Set([
  'WAW', 'BER', 'PRG', 'VIE', 'AMS', 'FCO', 'MAD', 'BCN', 'CDG', 'LHR',
  'LGW', 'ORY', 'MXP', 'ATH', 'BRU', 'ZRH', 'CPH', 'ARN', 'HEL',
  'KBP', // Kyiv Boryspil — prices in EUR
  'ODS', 'LWO', // other Ukrainian airports
]);

export async function searchFlightsMock(params: SearchFlightsParams): Promise<FlightOffer[]> {
  const { origin, destination, departureDate, passengers, cabinClass } = params;
  const route = getRouteData(origin, destination);
  const passengerCount = passengers.adults + (passengers.children ?? 0);

  // Use EUR pricing for European / Ukrainian origins, RUB for CIS/other
  const isEurOrUkr = EUR_ORIGIN_AIRPORTS.has(origin.toUpperCase());
  const currency = isEurOrUkr ? 'EUR' : 'RUB';

  // Use route-specific price range when available, else fall back to generic ranges
  let basePrice: number;
  if (isEurOrUkr) {
    if (route.priceRange) {
      const [minP, maxP] = route.priceRange;
      basePrice = minP + Math.floor(Math.random() * (maxP - minP));
    } else {
      basePrice = 49 + Math.floor(Math.random() * 300);
    }
  } else {
    basePrice = 8000 + Math.floor(Math.random() * 20000);
  }

  // Stagger departure times: 07:00, 12:30, 18:45, 06:15, 15:00
  const departureTimes = ['07:00', '12:30', '18:45', '06:15', '15:00'];

  const offers: FlightOffer[] = route.airlines.slice(0, 5).map((airlineCode, idx) => {
    const [hour, min] = departureTimes[idx % departureTimes.length].split(':').map(Number);
    const departure = new Date(
      `${departureDate}T${String(hour).padStart(2, '0')}:${String(min ?? 0).padStart(2, '0')}:00`,
    );
    const arrival = addMinutes(departure, route.duration + idx * 10);

    const airline = AIRLINES[airlineCode] ?? { name: 'Авиакомпания', code: airlineCode };
    const flightNum = `${airline.code}${100 + idx * 37}`;

    // Low-cost carriers (Wizz Air, Ryanair) get lower price multiplier
    const isLowCost = airlineCode === 'W6' || airlineCode === 'FR';
    const priceMultiplier = isLowCost
      ? 0.85 + idx * 0.05
      : idx === 0 ? 1 : idx === 1 ? 1.18 : idx === 2 ? 1.35 : 1.5;
    const totalPrice = Math.round(basePrice * priceMultiplier * passengerCount);

    // Baggage: low-cost — carry-on only (base fare), full-service — 23 kg included
    const baggage = isLowCost ? 'Только ручная кладь (багаж +€15-30)' : '1 место 23 кг';

    return {
      offerId: uuidv4(),
      provider: 'DUFFEL' as const,
      totalPrice: totalPrice.toFixed(2),
      currency,
      cabinClass: (cabinClass === 'business' || cabinClass === 'first' ? cabinClass : 'economy') as 'economy' | 'business' | 'first',
      segments: [
        {
          origin: origin.toUpperCase(),
          destination: destination.toUpperCase(),
          departureAt: formatISO(departure),
          arrivalAt: formatISO(arrival),
          airline: airline.name,
          flightNumber: flightNum,
          duration: route.duration + idx * 10,
        },
      ],
      baggage,
      expiresAt: formatISO(new Date(Date.now() + 30 * 60 * 1000)), // 30 minutes
    };
  });

  return offers;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Convert ISO 8601 duration (e.g. "PT3H25M") to minutes
function iso8601DurationToMinutes(duration: string | null): number {
  if (!duration) return 0;
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] ?? '0', 10);
  const minutes = parseInt(match[2] ?? '0', 10);
  return hours * 60 + minutes;
}

// Map a single Duffel Offer to our FlightOffer shape
function mapDuffelOffer(offer: Offer): FlightOffer {
  const segment: OfferSliceSegment | undefined = offer.slices[0]?.segments[0];

  // Baggage: read from first passenger on the first segment
  const baggages: OfferSliceSegmentPassengerBaggage[] =
    segment?.passengers[0]?.baggages ?? [];
  const checkedBag = baggages.find((b) => b.type === 'checked');
  let baggageLabel = 'Только ручная кладь';
  if (checkedBag && checkedBag.quantity > 0) {
    baggageLabel = `${checkedBag.quantity} место 23 кг`;
  }

  // Fallback IATA codes from the slice level if segment is missing
  const sliceOriginIata = offer.slices[0]?.origin.iata_code ?? '';
  const sliceDestIata = offer.slices[0]?.destination.iata_code ?? '';

  const segments: FlightSegment[] = segment
    ? [
        {
          origin: segment.origin.iata_code ?? sliceOriginIata,
          destination: segment.destination.iata_code ?? sliceDestIata,
          departureAt: segment.departing_at,
          arrivalAt: segment.arriving_at,
          airline: segment.operating_carrier.name,
          flightNumber: segment.operating_carrier_flight_number,
          duration: iso8601DurationToMinutes(segment.duration),
        },
      ]
    : [];

  // Derive cabin class from the first segment's first passenger cabin
  const rawCabin = segment?.passengers[0]?.cabin_class_marketing_name?.toLowerCase() ?? 'economy';
  const cabinClass: FlightOffer['cabinClass'] =
    rawCabin === 'business' ? 'business' : rawCabin === 'first' ? 'first' : 'economy';

  return {
    offerId: offer.id,
    provider: 'DUFFEL',
    totalPrice: offer.total_amount,
    currency: offer.total_currency,
    cabinClass,
    segments,
    baggage: baggageLabel,
    expiresAt: offer.expires_at,
  };
}

// ---------------------------------------------------------------------------
// Real Duffel API call
// ---------------------------------------------------------------------------

async function searchFlightsDuffelReal(
  params: SearchFlightsParams,
  client: Duffel,
): Promise<FlightOffer[]> {
  const { origin, destination, departureDate, passengers, cabinClass } = params;

  // Build Duffel passengers list
  const passengerList: CreateOfferRequestPassenger[] = [];
  for (let i = 0; i < passengers.adults; i++) {
    passengerList.push({ type: 'adult' });
  }
  for (let i = 0; i < (passengers.children ?? 0); i++) {
    passengerList.push({ age: 10 }); // typical child age
  }
  for (let i = 0; i < (passengers.infants ?? 0); i++) {
    passengerList.push({ age: 1 });
  }

  const slices: CreateOfferRequestSlice[] = [
    {
      origin: origin.toUpperCase(),
      destination: destination.toUpperCase(),
      departure_date: departureDate,
      arrival_time: null,
      departure_time: null,
    },
  ];

  // Map our cabinClass string → Duffel's CabinClass union
  const cabinClassMap: Record<string, CabinClass> = {
    economy: 'economy',
    premium_economy: 'premium_economy',
    business: 'business',
    first: 'first',
  };
  const resolvedCabinClass: CabinClass =
    cabinClassMap[cabinClass ?? 'economy'] ?? 'economy';

  // return_offers: true — Duffel returns offers inline in the OfferRequest response
  const response = await client.offerRequests.create({
    slices,
    passengers: passengerList,
    cabin_class: resolvedCabinClass,
    return_offers: true,
  });

  // OfferRequest.offers is typed as Omit<Offer, 'available_services'>[]
  // which is structurally compatible with Offer[] for our mapping needs.
  const offers = response.data.offers as Offer[];

  // Sort by total price ascending, return up to 5 results
  const sorted = [...offers].sort(
    (a, b) => parseFloat(a.total_amount) - parseFloat(b.total_amount),
  );

  return sorted.slice(0, 5).map(mapDuffelOffer);
}

// ---------------------------------------------------------------------------
// Public entry point — selects real API when DUFFEL_API_KEY is set
// ---------------------------------------------------------------------------

export async function searchFlights(params: SearchFlightsParams): Promise<FlightOffer[]> {
  const apiKey = process.env.DUFFEL_API_KEY;

  if (!apiKey) {
    console.log('[Duffel] API key not set, using mock');
    return searchFlightsMock(params);
  }

  console.log('[Duffel] Using real API');
  const client = new Duffel({ token: apiKey });

  try {
    return await searchFlightsDuffelReal(params, client);
  } catch (error) {
    console.error('[Duffel] Real API call failed, falling back to mock:', error);
    return searchFlightsMock(params);
  }
}

// ---------------------------------------------------------------------------
// Diagnostic: fire a test request to Duffel (Moscow → London, tomorrow)
// and log the number of offers + first offer details.
// Call once at startup or from an admin route to verify connectivity.
// ---------------------------------------------------------------------------

export async function testDuffelConnection(): Promise<void> {
  const apiKey = process.env.DUFFEL_API_KEY;

  if (!apiKey) {
    console.warn('[Duffel] testDuffelConnection: DUFFEL_API_KEY is not set');
    return;
  }

  // Use tomorrow's date as the departure date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const departureDate = tomorrow.toISOString().slice(0, 10);

  console.log(`[Duffel] testDuffelConnection: searching SVO → LHR on ${departureDate}`);

  const client = new Duffel({ token: apiKey });

  try {
    const response = await client.offerRequests.create({
      slices: [
        {
          origin: 'SVO',
          destination: 'LHR',
          departure_date: departureDate,
          arrival_time: null,
          departure_time: null,
        },
      ],
      passengers: [{ type: 'adult' }],
      cabin_class: 'economy',
      return_offers: true,
    });

    const offers = response.data.offers as Offer[];
    console.log(`[Duffel] testDuffelConnection: received ${offers.length} offers`);

    if (offers.length > 0) {
      const first = offers[0];
      console.log('[Duffel] testDuffelConnection: first offer =', {
        id: first.id,
        totalAmount: first.total_amount,
        currency: first.total_currency,
        expiresAt: first.expires_at,
        slicesCount: first.slices.length,
      });
    } else {
      console.warn('[Duffel] testDuffelConnection: no offers returned');
    }
  } catch (error) {
    console.error('[Duffel] testDuffelConnection: request failed:', error);
  }
}
