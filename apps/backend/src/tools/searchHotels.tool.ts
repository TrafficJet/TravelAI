import type Anthropic from '@anthropic-ai/sdk';
import { searchHotels } from '../services/booking.service';
import { searchCache, getCacheKey } from '../lib/searchCache';

// Claude tool definition for searching hotels
export const searchHotelsTool: Anthropic.Tool = {
  name: 'search_hotels',
  description: 'Поиск отелей в заданном городе. Используй когда пользователь хочет найти жильё или отель.',
  input_schema: {
    type: 'object' as const,
    properties: {
      city: {
        type: 'string',
        description: 'Название города (например, "Стамбул", "Дубай", "Москва", "Сочи")',
      },
      check_in: {
        type: 'string',
        description: 'Дата заезда в формате YYYY-MM-DD',
      },
      check_out: {
        type: 'string',
        description: 'Дата выезда в формате YYYY-MM-DD',
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
        description: 'Максимальная цена за ночь в рублях',
      },
    },
    required: ['city', 'check_in', 'check_out'],
  },
};

export interface SearchHotelsInput {
  city: string;
  check_in: string;
  check_out: string;
  guests?: number;
  stars?: number[];
  max_price_per_night?: number;
}

// Executor: calls booking.service mock; results are cached for 5 minutes
export async function executeSearchHotels(
  input: SearchHotelsInput,
): Promise<ReturnType<typeof buildHotelResult> & { searchId: string; cacheHit: boolean }> {
  // Fill in default check-in (+14 days) and check-out (+17 days) if not provided
  if (!input.check_in) {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    input.check_in = d.toISOString().slice(0, 10);
  }
  if (!input.check_out) {
    const d = new Date();
    d.setDate(d.getDate() + 17);
    input.check_out = d.toISOString().slice(0, 10);
  }

  const cacheKey = getCacheKey('hotel', input);
  const cached = searchCache.get(cacheKey);
  if (cached) {
    return { ...(cached as ReturnType<typeof buildHotelResult>), searchId: `hotel_search_${Date.now()}`, cacheHit: true };
  }

  const hotels = await searchHotels({
    city: input.city,
    checkIn: input.check_in,
    checkOut: input.check_out,
    guests: { adults: input.guests ?? 2 },
    starRating: input.stars,
    maxPrice: input.max_price_per_night,
  });

  const nights =
    Math.max(
      1,
      Math.round(
        (new Date(input.check_out).getTime() - new Date(input.check_in).getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );

  const result = buildHotelResult(input, hotels, nights);
  searchCache.set(cacheKey, result);
  return { ...result, searchId: `hotel_search_${Date.now()}`, cacheHit: false };
}

// Normalise a raw HotelOffer (booking.service shape) into the flat
// Mobile Hotel shape that HotelCard in the mobile app expects.
function normaliseMobileHotel(
  hotel: Awaited<ReturnType<typeof searchHotels>>[number],
  checkIn: string,
  checkOut: string,
): Record<string, unknown> {
  return {
    id:            hotel.offerId,
    name:          hotel.hotelName,            // mobile expects 'name'
    address:       hotel.address ?? '',
    stars:         hotel.starRating,           // mobile expects 'stars'
    pricePerNight: Number(hotel.pricePerNight), // mobile expects pricePerNight:number
    currency:      hotel.currency,
    rating:        hotel.rating,               // 0-10 scale
    reviewsCount:  hotel.reviewCount,
    amenities:     hotel.amenities ?? [],
    checkIn,
    checkOut,
    // keep raw fields for booking creation
    offerId:       hotel.offerId,
    totalPrice:    hotel.totalPrice,
    roomType:      hotel.roomType,
    provider:      hotel.provider,
    expiresAt:     hotel.expiresAt,
  };
}

function buildHotelResult(
  input: SearchHotelsInput,
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
