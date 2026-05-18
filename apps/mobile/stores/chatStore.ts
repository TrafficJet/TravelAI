import { create } from 'zustand';
import { chatService } from '../services/chatService';
import type { ChatSession, Message, BookingDraft } from '../types';

interface ChatStore {
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  messages: Message[];
  isStreaming: boolean;
  streamingText: string;
  pendingBooking: BookingDraft | null;
  loadSessions: () => Promise<void>;
  createSession: (initialMessage?: string) => Promise<string>;
  deleteSession: (sessionId: string) => Promise<void>;
  loadMessages: (sessionId: string) => Promise<void>;
  setCurrentSession: (session: ChatSession | null) => void;
  appendStreamingText: (delta: string) => void;
  setStreaming: (streaming: boolean) => void;
  commitStreamingMessage: () => void;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  setPendingBooking: (booking: BookingDraft | null) => void;
  updateSessionTitle: (sessionId: string, title: string) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  sessions: [],
  currentSession: null,
  messages: [],
  isStreaming: false,
  streamingText: '',
  pendingBooking: null,

  loadSessions: async () => {
    const response = await chatService.getSessions();
    set({ sessions: response.data ?? [] });
  },

  createSession: async (_initialMessage?: string) => {
    const response = await chatService.createSession();
    const newSession: ChatSession = {
      id: response.session.id,
      title: response.session.title,
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({ sessions: [newSession, ...state.sessions] }));
    return response.session.id;
  },

  deleteSession: async (sessionId: string) => {
    await chatService.deleteSession(sessionId);
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== sessionId),
    }));
  },

  loadMessages: async (sessionId: string) => {
    const response = await chatService.getMessages(sessionId);
    set({ messages: response.data ?? [] });
  },

  setCurrentSession: (session) => set({ currentSession: session }),

  appendStreamingText: (delta: string) =>
    set((state) => ({ streamingText: state.streamingText + delta })),

  setStreaming: (streaming: boolean) => {
    if (!streaming) {
      set({ isStreaming: false });
    } else {
      set({ isStreaming: true, streamingText: '' });
      // Auto-reset safety net: if streaming gets stuck (server drops connection
      // without sending "done" or "error"), unblock the UI after 60 seconds.
      setTimeout(() => {
        if (get().isStreaming) {
          console.warn('[chatStore] isStreaming auto-reset after 60s timeout');
          set({ isStreaming: false });
        }
      }, 60_000);
    }
  },

  commitStreamingMessage: () => {
    const { streamingText, messages } = get();
    if (!streamingText) {
      set({ isStreaming: false });
      return;
    }

    const assistantMessage: Message = {
      id: `local-${Date.now()}`,
      role: 'assistant',
      content: streamingText,
      createdAt: new Date().toISOString(),
    };

    set({
      messages: [...(messages ?? []), assistantMessage],
      streamingText: '',
      isStreaming: false,
    });
  },

  addMessage: (message: Message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  updateMessage: (id: string, updates: Partial<Message>) =>
    set((state) => ({
      messages: state.messages.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    })),

  setPendingBooking: (booking) => set({ pendingBooking: booking }),

  updateSessionTitle: (sessionId: string, title: string) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, title } : s,
      ),
      currentSession:
        state.currentSession?.id === sessionId
          ? { ...state.currentSession, title }
          : state.currentSession,
    }));
  },
}));
