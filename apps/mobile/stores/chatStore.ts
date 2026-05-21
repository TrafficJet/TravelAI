import { create } from 'zustand';
import { AxiosError } from 'axios';
import { chatService } from '../services/chatService';
import type { ChatSession, Message, BookingDraft } from '../types';

/** Returns true when the error is an HTTP 401 Unauthorized response */
function is401(err: unknown): boolean {
  return err instanceof AxiosError && err.response?.status === 401;
}

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
    try {
      const response = await chatService.getSessions();
      set({ sessions: response.data ?? [] });
    } catch (err: unknown) {
      // Guest (unauthenticated) users receive 401 — treat as empty list, not an error
      if (is401(err)) {
        set({ sessions: [] });
        return;
      }
      throw err;
    }
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
    try {
      const response = await chatService.getMessages(sessionId);
      // The API may return Prisma enum uppercase roles (ASSISTANT, USER, TOOL_USE, TOOL_RESULT).
      // Cast to unknown first so we can safely inspect and remap them to frontend roles.
      const raw = (response.data ?? []) as unknown as Array<Omit<Message, 'role'> & { role: string }>;
      // Map DB roles (Prisma enum uppercase) to frontend roles.
      // TOOL_USE messages are loading-chip placeholders — skip them because
      // TOOL_RESULT already carries the card data we care about.
      const messages: Message[] = raw
        .filter((m) => m.role !== 'TOOL_USE')
        .map((m) => ({
          ...m,
          role: (
            m.role === 'TOOL_RESULT' ? 'tool'
            : m.role === 'ASSISTANT' ? 'assistant'
            : m.role === 'USER' ? 'user'
            : m.role.toLowerCase()
          ) as Message['role'],
        }));
      set({ messages });
    } catch (err: unknown) {
      // Guest users receive 401 — show empty messages rather than crashing
      if (is401(err)) {
        set({ messages: [] });
        return;
      }
      throw err;
    }
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
