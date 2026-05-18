import React, { useEffect, useRef, useCallback, useState } from 'react';
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
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
import { ChatHistorySheet } from '../../components/chat/ChatHistorySheet';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { SkeletonChatMessage } from '../../components/ui/Skeleton';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { analytics, Events } from '../../src/analytics';
import { captureError } from '../../lib/sentry';
import * as Haptics from 'expo-haptics';
import type { Message } from '../../types';

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

const CONTEXT_SUGGESTIONS = [
  'Добавь трансфер из аэропорта',
  'Покажи отели дешевле',
  'Есть прямые рейсы?',
  'Нужен обратный билет',
  'Что взять с собой?',
  'Лучший район для отеля?',
];

interface EmptyStateProps {
  onSelectSuggestion: (text: string) => void;
}

function EmptyState({ onSelectSuggestion }: EmptyStateProps) {
  return (
    <View style={emptyStyles.container}>
      <View style={emptyStyles.center}>
        <Ionicons name="airplane" size={64} color={Colors.primary} style={{ opacity: 0.3, marginBottom: 20 }} />
        <Text style={emptyStyles.title}>Куда летим?</Text>
        <Text style={emptyStyles.subtitle}>
          Напишите маршрут и я подберу рейсы, отели и трансфер
        </Text>
      </View>
      <View style={emptyStyles.chips}>
        <View style={emptyStyles.chipRow}>
          <TouchableOpacity style={emptyStyles.chip} onPress={() => onSelectSuggestion('Варшава → Барселона')} activeOpacity={0.7}>
            <Text style={emptyStyles.chipText}>Варшава → Барселона</Text>
          </TouchableOpacity>
          <TouchableOpacity style={emptyStyles.chip} onPress={() => onSelectSuggestion('Москва → Дубай')} activeOpacity={0.7}>
            <Text style={emptyStyles.chipText}>Москва → Дубай</Text>
          </TouchableOpacity>
        </View>
        <View style={emptyStyles.chipRow}>
          <TouchableOpacity style={emptyStyles.chip} onPress={() => onSelectSuggestion('Лондон → Рим')} activeOpacity={0.7}>
            <Text style={emptyStyles.chipText}>Лондон → Рим</Text>
          </TouchableOpacity>
          <TouchableOpacity style={emptyStyles.chip} onPress={() => onSelectSuggestion('Амстердам → Прага')} activeOpacity={0.7}>
            <Text style={emptyStyles.chipText}>Амстердам → Прага</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ── Post-message suggestions ──────────────────────────────────────────────────

function PostMessageSuggestions({ onSelect }: { onSelect: (text: string) => void }) {
  return (
    <View style={suggStyles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={suggStyles.row}
      >
        {CONTEXT_SUGGESTIONS.map((s) => (
          <TouchableOpacity
            key={s}
            style={suggStyles.chip}
            onPress={() => onSelect(s)}
            activeOpacity={0.7}
          >
            <Text style={suggStyles.chipText}>{s}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const suggStyles = StyleSheet.create({
  wrap: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  row: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: `${Colors.primary}40`,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipText: {
    color: Colors.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
});

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
    gap: 10,
    paddingBottom: 8,
    width: '100%',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  chip: {
    flex: 1,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: `${Colors.primary}40`,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
    alignItems: 'center',
  },
  chipText: {
    color: Colors.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    textAlign: 'center',
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
    updateSessionTitle,
    deleteSession,
    createSession,
  } = useChatStore();

  const { balance, currency: walletCurrency, load: loadWallet, isLoading: isWalletLoading } = useWalletStore();
  const { confirmBooking } = useBookingStore();
  const { streamMessage } = useSSE();
  const flatListRef = useRef<FlatList<Message & { _streaming?: boolean }>>(null);
  const chatInputRef = useRef<ChatInputHandle>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [pendingBookingId, setPendingBookingId] = React.useState<string | null>(null);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // ── Offline state ─────────────────────────────────────────────────────────
  const [isOffline, setIsOffline] = React.useState(false);

  // Subscribe to network state changes
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      // На web Platform NetInfo может ложно сообщать offline.
      // Считаем offline только если оба признака подтверждают отсутствие сети.
      const offline = state.isConnected === false && state.isInternetReachable === false;
      setIsOffline(offline);
    });
    // Check immediately on mount
    NetInfo.fetch().then((state) => {
      const offline = state.isConnected === false && state.isInternetReachable === false;
      setIsOffline(offline);
    });
    return unsubscribe;
  }, []);

  // ── Session title ─────────────────────────────────────────────────────────
  const handleHeaderMenu = useCallback(() => {
    if (!sessionId) return;
    Alert.alert(
      currentSession?.title ?? 'Чат',
      undefined,
      [
        {
          text: 'Очистить историю',
          onPress: () => {
            Alert.alert(
              'Очистить историю?',
              'Все сообщения в этом чате будут удалены.',
              [
                { text: 'Отмена', style: 'cancel' },
                {
                  text: 'Очистить',
                  style: 'destructive',
                  onPress: () => {
                    // Delete all messages on server, then reload (empty)
                    import('../../services/chatService').then(({ chatService }) => {
                      chatService.clearMessages(sessionId)
                        .catch(() => {})
                        .finally(() => loadMessages(sessionId).catch(() => {}));
                    }).catch(() => {});
                  },
                },
              ],
            );
          },
        },
        {
          text: 'Удалить чат',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Удалить чат?',
              'Этот чат и все сообщения будут удалены безвозвратно.',
              [
                { text: 'Отмена', style: 'cancel' },
                {
                  text: 'Удалить',
                  style: 'destructive',
                  onPress: () => {
                    deleteSession(sessionId)
                      .catch(() => {})
                      .finally(() => router.back());
                  },
                },
              ],
            );
          },
        },
        { text: 'Отмена', style: 'cancel' },
      ],
      { cancelable: true },
    );
  }, [sessionId, currentSession, deleteSession, loadMessages]);

  async function handleNewChatFromHeader() {
    if (isCreatingNew) return;
    setIsCreatingNew(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const id = await createSession();
      router.replace((`/chat/${id}`) as never);
    } catch {
      Alert.alert('Ошибка', 'Не удалось создать чат. Попробуйте снова.');
    } finally {
      setIsCreatingNew(false);
    }
  }

  useEffect(() => {
    if (!sessionId) return;
    const session = (sessions ?? []).find((s) => s.id === sessionId);
    const title = session?.title ?? currentSession?.title ?? 'Новый чат';
    if (session) {
      setCurrentSession(session);
    }
    navigation.setOptions({
      title,
      headerBackTitle: '',
      headerTitleStyle: {
        fontFamily: 'Sora',
        fontSize: 16,
        fontWeight: '600' as const,
        color: Colors.text,
      },
      headerLeft: () => (
        <TouchableOpacity
          style={chatHeaderStyles.historyBtn}
          onPress={() => setHistoryVisible(true)}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="time-outline" size={18} color={Colors.primary} style={{ marginRight: 4 }} />
          <Text style={chatHeaderStyles.historyBtnText}>История</Text>
        </TouchableOpacity>
      ),
      headerRight: () => (
        <View style={chatHeaderStyles.rightGroup}>
          <TouchableOpacity
            style={chatHeaderStyles.profileBtn}
            onPress={() => router.push('/(tabs)/profile')}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="person-circle-outline" size={26} color={Colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={chatHeaderStyles.newChatBtn}
            onPress={() => { void handleNewChatFromHeader(); }}
            activeOpacity={0.7}
            disabled={isCreatingNew}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {isCreatingNew ? (
              <ActivityIndicator color={Colors.primary} size="small" />
            ) : (
              <Ionicons name="add" size={22} color={Colors.primary} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={chatHeaderStyles.menuBtn}
            onPress={handleHeaderMenu}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      ),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, sessions, currentSession, setCurrentSession, navigation, handleHeaderMenu, historyVisible, isCreatingNew]);

  useEffect(() => {
    if (!sessionId) return;
    // Reset streaming state on session change to prevent stuck "isStreaming=true" from a previous session
    setStreaming(false);
    loadMessages(sessionId)
      .catch(() => {})
      .finally(() => setIsLoading(false));
    loadWallet().catch(() => {});
  }, [sessionId, loadMessages, loadWallet, setStreaming]);

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
    if (!sessionId) {
      console.warn('[ChatScreen] handleSend blocked: no sessionId');
      return;
    }
    if (isStreaming) {
      console.warn('[ChatScreen] handleSend blocked: isStreaming=true — waiting for previous response to finish');
      return;
    }

    // TEMP: disabled hard block — NetInfo may falsely report offline on some devices/web
    // if (isOffline) {
    //   Alert.alert('Нет интернета', 'Проверьте подключение и попробуйте снова.');
    //   return;
    // }

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
            console.log('[SSE] tool_result received:', { toolUseId, resultKeys: result && typeof result === 'object' ? Object.keys(result as object) : result });
            // Attach result to the matching tool message so ChatToolResult can render cards
            const toolMsgId = `local-tool-${toolUseId}`;
            updateMessage(toolMsgId, { toolResult: result });
            console.log('[SSE] updateMessage called for:', toolMsgId);
          },
          onBookingDraft: (booking, bookingId) => {
            commitStreamingMessage();
            setPendingBooking(booking);
            setPendingBookingId(bookingId);
          },
          onDone: () => {
            commitStreamingMessage();
          },
          onSessionTitleUpdate: (title: string) => {
            if (!sessionId) return;
            updateSessionTitle(sessionId, title);
            navigation.setOptions({ title });
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
      // Safety net: ensure streaming is reset even if onDone/onError weren't called
      // (e.g. server closed connection without a "done" event)
      setStreaming(false);
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
    const bookingId = pendingBookingId;
    const bookingType = pendingBooking.type;
    const totalPrice = pendingBooking.totalPrice;
    const currency = pendingBooking.currency;

    // Extract flight/hotel details for success screen
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const details = pendingBooking.details as any;
    const origin = details?.origin || details?.segments?.[0]?.origin || '';
    const destination = details?.destination || details?.segments?.[details?.segments?.length - 1]?.destination || '';
    const airline = details?.airline || details?.segments?.[0]?.marketingCarrier || '';
    const flightNumber = details?.flightNumber || details?.segments?.[0]?.flightNumber || '';
    const departureDate = details?.departureDate || details?.segments?.[0]?.departureAt || '';
    const cabin = details?.cabin || 'economy';
    const hotelName = details?.name || details?.hotelName || '';
    const checkIn = details?.checkIn || details?.check_in || '';
    const checkOut = details?.checkOut || details?.check_out || '';

    try {
      await confirmBooking(bookingId);
      setPendingBooking(null);
      setPendingBookingId(null);
      await loadWallet();
      router.push({
        pathname: '/booking-success',
        params: {
          bookingId,
          type: bookingType,
          totalPrice: String(totalPrice),
          currency,
          // Flight details
          origin,
          destination,
          airline,
          flightNumber,
          departureDate,
          cabin,
          // Hotel details
          hotelName,
          checkIn,
          checkOut,
        },
      } as never);
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

  void currentSession;

  // Badge counts
  const flightActiveCount = Object.values(flightFilters).filter((v) => v !== undefined).length;
  const hotelActiveCount =
    (hotelFilters.maxPrice !== undefined ? 1 : 0) +
    (hotelFilters.stars !== undefined ? 1 : 0) +
    (hotelFilters.amenities?.length ?? 0) +
    (hotelFilters.sortBy !== undefined ? 1 : 0);

  // ── Skeleton loading state ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.skeletonWrap}>
          <SkeletonChatMessage />
          <View style={styles.skeletonUserRow}>
            <View style={styles.skeletonUserBubble} />
          </View>
          <SkeletonChatMessage />
        </View>
      </KeyboardAvoidingView>
    );
  }

  const showPostSuggestions =
    safeMessages.length > 0 &&
    !isStreaming &&
    safeMessages[safeMessages.length - 1]?.role === 'assistant';

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

      {displayMessages.length === 0 ? (
        <EmptyState
          onSelectSuggestion={(suggestion) => {
            void handleSend(suggestion);
          }}
        />
      ) : (
        <FlatList
          ref={flatListRef}
          data={displayMessages}
          keyExtractor={(item) => item.id}
          extraData={displayMessages}
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

      {/* Context suggestions shown after AI replies */}
      {showPostSuggestions && (
        <PostMessageSuggestions
          onSelect={(suggestion) => {
            void handleSend(suggestion);
          }}
        />
      )}

      <ChatInput
        ref={chatInputRef}
        onSend={handleSend}
        disabled={isStreaming}
        initialMessage={initialMessage}
      />

      {pendingBooking && (
        <BookingConfirmModal
          visible={!!pendingBooking}
          booking={pendingBooking}
          walletBalance={balance}
          walletCurrency={walletCurrency}
          onConfirm={handleConfirmBooking}
          onCancel={() => { setPendingBooking(null); setPendingBookingId(null); }}
          isWalletLoading={isWalletLoading}
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

      {/* Chat history bottom sheet */}
      <ChatHistorySheet
        visible={historyVisible}
        currentSessionId={sessionId}
        onClose={() => setHistoryVisible(false)}
        onSelectSession={(id) => {
          router.replace((`/chat/${id}`) as never);
        }}
        onNewChat={() => {
          // navigation already handled inside ChatHistorySheet via onSelectSession
        }}
      />
    </KeyboardAvoidingView>
  );
}

const chatHeaderStyles = StyleSheet.create({
  // History button (left side)
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  historyBtnText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.primary,
  },
  // Right side group
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  // New chat button
  newChatBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryMuted,
    borderWidth: 1,
    borderColor: `${Colors.primary}50`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Profile button
  profileBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Menu (•••) button
  menuBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
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
  // Skeleton loading state
  skeletonWrap: {
    flex: 1,
    paddingTop: 20,
  },
  skeletonUserRow: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  skeletonUserBubble: {
    width: '55%',
    height: 44,
    borderRadius: 18,
    backgroundColor: `${Colors.primary}33`,
  },
});
