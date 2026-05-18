import React, {
  useRef,
  useState,
  useMemo,
  useCallback,
  useEffect,
} from 'react';
import {
  Modal,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Animated,
  PanResponder,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useChatStore } from '../../stores/chatStore';
import { Colors, TextPresets, Radius, Spacing } from '../../constants';
import type { ChatSession } from '../../types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DELETE_BUTTON_WIDTH = 80;
const SWIPE_THRESHOLD = DELETE_BUTTON_WIDTH * 0.6;

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatItemTime(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const hours = diff / 3_600_000;
  if (hours < 24) {
    return new Date(dateStr).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  });
}

// ── Search bar ────────────────────────────────────────────────────────────────

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
}

function SearchBar({ value, onChangeText }: SearchBarProps) {
  return (
    <View style={searchStyles.container}>
      <Ionicons name="search-outline" size={16} color={Colors.textMuted} style={{ marginRight: 8 }} />
      <TextInput
        style={searchStyles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder="Поиск по чатам..."
        placeholderTextColor={Colors.textMuted}
        clearButtonMode="while-editing"
        returnKeyType="search"
      />
    </View>
  );
}

const searchStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: Radius.input,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    color: Colors.text,
    ...TextPresets.body,
    paddingVertical: 12,
  },
});

// ── Session item with swipe-to-delete ─────────────────────────────────────────

interface SessionItemProps {
  session: ChatSession;
  isActive: boolean;
  isPinned: boolean;
  onPress: () => void;
  onDelete: () => void;
  onRename: (session: ChatSession) => void;
  onTogglePin: () => void;
}

