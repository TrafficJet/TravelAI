import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  Animated,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useLocalSearchParams, useNavigation, router } from 'expo-router';
import { useChatStore } from '../../stores/chatStore';
import { useWalletStore } from '../../stores/walletStore';
import { useBookingStore } from '../../stores/bookingStore';
import { useSSE } from '../../hooks/useSSE';
import { MessageBubble } from '../../components/chat/MessageBubble';
import { ChatInput, type ChatInputHandle } from '../../components/chat/ChatInput';
import { BookingConfirmModal } from '../../components/chat/BookingConfirmModal';
import { FlightFilterBar, FlightFiltersSheet, type FlightFilters } from '../../components/chat/FlightFilters';
import { HotelFilterBar, HotelFiltersSheet, type HotelFilters } from '../../components/chat/HotelFiltersSheet';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { analytics, Events } from '../../src/analytics';
import { captureError } from '../../lib/sentry';
import * as Haptics from 'expo-haptics';
import type { Message } from '../../types';

const ASYNC_KEY_FLIGHT = 'flight_filters';
const ASYNC_KEY_HOTEL = 'hotel_filters';

function humanizeError(message: string): string {
  if (message.startsWith('HTTP ')) return 'Ошибка соединения. Попробуйте снова.';
  if (message === 'Network error') return 'Нет соединения с сервером. Повторяем...';
  return message;
}

// ── Offline banner ────────────────────────────────────────────────────────────

function OfflineBanner({ visible }: { visible: boolean }) {
  const translateY = useRef(new Animated.Value(-48)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: visible ? 0 : -48,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [visible, translateY]);

  return (
    <Animated.View
      style={[bannerStyles.container, { transform: [{ translateY }] }]}
      pointerEvents="none"
    >
      <Text style={bannerStyles.text}>Нет подключения к интернету</Text>
    </Animated.View>
  );
}

const bannerStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: Colors.error,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    color: Colors.textInverse,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
});

// ── Empty state ───────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  'Варшава → Барселона',
  'Москва → Дубай',
  'Лондон → Рим',
  'Амстердам → Прага',
];

const CHAT_SUGGESTIONS = [
  'Добавь трансфер из аэропорта',
  'Покажи отели в центре',
  'Есть прямые рейсы?',
  'Нужен обратный билет',
  'Какой бюджет нужен?',
];

interface EmptyStateProps {
  onSelectSuggestion: (text: string) => void;
}

