import type Anthropic from '@anthropic-ai/sdk';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

// Claude tool definition for creating a booking (PENDING status, awaiting user confirmation)
export const createBookingTool: Anthropic.Tool = {
  name: 'create_booking',
  description:
    'Создать черновик бронирования (статус PENDING). Используй только когда пользователь явно сказал "забронировать", "оформить", "купить". После создания пользователь должен подтвердить оплату.',
  input_schema: {
    type: 'object' as const,
    properties: {
      type: {
        type: 'string',
        enum: ['FLIGHT', 'HOTEL'],
        description: 'Тип бронирования: рейс или отель',
      },
      offer_id: {
        type: 'string',
        description: 'ID оффера из результатов поиска',
      },
      provider: {
        type: 'string',
        enum: ['DUFFEL', 'AVIASALES', 'BOOKING'],
        description: 'Провайдер бронирования',
      },
      total_price: {
        type: 'string',
        description: 'Итоговая цена в виде строки (например, "15000.00")',
      },
      currency: {
        type: 'string',
        description: 'Валюта (по умолчанию RUB)',
      },
      details: {
        type: 'object',
        description: 'Детали бронирования: сегменты рейса или параметры отеля',
      },
    },
    required: ['type', 'offer_id', 'provider', 'total_price', 'details'],
  },
};

export interface CreateBookingInput {
  type: 'FLIGHT' | 'HOTEL';
  offer_id: string;
  provider: 'DUFFEL' | 'AVIASALES' | 'BOOKING';
  total_price: string;
  currency?: string;
  details: Record<string, unknown>;
}

// Executor: creates a PENDING booking in DB and returns booking draft for confirmation
export async function executeCreateBooking(input: CreateBookingInput, userId: string) {
  const booking = await prisma.booking.create({
    data: {
      userId,
      type: input.type,
      status: 'PENDING',
      provider: input.provider,
      externalId: input.offer_id,
      details: input.details as Prisma.InputJsonValue,
      totalPrice: input.total_price,
      currency: input.currency ?? 'RUB',
    },
  });

  // Derive human-readable summary from details
  let title = 'Бронирование';
  let subtitle = '';

  if (input.type === 'FLIGHT') {
    const segments = (input.details.segments as Array<{ origin: string; destination: string; departureAt: string }>) ?? [];
    if (segments.length > 0) {
      const first = segments[0];
      title = `${first.origin} → ${first.destination}`;
      subtitle = new Date(first.departureAt).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
      });
    }
  } else if (input.type === 'HOTEL') {
    title = (input.details.hotelName as string) ?? 'Отель';
    const checkIn = input.details.checkIn as string;
    const checkOut = input.details.checkOut as string;
    if (checkIn && checkOut) {
      subtitle = `${checkIn} – ${checkOut}`;
    }
  }

  return {
    bookingId: booking.id,
    type: booking.type as 'FLIGHT' | 'HOTEL',
    provider: input.provider,
    totalPrice: parseFloat(input.total_price),
    currency: booking.currency,
    details: input.details,
    summary: { title, subtitle },
    status: booking.status,
    message: 'Черновик бронирования создан. Подтвердите оплату для завершения.',
  };
}
