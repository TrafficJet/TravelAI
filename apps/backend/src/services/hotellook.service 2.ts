import { v4 as uuidv4 } from 'uuid';
import type { HotelOffer, SearchHotelsParams } from './booking.service.js';

// Hotellook affiliate service.
//
// The engine.hotellook.com/api/v2/cache.json endpoint is DEPRECATED and always
// returns 404. Instead we generate Hotellook affiliate search links and return
// realistic mock data with those links attached so users can complete booking
// on the Hotellook site.
//
// Affiliate link format (TravelPayouts):
//   https://www.hotellook.com/search?adults={adults}&checkIn={checkIn}
//     &checkOut={checkOut}&cityId={city}&lang=ru
//     &marker={TRAVELPAYOUTS_MARKER}&token={TRAVELPAYOUTS_TOKEN}
//
// Env vars:
//   TRAVELPAYOUTS_TOKEN  — required for affiliate commissions.
//   TRAVELPAYOUTS_MARKER — affiliate partner/marker ID (default: 530860).

// ---------------------------------------------------------------------------
// Helper: derive nights count from ISO date strings
// ---------------------------------------------------------------------------

function getNights(checkIn: string, checkOut: string): number {
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
}

// ---------------------------------------------------------------------------
// Affiliate link builder
// ---------------------------------------------------------------------------

function buildHotellookUrl(params: {
  city: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  token: string;
  marker: string;
}): string {
  const url = new URL('https://www.hotellook.com/search');
  url.searchParams.set('adults', String(params.adults));
  url.searchParams.set('checkIn', params.checkIn);
  url.searchParams.set('checkOut', params.checkOut);
  // cityId can be a name string — Hotellook resolves it to ID internally
  url.searchParams.set('cityId', params.city);
  url.searchParams.set('lang', 'ru');
  // Affiliate marker — identifies the partner for commission tracking
  if (params.marker) {
    url.searchParams.set('marker', params.marker);
  }
  if (params.token) {
    url.searchParams.set('token', params.token);
  }
  return url.toString();
}

// ---------------------------------------------------------------------------
// Realistic hotel mock data by city
// ---------------------------------------------------------------------------

interface HotelMockTemplate {
  hotelName: string;
  address: string;
  starRating: number;
  rating: number;
  reviewCount: number;
  roomType: string;
  amenities: string[];
  pricePerNight: number; // in currency below
  currency: string;
  photoUrl?: string;
}

