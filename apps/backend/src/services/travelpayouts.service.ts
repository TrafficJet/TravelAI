import { v4 as uuidv4 } from 'uuid';
import type { HotelOffer, SearchHotelsParams } from './booking.service.js';
import type { FlightOffer, FlightSegment, SearchFlightsParams } from './duffel.service.js';
import { cityToIata } from './amadeus.service.js';

// Travelpayouts service — flights (Aviasales) + hotels (Hotellook) for CIS market.
// Docs:
//   Flights: https://support.travelpayouts.com/hc/en-us/articles/360004731452
//   Hotels:  https://support.travelpayouts.com/hc/en-us/articles/360004070052
//
// Required env vars:
//   TRAVELPAYOUTS_API_KEY — from travelpayouts.com → Dashboard → API
//   TRAVELPAYOUTS_MARKER  — affiliate partner/marker ID (default: 530860)

// ---------------------------------------------------------------------------
// Aviasales (flights) API types
// ---------------------------------------------------------------------------

interface AviasalesTicket {
  origin:            string;
  destination:       string;
  airline:           string;
  flight_number:     number;
  departure_at:      string; // ISO 8601 or YYYY-MM-DD
  expires_at:        string;
  number_of_changes: number;
  price:             number;
  found_at:          string;
  transfers:         number;
  duration?:         number; // total minutes
  duration_to?:      number;
  duration_back?:    number;
}

interface AviasalesResponse {
  success: boolean;
  data:    AviasalesTicket[];
  currency: string;
}

// ---------------------------------------------------------------------------
// Hotellook (hotels) API types
// ---------------------------------------------------------------------------

interface HotellookRoom {
  roomName?:      string;
  amenities?:     string[];
}

interface HotellookHotel {
  id:              number;
  hotelId?:        number;
  hotelName:       string;
  name?:           string;
  address?:        string;
  stars:           number;
  guestScore?:     number;
  reviewCount?:    number;
  rooms?:          HotellookRoom[];
  price?:          number;
  priceFrom?:      number;
  minPrice?:       number;
  currency?:       string;
  photoUrl?:       string;
  location?:       { name?: string };
  amenities?:      string[];
}

interface HotellookResponse {
  results?: HotellookHotel[];
  hotels?:  HotellookHotel[];
  status?:  string;
}

// ---------------------------------------------------------------------------
// Airline code → name mapping
// ---------------------------------------------------------------------------

const AIRLINE_NAMES: Record<string, string> = {
  SU: 'Аэрофлот',
  S7: 'S7 Airlines',
  DP: 'Победа',
  U6: 'Уральские авиалинии',
  '5N': 'Smartavia',
  Y7: 'NordStar',
  N4: 'Нордавиа',
  UT: 'ЮТэйр',
  TK: 'Turkish Airlines',
  EK: 'Emirates',
  FZ: 'Flydubai',
  LH: 'Lufthansa',
  BA: 'British Airways',
  AF: 'Air France',
  KL: 'KLM',
  W6: 'Wizz Air',
  FR: 'Ryanair',
  PS: 'МАУ',
};

// Exchange rate for RUB → USD conversion (1 USD = 90 RUB, hardcoded for MVP)
const RUB_TO_USD = 90;

// ---------------------------------------------------------------------------
// Mock flights (fallback when key absent or API fails)
// ---------------------------------------------------------------------------

const MOCK_AIRLINES = [
  { name: 'Аэрофлот',          code: 'SU' },
  { name: 'Turkish Airlines',   code: 'TK' },
  { name: 'Emirates',           code: 'EK' },
];

