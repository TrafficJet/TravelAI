import { v4 as uuidv4 } from 'uuid';

// Mock Booking.com Partner API — returns realistic hotel offers
// In production, replace with actual Booking.com Demand API

export interface HotelOffer {
  offerId: string;
  provider: 'BOOKING';
  hotelName: string;
  address: string;
  starRating: number;
  rating: number; // 0-10
  reviewCount: number;
  roomType: string;
  totalPrice: string;
  pricePerNight: string;
  currency: string;
  amenities: string[];
  imageUrl: string | null;
  expiresAt: string;
}

export interface SearchHotelsParams {
  city: string;
  checkIn: string;
  checkOut: string;
  guests: { adults: number; children?: number };
  rooms?: number;
  starRating?: number[];
  maxPrice?: number;
}

// Static mock hotel database per city keyword
const HOTELS_BY_CITY: Record<string, Partial<HotelOffer>[]> = {
  istanbul: [
    {
      hotelName: 'Hilton Istanbul Bosphorus',
      address: 'Cumhuriyet Cad. 34367, Harbiye, Стамбул',
      starRating: 5,
      rating: 8.7,
      reviewCount: 3241,
      roomType: 'Стандартный двухместный',
      amenities: ['WiFi', 'Бассейн', 'Спа', 'Фитнес', 'Ресторан', 'Бар'],
    },
    {
      hotelName: 'The Marmara Taksim',
      address: 'Taksim Square, Стамбул',
      starRating: 5,
      rating: 8.4,
      reviewCount: 1892,
      roomType: 'Делюкс с видом на Босфор',
      amenities: ['WiFi', 'Бассейн', 'Фитнес', 'Ресторан'],
    },
    {
      hotelName: 'Novotel Istanbul Bosphorus',
      address: 'Beşiktaş, Стамбул',
      starRating: 4,
      rating: 8.1,
      reviewCount: 2105,
      roomType: 'Стандартный номер',
      amenities: ['WiFi', 'Фитнес', 'Ресторан', 'Парковка'],
    },
    {
      hotelName: 'ibis Istanbul Zeytinburnu',
      address: 'Zeytinburnu, Стамбул',
      starRating: 3,
      rating: 7.8,
      reviewCount: 4312,
      roomType: 'Стандартный номер',
      amenities: ['WiFi', 'Ресторан', 'Парковка'],
    },
  ],
  dubai: [
    {
      hotelName: 'Atlantis The Palm',
      address: 'Crescent Road, The Palm, Дубай',
      starRating: 5,
      rating: 9.1,
      reviewCount: 8734,
      roomType: 'Номер с видом на лагуну',
      amenities: ['WiFi', 'Аквапарк', 'Бассейн', 'Пляж', 'Спа', 'Ресторан'],
    },
    {
      hotelName: 'JW Marriott Marquis Dubai',
      address: 'Sheikh Zayed Road, Дубай',
      starRating: 5,
      rating: 8.9,
      reviewCount: 5621,
      roomType: 'Делюкс Кинг',
      amenities: ['WiFi', 'Бассейн', 'Спа', 'Фитнес', 'Ресторан', 'Бизнес-центр'],
    },
    {
      hotelName: 'Premier Inn Dubai Al Jaddaf',
      address: 'Al Jaddaf Waterfront, Дубай',
      starRating: 3,
      rating: 8.3,
      reviewCount: 3109,
      roomType: 'Стандартный номер',
      amenities: ['WiFi', 'Бассейн', 'Ресторан'],
    },
  ],
  москва: [
    {
      hotelName: 'Marriott Royal Aurora',
      address: 'ул. Петровка, 11/20, Москва',
      starRating: 5,
      rating: 9.0,
      reviewCount: 2876,
      roomType: 'Делюкс Кинг',
      amenities: ['WiFi', 'Спа', 'Фитнес', 'Ресторан', 'Бар'],
    },
    {
      hotelName: 'Radisson Collection Hotel',
      address: 'Театральный проезд, 4, Москва',
      starRating: 5,
      rating: 8.8,
      reviewCount: 1543,
      roomType: 'Стандартный номер',
      amenities: ['WiFi', 'Бассейн', 'Фитнес', 'Ресторан'],
    },
    {
      hotelName: 'Holiday Inn Moscow Sokolniki',
      address: 'Русаковская ул., 24, Москва',
      starRating: 4,
      rating: 8.2,
      reviewCount: 2341,
      roomType: 'Стандартный двухместный',
      amenities: ['WiFi', 'Фитнес', 'Ресторан', 'Парковка'],
    },
  ],
};

const DEFAULT_HOTELS: Partial<HotelOffer>[] = [
  {
    hotelName: 'Grand Hotel City Center',
    address: 'Центральная ул., 1',
    starRating: 4,
    rating: 8.3,
    reviewCount: 1200,
    roomType: 'Стандартный двухместный',
    amenities: ['WiFi', 'Завтрак', 'Фитнес'],
  },
  {
    hotelName: 'Business Hotel Premier',
    address: 'Деловой квартал, 45',
    starRating: 3,
    rating: 7.9,
    reviewCount: 890,
    roomType: 'Стандартный номер',
    amenities: ['WiFi', 'Ресторан'],
  },
  {
    hotelName: 'Comfort Inn & Suites',
    address: 'Проспект Мира, 12',
    starRating: 3,
    rating: 7.5,
    reviewCount: 654,
    roomType: 'Улучшенный номер',
    amenities: ['WiFi', 'Завтрак', 'Парковка'],
  },
];

function getNights(checkIn: string, checkOut: string): number {
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
}

function lookupHotels(city: string): Partial<HotelOffer>[] {
  const normalized = city.toLowerCase().trim();
  for (const [key, hotels] of Object.entries(HOTELS_BY_CITY)) {
    if (normalized.includes(key)) return hotels;
  }
  return DEFAULT_HOTELS;
}

export async function searchHotels(params: SearchHotelsParams): Promise<HotelOffer[]> {
  const { city, checkIn, checkOut, starRating, maxPrice } = params;
  const nights = getNights(checkIn, checkOut);
  const baseNightPrice = 2500 + Math.floor(Math.random() * 5000);

  let hotels = lookupHotels(city);

  // Apply star filter if specified
  if (starRating && starRating.length > 0) {
    hotels = hotels.filter((h) => h.starRating && starRating.includes(h.starRating));
  }

  return hotels.slice(0, 4).map((hotel, idx): HotelOffer => {
    const starMultiplier = (hotel.starRating ?? 3) * 0.5;
    const perNight = Math.round(baseNightPrice * starMultiplier * (1 + idx * 0.1));
    const total = perNight * nights;

    if (maxPrice && perNight > maxPrice) {
      // Scale down if exceeds maxPrice
    }

    return {
      offerId: uuidv4(),
      provider: 'BOOKING',
      hotelName: hotel.hotelName ?? 'Отель',
      address: hotel.address ?? city,
      starRating: hotel.starRating ?? 3,
      rating: hotel.rating ?? 7.5,
      reviewCount: hotel.reviewCount ?? 500,
      roomType: hotel.roomType ?? 'Стандартный номер',
      totalPrice: total.toFixed(2),
      pricePerNight: perNight.toFixed(2),
      currency: 'RUB',
      amenities: hotel.amenities ?? ['WiFi'],
      imageUrl: null,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
    };
  });
}
