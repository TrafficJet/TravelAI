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
    'Поиск активностей, ресторанов, экскурсий, аренды авто в городе назначения. Используй когда пользователь интересуется тем, что делать в месте назначения.',
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
};

// Fallback activities for any city not in the map
function buildFallbackActivities(city: string): Activity[] {
  return [
    {
      id: 'gen-1',
      type: 'tour',
      name: `Обзорная экскурсия по ${city}`,
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

// Execute activity search — mock data, real Viator/GetYourGuide API integration planned
export async function executeSearchActivities(input: SearchActivitiesInput): Promise<{
  activities: Activity[];
  city: string;
}> {
  const cityKey = input.city.toLowerCase();
  const allForCity = CITY_ACTIVITIES[cityKey] ?? buildFallbackActivities(input.city);

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
