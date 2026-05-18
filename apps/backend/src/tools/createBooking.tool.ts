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
        description: 'Валюта (по умолчанию USD). Используй EUR для европейских маршрутов, USD для межконтинентальных, RUB только если ОБА города в России/СНГ.',
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
  // Parse price to number so Prisma stores it as a proper Decimal, not a raw string
  const totalPriceNum = parseFloat(input.total_price);
  if (isNaN(totalPriceNum)) {
    throw new Error(`Invalid total_price: "${input.total_price}"`);
  }

  // For FLIGHT bookings normalise details so top-level origin/destination are always present
  let details = input.details as Record<string, unknown>;
  if (input.type === 'FLIGHT') {
    const segments = (details.segments as Array<{ origin: string; destination: string }> | undefined) ?? [];
    if (segments.length > 0 && !details.origin) {
      details = {
        ...details,
        origin: segments[0].origin,
        destination: segments[segments.length - 1].destination,
      };
    }
  }

  const booking = await prisma.booking.create({
    data: {
      userId,
      type: input.type,
      status: 'PENDING',
      provider: input.provider,
      externalId: input.offer_id,
      details: details as Prisma.InputJsonValue,
      totalPrice: totalPriceNum,
      currency: input.currency ?? 'USD',
    },
  });

  // Derive human-readable summary from details
  let title = 'Бронирование';
  let subtitle = '';

  if (input.type === 'FLIGHT') {
    const segments = (details.segments as Array<{ origin: string; destination: string; departureAt: string }> | undefined) ?? [];
    if (segments.length > 0) {
      const first = segments[0];
      title = `${first.origin} → ${first.destination}`;
      subtitle = new Date(first.departureAt).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
      });
    } else if (details.origin) {
      // Flat details with top-level origin/destination
      title = `${details.origin} → ${details.destination}`;
    }
  } else if (input.type === 'HOTEL') {
    title = (details.hotelName as string) ?? 'Отель';
    const checkIn = details.checkIn as string;
    const checkOut = details.checkOut as string;
    if (checkIn && checkOut) {
      subtitle = `${checkIn} – ${checkOut}`;
    }
  }

  return {
    bookingId: booking.id,
    type: booking.type as 'FLIGHT' | 'HOTEL',
    provider: input.provider,
    totalPrice: totalPriceNum,
    currency: booking.currency,
    details,
    summary: { title, subtitle },
    status: booking.status as 'PENDING',
    message: 'Черновик бронирования создан. Подтвердите оплату для завершения.',
  };
}
