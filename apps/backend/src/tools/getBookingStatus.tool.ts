import type Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../lib/prisma';

// Claude tool definition for checking booking status
export const getBookingStatusTool: Anthropic.Tool = {
  name: 'get_booking_status',
  description: 'Получить статус существующего бронирования по его ID.',
  input_schema: {
    type: 'object' as const,
    properties: {
      booking_id: {
        type: 'string',
        description: 'UUID бронирования',
      },
    },
    required: ['booking_id'],
  },
};

export interface GetBookingStatusInput {
  booking_id: string;
}

// Executor: fetches booking from DB
export async function executeGetBookingStatus(input: GetBookingStatusInput, userId: string) {
  const booking = await prisma.booking.findFirst({
    where: { id: input.booking_id, userId },
  });

  if (!booking) {
    return {
      found: false,
      message: 'Бронирование не найдено',
    };
  }

  const statusLabels: Record<string, string> = {
    PENDING: 'Ожидает подтверждения',
    CONFIRMED: 'Подтверждено',
    CANCELLED: 'Отменено',
    FAILED: 'Ошибка при бронировании',
  };

  return {
    found: true,
    bookingId: booking.id,
    type: booking.type,
    status: booking.status,
    statusLabel: statusLabels[booking.status] ?? booking.status,
    totalPrice: Number(booking.totalPrice),
    currency: booking.currency,
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
  };
}
