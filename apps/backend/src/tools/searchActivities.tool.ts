import type Anthropic from '@anthropic-ai/sdk';

export interface Activity {
  id: string;
  type: 'restaurant' | 'tour' | 'car_rental' | 'attraction' | 'experience';
  name: string;
  description: string;
  price: number;
  currency: string;
  duration?: string;
  rating: number;
  bookingUrl?: string;
}

// Tool definition for Claude API
export const searchActivitiesTool: Anthropic.Tool = {
  name: 'search_activities',
  description:
    'Поиск активностей, экскурсий и событий в городе. Вызывай ПРОАКТИВНО сразу после определения destination чтобы найти интересные события в период поездки. Также вызывай когда пользователь явно спрашивает об активностях или развлечениях.',
  input_schema: {
    type: 'object' as const,
    properties: {
      city: { type: 'string', description: 'Город' },
      type: {
        type: 'string',
        enum: [
          'restaurant',
          'tour',
          'car_rental',
          'attraction',
          'experience',
          'all',
        ],
        description: 'Тип активности',
      },
      budget_per_person: {
        type: 'number',
        description: 'Бюджет на человека в EUR',
      },
      interests: {
        type: 'string',
        description: 'Интересы: пляж, история, гастрономия и тп',
      },
    },
    required: ['city'],
  },
};

export interface SearchActivitiesInput {
  city: string;
  type?: string;
  budget_per_person?: number;
  interests?: string;
}

