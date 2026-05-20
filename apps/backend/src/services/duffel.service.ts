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
import { searchFlightsTravelpayouts } from './travelpayouts.service.js';

// Duffel service — international flight search.
// Priority: Duffel real API → Travelpayouts (Aviasales) → mock.
// Uses real Duffel when DUFFEL_API_KEY is set.
// Falls back to Travelpayouts when TRAVELPAYOUTS_API_KEY is set.
// Falls back to mock data when no keys are present or all real calls fail.

export interface FlightOffer {
  offerId: string;
  provider: 'DUFFEL' | 'AVIASALES';
  totalPrice: string;
  currency: string;
  cabinClass: 'economy' | 'business' | 'first';
  segments: FlightSegment[];
  baggage: string;
  expiresAt: string;
  /** Affiliate booking link (Aviasales via TravelPayouts). Optional — present when marker is set. */
  bookingUrl?: string;
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
  TK: { name: 'Turkish Airlines', code: 'TK' },
  FZ: { name: 'flydubai', code: 'FZ' },
  EK: { name: 'Emirates', code: 'EK' },
  PC: { name: 'Pegasus Airlines', code: 'PC' },
  KC: { name: 'Air Astana', code: 'KC' },
  A9: { name: 'Georgian Airways', code: 'A9' },
  G9: { name: 'Air Arabia', code: 'G9' },
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
  J2: { name: 'Azerbaijan Airlines', code: 'J2' },
  HY: { name: 'Uzbekistan Airways', code: 'HY' },
};

