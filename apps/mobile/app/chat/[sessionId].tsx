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
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
import { toast } from '../../lib/toast';
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

const CONTEXT_SUGGESTIONS = [
  'Добавь трансфер из аэропорта',
  'Покажи отели дешевле',
  'Есть прямые рейсы?',
  'Нужен обратный билет',
  'Что взять с собой?',
  'Лучший район для отеля?',
];

function EmptyState() {
  return (
    <View style={emptyStyles.container}>
      <Ionicons name="airplane" size={64} color={Colors.primary} style={{ opacity: 0.25, marginBottom: 24 }} />
      <Text style={emptyStyles.title}>Куда летим?</Text>
      <Text style={emptyStyles.subtitle}>
        Напишите маршрут, даты и бюджет — {'\n'}я подберу рейсы, отели и трансфер
      </Text>
      <Text style={emptyStyles.hint}>
        Например: "Варшава → Барселона, 10-17 июня, 2 человека"
      </Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 32,
    paddingBottom: 16,
  },
  title: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: Typography.weights.bold,
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: 'Sora',
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.base,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
    marginBottom: 16,
  },
  hint: {
    color: Colors.primary,
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    opacity: 0.6,
    fontFamily: 'Inter',
    lineHeight: 20,
  },
});

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
  } = useChatStore();

  const { balance, currency: walletCurrency, load: loadWallet, isLoading: isWalletLoading } = useWalletStore();
  const { confirmBooking } = useBookingStore();
  const { streamMessage } = useSSE();
  const flatListRef = useRef<FlatList<Message & { _streaming?: boolean }>>(null);
  const chatInputRef = useRef<ChatInputHandle>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [pendingBookingId, setPendingBookingId] = React.useState<string | null>(null);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  // ── Swipe left → bookings ─────────────────────────────────────────────────
  const swipePanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && gestureState.dx < -30,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -60 && Math.abs(gestureState.dy) < 60) {
          router.push('/(tabs)/bookings');
        }
      },
    })
  ).current;

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
  }, [sessionId, sessions, currentSession, setCurrentSession, navigation, handleHeaderMenu, historyVisible]);

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
    const timer = setTimeout(() => {
      handleSend(initialMessage);
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

  async function handleSend(content: string) {
    if (!sessionId) {
      if (__DEV__) console.warn('[ChatScreen] handleSend blocked: no sessionId');
      return;
    }
    if (isStreaming) {
      if (__DEV__) console.warn('[ChatScreen] handleSend blocked: isStreaming=true — waiting for previous response to finish');
      return;
    }

    if (isOffline) {
      toast.warning('Нет соединения — сообщение отправлено в очередь');
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
    setReplyTo(null);
    setStreaming(true);

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
    <View {...swipePanResponder.panHandlers} style={{ flex: 1 }}>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Offline banner */}
      <OfflineBanner visible={isOffline} />

      {displayMessages.length === 0 ? (
        <EmptyState />
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
              onLongPress={(msg) => setReplyTo(msg)}
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
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
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
    </View>
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
  // Right side group (pill container)
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
    backgroundColor: Colors.elevated,
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginRight: 4,
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
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