// Mock activity data per city — real Viator/GetYourGuide API integration planned
const CITY_ACTIVITIES: Record<string, Activity[]> = {
  barcelona: [
    {
      id: 'bcn-1',
      type: 'attraction',
      name: 'Sagrada Família',
      description: 'Знаменитый собор Гауди',
      price: 26,
      currency: 'EUR',
      duration: '2-3 часа',
      rating: 4.8,
    },
    {
      id: 'bcn-2',
      type: 'tour',
      name: 'Готический квартал пешком',
      description: 'Гид по старому городу',
      price: 18,
      currency: 'EUR',
      duration: '3 часа',
      rating: 4.7,
    },
    {
      id: 'bcn-3',
      type: 'restaurant',
      name: 'Tapas на La Barceloneta',
      description: 'Лучшие тапас у моря',
      price: 35,
      currency: 'EUR',
      duration: '2 часа',
      rating: 4.6,
    },
    {
      id: 'bcn-4',
      type: 'car_rental',
      name: 'Аренда авто в аэропорту',
      description: 'Compact от €35/день — Budget/Europcar',
      price: 35,
      currency: 'EUR',
      duration: 'день',
      rating: 4.2,
    },
  ],
  madrid: [
    {
      id: 'mad-1',
      type: 'attraction',
      name: 'Museo del Prado',
      description: 'Лучший художественный музей Испании',
      price: 15,
      currency: 'EUR',
      duration: '3 часа',
      rating: 4.9,
    },
    {
      id: 'mad-2',
      type: 'tour',
      name: 'Экскурсия по Королевскому дворцу',
      description: 'История испанской монархии',
      price: 22,
      currency: 'EUR',
      duration: '2 часа',
      rating: 4.6,
    },
  ],
  istanbul: [
    {
      id: 'ist-1',
      type: 'tour',
      name: 'Тур по Голубой мечети и Айя-Софии',
      description: 'Главные архитектурные шедевры Стамбула',
      price: 20,
      currency: 'EUR',
      duration: '4 часа',
      rating: 4.8,
    },
    {
      id: 'ist-2',
      type: 'restaurant',
      name: 'Турецкий завтрак в Кадыкёй',
      description: 'Традиционный завтрак на азиатском берегу',
      price: 12,
      currency: 'EUR',
      duration: '1.5 часа',
      rating: 4.7,
    },
  ],
  dubai: [
    {
      id: 'dxb-1',
      type: 'attraction',
      name: 'Бурдж Халифа — смотровая',
      description: 'Вид с 124-го этажа самого высокого здания мира',
      price: 35,
      currency: 'EUR',
      duration: '2 часа',
      rating: 4.7,
    },
    {
      id: 'dxb-2',
      type: 'experience',
      name: 'Сафари по пустыне',
      description: 'Джип-тур + ужин в бедуинском лагере',
      price: 60,
      currency: 'EUR',
      duration: '6 часов',
      rating: 4.8,
    },
  ],

  // --- Rome ---
  rome: [
    {
      id: 'rom-1',
      type: 'attraction',
      name: 'Колизей и Форум — skip-the-line',
      description: 'Арена гладиаторов + древний Форум, аудиогид включён',
      price: 22,
      currency: 'EUR',
      duration: '3 часа',
      rating: 4.8,
    },
    {
      id: 'rom-2',
      type: 'attraction',
      name: 'Ватиканские музеи и Сикстинская капелла',
      description: 'Работы Микеланджело, Рафаэля, билет без очереди',
      price: 27,
      currency: 'EUR',
      duration: '3-4 часа',
      rating: 4.9,
    },
    {
      id: 'rom-3',
      type: 'restaurant',
      name: 'Ужин с пастой в Трастевере',
      description: 'Карбонара и Cacio e Pepe в историческом квартале',
      price: 35,
      currency: 'EUR',
      duration: '2 часа',
      rating: 4.7,
    },
    {
      id: 'rom-4',
      type: 'experience',
      name: 'Аренда скутера Vespa',
      description: 'Объехать все семь холмов Рима — от €40/день',
      price: 40,
      currency: 'EUR',
      duration: 'день',
      rating: 4.5,
    },
  ],

  // --- London ---
  london: [
    {
      id: 'lon-1',
      type: 'attraction',
      name: 'Tower of London',
      description: 'Королевские регалии, крепость, экскурсия с йоменом',
      price: 30,
      currency: 'EUR',
      duration: '3 часа',
      rating: 4.7,
    },
    {
      id: 'lon-2',
      type: 'attraction',
      name: 'Tate Modern — современное искусство',
      description: 'Бесплатный вход в один из лучших музеев мира',
      price: 0,
      currency: 'EUR',
      duration: '2-3 часа',
      rating: 4.6,
    },
    {
      id: 'lon-3',
      type: 'experience',
      name: 'West End театр — мюзикл',
      description: 'Les Misérables / Hamilton / Phantom — вечернее шоу',
      price: 65,
      currency: 'EUR',
      duration: '2.5 часа',
      rating: 4.9,
    },
    {
      id: 'lon-4',
      type: 'tour',
      name: 'Двухэтажный автобус hop-on hop-off',
      description: 'Big Ben, Букингемский дворец, Тауэрский мост',
      price: 28,
      currency: 'EUR',
      duration: 'день',
      rating: 4.4,
    },
  ],

  // --- Amsterdam ---
  amsterdam: [
    {
      id: 'ams-1',
      type: 'attraction',
      name: 'Рейксмузеум',
      description: 'Рембрандт, Вермеер — главный музей Нидерландов',
      price: 22,
      currency: 'EUR',
      duration: '3 часа',
      rating: 4.8,
    },
    {
      id: 'ams-2',
      type: 'experience',
      name: 'Аренда велосипеда',
      description: 'Классический способ познакомиться с городом — от €10/день',
      price: 10,
      currency: 'EUR',
      duration: 'день',
      rating: 4.6,
    },
    {
      id: 'ams-3',
      type: 'tour',
      name: 'Круиз по каналам',
      description: '75-минутный тур на лодке по историческим каналам',
      price: 16,
      currency: 'EUR',
      duration: '1.5 часа',
      rating: 4.7,
    },
    {
      id: 'ams-4',
      type: 'attraction',
      name: 'Дом Анны Франк',
      description: 'Скрытые комнаты, где пряталась семья Франк — обязательно бронировать',
      price: 16,
      currency: 'EUR',
      duration: '1.5 часа',
      rating: 4.8,
    },
  ],

  // --- Warsaw ---
  warsaw: [
    {
      id: 'waw-1',
      type: 'tour',
      name: 'Тур по Старому городу (Старе Място)',
      description: 'Восстановленный после WWII исторический центр, пешком с гидом',
      price: 15,
      currency: 'EUR',
      duration: '2.5 часа',
      rating: 4.7,
    },
    {
      id: 'waw-2',
      type: 'attraction',
      name: 'Музей Варшавского восстания',
      description: 'Один из лучших исторических музеев Европы, восстание 1944 года',
      price: 8,
      currency: 'EUR',
      duration: '3 часа',
      rating: 4.9,
    },
    {
      id: 'waw-3',
      type: 'restaurant',
      name: 'Крафтовое пиво в Old Town Pub',
      description: 'Польские пивоварни — Żywiec Porter, Pinta, Browar Śródmieście',
      price: 18,
      currency: 'EUR',
      duration: '2 часа',
      rating: 4.5,
    },
    {
      id: 'waw-4',
      type: 'experience',
      name: 'Дегустация польской кухни — Pierogi тур',
      description: 'Вареники, żurek, bigos — кулинарный тур с гидом',
      price: 25,
      currency: 'EUR',
      duration: '3 часа',
      rating: 4.6,
    },
  ],

  // --- Paris ---
  paris: [
    {
      id: 'par-1',
      type: 'attraction',
      name: 'Эйфелева башня — подъём на вершину',
      description: 'Билет на лифте до 3-го уровня, вид на весь Париж',
      price: 29,
      currency: 'EUR',
      duration: '2 часа',
      rating: 4.7,
    },
    {
      id: 'par-2',
      type: 'attraction',
      name: 'Лувр — skip-the-line',
      description: 'Мона Лиза, Венера Милосская, Ника Самофракийская',
      price: 22,
      currency: 'EUR',
      duration: '3-4 часа',
      rating: 4.8,
    },
    {
      id: 'par-3',
      type: 'tour',
      name: 'Круиз по Сене — Bateaux Mouches',
      description: 'Вечерний вид на Notre-Dame, Musée d\'Orsay, Эйфелеву башню',
      price: 17,
      currency: 'EUR',
      duration: '1.5 часа',
      rating: 4.6,
    },
    {
      id: 'par-4',
      type: 'restaurant',
      name: 'Ужин в парижском бистро',
      description: 'Стейк-фрит, бокал бордо — классика французской кухни',
      price: 40,
      currency: 'EUR',
      duration: '2 часа',
      rating: 4.7,
    },
  ],

  // --- Berlin ---
  berlin: [
    {
      id: 'ber-1',
      type: 'attraction',
      name: 'Бранденбургские ворота + Рейхстаг',
      description: 'Купол Рейхстага с панорамой — бесплатно, нужна регистрация',
      price: 0,
      currency: 'EUR',
      duration: '2 часа',
      rating: 4.7,
    },
    {
      id: 'ber-2',
      type: 'tour',
      name: 'Street Art тур в Кройцберге',
      description: 'Граффити, уличное искусство, история альтернативного Берлина',
      price: 18,
      currency: 'EUR',
      duration: '2.5 часа',
      rating: 4.8,
    },
    {
      id: 'ber-3',
      type: 'restaurant',
      name: 'Currywurst и крафтовое пиво',
      description: 'Currywurst у Curry 36 + пиво в Mikkeller Bar Kreuzberg',
      price: 15,
      currency: 'EUR',
      duration: '1.5 часа',
      rating: 4.5,
    },
    {
      id: 'ber-4',
      type: 'attraction',
      name: 'Мемориал Берлинской стены (East Side Gallery)',
      description: '1,3 км оригинальной Стены с историческими граффити',
      price: 0,
      currency: 'EUR',
      duration: '1.5 часа',
      rating: 4.6,
    },
  ],
};

