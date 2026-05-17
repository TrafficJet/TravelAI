import type Anthropic from '@anthropic-ai/sdk';

export interface TransferOption {
  type: 'taxi' | 'shuttle' | 'private' | 'public';
  provider: string;
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

// Execute transfer search — mock data, real API (GetTransfer, Kiwitaxi) to be integrated later
export async function executeSearchTransfers(input: SearchTransfersInput): Promise<{
  options: TransferOption[];
  city: string;
  route: string;
}> {
  const pax = input.passengers ?? 1;

  const basePrices: Record<string, number> = {
    BCN: 35,
    MAD: 40,
    CDG: 55,
    LHR: 65,
    AMS: 45,
    IST: 25,
    DXB: 30,
    BKK: 15,
    SVO: 50,
    DME: 45,
    WAW: 30,
    BER: 35,
    FCO: 40,
    JFK: 60,
    PRG: 25,
    VIE: 30,
  };

  // Detect airport code from the from/to strings
  const allCodes = Object.keys(basePrices);
  const detectedCode = allCodes.find(
    (c) =>
      input.from.toUpperCase().includes(c) ||
      input.to.toUpperCase().includes(c),
  );
  const basePrice = basePrices[detectedCode ?? 'BCN'] ?? 35;
  const groupMultiplier = pax > 3 ? 1.5 : 1;

  const options: TransferOption[] = [
    {
      type: 'taxi',
      provider: 'Bolt / Uber',
      price: Math.round(basePrice * 0.8 * groupMultiplier),
      currency: 'EUR',
      duration: 35,
      capacity: 4,
      description: 'Обычное такси через приложение. Самый бюджетный вариант.',
    },
    {
      type: 'shuttle',
      provider: 'Airport Shuttle',
      price: Math.round(basePrice * 0.4),
      currency: 'EUR',
      duration: 55,
      capacity: 8,
      description: 'Шаттл с другими пассажирами. Дешевле, но дольше.',
    },
    {
      type: 'private',
      provider: 'Premium Transfer',
      price: Math.round(basePrice * 1.8 * groupMultiplier),
      currency: 'EUR',
      duration: 30,
      capacity: 6,
      description: 'Персональный водитель, встреча с табличкой. Максимально комфортно.',
    },
  ];

  return {
    options,
    city: input.city,
    route: `${input.from} → ${input.to}`,
  };
}
