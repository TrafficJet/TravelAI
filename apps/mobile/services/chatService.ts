import api from './api';
import type { ChatSession, Message, PaginatedResponse } from '../types';

interface SessionData {
  id: string;
  title: string;
  [key: string]: unknown;
}

export interface CreateSessionResponse {
  session: SessionData;
}

export const chatService = {
  async createSession(): Promise<CreateSessionResponse> {
    const { data } = await api.post<CreateSessionResponse>('/chat/sessions', {});
    return data;
  },

  async getSessions(): Promise<PaginatedResponse<ChatSession>> {
    const { data } = await api.get<PaginatedResponse<ChatSession>>('/chat/sessions');
    return data;
  },

  async getMessages(sessionId: string): Promise<PaginatedResponse<Message>> {
    const { data } = await api.get<PaginatedResponse<Message>>(
      `/chat/sessions/${sessionId}/messages`,
    );
    return data;
  },

  async deleteSession(sessionId: string): Promise<void> {
    await api.delete(`/chat/sessions/${sessionId}`);
  },
};
