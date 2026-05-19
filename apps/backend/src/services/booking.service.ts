import { v4 as uuidv4 } from 'uuid';
import { searchHotelsHotellook } from './hotellook.service.js';

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
  /** Affiliate booking link (Hotellook or direct). Optional — present when generated. */
  bookingUrl?: string;
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

// Extended partial type used in mock data to support fixed prices
interface HotelMockEntry extends Partial<HotelOffer> {
  fixedPricePerNight?: number;
}

// Static mock hotel database per city keyword
const HOTELS_BY_CITY: Record<string, HotelMockEntry[]> = {
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
      hotelName: 'Burj Al Arab Jumeirah',
      address: 'Jumeirah Beach Road, Дубай',
      starRating: 7,
      rating: 9.6,
      reviewCount: 4312,
      roomType: 'Дипломатический люкс',
      amenities: ['WiFi', 'Частный пляж', 'Бассейн', 'Вертолётная площадка', 'Дворецкий', 'Спа', 'Ресторан', 'Трансфер на Rolls-Royce'],
      fixedPricePerNight: 800,
      currency: 'EUR',
    },
    {
      hotelName: 'Atlantis The Palm',
      address: 'Crescent Road, The Palm, Дубай',
      starRating: 5,
      rating: 9.1,
      reviewCount: 8734,
      roomType: 'Номер с видом на лагуну',
      amenities: ['WiFi', 'Аквапарк', 'Бассейн', 'Пляж', 'Спа', 'Ресторан', 'Фитнес', 'Дайвинг'],
      fixedPricePerNight: 420,
      currency: 'EUR',
    },
    {
      hotelName: 'JW Marriott Marquis Dubai',
      address: 'Sheikh Zayed Road, Business Bay, Дубай',
      starRating: 5,
      rating: 8.9,
      reviewCount: 5621,
      roomType: 'Делюкс Кинг',
      amenities: ['WiFi', 'Бассейн', 'Спа', 'Фитнес', 'Ресторан', 'Бар', 'Бизнес-центр', 'Кондиционер'],
      fixedPricePerNight: 320,
      currency: 'EUR',
    },
    {
      hotelName: 'Rove Downtown Dubai',
      address: 'Sheikh Mohammed Bin Rashid Blvd, Downtown Dubai',
      starRating: 3,
      rating: 8.5,
      reviewCount: 9823,
      roomType: 'Стандартный номер',
      amenities: ['WiFi', 'Бассейн', 'Фитнес', 'Ресторан', 'Велопрокат', 'Кондиционер'],
      fixedPricePerNight: 110,
      currency: 'EUR',
    },
    {
      hotelName: 'Premier Inn Dubai Al Jaddaf',
      address: 'Al Jaddaf Waterfront, Дубай',
      starRating: 3,
      rating: 8.3,
      reviewCount: 3109,
      roomType: 'Стандартный номер',
      amenities: ['WiFi', 'Бассейн', 'Ресторан', 'Кондиционер'],
      fixedPricePerNight: 85,
      currency: 'EUR',
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
      amenities: ['WiFi', 'Бассейн', 'Спа', 'Фитнес', 'Ресторан', 'Бар', 'Вид на море', 'Консьерж'],
      fixedPricePerNight: 180,
      currency: 'EUR',
    },
    {
      hotelName: 'Majestic Hotel & Spa Barcelona',
      address: 'Passeig de Gràcia 68',
      starRating: 5,
      rating: 8.9,
      reviewCount: 3201,
      roomType: 'Классический номер',
      amenities: ['WiFi', 'Спа', 'Фитнес', 'Ресторан', 'Бар', 'Консьерж'],
      fixedPricePerNight: 200,
      currency: 'EUR',
    },
    {
      hotelName: 'Catalonia Barcelona Plaza',
      address: 'Plaça d\'Espanya 6-8, Barcelona',
      starRating: 4,
      rating: 8.4,
      reviewCount: 3102,
      roomType: 'Стандартный с видом на площадь',
      amenities: ['WiFi', 'Бассейн на крыше', 'Фитнес', 'Ресторан', 'Бар', 'Кондиционер'],
      fixedPricePerNight: 95,
      currency: 'EUR',
    },
    {
      hotelName: 'Hotel 1898',
      address: 'La Rambla 109',
      starRating: 4,
      rating: 8.6,
      reviewCount: 2876,
      roomType: 'Стандартный с балконом',
      amenities: ['WiFi', 'Бассейн', 'Ресторан', 'Бар', 'Терраса', 'Кондиционер'],
      fixedPricePerNight: 110,
      currency: 'EUR',
    },
    {
      hotelName: 'Generator Barcelona',
      address: 'Carrer de Còrsega 373, Eixample',
      starRating: 2,
      rating: 8.0,
      reviewCount: 6234,
      roomType: 'Общий номер в хостеле',
      amenities: ['WiFi', 'Бар', 'Ресторан', 'Общая кухня', 'Камера хранения'],
      fixedPricePerNight: 28,
      currency: 'EUR',
    },
  ],
  warsaw: [
    {
      hotelName: 'Raffles Europejski Warsaw',
      address: 'Krakowskie Przedmieście 13, Warszawa',
      starRating: 5,
      rating: 9.2,
      reviewCount: 1876,
      roomType: 'Делюкс',
      amenities: ['WiFi', 'Спа', 'Фитнес', 'Ресторан', 'Бар', 'Консьерж', 'Дворецкий'],
      fixedPricePerNight: 250,
      currency: 'EUR',
    },
    {
      hotelName: 'Hotel Bristol Warsaw',
      address: 'Krakowskie Przedmieście 42/44, Warszawa',
      starRating: 5,
      rating: 9.0,
      reviewCount: 2341,
      roomType: 'Классический',
      amenities: ['WiFi', 'Спа', 'Ресторан', 'Бар', 'Фитнес', 'Консьерж'],
      fixedPricePerNight: 220,
      currency: 'EUR',
    },
    {
      hotelName: 'Puro Hotel Warsaw',
      address: 'ul. Ogrodowa 9, Warszawa',
      starRating: 4,
      rating: 8.7,
      reviewCount: 2890,
      roomType: 'Стандартный номер',
      amenities: ['WiFi', 'Фитнес', 'Ресторан', 'Бар', 'Кондиционер', 'Велопрокат'],
      fixedPricePerNight: 120,
      currency: 'EUR',
    },
    {
      hotelName: 'DoubleTree by Hilton Warsaw Centre',
      address: 'ul. Złota 2, Warszawa',
      starRating: 4,
      rating: 8.5,
      reviewCount: 3421,
      roomType: 'Стандарт',
      amenities: ['WiFi', 'Бассейн', 'Фитнес', 'Ресторан', 'Кондиционер'],
      fixedPricePerNight: 100,
      currency: 'EUR',
    },
    {
      hotelName: 'ibis Warszawa Centrum',
      address: 'al. Solidarności 165, Warszawa',
      starRating: 3,
      rating: 7.8,
      reviewCount: 4521,
      roomType: 'Стандарт',
      amenities: ['WiFi', 'Ресторан', 'Кондиционер'],
      fixedPricePerNight: 65,
      currency: 'EUR',
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
      address: 'Strand, London WC2R 0EZ',
      starRating: 5,
      rating: 9.3,
      reviewCount: 3201,
      roomType: 'Делюкс',
      amenities: ['WiFi', 'Бассейн', 'Спа', 'Ресторан', 'Бар', 'Фитнес', 'Консьерж', 'Дворецкий'],
      fixedPricePerNight: 450,
      currency: 'EUR',
    },
    {
      hotelName: 'The Goring',
      address: 'Beeston Place, London SW1W 0JW',
      starRating: 5,
      rating: 9.0,
      reviewCount: 1234,
      roomType: 'Классический',
      amenities: ['WiFi', 'Ресторан', 'Бар', 'Сад', 'Консьерж', 'Дворецкий'],
      fixedPricePerNight: 380,
      currency: 'EUR',
    },
    {
      hotelName: 'Premier Inn London City (Tower Hill)',
      address: '1 Pepys St, London EC3N',
      starRating: 3,
      rating: 8.0,
      reviewCount: 7654,
      roomType: 'Стандарт',
      amenities: ['WiFi', 'Ресторан', 'Кондиционер'],
      fixedPricePerNight: 95,
      currency: 'EUR',
    },
    {
      hotelName: 'Travelodge London Central',
      address: 'Drury Lane, London WC2B',
      starRating: 2,
      rating: 7.6,
      reviewCount: 12431,
      roomType: 'Стандартный номер',
      amenities: ['WiFi', 'Кондиционер'],
      fixedPricePerNight: 75,
      currency: 'EUR',
    },
  ],
  madrid: [
    {
      hotelName: 'Hotel Ritz Madrid',
      address: 'Plaza de la Lealtad 5, Madrid',
      starRating: 5,
      rating: 9.4,
      reviewCount: 2134,
      roomType: 'Делюкс',
      amenities: ['WiFi', 'Спа', 'Ресторан', 'Бар', 'Фитнес', 'Консьерж'],
      fixedPricePerNight: 320,
      currency: 'EUR',
    },
    {
      hotelName: 'NH Collection Gran Hotel de Zaragoza',
      address: 'Calle Joaquín Costa 5, Madrid',
      starRating: 4,
      rating: 8.5,
      reviewCount: 3201,
      roomType: 'Стандарт',
      amenities: ['WiFi', 'Фитнес', 'Ресторан', 'Бар', 'Кондиционер'],
      fixedPricePerNight: 120,
      currency: 'EUR',
    },
    {
      hotelName: 'Hostal Opera Madrid',
      address: 'Calle del Arenal 15, Madrid',
      starRating: 2,
      rating: 7.9,
      reviewCount: 4521,
      roomType: 'Стандартный номер',
      amenities: ['WiFi', 'Кондиционер'],
      fixedPricePerNight: 65,
      currency: 'EUR',
    },
  ],
  berlin: [
    {
      hotelName: 'Hotel Adlon Kempinski Berlin',
      address: 'Unter den Linden 77, Berlin',
      starRating: 5,
      rating: 9.1,
      reviewCount: 2876,
      roomType: 'Делюкс',
      amenities: ['WiFi', 'Спа', 'Бассейн', 'Ресторан', 'Бар', 'Фитнес'],
      fixedPricePerNight: 280,
      currency: 'EUR',
    },
    {
      hotelName: 'Mitte Hotel Berlin',
      address: 'Linienstrasse 160, Berlin Mitte',
      starRating: 4,
      rating: 8.6,
      reviewCount: 3102,
      roomType: 'Стандарт',
      amenities: ['WiFi', 'Фитнес', 'Ресторан', 'Кондиционер'],
      fixedPricePerNight: 110,
      currency: 'EUR',
    },
    {
      hotelName: 'Generator Hostel Berlin Mitte',
      address: 'Storkower Strasse 160, Berlin',
      starRating: 2,
      rating: 7.8,
      reviewCount: 8123,
      roomType: 'Стандартный номер',
      amenities: ['WiFi', 'Бар', 'Камера хранения'],
      fixedPricePerNight: 35,
      currency: 'EUR',
    },
  ],
  vienna: [
    {
      hotelName: 'Hotel Sacher Wien',
      address: 'Philharmoniker Str. 4, Vienna',
      starRating: 5,
      rating: 9.3,
      reviewCount: 1987,
      roomType: 'Делюкс',
      amenities: ['WiFi', 'Спа', 'Ресторан', 'Бар', 'Консьерж'],
      fixedPricePerNight: 350,
      currency: 'EUR',
    },
    {
      hotelName: 'Austria Trend Hotel Schillerpark',
      address: 'Schillerplatz 4, Vienna',
      starRating: 4,
      rating: 8.4,
      reviewCount: 2341,
      roomType: 'Стандарт',
      amenities: ['WiFi', 'Фитнес', 'Ресторан', 'Кондиционер'],
      fixedPricePerNight: 115,
      currency: 'EUR',
    },
    {
      hotelName: 'Ibis Wien City',
      address: 'Mariahilfer Gürtel 22–24, Vienna',
      starRating: 3,
      rating: 7.9,
      reviewCount: 5432,
      roomType: 'Стандартный номер',
      amenities: ['WiFi', 'Ресторан', 'Кондиционер'],
      fixedPricePerNight: 70,
      currency: 'EUR',
    },
  ],
  prague: [
    {
      hotelName: 'Four Seasons Hotel Prague',
      address: 'Veleslavínova 2a/1098, Prague',
      starRating: 5,
      rating: 9.4,
      reviewCount: 1654,
      roomType: 'Делюкс с видом на реку',
      amenities: ['WiFi', 'Спа', 'Ресторан', 'Бар', 'Фитнес', 'Консьерж'],
      fixedPricePerNight: 300,
      currency: 'EUR',
    },
    {
      hotelName: 'Mosaic House Prague',
      address: 'Odborů 4, New Town, Prague',
      starRating: 4,
      rating: 8.7,
      reviewCount: 3214,
      roomType: 'Стандарт',
      amenities: ['WiFi', 'Бар', 'Общая кухня', 'Кондиционер', 'Велопрокат'],
      fixedPricePerNight: 85,
      currency: 'EUR',
    },
    {
      hotelName: 'Czech Inn Hostel',
      address: 'Francouzská 76, Vinohrady, Prague',
      starRating: 2,
      rating: 8.0,
      reviewCount: 6789,
      roomType: 'Стандартный номер',
      amenities: ['WiFi', 'Кухня', 'Камера хранения'],
      fixedPricePerNight: 28,
      currency: 'EUR',
    },
  ],
  paris: [
    {
      hotelName: 'Le Meurice',
      address: '228 Rue de Rivoli, Paris 1er',
      starRating: 5,
      rating: 9.5,
      reviewCount: 1432,
      roomType: 'Делюкс',
      amenities: ['WiFi', 'Спа', 'Ресторан', 'Бар', 'Консьерж', 'Дворецкий'],
      fixedPricePerNight: 480,
      currency: 'EUR',
    },
    {
      hotelName: 'Hotel Malte',
      address: '63 Rue de Richelieu, Paris 2e',
      starRating: 4,
      rating: 8.6,
      reviewCount: 2341,
      roomType: 'Классический',
      amenities: ['WiFi', 'Ресторан', 'Кондиционер', 'Консьерж'],
      fixedPricePerNight: 150,
      currency: 'EUR',
    },
    {
      hotelName: 'ibis Paris Gare du Nord',
      address: '197 Rue La Fayette, Paris 10e',
      starRating: 3,
      rating: 7.7,
      reviewCount: 8901,
      roomType: 'Стандартный номер',
      amenities: ['WiFi', 'Ресторан', 'Кондиционер'],
      fixedPricePerNight: 90,
      currency: 'EUR',
    },
  ],
  kyiv: [
    {
      hotelName: 'InterContinental Kyiv',
      address: 'Вулиця Велика Житомирська, 2/1, Київ',
      starRating: 5,
      rating: 8.9,
      reviewCount: 2109,
      roomType: 'Делюкс',
      amenities: ['WiFi', 'Спа', 'Бассейн', 'Фитнес', 'Ресторан', 'Бар'],
      fixedPricePerNight: 120,
      currency: 'EUR',
    },
    {
      hotelName: 'ibis Kiev City Center',
      address: 'Вул. Антоновича 2, Київ',
      starRating: 3,
      rating: 8.0,
      reviewCount: 4213,
      roomType: 'Стандартный номер',
      amenities: ['WiFi', 'Ресторан', 'Кондиционер'],
      fixedPricePerNight: 55,
      currency: 'EUR',
    },
  ],
};