function buildMockFlightOffers(params: SearchFlightsParams): FlightOffer[] {
  const { origin, destination, departureDate, passengers, cabinClass } = params;
  const passengerCount = passengers.adults + (passengers.children ?? 0);
  // Base price in USD (roughly $90–$310 per passenger before scaling)
  const basePriceRub = 8000 + Math.floor(Math.random() * 20000);
  const departureTimes = ['07:00', '12:30', '18:45'];

  return MOCK_AIRLINES.map((airline, idx): FlightOffer => {
    const [hour, min] = departureTimes[idx].split(':').map(Number);
    const departure = new Date(
      `${departureDate}T${String(hour).padStart(2, '0')}:${String(min ?? 0).padStart(2, '0')}:00`,
    );
    const durationMin = 180 + idx * 30;
    const arrival = new Date(departure.getTime() + durationMin * 60 * 1000);
    const totalPriceUsd = Math.round((basePriceRub * (1 + idx * 0.15) * passengerCount) / RUB_TO_USD);

    return {
      offerId:    uuidv4(),
      provider:   'AVIASALES',
      totalPrice: totalPriceUsd.toFixed(2),
      currency:   'USD',
      cabinClass: (cabinClass === 'business' || cabinClass === 'first'
        ? cabinClass
        : 'economy') as FlightOffer['cabinClass'],
      segments: [
        {
          origin:       origin.toUpperCase(),
          destination:  destination.toUpperCase(),
          departureAt:  departure.toISOString(),
          arrivalAt:    arrival.toISOString(),
          airline:      airline.name,
          flightNumber: `${airline.code} ${200 + idx * 41}`,
          duration:     durationMin,
        } satisfies FlightSegment,
      ],
      baggage:   idx === 0 ? 'Только ручная кладь' : '1 место 23 кг',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
  });
}

// ---------------------------------------------------------------------------
// Mock hotels (fallback when key absent or API fails)
// ---------------------------------------------------------------------------

// Unsplash photo URLs for fallback hotel images
const HOTEL_PHOTOS = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=250&fit=crop', // luxury hotel
  'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=400&h=250&fit=crop', // hotel pool
  'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&h=250&fit=crop', // mountain hotel
  'https://images.unsplash.com/photo-1551882547-ff40c4a49f25?w=400&h=250&fit=crop',   // city hotel
];

function buildMockHotelOffers(params: SearchHotelsParams): HotelOffer[] {
  const { city, checkIn, checkOut } = params;
  const nights = Math.max(
    1,
    Math.round(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24),
    ),
  );

  // Prices in USD
  const mockHotels = [
    { name: `Grand Hotel ${city}`,       stars: 5, perNight: 220, rating: 8.9, reviews: 2300, photo: HOTEL_PHOTOS[0] },
    { name: `City Center Hotel ${city}`, stars: 4, perNight:  95, rating: 8.2, reviews: 1500, photo: HOTEL_PHOTOS[3] },
    { name: `Budget Inn ${city}`,        stars: 3, perNight:  45, rating: 7.5, reviews:  900, photo: HOTEL_PHOTOS[1] },
  ];

  return mockHotels.map((h): HotelOffer => ({
    offerId:      uuidv4(),
    provider:     'BOOKING',
    hotelName:    h.name,
    address:      `Центр города, ${city}`,
    starRating:   h.stars,
    rating:       h.rating,
    reviewCount:  h.reviews,
    roomType:     'Стандартный номер',
    totalPrice:   (h.perNight * nights).toFixed(2),
    pricePerNight: h.perNight.toFixed(2),
    currency:     'USD',
    amenities:    ['WiFi', 'Завтрак', 'Кондиционер'],
    imageUrl:     h.photo,
    expiresAt:    new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  }));
}

// ---------------------------------------------------------------------------
// Real Aviasales / Travelpayouts API — flight search
// GET https://api.travelpayouts.com/aviasales/v3/prices_for_dates
// ---------------------------------------------------------------------------

