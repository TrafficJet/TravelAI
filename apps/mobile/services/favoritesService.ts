import api from './api';
import type { Hotel, FlightOffer } from '../types';

export type FavoriteType = 'hotel' | 'flight';

export interface FavoriteItem {
  id: string;
  type: FavoriteType;
  itemId: string;
  itemData: Hotel | FlightOffer;
  createdAt: string;
}

interface FavoritesResponse {
  data: FavoriteItem[];
}

interface CheckFavoriteResponse {
  isFavorite: boolean;
}

export const favoritesService = {
  async getFavorites(type?: FavoriteType): Promise<FavoriteItem[]> {
    const params = type ? { type } : undefined;
    const { data } = await api.get<FavoritesResponse | FavoriteItem[]>(
      '/users/me/favorites',
      { params },
    );
    // Support both { data: [...] } and plain array responses
    if (Array.isArray(data)) return data;
    return data.data;
  },

  async addFavorite(
    type: FavoriteType,
    itemId: string,
    itemData: Hotel | FlightOffer,
  ): Promise<FavoriteItem> {
    const { data } = await api.post<FavoriteItem>('/users/me/favorites', {
      type,
      itemId,
      itemData,
    });
    return data;
  },

  async removeFavorite(type: FavoriteType, itemId: string): Promise<void> {
    await api.delete(`/users/me/favorites/${itemId}`, {
      params: { type },
    });
  },

  async checkFavorite(type: FavoriteType, itemId: string): Promise<boolean> {
    try {
      const { data } = await api.get<CheckFavoriteResponse>(
        `/users/me/favorites/${itemId}/check`,
        { params: { type } },
      );
      return data.isFavorite;
    } catch {
      return false;
    }
  },
};
