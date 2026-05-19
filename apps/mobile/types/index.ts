export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone?: string;
  dateOfBirth?: string;
  nationality?: string;
  passportNumber?: string;
  passportExpiry?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  createdAt: string;
  subscription: UserSubscription;
  wallet: UserWallet;
}

export interface UserSubscription {
  plan: 'FREE' | 'PRO' | 'PREMIUM';
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED';
  expiresAt?: string;
  /** Alias kept for backward compat — same value as plan */
  subscriptionTier?: 'FREE' | 'PRO' | 'PREMIUM';
  /** Daily usage counters */
  dailyUsed?: number;
  dailyLimit?: number;
}

export interface UserWallet {
  balance: number;
  currency: string;
}

export interface ChatSession {
  id: string;
  title: string;
  updatedAt: string;
  lastMessage?: string;
}

export type MessageRole = 'user' | 'assistant' | 'tool';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  toolName?: string;
  toolResult?: unknown;
  createdAt: string;
}

export interface BookingDraft {
  type: 'FLIGHT' | 'HOTEL';
  provider: string;
  details: FlightDetails | HotelDetails | Record<string, unknown>;
  totalPrice: number;
  currency: string;
  summary?: { title: string; subtitle: string };
  status?: string;
  message?: string;
}

export interface FlightDetails {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  airline: string;
  flightNumber: string;
  cabin: string;
  passengers: number;
}

export interface HotelDetails {
  name: string;
  address: string;
  stars: number;
  checkIn: string;
  checkOut: string;
  rooms: number;
  guests: number;
  pricePerNight: number;
}

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'FAILED';

export interface Booking {
  id: string;
  type: 'FLIGHT' | 'HOTEL';
  status: BookingStatus;
  provider: string;
  details: FlightDetails | HotelDetails | Record<string, unknown>;
  totalPrice: number | string;
  currency: string;
  createdAt: string;
}

export type TransactionType = 'TOPUP' | 'DEBIT';

export interface WalletTransaction {
  id: string;
  type: TransactionType;
  amount: string;
  currency: string;
  description: string;
  createdAt: string;
}

export interface SubscriptionPlan {
  id: 'FREE' | 'PRO' | 'PREMIUM';
  name: string;
  price: number;
  currency: string;
  features: string[];
  dailyLimit?: number;
  unlimited?: boolean;
  priority?: boolean;
}

export type SSEEvent =
  | { type: 'text_delta'; delta: string }
  | { type: 'tool_use'; toolName: string; toolInput: unknown; toolUseId: string }
  | { type: 'tool_result'; toolUseId: string; result: unknown }
  | { type: 'booking_draft'; booking: BookingDraft; bookingId: string }
  | { type: 'done' }
  | { type: 'error'; message: string }
  | { type: 'session_title_update'; title: string }
  | { type: 'cache_status'; xCache: string };

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
  };
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: Omit<UserProfile, 'subscription' | 'wallet'>;
}

export interface TokensResponse {
  accessToken: string;
  refreshToken: string;
}

// ── Notifications ─────────────────────────────────────────────────────────────

export type NotificationType = 'PRICE_ALERT' | 'BOOKING_UPDATE' | 'SYSTEM';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}

export interface NotificationsResponse {
  data: AppNotification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
  };
}

export interface UnreadCountResponse {
  count: number;
}

// ── Search history ────────────────────────────────────────────────────────────

export type SearchHistoryType = 'FLIGHT' | 'HOTEL';

export interface SearchHistoryItem {
  id: string;
  type: SearchHistoryType;
  query: string;
  route?: string;
  date?: string;
  resultsCount: number;
  sessionId?: string;
  createdAt: string;
}

// ── Favorites ─────────────────────────────────────────────────────────────────

export interface Hotel {
  id: string;
  name: string;
  address?: string;
  city?: string;
  stars?: number;
  pricePerNight: number;
  currency: string;
  rating?: number;
  reviewsCount?: number;
  amenities?: string[];
  description?: string;
  checkIn?: string;
  checkOut?: string;
  rooms?: number;
  guests?: number;
  latitude?: number;
  longitude?: number;
}

export type FlightProvider = 'AVIASALES' | 'DUFFEL';

export interface FlightOffer {
  id: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  airline: string;
  flightNumber: string;
  cabin: string;
  stops?: number;
  durationMin?: number;
  price: number;
  currency: string;
  departureTime?: string;
  arrivalTime?: string;
  provider?: FlightProvider;
}