function EmptyState({ onSelectSuggestion }: EmptyStateProps) {
  return (
    <View style={emptyStyles.container}>
      <View style={emptyStyles.center}>
        <Text style={emptyStyles.planeIcon}>✈️</Text>
        <Text style={emptyStyles.title}>Куда летим?</Text>
        <Text style={emptyStyles.subtitle}>
          Напишите маршрут и я подберу рейсы, отели и трансфер
        </Text>
      </View>
      <View style={emptyStyles.chips}>
        {SUGGESTIONS.map((s) => (
          <TouchableOpacity
            key={s}
            style={emptyStyles.chip}
            onPress={() => onSelectSuggestion(s)}
            activeOpacity={0.7}
          >
            <Text style={emptyStyles.chipText}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 16,
  },
  center: {
    alignItems: 'center',
  },
  planeIcon: {
    fontSize: 56,
    marginBottom: 20,
  },
  title: {
    color: Colors.text,
    fontSize: Typography.sizes['2xl'] ?? 24,
    fontWeight: Typography.weights.bold,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.base,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    paddingBottom: 8,
  },
  chip: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: `${Colors.primary}40`,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  chipText: {
    color: Colors.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
});

// ── Helpers: persist & load filters ──────────────────────────────────────────

async function saveFilters<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // non-fatal
  }
}

async function loadFilters<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const { sessionId, initialMessage } = useLocalSearchParams<{
    sessionId: string;
    initialMessage?: string;
  }>();
  const navigation = useNavigation();

  const {
    messages,
    isStreaming,
    streamingText,
    pendingBooking,
    currentSession,
    loadMessages,
    setCurrentSession,
    appendStreamingText,
    setStreaming,
    commitStreamingMessage,
    addMessage,
    updateMessage,
    setPendingBooking,
    sessions,
  } = useChatStore();

  const { balance, currency: walletCurrency, load: loadWallet } = useWalletStore();
  const { confirmBooking } = useBookingStore();
  const { streamMessage } = useSSE();
  const flatListRef = useRef<FlatList<Message & { _streaming?: boolean }>>(null);
  const chatInputRef = useRef<ChatInputHandle>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [pendingBookingId, setPendingBookingId] = React.useState<string | null>(null);

  // ── Filter state ──────────────────────────────────────────────────────────
  const [flightFilters, setFlightFilters] = React.useState<FlightFilters>({});
  const [hotelFilters, setHotelFilters] = React.useState<HotelFilters>({});
  const [filtersVisible, setFiltersVisible] = React.useState(false);
  const [hotelFiltersVisible, setHotelFiltersVisible] = React.useState(false);

  // Refs that always hold the latest filter values — used by auto-send to avoid stale closures
  const flightFiltersRef = useRef<FlightFilters>({});
  const hotelFiltersRef = useRef<HotelFilters>({});

  // ── Offline state ─────────────────────────────────────────────────────────
  const [isOffline, setIsOffline] = React.useState(false);

  // Subscribe to network state changes
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(state.isConnected === false);
    });
    // Check immediately on mount
    NetInfo.fetch().then((state) => {
      setIsOffline(state.isConnected === false);
    });
    return unsubscribe;
  }, []);

  // ── Restore filters from AsyncStorage on mount ────────────────────────────
  useEffect(() => {
    loadFilters<FlightFilters>(ASYNC_KEY_FLIGHT).then((saved) => {
      if (saved) {
        flightFiltersRef.current = saved;
        setFlightFilters(saved);
      }
    });
    loadFilters<HotelFilters>(ASYNC_KEY_HOTEL).then((saved) => {
      if (saved) {
        hotelFiltersRef.current = saved;
        setHotelFilters(saved);
      }
    });
  }, []);

  // ── Persist filters when they change ─────────────────────────────────────
  const handleFlightFiltersApply = useCallback((updated: FlightFilters) => {
    flightFiltersRef.current = updated;
    setFlightFilters(updated);
    void saveFilters(ASYNC_KEY_FLIGHT, updated);
  }, []);

  const handleHotelFiltersApply = useCallback((updated: HotelFilters) => {
    hotelFiltersRef.current = updated;
    setHotelFilters(updated);
    void saveFilters(ASYNC_KEY_HOTEL, updated);
  }, []);

  // ── Session title ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return;
    const session = (sessions ?? []).find((s) => s.id === sessionId);
    if (session) {
      setCurrentSession(session);
      navigation.setOptions({
        title: session.title,
        headerTitleStyle: {
          fontFamily: 'Sora',
          fontSize: 16,
          fontWeight: '600' as const,
          color: Colors.text,
        },
        headerRight: () => (
          <TouchableOpacity
            style={chatHeaderStyles.menuBtn}
            onPress={() => {}}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={chatHeaderStyles.menuBtnText}>•••</Text>
          </TouchableOpacity>
        ),
      });
    }
  }, [sessionId, sessions, setCurrentSession, navigation]);

  useEffect(() => {
    if (!sessionId) return;
    loadMessages(sessionId)
      .catch(() => {})
      .finally(() => setIsLoading(false));
    loadWallet().catch(() => {});
  }, [sessionId, loadMessages, loadWallet]);

  // Auto-send initialMessage once messages have loaded and streaming is idle
  const autoSentRef = useRef(false);
  useEffect(() => {
    if (!initialMessage || isLoading || isStreaming || autoSentRef.current) return;
    autoSentRef.current = true;
    // Capture the latest filter values from refs to avoid stale closure
    const flightSnapshot = flightFiltersRef.current;
    const hotelSnapshot = hotelFiltersRef.current;
    const timer = setTimeout(() => {
      handleSend(initialMessage, { flight: flightSnapshot, hotel: hotelSnapshot });
    }, 100);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessage, isLoading]);

  const safeMessages = messages ?? [];

  const scrollToBottom = useCallback(() => {
    if (flatListRef.current && safeMessages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [safeMessages.length]);

  useEffect(() => {
    scrollToBottom();
  }, [safeMessages.length, streamingText, scrollToBottom]);

  async function handleSend(content: string, overrideFilters?: { flight: FlightFilters; hotel: HotelFilters }) {
    if (!sessionId || isStreaming) return;

    if (isOffline) {
      Alert.alert('Нет интернета', 'Проверьте подключение и попробуйте снова.');
      return;
    }

    const userMessage: Message = {
      id: `local-user-${Date.now()}`,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    addMessage(userMessage);
    analytics.track(Events.MESSAGE_SENT, { sessionId });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStreaming(true);

    // Use provided override (e.g. from ref on auto-send) or current state
    const effectiveFlight = overrideFilters?.flight ?? flightFilters;
    const effectiveHotel = overrideFilters?.hotel ?? hotelFilters;

    // Build active filters payload
    const hasFlightFilters = Object.values(effectiveFlight).some((v) => v !== undefined);
    const hasHotelFilters =
      effectiveHotel.maxPrice !== undefined ||
      effectiveHotel.stars !== undefined ||
      (effectiveHotel.amenities && effectiveHotel.amenities.length > 0) ||
      effectiveHotel.sortBy !== undefined;

    const filtersPayload = {
      ...(hasFlightFilters ? { flight: effectiveFlight } : {}),
      ...(hasHotelFilters ? { hotel: effectiveHotel } : {}),
    };

    try {
      await streamMessage(
        sessionId,
        content,
        {
          onTextDelta: (delta) => appendStreamingText(delta),
          onToolUse: (toolName, _toolInput, toolUseId) => {
            const toolMsgId = `local-tool-${toolUseId ?? Date.now()}`;
            const toolMsg: Message = {
              id: toolMsgId,
              role: 'tool',
              content: `Использую инструмент: ${toolName}`,
              toolName,
              createdAt: new Date().toISOString(),
            };
            addMessage(toolMsg);
          },
          onToolResult: (toolUseId, result) => {
            // Attach result to the matching tool message so ChatToolResult can render cards
            const toolMsgId = `local-tool-${toolUseId}`;
            updateMessage(toolMsgId, { toolResult: result });
          },
          onBookingDraft: (booking, bookingId) => {
            commitStreamingMessage();
            setPendingBooking(booking);
            setPendingBookingId(bookingId);
          },
          onDone: () => {
            commitStreamingMessage();
          },
          onError: (message) => {
            setStreaming(false);
            captureError(new Error(message), { sessionId, source: 'sse_stream' });
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Ошибка чата', humanizeError(message));
          },
        },
        Object.keys(filtersPayload).length > 0 ? filtersPayload : undefined,
      );
    } catch (err: unknown) {
      setStreaming(false);
      captureError(err, { sessionId, source: 'sse_catch' });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const raw = err instanceof Error ? err.message : 'Ошибка соединения';
      Alert.alert('Ошибка', humanizeError(raw));
    }
  }

  async function handleConfirmBooking() {
    if (!pendingBooking || !pendingBookingId) return;
    try {
      await confirmBooking(pendingBookingId);
      setPendingBooking(null);
      setPendingBookingId(null);
      await loadWallet();
      Alert.alert('Бронь подтверждена', 'Ваша бронь успешно оформлена!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка подтверждения';
      Alert.alert('Ошибка', msg);
    }
  }

  // Build display data: real messages + optional streaming bubble
  const displayMessages: (Message & { _streaming?: boolean })[] = [
    ...safeMessages,
    ...(isStreaming
      ? [
          {
            id: '__streaming__',
            role: 'assistant' as const,
            content: streamingText,
            createdAt: new Date().toISOString(),
            _streaming: true,
          },
        ]
      : []),
  ];

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  void currentSession;

  // Badge counts
  const flightActiveCount = Object.values(flightFilters).filter((v) => v !== undefined).length;
  const hotelActiveCount =
    (hotelFilters.maxPrice !== undefined ? 1 : 0) +
    (hotelFilters.stars !== undefined ? 1 : 0) +
    (hotelFilters.amenities?.length ?? 0) +
    (hotelFilters.sortBy !== undefined ? 1 : 0);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Offline banner */}
      <OfflineBanner visible={isOffline} />

      {/* Filter bar — flight + hotel buttons */}
      <View style={styles.filterBarRow}>
        <FlightFilterBar
          filters={flightFilters}
          onOpenFilters={() => setFiltersVisible(true)}
          activeCount={flightActiveCount}
        />
        <HotelFilterBar
          filters={hotelFilters}
          onOpenFilters={() => setHotelFiltersVisible(true)}
        />
        {hotelActiveCount > 0 && <View style={styles.spacer} />}
      </View>

      {displayMessages.length === 0 && !isLoading ? (
        <EmptyState
          onSelectSuggestion={(suggestion) => {
            chatInputRef.current?.setText(suggestion);
          }}
        />
      ) : (
        <FlatList
          ref={flatListRef}
          data={displayMessages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              isStreaming={item._streaming}
              streamingText={item._streaming ? streamingText : undefined}
            />
          )}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={scrollToBottom}
          ListHeaderComponent={<View style={styles.listHeader} />}
        />
      )}

      <ChatInput
        ref={chatInputRef}
        onSend={handleSend}
        disabled={isStreaming}
        initialMessage={initialMessage}
        suggestions={
          !isStreaming &&
          safeMessages.length > 0 &&
          safeMessages[safeMessages.length - 1]?.role === 'assistant'
            ? CHAT_SUGGESTIONS
            : []
        }
        onSuggestionSelect={(suggestion) => {
          chatInputRef.current?.setText(suggestion);
        }}
      />

      {pendingBooking && (
        <BookingConfirmModal
          visible={!!pendingBooking}
          booking={pendingBooking}
          walletBalance={balance}
          walletCurrency={walletCurrency}
          onConfirm={handleConfirmBooking}
          onCancel={() => { setPendingBooking(null); setPendingBookingId(null); }}
        />
      )}

      {/* Flight filters bottom sheet */}
      <FlightFiltersSheet
        visible={filtersVisible}
        filters={flightFilters}
        onApply={handleFlightFiltersApply}
        onClose={() => setFiltersVisible(false)}
      />

      {/* Hotel filters bottom sheet */}
      <HotelFiltersSheet
        visible={hotelFiltersVisible}
        filters={hotelFilters}
        onApply={handleHotelFiltersApply}
        onClose={() => setHotelFiltersVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

const chatHeaderStyles = StyleSheet.create({
  menuBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  menuBtnText: {
    color: Colors.textMuted,
    fontSize: 18,
    fontWeight: Typography.weights.bold,
    letterSpacing: 1,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  filterBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  spacer: {
    flex: 1,
  },
  messageList: {
    paddingVertical: 8,
  },
  listHeader: {
    height: 8,
  },
});
