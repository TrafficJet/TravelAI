import { v4 as uuidv4 } from 'uuid';
import type { HotelOffer, SearchHotelsParams } from './booking.service.js';

// Hotellook (TravelPayouts) hotel search service.
// API docs: https://support.travelpayouts.com/hc/en-us/articles/360004200074
//
// Endpoint: GET https://engine.hotellook.com/api/v2/cache.json
// Optional env var: TRAVELPAYOUTS_TOKEN — add to .env for higher rate limits.
// Without token the public endpoint still works (lower limit).

// ---------------------------------------------------------------------------
// Raw Hotellook API response types
// ---------------------------------------------------------------------------

interface HotellookLocation {
  name:    string;
  country: string;
}

interface HotellookHotel {
  hotelId:    number;
  hotelName:  string;
  location:   HotellookLocation;
  stars:      number;
  priceFrom:  number;
  priceTo:    number;
  popularity: number;
  url:        string;
  photoUrl:   string | null;
}

// ---------------------------------------------------------------------------
// Helper: derive nights count from ISO date strings
// ---------------------------------------------------------------------------

function getNights(checkIn: string, checkOut: string): number {
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
}

// ---------------------------------------------------------------------------
// Mapping: Hotellook → HotelOffer
// ---------------------------------------------------------------------------

function mapHotellookHotel(
  raw: HotellookHotel,
  nights: number,
  currency: string,
): HotelOffer {
  const pricePerNight = raw.priceFrom;
  const totalPrice    = pricePerNight * nights;

  // Hotellook popularity is 0-100; scale to a 0-10 guest rating approximation
  const rating = Math.min(10, Math.max(5, (raw.popularity / 10)));

  return {
    offerId:      uuidv4(),
    provider:     'BOOKING',
    hotelName:    raw.hotelName,
    address:      raw.location.name + (raw.location.country ? ', ' + raw.location.country : ''),
    starRating:   raw.stars || 3,
    rating:       parseFloat(rating.toFixed(1)),
    reviewCount:  Math.floor(raw.popularity * 30), // synthetic estimate
    roomType:     'Стандартный номер',
    totalPrice:   totalPrice.toFixed(2),
    pricePerNight: pricePerNight.toFixed(2),
    currency,
    amenities:    ['WiFi'],
    imageUrl:     raw.photoUrl ?? null,
    expiresAt:    new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Public: searchHotelsHotellook
// ---------------------------------------------------------------------------

/**
 * Search for hotels via the Hotellook (TravelPayouts) cache API.
 *
 * Returns HotelOffer[] on success.
 * Returns [] on API error or empty response — caller decides whether to fall
 * back to mock data.
 *
 * Uses TRAVELPAYOUTS_TOKEN from env when available (optional).
 *
 * Example curl:
 *   curl "https://engine.hotellook.com/api/v2/cache.json?location=istanbul&checkIn=2026-06-01&checkOut=2026-06-05&adults=2&currency=rub&limit=10"
 */
export async function searchHotelsHotellook(
  params: SearchHotelsParams,
): Promise<HotelOffer[]> {
  const { city, checkIn, checkOut, guests, starRating, maxPrice } = params;

  const currency = 'rub';
  const nights   = getNights(checkIn, checkOut);

  const url = new URL('https://engine.hotellook.com/api/v2/cache.json');
  url.searchParams.set('location', city);
  url.searchParams.set('checkIn',  checkIn);
  url.searchParams.set('checkOut', checkOut);
  url.searchParams.set('adults',   String(guests.adults));
  url.searchParams.set('currency', currency);
  url.searchParams.set('limit',    '20');

  // Token is optional — public endpoint works without it at a lower rate limit
  const token = process.env.TRAVELPAYOUTS_TOKEN;
  if (token) {
    url.searchParams.set('token', token);
  }

  console.log('[Hotellook] Searching hotels for', city, checkIn, '->', checkOut);

  let raw: HotellookHotel[];

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => res.statusText);
      console.warn(`[Hotellook] HTTP ${res.status}: ${body}`);
      return [];
    }

    const json: unknown = await res.json();

    // API returns either a bare array or an object with a "result" array
    if (Array.isArray(json)) {
      raw = json as HotellookHotel[];
    } else if (
      json !== null &&
      typeof json === 'object' &&
      'result' in json &&
      Array.isArray((json as Record<string, unknown>)['result'])
    ) {
      raw = (json as Record<string, unknown>)['result'] as HotellookHotel[];
    } else {
      console.warn('[Hotellook] Unexpected response shape:', typeof json);
      return [];
    }
  } catch (err) {
    console.error('[Hotellook] Fetch error:', err instanceof Error ? err.message : String(err));
    return [];
  }

  if (raw.length === 0) {
    console.log('[Hotellook] Empty result for', city);
    return [];
  }

  // Apply star filter
  let filtered = starRating && starRating.length > 0
    ? raw.filter((h) => starRating.includes(h.stars))
    : raw;

  // Apply max price (per night) filter
  if (maxPrice) {
    filtered = filtered.filter((h) => h.priceFrom <= maxPrice);
  }

  // Sort by priceFrom ascending, cap at 5 results
  filtered.sort((a, b) => a.priceFrom - b.priceFrom);

  // Currency label: Hotellook returns prices in the requested currency.
  // We request 'rub' → display as 'RUB'.
  const displayCurrency = currency.toUpperCase();

  const offers = filtered
    .slice(0, 5)
    .map((h) => mapHotellookHotel(h, nights, displayCurrency));

  console.log(`[Hotellook] Mapped ${offers.length} hotel(s) for`, city);
  return offers;
}
