import api from './api';
import type { PaginatedResponse, SearchHistoryItem } from '../types';

export const searchHistoryService = {
  async getHistory(): Promise<PaginatedResponse<SearchHistoryItem>> {
    const { data } = await api.get<PaginatedResponse<SearchHistoryItem>>('/search/history');
    return data;
  },

  async deleteHistoryItem(id: string): Promise<void> {
    await api.delete(`/search/history/${id}`);
  },
};
