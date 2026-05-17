import type Anthropic from '@anthropic-ai/sdk';

export interface TransferOption {
  type: 'taxi' | 'minivan' | 'vip' | 'shuttle';
  provider: string;
  vehicle: string;
  price: number;
  currency: string;
  duration: number; // minutes
  capacity: number;
  description: string;
}

// Tool definition for Claude API
export const searchTransfersTool: Anthropic.Tool = {
  name: 'search_transfers',
  description:
    'Поиск трансферов между аэропортом и отелем/городом. Используй когда пользователь прилетает/улетает и нужно добраться.',
  input_schema: {
    type: 'object' as const,
    properties: {
      from: {
        type: 'string',
        description: 'Откуда: название аэропорта или отеля/адреса',
      },
      to: {
        type: 'string',
        description: 'Куда: название аэропорта или отеля/адреса',
      },
      city: { type: 'string', description: 'Город' },
      passengers: { type: 'number', description: 'Количество пассажиров' },
      datetime: {
        type: 'string',
        description: 'Дата и время в формате ISO',
      },
    },
    required: ['from', 'to', 'city'],
  },
};

export interface SearchTransfersInput {
  from: string;
  to: string;
  city: string;
  passengers?: number;
  datetime?: string;
}

// Airport base prices (taxi, one-way, city center) in EUR
// and approximate drive durations (minutes) to city center
const AIRPORT_DATA: Record<string, { basePrice: number; duration: number }> = {
  BCN: { basePrice: 35, duration: 30 },
  MAD: { basePrice: 40, duration: 40 },
  CDG: { basePrice: 55, duration: 45 },
  LHR: { basePrice: 65, duration: 50 },
  AMS: { basePrice: 45, duration: 25 },
  IST: { basePrice: 25, duration: 45 },
  DXB: { basePrice: 30, duration: 35 },
  BKK: { basePrice: 15, duration: 40 },
  SVO: { basePrice: 50, duration: 60 },
  DME: { basePrice: 45, duration: 55 },
  WAW: { basePrice: 30, duration: 30 },
  BER: { basePrice: 35, duration: 40 },
  FCO: { basePrice: 40, duration: 35 },
  JFK: { basePrice: 60, duration: 50 },
  PRG: { basePrice: 25, duration: 30 },
  VIE: { basePrice: 30, duration: 30 },
};

// Execute transfer search — mock data, real API (GetTransfer, Kiwitaxi) to be integrated later
export async function executeSearchTransfers(input: SearchTransfersInput): Promise<{
  options: TransferOption[];
  city: string;
  route: string;
}> {
  const pax = input.passengers ?? 1;

  // Detect airport code from the from/to strings
  const allCodes = Object.keys(AIRPORT_DATA);
  const detectedCode = allCodes.find(
    (c) =>
      input.from.toUpperCase().includes(c) ||
      input.to.toUpperCase().includes(c),
  );
  const { basePrice, duration } = AIRPORT_DATA[detectedCode ?? 'BCN'] ?? { basePrice: 35, duration: 30 };

  // Group multiplier for larger parties
  const groupMultiplier = pax > 3 ? 1.5 : 1;

  // Clamp helper to keep prices within realistic ranges
  const clamp = (val: number, min: number, max: number) =>
    Math.round(Math.min(max, Math.max(min, val)));

  const options: TransferOption[] = [
    // Standard taxi — €15–€45
    {
      type: 'taxi',
      provider: 'Bolt / Uber',
      vehicle: 'Toyota Camry',
      price: clamp(basePrice * 0.9 * groupMultiplier, 15, 45),
      currency: 'EUR',
      duration,
      capacity: 4,
      description: 'Обычное такси через приложение. Самый бюджетный вариант.',
    },
    // Minivan 7 seats — €25–€65
    {
      type: 'minivan',
      provider: 'Transfer Express',
      vehicle: 'Ford Transit',
      price: clamp(basePrice * 1.3 * groupMultiplier, 25, 65),
      currency: 'EUR',
      duration: duration + 5,
      capacity: 7,
      description: 'Минивэн на 7 мест. Идеально для семьи или группы.',
    },
    // VIP Mercedes — €60–€150
    {
      type: 'vip',
      provider: 'Premium Transfer',
      vehicle: 'Mercedes E-Class',
      price: clamp(basePrice * 2.0 * groupMultiplier, 60, 150),
      currency: 'EUR',
      duration: duration - 5 > 10 ? duration - 5 : duration,
      capacity: 3,
      description: 'VIP-трансфер на Mercedes. Встреча с табличкой, вода в салоне.',
    },
    // Shuttle bus — €5–€15
    {
      type: 'shuttle',
      provider: 'Airport Shuttle',
      vehicle: 'Airport Shuttle',
      price: clamp(basePrice * 0.35, 5, 15),
      currency: 'EUR',
      duration: duration + 25,
      capacity: 16,
      description: 'Шаттл с другими пассажирами. Самый дешёвый вариант, дольше в пути.',
    },
  ];

  return {
    options,
    city: input.city,
    route: `${input.from} → ${input.to}`,
  };
}