const DEFAULT_HOTELS: HotelMockEntry[] = [
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

// Mapping of Russian/alternative city names → canonical HOTELS_BY_CITY key
const CITY_ALIASES: Record<string, string> = {
  // Russian names
  'рим':        'rome',
  'roma':       'rome',
  'лондон':     'london',
  'барселона':  'barcelona',
  'мадрид':     'madrid',
  'варшава':    'warsaw',
  'варшave':    'warsaw',
  'амстердам':  'amsterdam',
  'париж':      'paris',
  'дубай':      'dubai',
  'стамбул':    'istanbul',
  'берлин':     'berlin',
  'вена':       'vienna',
  'прага':      'prague',
  'киев':       'kyiv',
  'киiв':       'kyiv',
  // English aliases
  'wien':       'vienna',
  'rome':       'rome',
  'london':     'london',
  'barcelona':  'barcelona',
  'madrid':     'madrid',
  'warsaw':     'warsaw',
  'amsterdam':  'amsterdam',
  'paris':      'paris',
  'dubai':      'dubai',
  'istanbul':   'istanbul',
  'berlin':     'berlin',
  'vienna':     'vienna',
  'prague':     'prague',
};

function lookupHotels(city: string): HotelMockEntry[] {
  const normalized = city.toLowerCase().trim();

  // 1. Check alias map first for exact/substring matches
  for (const [alias, canonicalKey] of Object.entries(CITY_ALIASES)) {
    if (normalized.includes(alias)) {
      const hotels = HOTELS_BY_CITY[canonicalKey];
      if (hotels) return hotels;
    }
  }

  // 2. Direct key lookup in HOTELS_BY_CITY (handles English names without alias)
  for (const [key, hotels] of Object.entries(HOTELS_BY_CITY)) {
    if (normalized.includes(key)) return hotels;
  }

  return DEFAULT_HOTELS;
}

// Base price ranges per star rating in USD (min..spread) — used as fallback when no fixedPricePerNight
const USD_BASE: Record<number, { min: number; spread: number }> = {
  2: { min: 25,  spread: 40  }, // $25–65 (hostels / budget)
  3: { min: 60,  spread: 60  }, // $60–120
  4: { min: 100, spread: 130 }, // $100–230
  5: { min: 200, spread: 350 }, // $200–550
  7: { min: 700, spread: 300 }, // $700–1000 (Burj Al Arab style)
};

function getBaseUsdPrice(stars: number): number {
  const range = USD_BASE[stars] ?? USD_BASE[3];
  return range.min + Math.floor(Math.random() * range.spread);
}

// Exchange rates for price conversion to USD (hardcoded for MVP)
const EUR_TO_USD = 1.09; // 1 EUR = 1.09 USD
const RUB_TO_USD = 90;   // 1 USD = 90 RUB

// Unsplash hotel photo URLs by category
const HOTEL_PHOTOS = {
  luxury: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=250&fit=crop',
  pool:   'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=400&h=250&fit=crop',
  mountain: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&h=250&fit=crop',
  city:   'https://images.unsplash.com/photo-1551882547-ff40c4a49f25?w=400&h=250&fit=crop',
};

function getHotelPhoto(stars: number): string {
  if (stars >= 5) return HOTEL_PHOTOS.luxury;
  if (stars >= 4) return HOTEL_PHOTOS.city;
  if (stars >= 3) return HOTEL_PHOTOS.pool;
  return HOTEL_PHOTOS.mountain;
}

// Mock implementation — preserved as fallback when Amadeus is unavailable
export async function searchHotelsMock(params: SearchHotelsParams): Promise<HotelOffer[]> {
  const { city, checkIn, checkOut, starRating, maxPrice } = params;
  const nights = getNights(checkIn, checkOut);

  let hotels = lookupHotels(city);

  // Apply star filter if specified
  if (starRating && starRating.length > 0) {
    hotels = hotels.filter((h) => h.starRating && starRating.includes(h.starRating));
  }

  // Apply max price filter (per night) if specified — filter before slicing
  const filtered = maxPrice
    ? hotels.filter((h) => {
        const perNight = h.fixedPricePerNight ?? null;
        if (perNight !== null) return perNight <= maxPrice;
        return true; // keep hotels without a fixed price (will be filtered later)
      })
    : hotels;

  return filtered.slice(0, 5).map((hotel): HotelOffer => {
    const stars = hotel.starRating ?? 3;

    // Convert fixed prices to USD; generate random USD price when no fixed price is set
    let perNightUsd: number;

    if (hotel.fixedPricePerNight !== undefined) {
      const srcCurrency = (hotel.currency ?? 'EUR').toUpperCase();
      if (srcCurrency === 'EUR') {
        perNightUsd = Math.round(hotel.fixedPricePerNight * EUR_TO_USD);
      } else if (srcCurrency === 'RUB') {
        perNightUsd = Math.round(hotel.fixedPricePerNight / RUB_TO_USD);
      } else {
        // already USD or unknown — use as-is
        perNightUsd = hotel.fixedPricePerNight;
      }
    } else {
      perNightUsd = getBaseUsdPrice(stars);
    }

    const total = perNightUsd * nights;

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
      pricePerNight: perNightUsd.toFixed(2),
      currency: 'USD',
      amenities: hotel.amenities ?? ['WiFi'],
      imageUrl: getHotelPhoto(stars),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
    };
  });
}

// ---------------------------------------------------------------------------
// Public entry point with Hotellook → mock fallback
// ---------------------------------------------------------------------------

/**
 * Search for hotels.
 * Priority:
 *   1. Hotellook (TravelPayouts) real API — always tried first.
 *      Uses TRAVELPAYOUTS_TOKEN from env when available.
 *   2. Mock data — used when Hotellook returns 0 results.
 */
export async function searchHotels(params: SearchHotelsParams): Promise<HotelOffer[]> {
  console.log('[Hotels] Trying Hotellook for', params.city);

  const hotellookResults = await searchHotelsHotellook(params);

  if (hotellookResults.length > 0) {
    return hotellookResults;
  }

  console.log('[Hotels] Hotellook returned 0 results, falling back to mock for', params.city);
  return searchHotelsMock(params);
}
