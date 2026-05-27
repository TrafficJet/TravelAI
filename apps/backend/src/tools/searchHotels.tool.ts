import type Anthropic from '@anthropic-ai/sdk';
import { searchHotels } from '../services/booking.service';
import { searchCache, getCacheKey } from '../lib/searchCache';

// Claude tool definition for searching hotels
export const searchHotelsTool: Anthropic.Tool = {
  name: 'search_hotels',
  description: 'Поиск отелей в заданном городе. Используй когда пользователь хочет найти жильё или отель. Вызывай только если известен город назначения.',
  input_schema: {
    type: 'object' as const,
    properties: {
      city: {
        type: 'string',
        description: 'Название города (например, "Стамбул", "Дубай", "Тбилиси", "Варшава")',
      },
      check_in: {
        type: 'string',
        description: 'Дата заезда в формате YYYY-MM-DD. Если не указана — будет подставлено через 14 дней.',
      },
      check_out: {
        type: 'string',
        description: 'Дата выезда в формате YYYY-MM-DD. Если не указана — будет подставлено через 17 дней (3 ночи).',
      },
      guests: {
        type: 'number',
        description: 'Количество гостей (взрослые, по умолчанию 2)',
      },
      stars: {
        type: 'array',
        items: { type: 'number' },
        description: 'Фильтр по звёздам (например, [4, 5] для 4-5 звёзд)',
      },
      max_price_per_night: {
        type: 'number',
        description: 'Максимальная цена за ночь в USD',
      },
    },
    required: ['city'],
  },
};

export interface SearchHotelsInput {
  city: string;
  check_in?: string;
  check_out?: string;
  guests?: number;
  stars?: number[];
  max_price_per_night?: number;
}

// Executor: calls booking.service mock; results are cached for 5 minutes
export async function executeSearchHotels(
  input: SearchHotelsInput,
): Promise<ReturnType<typeof buildHotelResult> & { searchId: string; cacheHit: boolean }> {
  // Default: check-in in 14 days, check-out in 17 days (3 nights)
  const today = new Date();
  const defaultCheckIn = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10);
  const defaultCheckOut = new Date(today.getTime() + 17 * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10);

  const resolvedInput = {
    ...input,
    check_in: input.check_in || defaultCheckIn,
    check_out: input.check_out || defaultCheckOut,
  };

  const cacheKey = getCacheKey('hotel', resolvedInput);
  const cached = searchCache.get(cacheKey);
  if (cached) {
    return { ...(cached as ReturnType<typeof buildHotelResult>), searchId: `hotel_search_${Date.now()}`, cacheHit: true };
  }

  const hotels = await searchHotels({
    city: resolvedInput.city,
    checkIn: resolvedInput.check_in,
    checkOut: resolvedInput.check_out,
    guests: { adults: resolvedInput.guests ?? 2 },
    starRating: resolvedInput.stars,
    maxPrice: resolvedInput.max_price_per_night,
  });

  const nights =
    Math.max(
      1,
      Math.round(
        (new Date(resolvedInput.check_out).getTime() - new Date(resolvedInput.check_in).getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );

  const result = buildHotelResult(resolvedInput, hotels, nights);
  searchCache.set(cacheKey, result);
  return { ...result, searchId: `hotel_search_${Date.now()}`, cacheHit: false };
}

// Normalise a raw HotelOffer (booking.service shape) into the flat
// Mobile Hotel shape that HotelCard in the mobile app expects.
const EUR_TO_USD = 1.09;
const RUB_TO_USD = 0.011; // 1 RUB ≈ $0.011

function toUSD(price: number, currency: string): number {
  if (currency === 'EUR') return Math.round(price * EUR_TO_USD);
  if (currency === 'RUB') return Math.round(price * RUB_TO_USD);
  return Math.round(price); // already USD
}

function normaliseMobileHotel(
  hotel: Awaited<ReturnType<typeof searchHotels>>[number],
  checkIn: string,
  checkOut: string,
): Record<string, unknown> {
  const pricePerNightUSD = toUSD(Number(hotel.pricePerNight), hotel.currency);
  return {
    id:            hotel.offerId,
    name:          hotel.hotelName,            // mobile expects 'name'
    address:       hotel.address ?? '',
    stars:         hotel.starRating,           // mobile expects 'stars'
    pricePerNight: pricePerNightUSD,           // always USD
    currency:      'USD',
    rating:        hotel.rating,               // 0-10 scale
    reviewsCount:  hotel.reviewCount,
    amenities:     hotel.amenities ?? [],
    checkIn,
    checkOut,
    // keep raw fields for booking creation
    offerId:       hotel.offerId,
    totalPrice:    toUSD(Number(hotel.totalPrice), hotel.currency),
    roomType:      hotel.roomType,
    provider:      hotel.provider,
    expiresAt:     hotel.expiresAt,
    imageUrl:      hotel.imageUrl ?? null,
    bookingUrl:    (hotel as { bookingUrl?: string }).bookingUrl ?? null,
  };
}

function buildHotelResult(
  input: Required<Pick<SearchHotelsInput, 'city' | 'check_in' | 'check_out'>> & SearchHotelsInput,
  hotels: Awaited<ReturnType<typeof searchHotels>>,
  nights: number,
) {
  const normalised = hotels.map((h) =>
    normaliseMobileHotel(h, input.check_in, input.check_out),
  );

  return {
    offers: normalised,
    count: normalised.length,
    city: input.city,
    checkIn: input.check_in,
    checkOut: input.check_out,
    nights,
  };
}
