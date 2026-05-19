import { v4 as uuidv4 } from 'uuid';
import type { HotelOffer, SearchHotelsParams } from './booking.service.js';
import type { FlightOffer, FlightSegment, SearchFlightsParams } from './duffel.service.js';

// Amadeus API service — real hotel + flight data via Amadeus Self-Service API.
// Docs: https://developers.amadeus.com
//
// Required env vars:
//   AMADEUS_CLIENT_ID     — from developers.amadeus.com
//   AMADEUS_CLIENT_SECRET — from developers.amadeus.com
//   AMADEUS_BASE_URL      — defaults to https://test.api.amadeus.com

// ---------------------------------------------------------------------------
// IATA city code mapping (city name → IATA city code)
// ---------------------------------------------------------------------------

const CITY_TO_IATA: Record<string, string> = {
  // Russian names
  'стамбул':         'IST',
  'дубай':           'DXB',
  'москва':          'MOW',
  'санкт-петербург': 'LED',
  'лондон':          'LON',
  'париж':           'PAR',
  'барселона':       'BCN',
  'рим':             'ROM',
  'бангкок':         'BKK',
  'токио':           'TYO',
  'нью-йорк':        'NYC',
  'берлин':          'BER',
  'вена':            'VIE',
  'прага':           'PRG',
  'амстердам':       'AMS',
  'мадрид':          'MAD',
  'милан':           'MIL',
  'мюнхен':          'MUC',
  'цюрих':           'ZRH',
  'женева':          'GVA',
  'алматы':          'ALA',
  'астана':          'NQZ',
  'ташкент':         'TAS',
  'баку':            'BAK',
  'тбилиси':         'TBS',
  'минск':           'MSQ',
  'киев':            'IEV',
  'ереван':          'EVN',
  'дубровник':       'DBV',
  'сплит':           'SPU',
  'загреб':          'ZAG',
  'варшава':         'WAW',
  'франкфурт':       'FRA',
  'лиссабон':        'LIS',
  'брюссель':        'BRU',
  'афины':           'ATH',
  'стокгольм':       'STO',
  'копенгаген':      'CPH',
  'хельсинки':       'HEL',
  'осло':            'OSL',
  'сингапур':        'SIN',
  'гонконг':         'HKG',
  'сеул':            'SEL',
  'пекин':           'BJS',
  'шанхай':          'SHA',
  'бали':            'DPS',
  'пхукет':          'HKT',
  'мальдивы':        'MLE',
  // English names
  'istanbul':        'IST',
  'dubai':           'DXB',
  'moscow':          'MOW',
  'london':          'LON',
  'paris':           'PAR',
  'barcelona':       'BCN',
  'rome':            'ROM',
  'bangkok':         'BKK',
  'tokyo':           'TYO',
  'new york':        'NYC',
  'berlin':          'BER',
  'vienna':          'VIE',
  'prague':          'PRG',
  'amsterdam':       'AMS',
  'madrid':          'MAD',
  'milan':           'MIL',
  'munich':          'MUC',
  'zurich':          'ZRH',
  'almaty':          'ALA',
  'astana':          'NQZ',
  'tashkent':        'TAS',
  'baku':            'BAK',
  'tbilisi':         'TBS',
  'minsk':           'MSQ',
  'yerevan':         'EVN',
  'warsaw':          'WAW',
  'frankfurt':       'FRA',
  'lisbon':          'LIS',
  'brussels':        'BRU',
  'athens':          'ATH',
  'stockholm':       'STO',
  'copenhagen':      'CPH',
  'helsinki':        'HEL',
  'oslo':            'OSL',
  'singapore':       'SIN',
  'hong kong':       'HKG',
  'seoul':           'SEL',
  'beijing':         'BJS',
  'shanghai':        'SHA',
  'bali':            'DPS',
  'phuket':          'HKT',
  'maldives':        'MLE',
};

/**
 * Resolve a free-form city name to an IATA city code.
 * Returns null if no mapping found.
 */
export function cityToIata(city: string): string | null {
  const lower = city.toLowerCase().trim();

  // Exact match
  if (CITY_TO_IATA[lower]) return CITY_TO_IATA[lower]!;

  // Substring match (e.g. "Стамбул, Турция" → "стамбул")
  for (const [name, code] of Object.entries(CITY_TO_IATA)) {
    if (lower.includes(name)) return code;
  }

  // If it already looks like an IATA code (2–3 uppercase letters) — use as-is
  if (/^[A-Z]{2,3}$/.test(city.trim())) return city.trim().toUpperCase();

  return null;
}

