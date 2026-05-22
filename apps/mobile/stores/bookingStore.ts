import { create } from 'zustand';
import { bookingService } from '../services/bookingService';
import type { Booking } from '../types';

interface BookingStore {
  bookings: Booking[];
  currentBooking: Booking | null;
  isLoading: boolean;
  bookingError: string | null;
  load: () => Promise<void>;
  loadBooking: (id: string) => Promise<void>;
  appendBookings: (newBookings: Booking[]) => void;
  confirmBooking: (bookingId: string) => Promise<void>;
  cancelBooking: (bookingId: string) => Promise<void>;
}

export const useBookingStore = create<BookingStore>((set, get) => ({
  bookings: [],
  currentBooking: null,
  isLoading: false,
  bookingError: null,

  appendBookings: (newBookings: Booking[]) => {
    const { bookings } = get();
    const existing = bookings ?? [];
    const existingIds = new Set(existing.map((b) => b.id));
    const deduped = newBookings.filter((b) => !existingIds.has(b.id));
    set({ bookings: [...existing, ...deduped] });
  },

  load: async () => {
    set({ isLoading: true });
    try {
      const response = await bookingService.getBookings();
      set({ bookings: response.bookings ?? [] });
    } finally {
      set({ isLoading: false });
    }
  },

  loadBooking: async (id: string) => {
    set({ isLoading: true, bookingError: null });
    try {
      const booking = await bookingService.getBooking(id);
      set({ currentBooking: booking });
    } catch (err) {
      set({ bookingError: err instanceof Error ? err.message : 'Ошибка загрузки' });
    } finally {
      set({ isLoading: false });
    }
  },

  confirmBooking: async (bookingId: string) => {
    const confirmed = await bookingService.confirmBooking({
      bookingId,
      payFromWallet: true,
    });
    const { bookings } = get();
    set({
      bookings: (bookings ?? []).map((b) => (b.id === confirmed.id ? confirmed : b)),
      currentBooking: confirmed,
    });
  },

  cancelBooking: async (bookingId: string) => {
    const cancelled = await bookingService.cancelBooking(bookingId);
    const { bookings } = get();
    set({
      bookings: (bookings ?? []).map((b) => (b.id === cancelled.id ? cancelled : b)),
      currentBooking: cancelled,
    });
  },
}));