const CITY_HOTELS: Record<string, HotelMockTemplate[]> = {
  istanbul: [
    {
      hotelName: 'Hilton Istanbul Bosphorus',
      address: 'Cumhuriyet Cad. 34367, Harbiye, Стамбул',
      starRating: 5, rating: 8.7, reviewCount: 3241,
      roomType: 'Стандартный двухместный',
      amenities: ['WiFi', 'Бассейн', 'Спа', 'Фитнес', 'Ресторан', 'Бар'],
      pricePerNight: 206, currency: 'USD',
      photoUrl: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&q=80',
    },
    {
      hotelName: 'The Marmara Taksim',
      address: 'Taksim Square, Стамбул',
      starRating: 5, rating: 8.4, reviewCount: 1892,
      roomType: 'Делюкс с видом на Босфор',
      amenities: ['WiFi', 'Бассейн', 'Фитнес', 'Ресторан'],
      pricePerNight: 169, currency: 'USD',
      photoUrl: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&q=80',
    },
    {
      hotelName: 'Novotel Istanbul Bosphorus',
      address: 'Beşiktaş, Стамбул',
      starRating: 4, rating: 8.1, reviewCount: 2105,
      roomType: 'Стандартный номер',
      amenities: ['WiFi', 'Фитнес', 'Ресторан', 'Парковка'],
      pricePerNight: 109, currency: 'USD',
      photoUrl: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&q=80',
    },
    {
      hotelName: 'ibis Istanbul Zeytinburnu',
      address: 'Zeytinburnu, Стамбул',
      starRating: 3, rating: 7.8, reviewCount: 4312,
      roomType: 'Стандартный номер',
      amenities: ['WiFi', 'Ресторан', 'Парковка'],
      pricePerNight: 50, currency: 'USD',
      photoUrl: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&q=80',
    },
    {
      hotelName: 'Grand Bazaar Hotel',
      address: 'Nuruosmaniye, Sultanahmet, Стамбул',
      starRating: 3, rating: 7.5, reviewCount: 1876,
      roomType: 'Стандарт',
      amenities: ['WiFi', 'Завтрак', 'Кондиционер'],
      pricePerNight: 42, currency: 'USD',
      photoUrl: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&q=80',
    },
  ],
  москва: [
    {
      hotelName: 'Marriott Royal Aurora',
      address: 'ул. Петровка, 11/20, Москва',
      starRating: 5, rating: 9.0, reviewCount: 2876,
      roomType: 'Делюкс Кинг',
      amenities: ['WiFi', 'Спа', 'Фитнес', 'Ресторан', 'Бар'],
      pricePerNight: 244, currency: 'USD',
      photoUrl: 'https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?w=800&q=80',
    },
    {
      hotelName: 'Radisson Collection Hotel Moscow',
      address: 'Театральный проезд, 4, Москва',
      starRating: 5, rating: 8.8, reviewCount: 1543,
      roomType: 'Стандартный номер',
      amenities: ['WiFi', 'Бассейн', 'Фитнес', 'Ресторан'],
      pricePerNight: 206, currency: 'USD',
      photoUrl: 'https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?w=800&q=80',
    },
    {
      hotelName: 'Holiday Inn Moscow Sokolniki',
      address: 'Русаковская ул., 24, Москва',
      starRating: 4, rating: 8.2, reviewCount: 2341,
      roomType: 'Стандартный двухместный',
      amenities: ['WiFi', 'Фитнес', 'Ресторан', 'Парковка'],
      pricePerNight: 106, currency: 'USD',
      photoUrl: 'https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?w=800&q=80',
    },
    {
      hotelName: 'ibis Moscow Centre Bakhrushina',
      address: 'ул. Бахрушина, 11, Москва',
      starRating: 3, rating: 7.9, reviewCount: 5432,
      roomType: 'Стандарт',
      amenities: ['WiFi', 'Ресторан'],
      pricePerNight: 64, currency: 'USD',
      photoUrl: 'https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?w=800&q=80',
    },
    {
      hotelName: 'Гостиница Москва',
      address: 'Охотный ряд, 2, Москва',
      starRating: 4, rating: 8.0, reviewCount: 3109,
      roomType: 'Улучшенный номер',
      amenities: ['WiFi', 'Ресторан', 'Кондиционер', 'Бар'],
      pricePerNight: 122, currency: 'USD',
      photoUrl: 'https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?w=800&q=80',
    },
  ],
  dubai: [
    {
      hotelName: 'Atlantis The Palm',
      address: 'Crescent Road, The Palm, Дубай',
      starRating: 5, rating: 9.1, reviewCount: 8734,
      roomType: 'Номер с видом на лагуну',
      amenities: ['WiFi', 'Аквапарк', 'Бассейн', 'Пляж', 'Спа', 'Ресторан', 'Фитнес'],
      pricePerNight: 378, currency: 'USD',
      photoUrl: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80',
    },
    {
      hotelName: 'JW Marriott Marquis Dubai',
      address: 'Sheikh Zayed Road, Business Bay, Дубай',
      starRating: 5, rating: 8.9, reviewCount: 5621,
      roomType: 'Делюкс Кинг',
      amenities: ['WiFi', 'Бассейн', 'Спа', 'Фитнес', 'Ресторан', 'Бар'],
      pricePerNight: 289, currency: 'USD',
      photoUrl: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80',
    },
    {
      hotelName: 'Rove Downtown Dubai',
      address: 'Sheikh Mohammed Bin Rashid Blvd, Downtown Dubai',
      starRating: 3, rating: 8.5, reviewCount: 9823,
      roomType: 'Стандартный номер',
      amenities: ['WiFi', 'Бассейн', 'Фитнес', 'Ресторан', 'Кондиционер'],
      pricePerNight: 100, currency: 'USD',
      photoUrl: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80',
    },
    {
      hotelName: 'Premier Inn Dubai Al Jaddaf',
      address: 'Al Jaddaf Waterfront, Дубай',
      starRating: 3, rating: 8.3, reviewCount: 3109,
      roomType: 'Стандартный номер',
      amenities: ['WiFi', 'Бассейн', 'Ресторан', 'Кондиционер'],
      pricePerNight: 78, currency: 'USD',
      photoUrl: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80',
    },
    {
      hotelName: 'Burj Al Arab Jumeirah',
      address: 'Jumeirah Beach Road, Дубай',
      starRating: 5, rating: 9.6, reviewCount: 4312,
      roomType: 'Дипломатический люкс',
      amenities: ['WiFi', 'Частный пляж', 'Бассейн', 'Спа', 'Ресторан', 'Дворецкий'],
      pricePerNight: 722, currency: 'USD',
      photoUrl: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80',
    },
  ],
  barcelona: [
    {
      hotelName: 'Hotel Arts Barcelona',
      address: 'Carrer de la Marina 19-21, Barceloneta',
      starRating: 5, rating: 9.1, reviewCount: 4521,
      roomType: 'Делюкс с видом на море',
      amenities: ['WiFi', 'Бассейн', 'Спа', 'Фитнес', 'Ресторан', 'Бар'],
      pricePerNight: 163, currency: 'USD',
      photoUrl: 'https://images.unsplash.com/photo-1563911302283-d2bc129e7570?w=800&q=80',
    },
    {
      hotelName: 'Majestic Hotel & Spa Barcelona',
      address: 'Passeig de Gràcia 68',
      starRating: 5, rating: 8.9, reviewCount: 3201,
      roomType: 'Классический номер',
      amenities: ['WiFi', 'Спа', 'Фитнес', 'Ресторан', 'Бар'],
      pricePerNight: 182, currency: 'USD',
      photoUrl: 'https://images.unsplash.com/photo-1563911302283-d2bc129e7570?w=800&q=80',
    },
    {
      hotelName: 'Catalonia Barcelona Plaza',
      address: 'Plaça d\'Espanya 6-8, Barcelona',
      starRating: 4, rating: 8.4, reviewCount: 3102,
      roomType: 'Стандартный с видом на площадь',
      amenities: ['WiFi', 'Бассейн на крыше', 'Фитнес', 'Ресторан', 'Кондиционер'],
      pricePerNight: 87, currency: 'USD',
      photoUrl: 'https://images.unsplash.com/photo-1563911302283-d2bc129e7570?w=800&q=80',
    },
    {
      hotelName: 'Hotel 1898',
      address: 'La Rambla 109',
      starRating: 4, rating: 8.6, reviewCount: 2876,
      roomType: 'Стандартный с балконом',
      amenities: ['WiFi', 'Бассейн', 'Ресторан', 'Бар', 'Терраса'],
      pricePerNight: 100, currency: 'USD',
      photoUrl: 'https://images.unsplash.com/photo-1563911302283-d2bc129e7570?w=800&q=80',
    },
    {
      hotelName: 'Generator Barcelona',
      address: 'Carrer de Còrsega 373, Eixample',
      starRating: 2, rating: 8.0, reviewCount: 6234,
      roomType: 'Стандартный номер',
      amenities: ['WiFi', 'Бар', 'Общая кухня'],
      pricePerNight: 26, currency: 'USD',
      photoUrl: 'https://images.unsplash.com/photo-1563911302283-d2bc129e7570?w=800&q=80',
    },
  ],
  paris: [
    {
      hotelName: 'Le Meurice',
      address: '228 Rue de Rivoli, Paris 1er',
      starRating: 5, rating: 9.5, reviewCount: 1432,
      roomType: 'Делюкс',
      amenities: ['WiFi', 'Спа', 'Ресторан', 'Бар', 'Консьерж', 'Дворецкий'],
      pricePerNight: 438, currency: 'USD',
      photoUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80',
    },
    {
      hotelName: 'Hotel Malte - Astotel',
      address: '63 Rue de Richelieu, Paris 2e',
      starRating: 4, rating: 8.6, reviewCount: 2341,
      roomType: 'Классический',
      amenities: ['WiFi', 'Ресторан', 'Кондиционер', 'Консьерж'],
      pricePerNight: 137, currency: 'USD',
      photoUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80',
    },
    {
      hotelName: 'ibis Paris Gare du Nord',
      address: '197 Rue La Fayette, Paris 10e',
      starRating: 3, rating: 7.7, reviewCount: 8901,
      roomType: 'Стандартный номер',
      amenities: ['WiFi', 'Ресторан', 'Кондиционер'],
      pricePerNight: 82, currency: 'USD',
      photoUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80',
    },
  ],
  london: [
    {
      hotelName: 'The Savoy',
      address: 'Strand, London WC2R 0EZ',
      starRating: 5, rating: 9.3, reviewCount: 3201,
      roomType: 'Делюкс',
      amenities: ['WiFi', 'Бассейн', 'Спа', 'Ресторан', 'Бар', 'Фитнес', 'Консьерж'],
      pricePerNight: 410, currency: 'USD',
      photoUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
    },
    {
      hotelName: 'Premier Inn London City (Tower Hill)',
      address: '1 Pepys St, London EC3N',
      starRating: 3, rating: 8.0, reviewCount: 7654,
      roomType: 'Стандарт',
      amenities: ['WiFi', 'Ресторан', 'Кондиционер'],
      pricePerNight: 87, currency: 'USD',
      photoUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
    },
    {
      hotelName: 'Travelodge London Central',
      address: 'Drury Lane, London WC2B',
      starRating: 2, rating: 7.6, reviewCount: 12431,
      roomType: 'Стандартный номер',
      amenities: ['WiFi', 'Кондиционер'],
      pricePerNight: 69, currency: 'USD',
      photoUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
    },
  ],
};