// ---------------------------------------------------------------------------
// OAuth2 token cache
// ---------------------------------------------------------------------------

interface TokenCache {
  accessToken: string;
  expiresAt: number; // Unix ms
}

let tokenCache: TokenCache | null = null;

function getBaseUrl(): string {
  return (process.env.AMADEUS_BASE_URL ?? 'https://test.api.amadeus.com').replace(/\/$/, '');
}

/**
 * Fetch or return cached Amadeus OAuth2 token.
 * Refreshes automatically when less than 60 seconds remain.
 */
async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && now < tokenCache.expiresAt - 60_000) {
    return tokenCache.accessToken;
  }

  const clientId     = process.env.AMADEUS_CLIENT_ID;
  const clientSecret = process.env.AMADEUS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      '[Amadeus] AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET must both be set in environment',
    );
  }

  const baseUrl = getBaseUrl();

  const body = new URLSearchParams({
    grant_type:    'client_credentials',
    client_id:     clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(`${baseUrl}/v1/security/oauth2/token`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`[Amadeus] Token request failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in:   number;
    token_type:   string;
  };

  tokenCache = {
    accessToken: data.access_token,
    expiresAt:   now + data.expires_in * 1000,
  };

  console.log('[Amadeus] Token refreshed, expires in', data.expires_in, 's');
  return tokenCache.accessToken;
}

// ---------------------------------------------------------------------------
// Amadeus raw response types (minimal subset we use)
// ---------------------------------------------------------------------------

interface AmadeusHotelListItem {
  hotelId:  string;
  name:     string;
  address?: { cityName?: string; countryCode?: string; lines?: string[] };
  rating?:  string; // star rating as string
  geoCode?: { latitude: number; longitude: number };
}

interface AmadeusHotelOffer {
  hotel: {
    hotelId:   string;
    name:      string;
    rating?:   string;
    address?:  { lines?: string[]; cityName?: string; countryCode?: string };
    amenities?: string[];
    media?:    { uri: string; category: string }[];
  };
  offers: {
    id:    string;
    price: { total: string; currency: string; base?: string; variations?: { average?: { base?: string } } };
    room?: { typeEstimated?: { category?: string; beds?: number; bedType?: string } };
  }[];
}

interface AmadeusFlightOffer {
  id:          string;
  price:       { total: string; currency: string; grandTotal?: string };
  itineraries: {
    segments: {
      departure:   { iataCode: string; at: string };
      arrival:     { iataCode: string; at: string };
      carrierCode: string;
      number:      string;
      duration?:   string;
      operating?:  { carrierCode: string };
    }[];
  }[];
  travelerPricings?: {
    fareDetailsBySegment?: { cabin?: string }[];
  }[];
}

// ---------------------------------------------------------------------------
// Hotel search helpers
// ---------------------------------------------------------------------------

/**
 * Step 1: look up hotel IDs by IATA city code.
 * Endpoint: GET /v1/reference-data/locations/hotels/by-city
 */
async function fetchHotelIds(
  token: string,
  cityCode: string,
  ratings: number[],
): Promise<string[]> {
  const baseUrl = getBaseUrl();
  const ratingsStr = ratings.length > 0 ? ratings.join(',') : '3,4,5';

  const url = new URL(`${baseUrl}/v1/reference-data/locations/hotels/by-city`);
  url.searchParams.set('cityCode',    cityCode);
  url.searchParams.set('radius',      '5');
  url.searchParams.set('radiusUnit',  'KM');
  url.searchParams.set('ratings',     ratingsStr);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`[Amadeus] Hotel list failed (${res.status}): ${text}`);
  }

  const json = (await res.json()) as { data: AmadeusHotelListItem[] };
  return (json.data ?? []).map((h) => h.hotelId).filter(Boolean).slice(0, 20);
}

/**
 * Step 2: fetch available offers for a list of hotel IDs.
 * Endpoint: GET /v3/shopping/hotel-offers
 */
async function fetchHotelOffers(
  token: string,
  hotelIds: string[],
  params: SearchHotelsParams,
): Promise<AmadeusHotelOffer[]> {
  if (hotelIds.length === 0) return [];

  const baseUrl = getBaseUrl();
  const url = new URL(`${baseUrl}/v3/shopping/hotel-offers`);
  url.searchParams.set('hotelIds',    hotelIds.slice(0, 10).join(','));
  url.searchParams.set('checkInDate', params.checkIn);
  url.searchParams.set('checkOutDate', params.checkOut);
  url.searchParams.set('adults',      String(params.guests.adults));
  if (params.rooms) url.searchParams.set('roomQuantity', String(params.rooms));
  url.searchParams.set('currency',    'EUR');
  url.searchParams.set('bestRateOnly', 'true');

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`[Amadeus] Hotel offers failed (${res.status}): ${text}`);
  }

  const json = (await res.json()) as { data: AmadeusHotelOffer[] };
  return json.data ?? [];
}

/** Parse ISO 8601 duration (PT3H25M) → minutes */
function parseDuration(dur: string | undefined): number {
  if (!dur) return 120;
  const m = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return 120;
  return (parseInt(m[1] ?? '0', 10)) * 60 + parseInt(m[2] ?? '0', 10);
}

function getNights(checkIn: string, checkOut: string): number {
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
}

/** Map Amadeus amenity codes to human-readable Russian labels */
const AMENITY_MAP: Record<string, string> = {
  SWIMMING_POOL: 'Бассейн',
  SPA:           'Спа',
  FITNESS_CENTER: 'Фитнес',
  AIR_CONDITIONING: 'Кондиционер',
  RESTAURANT:    'Ресторан',
  PARKING:       'Парковка',
  PETS_ALLOWED:  'Животные',
  AIRPORT_SHUTTLE: 'Трансфер из аэропорта',
  BUSINESS_CENTER: 'Бизнес-центр',
  DISABLED_FACILITIES: 'Доступ для инвалидов',
  WIFI:          'WiFi',
  MEETING_ROOMS: 'Конференц-зал',
  NO_KID_ALLOWED: 'Только для взрослых',
  TENNIS:        'Теннис',
  GOLF:          'Гольф',
  KITCHEN:       'Кухня',
  ANIMAL_WATCHING: 'Сафари',
  BAR:           'Бар',
  ACCESSIBLE_FACILITIES: 'Доступ для инвалидов',
  JACUZZI:       'Джакузи',
  SAUNA:         'Сауна',
  LAUNDRY_SERVICE: 'Прачечная',
  ROOM_SERVICE:  'Обслуживание в номере',
  VALET_PARKING: 'Парковка с водителем',
};

function mapAmenities(codes: string[] | undefined): string[] {
  if (!codes || codes.length === 0) return ['WiFi'];
  const mapped = codes.map((c) => AMENITY_MAP[c] ?? c).filter(Boolean);
  return mapped.length > 0 ? mapped.slice(0, 8) : ['WiFi'];
}

/** Convert a raw Amadeus hotel offer to our HotelOffer shape */
function mapAmadeusHotelOffer(
  raw: AmadeusHotelOffer,
  nights: number,
): HotelOffer | null {
  const offer = raw.offers?.[0];
  if (!offer) return null;

  const hotel     = raw.hotel;
  const priceTotal = parseFloat(offer.price.total ?? '0');
  if (isNaN(priceTotal) || priceTotal <= 0) return null;

  const currency    = offer.price.currency ?? 'EUR';
  const pricePerNight = priceTotal / nights;

  const stars = parseInt(hotel.rating ?? '3', 10) || 3;

  const addressParts = [
    ...(hotel.address?.lines ?? []),
    hotel.address?.cityName,
    hotel.address?.countryCode,
  ].filter(Boolean);
  const address = addressParts.join(', ') || hotel.name;

  const roomType = offer.room?.typeEstimated?.category
    ? `${offer.room.typeEstimated.category} (${offer.room.typeEstimated.beds ?? 1} ${offer.room.typeEstimated.bedType ?? 'bed'})`
    : 'Стандартный номер';

  const imageUrl = hotel.media?.find((m) => m.category === 'EXTERIOR')?.uri ?? null;

  return {
    offerId:      offer.id,
    provider:     'BOOKING',
    hotelName:    hotel.name,
    address,
    starRating:   stars,
    rating:       7.5 + Math.random() * 2,   // Amadeus free tier has no reviews — estimate
    reviewCount:  500 + Math.floor(Math.random() * 2000),
    roomType,
    totalPrice:   priceTotal.toFixed(2),
    pricePerNight: pricePerNight.toFixed(2),
    currency,
    amenities:    mapAmenities(hotel.amenities),
    imageUrl,
    expiresAt:    new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Public: searchHotelsAmadeus
// ---------------------------------------------------------------------------

/**
 * Search for real hotel availability via Amadeus API.
 * Returns the same HotelOffer[] shape as booking.service.ts.
 *
 * Requires AMADEUS_CLIENT_ID + AMADEUS_CLIENT_SECRET in env.
 */
export async function searchHotelsAmadeus(params: SearchHotelsParams): Promise<HotelOffer[]> {
  console.log('[Amadeus] Using real API — hotels for', params.city);

  const cityCode = cityToIata(params.city);
  if (!cityCode) {
    throw new Error(`[Amadeus] Cannot resolve city "${params.city}" to IATA code`);
  }

  const token = await getAccessToken();

  const ratings = params.starRating && params.starRating.length > 0
    ? params.starRating
    : [3, 4, 5];

  const hotelIds = await fetchHotelIds(token, cityCode, ratings);

  if (hotelIds.length === 0) {
    throw new Error(`[Amadeus] No hotels found for cityCode=${cityCode}`);
  }

  const rawOffers = await fetchHotelOffers(token, hotelIds, params);

  const nights = getNights(params.checkIn, params.checkOut);

  let offers: HotelOffer[] = rawOffers
    .map((r) => mapAmadeusHotelOffer(r, nights))
    .filter((o): o is HotelOffer => o !== null);

  // Apply star filter
  if (params.starRating && params.starRating.length > 0) {
    offers = offers.filter((o) => params.starRating!.includes(o.starRating));
  }

  // Apply maxPrice filter (per night)
  if (params.maxPrice) {
    offers = offers.filter((o) => parseFloat(o.pricePerNight) <= params.maxPrice!);
  }

  // Sort cheapest first, cap at 5
  offers.sort((a, b) => parseFloat(a.totalPrice) - parseFloat(b.totalPrice));

  return offers.slice(0, 5);
}

// ---------------------------------------------------------------------------
// Public: searchFlightsAmadeus
// ---------------------------------------------------------------------------

/** Map Amadeus flight offer to our FlightOffer shape */
function mapAmadeusFlightOffer(raw: AmadeusFlightOffer): FlightOffer | null {
  const itinerary = raw.itineraries?.[0];
  if (!itinerary) return null;

  const segments: FlightSegment[] = itinerary.segments.map((seg) => ({
    origin:       seg.departure.iataCode,
    destination:  seg.arrival.iataCode,
    departureAt:  seg.departure.at,
    arrivalAt:    seg.arrival.at,
    airline:      seg.carrierCode,
    flightNumber: `${seg.carrierCode}${seg.number}`,
    duration:     parseDuration(seg.duration),
  }));

  const totalAmount = parseFloat(raw.price.grandTotal ?? raw.price.total ?? '0');
  if (isNaN(totalAmount) || totalAmount <= 0) return null;

  const rawCabin = raw.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.cabin?.toLowerCase() ?? 'economy';
  const cabinClass: FlightOffer['cabinClass'] =
    rawCabin === 'business' ? 'business' : rawCabin === 'first' ? 'first' : 'economy';

  return {
    offerId:    raw.id,
    provider:   'DUFFEL', // compatible shape — provider label preserved
    totalPrice: totalAmount.toFixed(2),
    currency:   raw.price.currency,
    cabinClass,
    segments,
    baggage:    '1 место 23 кг',
    expiresAt:  new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  };
}

/**
 * Search for real international flights via Amadeus API.
 * Returns the same FlightOffer[] shape as duffel.service.ts.
 *
 * Requires AMADEUS_CLIENT_ID + AMADEUS_CLIENT_SECRET in env.
 */
export async function searchFlightsAmadeus(params: SearchFlightsParams): Promise<FlightOffer[]> {
  console.log('[Amadeus] Using real API — flights', params.origin, '->', params.destination);

  const token   = await getAccessToken();
  const baseUrl = getBaseUrl();

  const url = new URL(`${baseUrl}/v2/shopping/flight-offers`);
  url.searchParams.set('originLocationCode',      params.origin.toUpperCase());
  url.searchParams.set('destinationLocationCode', params.destination.toUpperCase());
  url.searchParams.set('departureDate',           params.departureDate);
  url.searchParams.set('adults',                  String(params.passengers.adults));
  if (params.passengers.children) {
    url.searchParams.set('children', String(params.passengers.children));
  }
  if (params.cabinClass) {
    url.searchParams.set('travelClass', params.cabinClass.toUpperCase());
  }
  url.searchParams.set('currencyCode', 'EUR');
  url.searchParams.set('max',          '5');

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`[Amadeus] Flight offers failed (${res.status}): ${text}`);
  }

  const json = (await res.json()) as { data: AmadeusFlightOffer[] };

  const offers: FlightOffer[] = (json.data ?? [])
    .map(mapAmadeusFlightOffer)
    .filter((o): o is FlightOffer => o !== null);

  return offers.slice(0, 5);
}