async function searchFlightsTravelpayoutsReal(
  params: SearchFlightsParams,
  apiKey: string,
): Promise<FlightOffer[]> {
  const { origin, destination, departureDate, passengers } = params;

  const url = new URL('https://api.travelpayouts.com/aviasales/v3/prices_for_dates');
  url.searchParams.set('origin',        origin.toUpperCase());
  url.searchParams.set('destination',   destination.toUpperCase());
  url.searchParams.set('departure_at',  departureDate);
  url.searchParams.set('currency',      'rub');
  url.searchParams.set('limit',         '10');
  url.searchParams.set('sorting',       'price');
  url.searchParams.set('unique',        'false');
  url.searchParams.set('one_way',       'true');

  const res = await fetch(url.toString(), {
    headers: {
      'X-Access-Token': apiKey,
      'Accept':         'application/json',
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[Travelpayouts/flights] HTTP ${res.status}: ${body}`);
  }

  const json = (await res.json()) as AviasalesResponse;

  if (!json.success || !Array.isArray(json.data)) {
    throw new Error('[Travelpayouts/flights] Unexpected response shape');
  }

  if (json.data.length === 0) {
    throw new Error('[Travelpayouts/flights] Empty data array for this route');
  }

  const passengerCount = passengers.adults + (passengers.children ?? 0);
  // API returns prices in RUB — convert to USD for display
  const apiCurrency = (json.currency ?? 'rub').toLowerCase();
  const isRub = apiCurrency === 'rub';

  return json.data.slice(0, 5).map((ticket): FlightOffer => {
    const departureAt = ticket.departure_at.includes('T')
      ? ticket.departure_at
      : `${ticket.departure_at}T00:00:00`;

    const durationMinutes = ticket.duration ?? ticket.duration_to ?? 120;
    const arrivalAt = new Date(
      new Date(departureAt).getTime() + durationMinutes * 60 * 1000,
    ).toISOString();

    const expiresAt = new Date(
      new Date(ticket.found_at).getTime() + 30 * 60 * 1000,
    ).toISOString();

    const airlineName = AIRLINE_NAMES[ticket.airline] ?? ticket.airline;
    const rawPrice    = ticket.price * passengerCount;
    const totalPrice  = isRub
      ? (rawPrice / RUB_TO_USD).toFixed(2)
      : rawPrice.toFixed(2);
    const baggage     = ticket.transfers === 0 ? 'Только ручная кладь' : '1 место 23 кг';

    return {
      offerId:    uuidv4(),
      provider:   'AVIASALES',
      totalPrice,
      currency:   'USD',
      cabinClass: 'economy' as const,
      segments: [
        {
          origin:       ticket.origin.toUpperCase(),
          destination:  ticket.destination.toUpperCase(),
          departureAt,
          arrivalAt,
          airline:      airlineName,
          flightNumber: `${ticket.airline} ${ticket.flight_number}`,
          duration:     durationMinutes,
        } satisfies FlightSegment,
      ],
      baggage,
      expiresAt,
    };
  });
}

// ---------------------------------------------------------------------------
// Real Hotellook API — hotel search
// GET https://engine.hotellook.com/api/v2/cache.json
// ---------------------------------------------------------------------------

/**
 * Build a Hotellook affiliate search URL including the partner marker.
 * Example: https://search.hotellook.com/?marker=530860&token=...&locationId=istanbul
 */
function buildHotellookAffiliateUrl(params: {
  locationId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  apiKey: string;
}): string {
  const marker = process.env.TRAVELPAYOUTS_MARKER ?? '530860';
  const url = new URL('https://search.hotellook.com/');
  url.searchParams.set('marker', marker);
  url.searchParams.set('token', params.apiKey);
  url.searchParams.set('locationId', params.locationId);
  url.searchParams.set('checkIn', params.checkIn);
  url.searchParams.set('checkOut', params.checkOut);
  url.searchParams.set('adults', String(params.adults));
  url.searchParams.set('lang', 'ru');
  return url.toString();
}

/** Pick a fallback Unsplash photo based on hotel star rating */
function fallbackHotelPhoto(stars: number): string {
  if (stars >= 5) return HOTEL_PHOTOS[0]; // luxury
  if (stars >= 4) return HOTEL_PHOTOS[3]; // city hotel
  if (stars >= 3) return HOTEL_PHOTOS[1]; // pool/mid-range
  return HOTEL_PHOTOS[2];                  // budget/mountain
}

/** Map Hotellook hotel entry to our HotelOffer shape */
function mapHotellookHotel(hotel: HotellookHotel, nights: number): HotelOffer | null {
  const rawPrice = hotel.price ?? hotel.priceFrom ?? hotel.minPrice ?? 0;
  if (rawPrice <= 0) return null;

  // API requests currency=rub — convert to USD
  const apiCurrency = (hotel.currency ?? 'RUB').toUpperCase();
  const isRub = apiCurrency === 'RUB';
  const priceTotalUsd   = isRub ? rawPrice / RUB_TO_USD : rawPrice;
  const pricePerNightUsd = priceTotalUsd / nights;

  const stars         = Math.max(1, Math.min(5, hotel.stars ?? 3));
  const hotelName     = hotel.hotelName ?? hotel.name ?? 'Отель';
  const address       = hotel.address ?? hotel.location?.name ?? hotelName;
  const rating        = hotel.guestScore ? hotel.guestScore / 10 : 7.5 + Math.random() * 2;
  const reviewCount   = hotel.reviewCount ?? Math.floor(Math.random() * 2000) + 500;
  const amenities     = hotel.amenities ?? hotel.rooms?.[0]?.amenities ?? ['WiFi'];
  const roomType      = hotel.rooms?.[0]?.roomName ?? 'Стандартный номер';
  const imageUrl      = hotel.photoUrl ?? fallbackHotelPhoto(stars);

  return {
    offerId:      uuidv4(),
    provider:     'BOOKING',
    hotelName,
    address,
    starRating:   stars,
    rating:       Math.round(rating * 10) / 10,
    reviewCount,
    roomType,
    totalPrice:   priceTotalUsd.toFixed(2),
    pricePerNight: pricePerNightUsd.toFixed(2),
    currency:     'USD',
    amenities:    Array.isArray(amenities) ? amenities.slice(0, 8) : ['WiFi'],
    imageUrl,
    expiresAt:    new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  };
}

async function searchHotelsTravelpayoutsReal(
  params: SearchHotelsParams,
  apiKey: string,
): Promise<HotelOffer[]> {
  const { city, checkIn, checkOut, guests } = params;

  const nights = Math.max(
    1,
    Math.round(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24),
    ),
  );

  // Hotellook accepts city name or IATA code in `location`
  // Try to resolve IATA first; if not found, use the city name as-is
  const iataCode   = cityToIata(city);
  const locationId = iataCode ?? city;

  const url = new URL('https://engine.hotellook.com/api/v2/cache.json');
  url.searchParams.set('location',    locationId);
  url.searchParams.set('currency',    'rub');
  url.searchParams.set('checkIn',     checkIn);
  url.searchParams.set('checkOut',    checkOut);
  url.searchParams.set('adultsCount', String(guests.adults));
  url.searchParams.set('lang',        'ru');
  url.searchParams.set('token',       apiKey);
  url.searchParams.set('limit',       '10');

  if (params.starRating && params.starRating.length > 0) {
    url.searchParams.set('stars', params.starRating.join(','));
  }

  const res = await fetch(url.toString(), {
    headers: { 'Accept': 'application/json' },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[Travelpayouts/hotels] HTTP ${res.status}: ${body}`);
  }

  const json = (await res.json()) as HotellookResponse;

  const rawList: HotellookHotel[] = json.results ?? json.hotels ?? [];

  if (rawList.length === 0) {
    throw new Error('[Travelpayouts/hotels] No hotels returned for this query');
  }

  // Build Hotellook affiliate URL with partner marker
  const affiliateUrl = buildHotellookAffiliateUrl({
    locationId,
    checkIn,
    checkOut,
    adults: guests.adults,
    apiKey,
  });

  let offers: HotelOffer[] = rawList
    .map((h): HotelOffer | null => {
      const offer = mapHotellookHotel(h, nights);
      if (!offer) return null;
      // Attach affiliate booking URL — includes marker=530860 for commission tracking
      offer.bookingUrl = affiliateUrl;
      return offer;
    })
    .filter((o): o is HotelOffer => o !== null);

  // Apply star filter
  if (params.starRating && params.starRating.length > 0) {
    offers = offers.filter((o) => params.starRating!.includes(o.starRating));
  }

  // Apply maxPrice filter (per night)
  if (params.maxPrice !== undefined) {
    offers = offers.filter((o) => parseFloat(o.pricePerNight) <= params.maxPrice!);
  }

  offers.sort((a, b) => parseFloat(a.pricePerNight) - parseFloat(b.pricePerNight));

  return offers.slice(0, 5);
}

// ---------------------------------------------------------------------------
// Public: searchFlightsTravelpayouts
// ---------------------------------------------------------------------------

/**
 * Search international + CIS flights via Travelpayouts / Aviasales API.
 * Falls back to mock data when TRAVELPAYOUTS_API_KEY is absent or the call fails.
 */
export async function searchFlightsTravelpayouts(
  params: SearchFlightsParams,
): Promise<FlightOffer[]> {
  const apiKey = process.env.TRAVELPAYOUTS_TOKEN ?? process.env.TRAVELPAYOUTS_API_KEY;

  if (!apiKey) {
    console.log('[Travelpayouts/flights] API key not set, using mock data');
    return buildMockFlightOffers(params);
  }

  console.log(
    '[Travelpayouts/flights] Using real API:',
    params.origin,
    '→',
    params.destination,
  );

  try {
    return await searchFlightsTravelpayoutsReal(params, apiKey);
  } catch (error) {
    console.error('[Travelpayouts/flights] Real API failed, falling back to mock:', error);
    return buildMockFlightOffers(params);
  }
}

// ---------------------------------------------------------------------------
// Public: searchHotelsTravelpayouts
// ---------------------------------------------------------------------------

/**
 * Search hotels via Travelpayouts / Hotellook (Booking.com, Hotels.com, Ostrovok).
 * Falls back to mock data when TRAVELPAYOUTS_API_KEY is absent or the call fails.
 */
export async function searchHotelsTravelpayouts(
  params: SearchHotelsParams,
): Promise<HotelOffer[]> {
  const apiKey = process.env.TRAVELPAYOUTS_TOKEN ?? process.env.TRAVELPAYOUTS_API_KEY;

  if (!apiKey) {
    console.log('[Travelpayouts/hotels] API key not set, using mock data');
    return buildMockHotelOffers(params);
  }

  console.log('[Travelpayouts/hotels] Using real API for city:', params.city);

  try {
    return await searchHotelsTravelpayoutsReal(params, apiKey);
  } catch (error) {
    console.error('[Travelpayouts/hotels] Real API failed, falling back to mock:', error);
    return buildMockHotelOffers(params);
  }
}