// Mapping of Russian / alternative city names → canonical CITY_ACTIVITIES key
const CITY_ALIASES: Record<string, string> = {
  // Russian names
  'рим':        'rome',
  'roma':       'rome',
  'лондон':     'london',
  'барселона':  'barcelona',
  'мадрид':     'madrid',
  'варшава':    'warsaw',
  'амстердам':  'amsterdam',
  'париж':      'paris',
  'дубай':      'dubai',
  'стамбул':    'istanbul',
  'берлин':     'berlin',
  // English aliases (canonical pass-through)
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
};

// Fallback activities for any city not in the map
function buildFallbackActivities(city: string): Activity[] {
  return [
    {
      id: 'gen-1',
      type: 'tour',
      name: `Обзорная экскурсия — ${city}`,
      description: 'Пешеходная экскурсия с местным гидом',
      price: 20,
      currency: 'EUR',
      duration: '3 часа',
      rating: 4.5,
    },
    {
      id: 'gen-2',
      type: 'car_rental',
      name: 'Аренда автомобиля',
      description: 'Compact класс, включена страховка',
      price: 40,
      currency: 'EUR',
      duration: 'день',
      rating: 4.3,
    },
    {
      id: 'gen-3',
      type: 'restaurant',
      name: 'Лучший ресторан местной кухни',
      description: 'По рейтингу TripAdvisor',
      price: 30,
      currency: 'EUR',
      duration: '2 часа',
      rating: 4.7,
    },
  ];
}

// Resolve city input to a canonical CITY_ACTIVITIES key via aliases
function resolveCityKey(city: string): string | undefined {
  const normalized = city.toLowerCase().trim();
  // Direct match in CITY_ACTIVITIES
  if (CITY_ACTIVITIES[normalized]) return normalized;
  // Alias lookup (exact or substring)
  for (const [alias, canonical] of Object.entries(CITY_ALIASES)) {
    if (normalized.includes(alias)) return canonical;
  }
  return undefined;
}

// Execute activity search — mock data, real Viator/GetYourGuide API integration planned
export async function executeSearchActivities(input: SearchActivitiesInput): Promise<{
  activities: Activity[];
  city: string;
}> {
  const resolvedKey = resolveCityKey(input.city);
  const allForCity = resolvedKey
    ? (CITY_ACTIVITIES[resolvedKey] ?? buildFallbackActivities(input.city))
    : buildFallbackActivities(input.city);

  let filtered = allForCity;

  // Filter by type if specified
  if (input.type && input.type !== 'all') {
    const byType = allForCity.filter((a) => a.type === input.type);
    filtered = byType.length > 0 ? byType : allForCity;
  }

  // Filter by budget if specified
  if (input.budget_per_person !== undefined) {
    const byBudget = filtered.filter((a) => a.price <= input.budget_per_person!);
    filtered = byBudget.length > 0 ? byBudget : filtered.slice(0, 3);
  }

  return { activities: filtered, city: input.city };
}