// Approximate flight routes with typical duration in minutes and realistic price ranges (USD)
// priceRange: [min, max] per person in USD
const ROUTE_DATA: Record<string, { duration: number; airlines: string[]; priceRange?: [number, number] }> = {
  // Moscow routes (Russian airlines excluded — using neutral carriers only)
  'SVO-IST': { duration: 200, airlines: ['TK', 'PC'] },
  'SVO-DXB': { duration: 265, airlines: ['EK', 'FZ', 'G9'] },
  'SVO-LED': { duration: 75,  airlines: ['TK', 'PC'] },
  'DME-IST': { duration: 195, airlines: ['TK', 'PC'] },
  'LED-IST': { duration: 225, airlines: ['TK', 'PC'] },
  // Warsaw (WAW) routes — prices in USD
  'WAW-BCN': { duration: 180, airlines: ['W6', 'FR', 'LO', 'VY'], priceRange: [54, 197] },  // 3h00m
  'WAW-MAD': { duration: 195, airlines: ['LO', 'FR', 'IB'],        priceRange: [60, 218] },
  'WAW-LHR': { duration: 160, airlines: ['LO', 'BA', 'W6'],        priceRange: [54, 175] },  // 2h40m
  'WAW-CDG': { duration: 160, airlines: ['LO', 'AF', 'FR'],        priceRange: [60, 186] },
  'WAW-AMS': { duration: 130, airlines: ['LO', 'KL', 'W6'],        priceRange: [54, 164] },
  'WAW-FCO': { duration: 165, airlines: ['LO', 'FR', 'W6'],        priceRange: [54, 180] },
  'WAW-VIE': { duration: 100, airlines: ['LO', 'OS'],              priceRange: [60, 142] },
  'WAW-BER': { duration: 95,  airlines: ['LO', 'EW', 'FR'],        priceRange: [49, 131] },
  'WAW-DXB': { duration: 380, airlines: ['EK', 'LH', 'TK'],        priceRange: [382, 655] }, // 6h20m
  'WAW-IST': { duration: 185, airlines: ['TK', 'LO', 'W6'],        priceRange: [131, 349] },
  // Kyiv Boryspil (KBP) routes — prices in USD
  'KBP-BCN': { duration: 210, airlines: ['W6', 'FR', 'TK'],        priceRange: [65, 218] },  // 3h30m
  'KBP-DXB': { duration: 390, airlines: ['FZ', 'G9', 'TK', 'W6'], priceRange: [382, 633] }, // 6h30m; real carriers: flydubai, Air Arabia, Turkish Airlines, Wizz Air
  'KBP-IST': { duration: 140, airlines: ['TK', 'W6', 'PC'],        priceRange: [88, 273] },
  'KBP-LHR': { duration: 195, airlines: ['BA', 'W6', 'TK'],        priceRange: [99, 306] },
  'KBP-WAW': { duration: 90,  airlines: ['LO', 'W6', 'FR'],        priceRange: [54, 142] },
  // London (LHR/LGW/STN) routes — prices in USD
  'LHR-FCO': { duration: 155, airlines: ['BA', 'IB', 'FR', 'W6'],  priceRange: [49, 197] },  // 2h35m London→Rome
  'LHR-MAD': { duration: 150, airlines: ['BA', 'IB', 'VY'],        priceRange: [54, 186] },
  'LHR-BCN': { duration: 145, airlines: ['BA', 'VY', 'FR'],        priceRange: [49, 175] },
  'LHR-CDG': { duration: 85,  airlines: ['BA', 'AF'],              priceRange: [60, 197] },
  'LHR-AMS': { duration: 80,  airlines: ['BA', 'KL'],              priceRange: [60, 175] },
  'LHR-BER': { duration: 120, airlines: ['BA', 'EW', 'LH'],        priceRange: [54, 164] },
  'LHR-FRA': { duration: 115, airlines: ['BA', 'LH'],              priceRange: [60, 186] },
  'LHR-VIE': { duration: 135, airlines: ['BA', 'OS'],              priceRange: [71, 208] },
  'LHR-PRG': { duration: 130, airlines: ['BA', 'W6'],              priceRange: [60, 175] },
  'LHR-WAW': { duration: 160, airlines: ['BA', 'LO', 'W6'],        priceRange: [54, 175] },
  'LHR-IST': { duration: 225, airlines: ['BA', 'TK'],              priceRange: [99, 306] },
  'LHR-DXB': { duration: 420, airlines: ['BA', 'EK'],              priceRange: [349, 709] },
  // Rome (FCO) routes — prices in USD
  'FCO-LHR': { duration: 155, airlines: ['BA', 'IB', 'FR', 'W6'],  priceRange: [49, 197] },  // Rome→London
  'FCO-WAW': { duration: 165, airlines: ['LO', 'FR', 'W6'],        priceRange: [54, 180] },
  'FCO-BCN': { duration: 135, airlines: ['VY', 'FR', 'IB'],        priceRange: [43, 153] },
  'FCO-MAD': { duration: 145, airlines: ['IB', 'VY', 'FR'],        priceRange: [49, 175] },
  'FCO-CDG': { duration: 135, airlines: ['AF', 'FR'],              priceRange: [54, 169] },
  'FCO-AMS': { duration: 150, airlines: ['KL', 'FR'],              priceRange: [60, 180] },
  'FCO-BER': { duration: 135, airlines: ['EW', 'FR', 'LH'],        priceRange: [49, 164] },
  'FCO-FRA': { duration: 130, airlines: ['LH', 'FR'],              priceRange: [60, 175] },
  'FCO-VIE': { duration: 105, airlines: ['OS', 'FR'],              priceRange: [54, 153] },
  'FCO-IST': { duration: 195, airlines: ['TK', 'FR'],              priceRange: [88, 262] },
  'FCO-DXB': { duration: 390, airlines: ['EK', 'FR'],              priceRange: [306, 633] },
  // Paris (CDG/ORY) routes
  'CDG-FCO': { duration: 135, airlines: ['AF', 'FR'],              priceRange: [54, 169] },
  'CDG-LHR': { duration: 85,  airlines: ['AF', 'BA'],              priceRange: [60, 197] },
  'CDG-MAD': { duration: 130, airlines: ['AF', 'IB', 'VY'],        priceRange: [60, 186] },
  'CDG-BCN': { duration: 115, airlines: ['AF', 'VY', 'FR'],        priceRange: [54, 164] },
  'CDG-AMS': { duration: 75,  airlines: ['AF', 'KL'],              priceRange: [54, 164] },
  // Amsterdam (AMS) routes
  'AMS-FCO': { duration: 150, airlines: ['KL', 'FR'],              priceRange: [60, 180] },
  'AMS-LHR': { duration: 80,  airlines: ['KL', 'BA'],              priceRange: [60, 175] },
  'AMS-BCN': { duration: 155, airlines: ['KL', 'VY'],              priceRange: [60, 180] },
  'AMS-MAD': { duration: 165, airlines: ['KL', 'IB'],              priceRange: [71, 197] },
  // Berlin (BER) routes
  'BER-FCO': { duration: 135, airlines: ['EW', 'FR', 'LH'],        priceRange: [49, 164] },
  'BER-LHR': { duration: 120, airlines: ['EW', 'BA', 'LH'],        priceRange: [54, 164] },
  'BER-BCN': { duration: 160, airlines: ['EW', 'VY', 'FR'],        priceRange: [54, 175] },
  // Madrid (MAD) routes
  'MAD-FCO': { duration: 145, airlines: ['IB', 'VY', 'FR'],        priceRange: [49, 175] },
  'MAD-LHR': { duration: 150, airlines: ['IB', 'BA', 'VY'],        priceRange: [54, 186] },
  // Frankfurt (FRA) routes
  'FRA-FCO': { duration: 130, airlines: ['LH', 'FR'],              priceRange: [60, 175] },
  'FRA-LHR': { duration: 115, airlines: ['LH', 'BA'],              priceRange: [60, 186] },
  // Prague (PRG) routes
  'PRG-LHR': { duration: 130, airlines: ['W6', 'BA'],              priceRange: [60, 175] },
  'PRG-FCO': { duration: 120, airlines: ['W6', 'FR'],              priceRange: [49, 153] },
  // Vienna (VIE) routes
  'VIE-LHR': { duration: 135, airlines: ['OS', 'BA'],              priceRange: [71, 208] },
  'VIE-FCO': { duration: 105, airlines: ['OS', 'FR'],              priceRange: [54, 153] },
  // Tbilisi (TBS) routes
  'TBS-IST': { duration: 120, airlines: ['TK', 'A9', 'PC'],        priceRange: [109, 273] },
  'TBS-DXB': { duration: 270, airlines: ['FZ', 'G9', 'EK'],        priceRange: [218, 491] },
  'TBS-WAW': { duration: 195, airlines: ['W6', 'TK', 'LO'],        priceRange: [131, 327] },
  'TBS-BCN': { duration: 240, airlines: ['W6', 'TK', 'FR'],        priceRange: [153, 382] },
  'TBS-LHR': { duration: 225, airlines: ['TK', 'BA'],              priceRange: [175, 436] },
  // Almaty (ALA) routes
  'ALA-IST': { duration: 330, airlines: ['TK', 'KC', 'FZ'],        priceRange: [273, 600] },
  'ALA-DXB': { duration: 300, airlines: ['FZ', 'EK', 'G9', 'KC'],  priceRange: [218, 491] },
  'ALA-BCN': { duration: 450, airlines: ['TK', 'W6', 'LH'],        priceRange: [382, 764] },
  'ALA-WAW': { duration: 390, airlines: ['TK', 'W6', 'LO'],        priceRange: [273, 546] },
  // Baku (GYD) routes
  'GYD-IST': { duration: 100, airlines: ['TK', 'PC', 'J2'],        priceRange: [87, 218] },
  'GYD-DXB': { duration: 210, airlines: ['FZ', 'G9', 'EK'],        priceRange: [175, 382] },
  'GYD-WAW': { duration: 240, airlines: ['W6', 'TK', 'LO'],        priceRange: [153, 382] },
  // Yerevan (EVN) routes
  'EVN-IST': { duration: 120, airlines: ['TK', 'PC'],              priceRange: [109, 262] },
  'EVN-DXB': { duration: 240, airlines: ['FZ', 'G9', 'EK'],        priceRange: [197, 436] },
  // Tashkent (TAS) routes
  'TAS-IST': { duration: 360, airlines: ['TK', 'HY'],              priceRange: [262, 546] },
  'TAS-DXB': { duration: 270, airlines: ['FZ', 'EK', 'G9'],        priceRange: [197, 436] },
  DEFAULT: { duration: 180, airlines: ['TK', 'FZ', 'W6'],          priceRange: [87, 382] },
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


export async function searchFlightsMock(params: SearchFlightsParams): Promise<FlightOffer[]> {
  const { origin, destination, departureDate, passengers, cabinClass } = params;
  const route = getRouteData(origin, destination);
  const passengerCount = passengers.adults + (passengers.children ?? 0);

  // All prices are always in USD — no EUR or RUB returned to Claude.
  const currency = 'USD';

  // Use route-specific price range when available (already in USD), else fall back to generic USD range.
  let basePrice: number;
  if (route.priceRange) {
    const [minP, maxP] = route.priceRange;
    basePrice = minP + Math.floor(Math.random() * (maxP - minP));
  } else {
    basePrice = 89 + Math.floor(Math.random() * 510);
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
    const baggage = isLowCost ? 'Только ручная кладь (багаж +$15-30)' : '1 место 23 кг';

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

  // --- Priority 1: Duffel real API ---
  if (apiKey) {
    console.log('[Duffel] Using real API');
    const client = new Duffel({ token: apiKey });
    try {
      return await searchFlightsDuffelReal(params, client);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[Duffel] Fallback to Travelpayouts/mock: ${message}`);
    }
  }

  // --- Priority 2: Travelpayouts (Aviasales) real API ---
  if (process.env.TRAVELPAYOUTS_TOKEN ?? process.env.TRAVELPAYOUTS_API_KEY) {
    console.log('[Travelpayouts] Duffel unavailable — trying Travelpayouts flights');
    try {
      return await searchFlightsTravelpayouts(params);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[Travelpayouts] Fallback to mock: ${message}`);
    }
  }

  // --- Priority 3: Mock ---
  console.log('[Duffel] No real API available, using mock');
  return searchFlightsMock(params);
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