// Canonical key aliases (Russian and English names → key in CITY_HOTELS)
const CITY_ALIASES: Record<string, string> = {
  'стамбул':   'istanbul',
  'istanbul':  'istanbul',
  'москва':    'москва',
  'moscow':    'москва',
  'дубай':     'dubai',
  'dubai':     'dubai',
  'барселона': 'barcelona',
  'barcelona': 'barcelona',
  'париж':     'paris',
  'paris':     'paris',
  'лондон':    'london',
  'london':    'london',
};

const DEFAULT_HOTELS: HotelMockTemplate[] = [
  {
    hotelName: 'Grand Hotel City Center',
    address: 'Центральная ул., 1',
    starRating: 4, rating: 8.3, reviewCount: 1200,
    roomType: 'Стандартный двухместный',
    amenities: ['WiFi', 'Завтрак', 'Фитнес'],
    pricePerNight: 83, currency: 'USD',
    photoUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
  },
  {
    hotelName: 'Business Hotel Premier',
    address: 'Деловой квартал, 45',
    starRating: 3, rating: 7.9, reviewCount: 890,
    roomType: 'Стандартный номер',
    amenities: ['WiFi', 'Ресторан'],
    pricePerNight: 47, currency: 'USD',
    photoUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
  },
  {
    hotelName: 'Comfort Inn & Suites',
    address: 'Проспект Мира, 12',
    starRating: 3, rating: 7.5, reviewCount: 654,
    roomType: 'Улучшенный номер',
    amenities: ['WiFi', 'Завтрак', 'Парковка'],
    pricePerNight: 39, currency: 'USD',
    photoUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
  },
];

