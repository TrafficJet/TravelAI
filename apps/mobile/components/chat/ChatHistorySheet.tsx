import React, {
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
  ActivityIndicator,
  Platform,
} from 'react-native';
// GestureHandlerRootView и Swipeable убраны — нативный модуль недоступен в Expo Go
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSearch, IconClose } from '../icons';
import { safeStorage } from '../../utils/safeStorage';
import { useChatStore } from '../../stores/chatStore';
import { TextPresets, Radius, Spacing } from '../../constants';
import { useTheme } from '../../src/theme/ThemeContext';
import type { ChatSession } from '../../types';

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Strip emoji and non-printable chars that render as [?] boxes on iOS */
function stripEmoji(str: string): string {
  return (str ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27FF}\u{1F300}-\u{1F9FF}]/gu, '')
    .replace(/[^\p{L}\p{N}\p{Z}\p{P}\-→]/gu, '')
    .trim() || 'Новый чат';
}

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
  const { colors } = useTheme();
  return (
    <View style={[searchStyles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={{ marginRight: 8 }}>
        <IconSearch size={18} color={colors.textMuted} />
      </View>
      <TextInput
        style={[searchStyles.input, { color: colors.text }]}
        value={value}
        onChangeText={onChangeText}
        placeholder="Поиск по чатам..."
        placeholderTextColor={colors.textMuted}
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
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: Radius.input,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
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
  const { colors } = useTheme();

  return (
    <View style={[itemStyles.outerWrap, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
      <TouchableOpacity
        onPress={() => {
          void Haptics.selectionAsync();
          onPress();
        }}
        onLongPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onRename(session);
        }}
        activeOpacity={0.85}
        style={[
          itemStyles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
          isActive && { backgroundColor: colors.elevated },
        ]}
      >
        <View style={[
          itemStyles.iconCircle,
          { backgroundColor: `${colors.primary}26` },
          isActive && { backgroundColor: `${colors.primary}30`, borderWidth: 1.5, borderColor: colors.primary },
        ]}>
          <Text style={{ fontSize: 20, color: colors.primary, lineHeight: 24  }}>{'✈'}</Text>
        </View>

        <View style={itemStyles.content}>
          <View style={itemStyles.titleRow}>
            {isPinned && (
              <Text style={{ fontSize: 11, color: colors.primary, lineHeight: 15, marginRight: 4  }}>{'•'}</Text>
            )}
            <Text style={[itemStyles.title, { color: colors.text }]} numberOfLines={1}>
              {stripEmoji(session.title)}
            </Text>
          </View>
          {session.lastMessage ? (() => {
            const clean = session.lastMessage
              .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27FF}\u{1F300}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/gu, '')
              .trim();
            return clean.length > 0 ? (
              <Text style={[itemStyles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
                {clean}
              </Text>
            ) : null;
          })() : null}
        </View>

        <View style={itemStyles.rightCol}>
          <View style={itemStyles.actions}>
            <TouchableOpacity
              onPress={onTogglePin}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 13, color: isPinned ? colors.primary : colors.textMuted, lineHeight: 16 }}>
                {isPinned ? '★' : '☆'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                onDelete();
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
              style={itemStyles.deleteBtn}
            >
              <IconClose size={14} color={colors.error} />
            </TouchableOpacity>
          </View>
          <Text style={[itemStyles.time, { color: colors.textMuted }]}>{formatItemTime(session.updatedAt)}</Text>
          {isActive && <View style={[itemStyles.activeDot, { backgroundColor: colors.primary }]} />}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const itemStyles = StyleSheet.create({
  outerWrap: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: Radius.card,
  },
  deleteBtn: {
    padding: 2,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.card,
    borderWidth: 1,
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 12,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
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
    lineHeight: 20,
    flex: 1,
  },
  subtitle: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '400' as const,
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
    fontSize: 11,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});

// ── Empty state inside sheet ───────────────────────────────────────────────────

function EmptyHistory() {
  const { colors } = useTheme();
  return (
    <View style={emptyStyles.container}>
      <Text style={{ fontSize: 44, color: colors.textMuted, lineHeight: 48, marginBottom: 4  }}>{'•'}</Text>
      <Text style={[emptyStyles.title, { color: colors.text }]}>Нет истории чатов</Text>
      <Text style={[emptyStyles.subtitle, { color: colors.textMuted }]}>
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
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Inter',
    fontSize: 14,
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
  const { colors } = useTheme();
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
      safeStorage.getItem('pinnedChats').then((val) => {
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
    await safeStorage.setItem('pinnedChats', JSON.stringify(newPinned));
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
      <View style={{ flex: 1 }}>
        <View style={[sheetStyles.container, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 8 }]}>
          {/* Drag handle */}
          <View style={[sheetStyles.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={sheetStyles.header}>
            <View style={{ width: 32 }} />
            <Text style={[sheetStyles.headerTitle, { color: colors.text }]}>История чатов</Text>
            <TouchableOpacity
              style={[sheetStyles.closeBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={onClose}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <IconClose size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* New chat button */}
          <TouchableOpacity
            style={[sheetStyles.newChatBtn, { shadowColor: colors.primary }, isCreating && sheetStyles.newChatBtnDisabled]}
            onPress={() => { void handleNewChat(); }}
            activeOpacity={0.85}
            disabled={isCreating}
          >
            <LinearGradient
              colors={['#E8A020', '#B87518']}
              style={sheetStyles.newChatGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isCreating ? (
                <ActivityIndicator color={colors.textInverse} size="small" />
              ) : (
                <>
                  <Text style={[sheetStyles.newChatIcon, { color: colors.textInverse }]}>+</Text>
                  <Text style={[sheetStyles.newChatText, { color: colors.textInverse }]}>Новый чат</Text>
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
                  <Text style={[sheetStyles.noResultsText, { color: colors.textMuted }]}>
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
              <View style={[renameStyles.dialog, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[renameStyles.title, { color: colors.text }]}>Переименовать чат</Text>
                <TextInput
                  style={[renameStyles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                  value={renameText}
                  onChangeText={setRenameText}
                  placeholder="Название чата"
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                  maxLength={100}
                />
                <View style={renameStyles.buttons}>
                  <TouchableOpacity
                    style={[renameStyles.cancelBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => setRenameSession(null)}
                    activeOpacity={0.7}
                  >
                    <Text style={[renameStyles.cancelText, { color: colors.textMuted }]}>Отмена</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[renameStyles.saveBtn, { backgroundColor: colors.primary }]}
                    onPress={() => {
                      if (renameText.trim() && renameSession) {
                        updateSessionTitle(renameSession.id, renameText.trim());
                      }
                      setRenameSession(null);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[renameStyles.saveText, { color: colors.textInverse }]}>Сохранить</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </View>
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
    borderRadius: 16,
    padding: 24,
    width: '100%',
    gap: 16,
    borderWidth: 1,
  },
  title: {
    fontFamily: 'Sora',
    fontSize: 18,
    fontWeight: '600' as const,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
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
    borderWidth: 1,
  },
  cancelText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '500' as const,
  },
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600' as const,
  },
});

const sheetStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
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
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Sora',
    fontSize: 20,
    fontWeight: '600' as const,
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newChatBtn: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: Radius.button,
    overflow: 'hidden',
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
    lineHeight: Platform.select({ ios: 26, android: 24, default: 26 }),
  },
  newChatText: {
    fontFamily: 'Sora',
    fontSize: 16,
    fontWeight: '600' as const,
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
    textAlign: 'center',
  },
});
