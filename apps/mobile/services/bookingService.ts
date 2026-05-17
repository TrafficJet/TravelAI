import api from './api';
import type { Booking } from '../types';

export interface ConfirmBookingPayload {
  bookingId: string;
  payFromWallet: boolean;
}

export interface GetBookingsParams {
  page?: number;
  limit?: number;
}

export interface GetBookingsResponse {
  bookings: Booking[];
  total: number;
  page: number;
  totalPages: number;
}

export const bookingService = {
  async getBookings(params: GetBookingsParams = {}): Promise<GetBookingsResponse> {
    const { data } = await api.get<GetBookingsResponse>('/bookings', { params });
    return data;
  },

  async getBooking(id: string): Promise<Booking> {
    const { data } = await api.get<{ booking: Booking }>(`/bookings/${id}`);
    return data.booking;
  },

  async confirmBooking(payload: ConfirmBookingPayload): Promise<Booking> {
    const { data } = await api.post<{ booking: Booking }>('/bookings/confirm', payload);
    return data.booking;
  },

  async cancelBooking(id: string): Promise<Booking> {
    const { data } = await api.post<{ booking: Booking }>(`/bookings/${id}/cancel`);
    return data.booking;
  },
};
