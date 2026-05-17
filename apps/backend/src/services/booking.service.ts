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
  barcelona: [
    {
      hotelName: 'Hotel Arts Barcelona',
      address: 'Carrer de la Marina 19-21, Barceloneta',
      starRating: 5,
      rating: 9.1,
      reviewCount: 4521,
      roomType: 'Делюкс с видом на море',
      amenities: ['WiFi', 'Бассейн', 'Спа', 'Фитнес', 'Ресторан', 'Вид на море'],
    },
    {
      hotelName: 'Majestic Hotel & Spa Barcelona',
      address: 'Passeig de Gràcia 68',
      starRating: 5,
      rating: 8.9,
      reviewCount: 3201,
      roomType: 'Классический номер',
      amenities: ['WiFi', 'Спа', 'Фитнес', 'Ресторан', 'Бар'],
    },
    {
      hotelName: 'Hotel 1898',
      address: 'La Rambla 109',
      starRating: 4,
      rating: 8.6,
      reviewCount: 2876,
      roomType: 'Стандартный с балконом',
      amenities: ['WiFi', 'Бассейн', 'Ресторан', 'Бар', 'Терраса'],
    },
    {
      hotelName: 'Catalonia Born',
      address: 'Carrer de la Bòria 26',
      starRating: 3,
      rating: 8.2,
      reviewCount: 1654,
      roomType: 'Стандарт',
      amenities: ['WiFi', 'Кондиционер'],
    },
  ],
  warsaw: [
    {
      hotelName: 'Hotel Bristol Warsaw',
      address: 'Krakowskie Przedmieście 42/44',
      starRating: 5,
      rating: 9.0,
      reviewCount: 2341,
      roomType: 'Делюкс',
      amenities: ['WiFi', 'Спа', 'Ресторан', 'Бар', 'Фитнес'],
    },
    {
      hotelName: 'Raffles Europejski Warsaw',
      address: 'Krakowskie Przedmieście 13',
      starRating: 5,
      rating: 8.8,
      reviewCount: 1876,
      roomType: 'Классический номер',
      amenities: ['WiFi', 'Спа', 'Фитнес', 'Ресторан'],
    },
    {
      hotelName: 'DoubleTree by Hilton Warsaw Centre',
      address: 'ul. Złota 2',
      starRating: 4,
      rating: 8.5,
      reviewCount: 3421,
      roomType: 'Стандарт',
      amenities: ['WiFi', 'Бассейн', 'Фитнес', 'Ресторан'],
    },
    {
      hotelName: 'ibis Warszawa Centrum',
      address: 'al. Solidarności 165',
      starRating: 3,
      rating: 7.8,
      reviewCount: 4521,
      roomType: 'Стандарт',
      amenities: ['WiFi', 'Ресторан'],
    },
  ],
  rome: [
    {
      hotelName: 'Hotel Hassler Roma',
      address: 'Piazza Trinità dei Monti 6',
      starRating: 5,
      rating: 9.2,
      reviewCount: 1876,
      roomType: 'Делюкс с видом',
      amenities: ['WiFi', 'Ресторан', 'Спа', 'Бар', 'Терраса'],
    },
    {
      hotelName: 'Borghese Grand Hotel',
      address: 'Via Pinciana 6',
      starRating: 4,
      rating: 8.4,
      reviewCount: 2103,
      roomType: 'Стандарт',
      amenities: ['WiFi', 'Ресторан', 'Фитнес'],
    },
    {
      hotelName: 'Hotel Navona',
      address: 'Via dei Sediari 8',
      starRating: 3,
      rating: 8.1,
      reviewCount: 987,
      roomType: 'Стандарт',
      amenities: ['WiFi', 'Кондиционер'],
    },
  ],
  amsterdam: [
    {
      hotelName: 'Conservatorium Hotel',
      address: 'Van Baerlestraat 27',
      starRating: 5,
      rating: 9.1,
      reviewCount: 2109,
      roomType: 'Делюкс',
      amenities: ['WiFi', 'Спа', 'Бассейн', 'Ресторан', 'Бар'],
    },
    {
      hotelName: 'Pulitzer Amsterdam',
      address: 'Prinsengracht 315-331',
      starRating: 4,
      rating: 8.7,
      reviewCount: 3412,
      roomType: 'Классический',
      amenities: ['WiFi', 'Ресторан', 'Бар', 'Терраса'],
    },
    {
      hotelName: 'citizenM Amsterdam Centre',
      address: 'Rokin 147',
      starRating: 3,
      rating: 8.5,
      reviewCount: 5621,
      roomType: 'Стандарт',
      amenities: ['WiFi', 'Бар'],
    },
  ],
  london: [
    {
      hotelName: 'The Savoy',
      address: 'Strand',
      starRating: 5,
      rating: 9.3,
      reviewCount: 3201,
      roomType: 'Делюкс',
      amenities: ['WiFi', 'Бассейн', 'Спа', 'Ресторан', 'Бар'],
    },
    {
      hotelName: 'The Goring',
      address: 'Beeston Place',
      starRating: 5,
      rating: 9.0,
      reviewCount: 1234,
      roomType: 'Классический',
      amenities: ['WiFi', 'Ресторан', 'Бар', 'Сад'],
    },
    {
      hotelName: 'Premier Inn London City',
      address: '1 Pepys St',
      starRating: 3,
      rating: 8.0,
      reviewCount: 7654,
      roomType: 'Стандарт',
      amenities: ['WiFi', 'Ресторан'],
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

// Cities where prices are quoted in EUR
const EUR_CITIES = new Set(['barcelona', 'warsaw', 'rome', 'amsterdam', 'london', 'paris']);

// Base price ranges per star rating in EUR (min..spread)
const EUR_BASE: Record<number, { min: number; spread: number }> = {
  3: { min: 60,  spread: 60  }, // 60–120 EUR
  4: { min: 120, spread: 130 }, // 120–250 EUR
  5: { min: 250, spread: 350 }, // 250–600 EUR
};

function getCurrencyAndBasePrice(city: string, stars: number): { currency: string; base: number } {
  const normalized = city.toLowerCase().trim();
  const isEur = [...EUR_CITIES].some((key) => normalized.includes(key));

  if (isEur) {
    const range = EUR_BASE[stars] ?? EUR_BASE[3];
    const base = range.min + Math.floor(Math.random() * range.spread);
    return { currency: 'EUR', base };
  }

  // RUB pricing: existing logic — 2500..7500 base scaled by star multiplier
  const base = 2500 + Math.floor(Math.random() * 5000);
  return { currency: 'RUB', base };
}

export async function searchHotels(params: SearchHotelsParams): Promise<HotelOffer[]> {
  const { city, checkIn, checkOut, starRating, maxPrice } = params;
  const nights = getNights(checkIn, checkOut);

  let hotels = lookupHotels(city);

  // Apply star filter if specified
  if (starRating && starRating.length > 0) {
    hotels = hotels.filter((h) => h.starRating && starRating.includes(h.starRating));
  }

  return hotels.slice(0, 4).map((hotel, idx): HotelOffer => {
    const stars = hotel.starRating ?? 3;
    const { currency, base } = getCurrencyAndBasePrice(city, stars);

    let perNight: number;
    if (currency === 'EUR') {
      // For EUR cities base already accounts for star rating; add small per-index spread
      perNight = Math.round(base * (1 + idx * 0.05));
    } else {
      const starMultiplier = stars * 0.5;
      perNight = Math.round(base * starMultiplier * (1 + idx * 0.1));
    }

    const total = perNight * nights;

    if (maxPrice && perNight > maxPrice) {
      // Scale down if exceeds maxPrice — kept as intentional no-op placeholder
    }

    return {
      offerId: uuidv4(),
      provider: 'BOOKING',
      hotelName: hotel.hotelName ?? 'Отель',
      address: hotel.address ?? city,
      starRating: stars,
      rating: hotel.rating ?? 7.5,
      reviewCount: hotel.reviewCount ?? 500,
      roomType: hotel.roomType ?? 'Стандартный номер',
      totalPrice: total.toFixed(2),
      pricePerNight: perNight.toFixed(2),
      currency,
      amenities: hotel.amenities ?? ['WiFi'],
      imageUrl: null,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
    };
  });
}