function SessionItem({ session, isActive, isPinned, onPress, onDelete, onRename, onTogglePin }: SessionItemProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 8 && Math.abs(gs.dy) < 20,
      onPanResponderGrant: () => {
        translateX.stopAnimation();
      },
      onPanResponderMove: (_, gs) => {
        const currentOffset = isOpen.current ? -DELETE_BUTTON_WIDTH : 0;
        const clamped = Math.max(-DELETE_BUTTON_WIDTH, Math.min(0, currentOffset + gs.dx));
        translateX.setValue(clamped);
      },
      onPanResponderRelease: (_, gs) => {
        const currentOffset = isOpen.current ? -DELETE_BUTTON_WIDTH : 0;
        const projected = currentOffset + gs.dx;

        if (projected < -SWIPE_THRESHOLD) {
          isOpen.current = true;
          Animated.spring(translateX, {
            toValue: -DELETE_BUTTON_WIDTH,
            useNativeDriver: true,
            damping: 18,
            stiffness: 200,
          }).start();
        } else {
          isOpen.current = false;
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            damping: 18,
            stiffness: 200,
          }).start();
        }
      },
    }),
  ).current;

  function handlePress() {
    if (isOpen.current) {
      isOpen.current = false;
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        damping: 18,
        stiffness: 200,
      }).start();
      return;
    }
    void Haptics.selectionAsync();
    onPress();
  }

  function handleDelete() {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    isOpen.current = false;
    Animated.timing(translateX, {
      toValue: -SCREEN_WIDTH,
      duration: 220,
      useNativeDriver: true,
    }).start(() => onDelete());
  }

  return (
    <View style={itemStyles.outerWrap}>
      {/* Delete button behind card */}
      <View style={itemStyles.deleteWrap}>
        <TouchableOpacity
          style={itemStyles.deleteBtn}
          onPress={handleDelete}
          activeOpacity={0.8}
        >
          <Ionicons name="trash-outline" size={20} color="#fff" />
          <Text style={itemStyles.deleteBtnText}>Удалить</Text>
        </TouchableOpacity>
      </View>

      {/* Card */}
      <Animated.View
        style={[
          itemStyles.cardAnimated,
          { transform: [{ translateX }] },
          isActive && itemStyles.cardActive,
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.85}
          style={itemStyles.card}
        >
          <View style={[itemStyles.iconCircle, isActive && itemStyles.iconCircleActive]}>
            <Ionicons name="airplane-outline" size={20} color={Colors.primary} />
          </View>

          <View style={itemStyles.content}>
            <View style={itemStyles.titleRow}>
              {isPinned && (
                <Ionicons name="pin" size={11} color={Colors.primary} style={{ marginRight: 4 }} />
              )}
              <Text style={itemStyles.title} numberOfLines={1}>
                {session.title}
              </Text>
            </View>
            {session.lastMessage ? (
              <Text style={itemStyles.subtitle} numberOfLines={1}>
                {session.lastMessage}
              </Text>
            ) : null}
          </View>

          <View style={itemStyles.rightCol}>
            <View style={itemStyles.actions}>
              <TouchableOpacity
                onPress={onTogglePin}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isPinned ? 'pin' : 'pin-outline'}
                  size={14}
                  color={isPinned ? Colors.primary : Colors.textMuted}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onRename(session)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <Ionicons name="pencil-outline" size={14} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={itemStyles.time}>{formatItemTime(session.updatedAt)}</Text>
            {isActive && <View style={itemStyles.activeDot} />}
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const itemStyles = StyleSheet.create({
  outerWrap: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: Radius.card,
    overflow: 'hidden',
    position: 'relative',
  },
  deleteWrap: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: DELETE_BUTTON_WIDTH,
    borderRadius: Radius.card,
    overflow: 'hidden',
  },
  deleteBtn: {
    flex: 1,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  deleteBtnText: {
    ...TextPresets.label,
    color: '#fff',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  cardAnimated: {
    borderRadius: Radius.card,
    backgroundColor: Colors.card,
  },
  cardActive: {
    backgroundColor: Colors.elevated,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 12,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconCircleActive: {
    backgroundColor: `${Colors.primary}30`,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    lineHeight: 20,
    flex: 1,
  },
  subtitle: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  rightCol: {
    alignItems: 'flex-end',
    gap: 4,
    flexShrink: 0,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  time: {
    ...TextPresets.label,
    color: Colors.textMuted,
    fontSize: 11,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.primary,
  },
});

// ── Empty state inside sheet ───────────────────────────────────────────────────

function EmptyHistory() {
  return (
    <View style={emptyStyles.container}>
      <Ionicons name="chatbubbles-outline" size={44} color={Colors.textMuted} style={{ marginBottom: 4 }} />
      <Text style={emptyStyles.title}>Нет истории чатов</Text>
      <Text style={emptyStyles.subtitle}>
        Начни новый чат, и он появится здесь
      </Text>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
    gap: 10,
  },
  title: {
    fontFamily: 'Sora',
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});

// ── Main ChatHistorySheet ──────────────────────────────────────────────────────

export interface ChatHistorySheetProps {
  visible: boolean;
  currentSessionId?: string;
  onClose: () => void;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
}

export function ChatHistorySheet({
  visible,
  currentSessionId,
  onClose,
  onSelectSession,
  onNewChat,
}: ChatHistorySheetProps) {
  const { sessions, deleteSession, createSession, updateSessionTitle } = useChatStore();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [renameSession, setRenameSession] = useState<ChatSession | null>(null);
  const [renameText, setRenameText] = useState('');

  // Load pinned chats when sheet opens
  useEffect(() => {
    if (visible) {
      AsyncStorage.getItem('pinnedChats').then((val) => {
        if (val) setPinnedIds(JSON.parse(val) as string[]);
      }).catch(() => {});
    }
  }, [visible]);

  const sortedSessions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = (sessions ?? []).filter((s) =>
      !q || s.title.toLowerCase().includes(q) || (s.lastMessage ?? '').toLowerCase().includes(q)
    );
    const pinned = list.filter((s) => pinnedIds.includes(s.id));
    const unpinned = list.filter((s) => !pinnedIds.includes(s.id));
    return [...pinned, ...unpinned];
  }, [sessions, searchQuery, pinnedIds]);

  async function handleSessionDelete(session: ChatSession) {
    try {
      await deleteSession(session.id);
    } catch {
      Alert.alert('Ошибка', 'Не удалось удалить чат. Попробуйте снова.');
    }
  }

  function handleRename(session: ChatSession) {
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Переименовать чат',
        'Введите новое название',
        (newTitle) => {
          if (newTitle?.trim()) updateSessionTitle(session.id, newTitle.trim());
        },
        'plain-text',
        session.title,
      );
    } else {
      setRenameText(session.title);
      setRenameSession(session);
    }
  }

  async function handleTogglePin(sessionId: string) {
    const newPinned = pinnedIds.includes(sessionId)
      ? pinnedIds.filter((id) => id !== sessionId)
      : [sessionId, ...pinnedIds];
    setPinnedIds(newPinned);
    await AsyncStorage.setItem('pinnedChats', JSON.stringify(newPinned));
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  const handleNewChat = useCallback(async () => {
    if (isCreating) return;
    setIsCreating(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const id = await createSession();
      onClose();
      onNewChat();
      onSelectSession(id);
    } catch {
      Alert.alert('Ошибка', 'Не удалось создать чат. Попробуйте снова.');
    } finally {
      setIsCreating(false);
    }
  }, [isCreating, createSession, onClose, onNewChat, onSelectSession]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[sheetStyles.container, { paddingBottom: insets.bottom + 8 }]}>
        {/* Drag handle */}
        <View style={sheetStyles.handle} />

        {/* Header */}
        <View style={sheetStyles.header}>
          <Text style={sheetStyles.headerTitle}>История чатов</Text>
          <TouchableOpacity
            style={sheetStyles.closeBtn}
            onPress={onClose}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* New chat button */}
        <TouchableOpacity
          style={[sheetStyles.newChatBtn, isCreating && sheetStyles.newChatBtnDisabled]}
          onPress={() => { void handleNewChat(); }}
          activeOpacity={0.85}
          disabled={isCreating}
        >
          <LinearGradient
            colors={['#F59E0B', '#D97706']}
            style={sheetStyles.newChatGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {isCreating ? (
              <ActivityIndicator color={Colors.textInverse} size="small" />
            ) : (
              <>
                <Text style={sheetStyles.newChatIcon}>+</Text>
                <Text style={sheetStyles.newChatText}>Новый чат</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Search */}
        {(sessions ?? []).length > 0 && (
          <SearchBar value={searchQuery} onChangeText={setSearchQuery} />
        )}

        {/* Sessions list */}
        <FlatList
          data={sortedSessions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SessionItem
              session={item}
              isActive={item.id === currentSessionId}
              isPinned={pinnedIds.includes(item.id)}
              onPress={() => {
                onClose();
                onSelectSession(item.id);
              }}
              onDelete={() => handleSessionDelete(item)}
              onRename={handleRename}
              onTogglePin={() => { void handleTogglePin(item.id); }}
            />
          )}
          ListEmptyComponent={
            searchQuery.trim() ? (
              <View style={sheetStyles.noResults}>
                <Text style={sheetStyles.noResultsText}>
                  По запросу "{searchQuery}" ничего не найдено
                </Text>
              </View>
            ) : (
              <EmptyHistory />
            )
          }
          contentContainerStyle={
            sortedSessions.length === 0
              ? sheetStyles.emptyList
              : sheetStyles.list
          }
          showsVerticalScrollIndicator={false}
        />

        {/* Rename Modal (Android) */}
        <Modal
          visible={renameSession !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setRenameSession(null)}
        >
          <View style={renameStyles.overlay}>
            <View style={renameStyles.dialog}>
              <Text style={renameStyles.title}>Переименовать чат</Text>
              <TextInput
                style={renameStyles.input}
                value={renameText}
                onChangeText={setRenameText}
                placeholder="Название чата"
                placeholderTextColor={Colors.textMuted}
                autoFocus
                maxLength={100}
              />
              <View style={renameStyles.buttons}>
                <TouchableOpacity
                  style={renameStyles.cancelBtn}
                  onPress={() => setRenameSession(null)}
                  activeOpacity={0.7}
                >
                  <Text style={renameStyles.cancelText}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={renameStyles.saveBtn}
                  onPress={() => {
                    if (renameText.trim() && renameSession) {
                      updateSessionTitle(renameSession.id, renameText.trim());
                    }
                    setRenameSession(null);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={renameStyles.saveText}>Сохранить</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const renameStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  dialog: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: {
    fontFamily: 'Sora',
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.text,
    fontFamily: 'Inter',
    fontSize: 15,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelText: {
    color: Colors.textMuted,
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '500' as const,
  },
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  saveText: {
    color: Colors.textInverse,
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600' as const,
  },
});

const sheetStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  headerTitle: {
    fontFamily: 'Sora',
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newChatBtn: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: Radius.button,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  newChatBtnDisabled: {
    opacity: 0.6,
  },
  newChatGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
    borderRadius: Radius.button,
  },
  newChatIcon: {
    fontFamily: 'Inter',
    fontSize: 22,
    fontWeight: '600' as const,
    color: Colors.textInverse,
    lineHeight: Platform.select({ ios: 26, android: 24, default: 26 }),
  },
  newChatText: {
    fontFamily: 'Sora',
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textInverse,
    letterSpacing: 0.2,
  },
  list: {
    paddingTop: 4,
    paddingBottom: Spacing.xl,
  },
  emptyList: {
    flexGrow: 1,
  },
  noResults: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 32,
  },
  noResultsText: {
    ...TextPresets.body,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