function lookupCityKey(city: string): string | null {
  const normalized = city.toLowerCase().trim();
  for (const [alias, key] of Object.entries(CITY_ALIASES)) {
    if (normalized.includes(alias)) return key;
  }
  for (const key of Object.keys(CITY_HOTELS)) {
    if (normalized.includes(key)) return key;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Public: searchHotelsHotellook
// Returns realistic mock data + Hotellook affiliate booking links.
// No HTTP call to engine.hotellook.com (deprecated/404).
// ---------------------------------------------------------------------------

/**
 * Returns hotel offers with Hotellook affiliate booking links.
 *
 * The deprecated engine.hotellook.com API is not called. Instead this function
 * returns curated mock data for major cities and attaches a Hotellook search
 * URL (affiliate) as bookingUrl so users can complete the booking.
 *
 * Example affiliate URL:
 *   https://www.hotellook.com/search?adults=2&checkIn=2026-06-01
 *     &checkOut=2026-06-05&cityId=istanbul&lang=ru&token=<TOKEN>
 */
export async function searchHotelsHotellook(
  params: SearchHotelsParams,
): Promise<HotelOffer[]> {
  const { city, checkIn, checkOut, guests, starRating, maxPrice } = params;

  const nights  = getNights(checkIn, checkOut);
  const token   = process.env.TRAVELPAYOUTS_TOKEN ?? '';
  const marker  = process.env.TRAVELPAYOUTS_MARKER ?? '530860';

  // Build one affiliate search URL that covers all offers in this search
  const affiliateUrl = buildHotellookUrl({
    city,
    checkIn,
    checkOut,
    adults: guests.adults,
    token,
    marker,
  });

  console.log('[Hotellook] Generating affiliate offers for', city, checkIn, '->', checkOut);
  console.log('[Hotellook] Affiliate URL:', affiliateUrl);

  const cityKey = lookupCityKey(city);
  let templates = cityKey ? (CITY_HOTELS[cityKey] ?? DEFAULT_HOTELS) : DEFAULT_HOTELS;

  // Apply star filter
  if (starRating && starRating.length > 0) {
    templates = templates.filter((h) => starRating.includes(h.starRating));
  }

  // Apply max price (per night) filter
  if (maxPrice) {
    templates = templates.filter((h) => h.pricePerNight <= maxPrice);
  }

  // Sort cheapest first, cap at 5
  templates = [...templates].sort((a, b) => a.pricePerNight - b.pricePerNight).slice(0, 5);

  const offers: HotelOffer[] = templates.map((t): HotelOffer => {
    const totalPrice = t.pricePerNight * nights;

    return {
      offerId:       uuidv4(),
      provider:      'BOOKING',
      hotelName:     t.hotelName,
      address:       t.address,
      starRating:    t.starRating,
      rating:        t.rating,
      reviewCount:   t.reviewCount,
      roomType:      t.roomType,
      totalPrice:    totalPrice.toFixed(2),
      pricePerNight: t.pricePerNight.toFixed(2),
      currency:      t.currency,
      amenities:     t.amenities,
      imageUrl:      t.photoUrl ?? 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
      expiresAt:     new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      bookingUrl:    affiliateUrl,
    };
  });

  console.log(`[Hotellook] Returning ${offers.length} offer(s) with affiliate links`);
  return offers;
}
