import api from './api';
import type { AppNotification, NotificationsResponse, UnreadCountResponse } from '../types';

// Backend meta shape (what the API actually returns)
interface BackendNotificationsResponse {
  data: AppNotification[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export const notificationService = {
  async getNotifications(page = 1): Promise<NotificationsResponse> {
    const { data } = await api.get<BackendNotificationsResponse>('/notifications', {
      params: { page, limit: 50 },
    });
    // Normalise backend meta shape → mobile NotificationsResponse shape
    return {
      data: data.data,
      pagination: {
        page: data.meta.page,
        limit: data.meta.pageSize,
        total: data.meta.total,
        hasNext: data.meta.page < data.meta.totalPages,
      },
    };
  },

  async getUnreadCount(): Promise<number> {
    const { data } = await api.get<UnreadCountResponse>('/notifications/unread-count');
    return data.count;
  },

  async markNotificationRead(id: string): Promise<AppNotification> {
    const { data } = await api.patch<AppNotification>(`/notifications/${id}/read`);
    return data;
  },

  async markAllNotificationsRead(): Promise<void> {
    // Backend registers PATCH /read-all (not POST)
    await api.patch('/notifications/read-all');
  },

  async deleteNotification(id: string): Promise<void> {
    await api.delete(`/notifications/${id}`);
  },
};
