import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import type { Hotel, FlightOffer } from '../types';

interface FavoritesState {
  hotels: Hotel[];
  flights: FlightOffer[];
}

interface FavoritesActions {
  addHotel: (hotel: Hotel) => void;
  removeHotel: (id: string) => void;
  addFlight: (flight: FlightOffer) => void;
  removeFlight: (id: string) => void;
  isFavoriteHotel: (id: string) => boolean;
  isFavoriteFlight: (id: string) => boolean;
}

type FavoritesStore = FavoritesState & FavoritesActions;

export const useFavoritesStore = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      hotels: [],
      flights: [],

      addHotel: (hotel: Hotel) => {
        // Optimistic update first
        set((state) => ({
          hotels: state.hotels.some((h) => h.id === hotel.id)
            ? state.hotels
            : [...state.hotels, hotel],
        }));
        // Then sync to backend
        api
          .post('/api/users/me/favorites', { type: 'hotel', itemId: hotel.id, itemData: hotel })
          .catch(() => {
            // Rollback on failure
            set((state) => ({
              hotels: state.hotels.filter((h) => h.id !== hotel.id),
            }));
          });
      },

      removeHotel: (id: string) => {
        const prev = get().hotels.find((h) => h.id === id);
        // Optimistic update
        set((state) => ({
          hotels: state.hotels.filter((h) => h.id !== id),
        }));
        // Then sync to backend
        api.delete(`/api/users/me/favorites/${id}?type=hotel`).catch(() => {
          // Rollback on failure
          if (prev) {
            set((state) => ({ hotels: [...state.hotels, prev] }));
          }
        });
      },

      addFlight: (flight: FlightOffer) => {
        set((state) => ({
          flights: state.flights.some((f) => f.id === flight.id)
            ? state.flights
            : [...state.flights, flight],
        }));
        api
          .post('/api/users/me/favorites', { type: 'flight', itemId: flight.id, itemData: flight })
          .catch(() => {
            set((state) => ({
              flights: state.flights.filter((f) => f.id !== flight.id),
            }));
          });
      },

      removeFlight: (id: string) => {
        const prev = get().flights.find((f) => f.id === id);
        set((state) => ({
          flights: state.flights.filter((f) => f.id !== id),
        }));
        api.delete(`/api/users/me/favorites/${id}?type=flight`).catch(() => {
          if (prev) {
            set((state) => ({ flights: [...state.flights, prev] }));
          }
        });
      },

      isFavoriteHotel: (id: string) => get().hotels.some((h) => h.id === id),

      isFavoriteFlight: (id: string) => get().flights.some((f) => f.id === id),
    }),
    {
      name: 'favorites-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
