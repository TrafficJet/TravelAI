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
import { useAuthStore } from '../../stores/authStore';
import AuthModal from '../../components/auth/AuthModal';
import { useSSE } from '../../hooks/useSSE';
import { MessageBubble } from '../../components/chat/MessageBubble';
import { ChatInput, type ChatInputHandle } from '../../components/chat/ChatInput';
import { BookingConfirmModal } from '../../components/chat/BookingConfirmModal';
import { ChatHistorySheet } from '../../components/chat/ChatHistorySheet';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { SkeletonChatMessage } from '../../components/ui/Skeleton';
import { useTheme } from '../../src/theme/ThemeContext';
import { Typography } from '../../constants/typography';
import { analyticsService } from '../../src/services/analytics.service';
import { AnalyticsEvents } from '../../src/constants/analytics-events';
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
  const { colors } = useTheme();
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
      style={[bannerStyles.container, { backgroundColor: colors.error, transform: [{ translateY }] }]}
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
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    color: '#fff',
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
  const { colors } = useTheme();
  return (
    <View style={emptyStyles.container}>
      <Ionicons name="airplane" size={64} color={colors.primary} style={{ opacity: 0.25, marginBottom: 24 }} />
      <Text style={[emptyStyles.title, { color: colors.text }]}>Куда летим?</Text>
      <Text style={[emptyStyles.subtitle, { color: colors.textMuted }]}>
        Напишите маршрут, даты и бюджет — {'\n'}я подберу рейсы, отели и трансфер
      </Text>
      <Text style={[emptyStyles.hint, { color: colors.primary }]}>
        Например: "Варшава → Барселона, 10-17 июня, 2 человека"
      </Text>
    </View>
  );
}

// ── Post-message suggestions ──────────────────────────────────────────────────

function PostMessageSuggestions({ onSelect }: { onSelect: (text: string) => void }) {
  const { colors } = useTheme();
  return (
    <View style={[suggStyles.wrap, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={suggStyles.row}
      >
        {CONTEXT_SUGGESTIONS.map((s) => (
          <TouchableOpacity
            key={s}
            style={[suggStyles.chip, { backgroundColor: colors.card, borderColor: `${colors.primary}40` }]}
            onPress={() => onSelect(s)}
            activeOpacity={0.7}
          >
            <Text style={[suggStyles.chipText, { color: colors.primary }]}>{s}</Text>
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
  },
  row: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipText: {
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
    fontSize: 24,
    fontWeight: Typography.weights.bold,
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: 'Sora',
  },
  subtitle: {
    fontSize: Typography.sizes.base,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
    marginBottom: 16,
  },
  hint: {
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    opacity: 0.6,
    fontFamily: 'Inter',
    lineHeight: 20,
  },
});

// ── Guest welcome ─────────────────────────────────────────────────────────────

function GuestWelcomeState({ onSignIn }: { onSignIn: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={guestStyles.container}>
      <Ionicons name="airplane" size={64} color={colors.primary} style={{ opacity: 0.3, marginBottom: 24 }} />
      <Text style={[guestStyles.title, { color: colors.text }]}>Добро пожаловать в SVIT</Text>
      <Text style={[guestStyles.subtitle, { color: colors.textMuted }]}>
        AI-ассистент поможет подобрать рейсы, отели и трансфер.{'\n'}
        Войдите, чтобы начать планировать путешествие.
      </Text>
      <TouchableOpacity style={[guestStyles.btn, { backgroundColor: colors.primary }]} onPress={onSignIn} activeOpacity={0.8}>
        <Ionicons name="person-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
        <Text style={guestStyles.btnText}>Войти / Зарегистрироваться</Text>
      </TouchableOpacity>
    </View>
  );
}

const guestStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '700' as const,
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: 'Sora',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
    marginBottom: 28,
    fontFamily: 'Inter',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 14,
  },
  btnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600' as const,
    fontFamily: 'Inter',
  },
});

// ── Guest input banner ─────────────────────────────────────────────────────────

function GuestInputBanner({ onSignIn }: { onSignIn: () => void }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[guestBannerStyles.container, { borderTopColor: colors.border, backgroundColor: colors.surface }]}
      onPress={onSignIn}
      activeOpacity={0.85}
    >
      <Ionicons name="lock-closed-outline" size={16} color={colors.primary} style={{ marginRight: 8 }} />
      <Text style={[guestBannerStyles.text, { color: colors.primary }]}>Войдите чтобы общаться с AI-ассистентом</Text>
    </TouchableOpacity>
  );
}

const guestBannerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  text: {
    fontSize: 14,
    fontFamily: 'Inter',
    fontWeight: '500' as const,
  },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const { colors } = useTheme();
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

  const { isAuthenticated } = useAuthStore();
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [authReason, setAuthReason] = useState<'booking' | 'profile'>('profile');

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

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = state.isConnected === false && state.isInternetReachable === false;
      setIsOffline(offline);
    });
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
          text: 'Переименовать',
          onPress: () => {
            if (Platform.OS === 'ios') {
              Alert.prompt(
                'Переименовать чат',
                'Введите новое название',
                (newTitle) => {
                  if (newTitle?.trim()) {
                    updateSessionTitle(sessionId, newTitle.trim());
                    navigation.setOptions({ title: newTitle.trim() });
                  }
                },
                'plain-text',
                currentSession?.title ?? '',
              );
            } else {
              Alert.alert('Переименование', 'Откройте историю чатов для переименования.');
            }
          },
        },
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
  }, [sessionId, currentSession, deleteSession, loadMessages, updateSessionTitle, navigation]);

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
        color: colors.text,
      },
      headerLeft: () => (
        <TouchableOpacity
          style={chatHeaderStyles.historyBtn}
          onPress={() => setHistoryVisible(true)}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="time-outline" size={18} color={colors.primary} style={{ marginRight: 4 }} />
          <Text style={[chatHeaderStyles.historyBtnText, { color: colors.primary }]}>История</Text>
        </TouchableOpacity>
      ),
      headerRight: () => (
        <View style={chatHeaderStyles.rightGroup}>
          <TouchableOpacity
            style={chatHeaderStyles.profileBtn}
            onPress={() => {
              if (isAuthenticated) {
                router.push('/(tabs)/profile');
              } else {
                setAuthReason('profile');
                setAuthModalVisible(true);
              }
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="person-circle-outline" size={22} color={colors.textMuted} />
          </TouchableOpacity>
          <View style={chatHeaderStyles.divider} />
          <TouchableOpacity
            style={chatHeaderStyles.menuBtn}
            onPress={handleHeaderMenu}
            activeOpacity={0.7}
          >
            <Ionicons name="ellipsis-horizontal" size={22} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      ),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, sessions, currentSession, setCurrentSession, navigation, handleHeaderMenu, historyVisible, isAuthenticated, colors]);

  useEffect(() => {
    if (!sessionId) return;
    setStreaming(false);
    loadMessages(sessionId)
      .catch(() => {})
      .finally(() => setIsLoading(false));
    loadWallet().catch(() => {});
    analyticsService.page(AnalyticsEvents.NAVIGATION.SCREEN_VIEW, { name: 'Chat', sessionId });
  }, [sessionId, loadMessages, loadWallet, setStreaming]);

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
    analyticsService.track(AnalyticsEvents.CHAT.MESSAGE_SENT, { sessionId });
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
          onNeedsAuth: (_reason: string) => {
            commitStreamingMessage();
            setStreaming(false);
            setAuthReason('booking');
            setAuthModalVisible(true);
          },
        },
      );
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
    if (!isAuthenticated) {
      setAuthReason('booking');
      setAuthModalVisible(true);
      return;
    }
    if (!pendingBooking || !pendingBookingId) return;
    const bookingId = pendingBookingId;
    const bookingType = pendingBooking.type;
    const totalPrice = pendingBooking.totalPrice;
    const currency = pendingBooking.currency;

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

    analyticsService.track(AnalyticsEvents.BOOKING.STARTED, {
      bookingId,
      type: bookingType,
      totalPrice,
      currency,
    });

    try {
      await confirmBooking(bookingId);
      analyticsService.track(AnalyticsEvents.BOOKING.COMPLETED, {
        bookingId,
        type: bookingType,
        totalPrice,
        currency,
      });
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
          origin,
          destination,
          airline,
          flightNumber,
          departureDate,
          cabin,
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

  if (isLoading) {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.skeletonWrap}>
          <SkeletonChatMessage />
          <View style={styles.skeletonUserRow}>
            <View style={[styles.skeletonUserBubble, { backgroundColor: `${colors.primary}33` }]} />
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
      style={[styles.container, { backgroundColor: colors.background }]}
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
          onCancel={() => {
            analyticsService.track(AnalyticsEvents.BOOKING.CANCELLED, {
              bookingId: pendingBookingId,
            });
            setPendingBooking(null);
            setPendingBookingId(null);
          }}
          isWalletLoading={isWalletLoading}
        />
      )}

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

      <AuthModal
        visible={authModalVisible}
        onClose={() => setAuthModalVisible(false)}
        reason={authReason}
      />
    </KeyboardAvoidingView>
    </View>
  );
}

const chatHeaderStyles = StyleSheet.create({
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
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
    height: 36,
  },
  profileBtn: {
    width: 40,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    width: 4,
  },
  menuBtn: {
    width: 40,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messageList: {
    paddingVertical: 8,
  },
  listHeader: {
    height: 8,
  },
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
  },
});
