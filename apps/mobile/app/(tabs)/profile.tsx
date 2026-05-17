import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Switch,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Radius } from '../../constants/radius';
import { Spacing } from '../../constants/spacing';
import { useTheme } from '../../src/theme/ThemeContext';
import { useNotificationsContext } from '../../context/NotificationsContext';
import { toast } from '../../lib/toast';
import i18n from '../../src/i18n';
import api from '../../services/api';

const LANGUAGE_KEY = 'app_language';

// ── AsyncStorage keys for notification prefs ──────────────────────────────────
const NOTIF_BOOKINGS_KEY = 'notif_bookings';
const NOTIF_PRICES_KEY = 'notif_prices';

// ── Avatar ────────────────────────────────────────────────────────────────────

/** Deterministic colour from a string — same input always yields same colour. */
function hashColor(str: string): string {
  const palette = [
    '#6366F1', // indigo
    '#8B5CF6', // violet
    '#EC4899', // pink
    '#F59E0B', // amber
    '#10B981', // emerald
    '#06B6D4', // cyan
    '#F97316', // orange
    '#14B8A6', // teal
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) & 0x7fffffff;
  }
  return palette[hash % palette.length];
}

function Avatar({ name }: { name?: string }) {
  const safeName = name ?? '';
  const initials =
    safeName
      .split(' ')
      .map((w) => w[0] ?? '')
      .filter(Boolean)
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';

  const bgColor = safeName ? hashColor(safeName) : Colors.primary;

  return (
    <View style={[avatarStyles.container, { backgroundColor: bgColor }]}>
      <Text style={avatarStyles.initials}>{initials}</Text>
    </View>
  );
}

const avatarStyles = StyleSheet.create({
  container: {
    width: 88,
    height: 88,
    borderRadius: Radius.avatar,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  initials: {
    color: Colors.textInverse,
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
  },
});

// ── Edit profile modal ────────────────────────────────────────────────────────

interface EditProfileModalProps {
  visible: boolean;
  initialName: string;
  email: string;
  onClose: () => void;
  onSaved: (newName: string) => void;
}

function EditProfileModal({
  visible,
  initialName,
  email,
  onClose,
  onSaved,
}: EditProfileModalProps) {
  const [name, setName] = useState(initialName);
  const [isSaving, setIsSaving] = useState(false);

  // Reset field when modal opens with a new initialName
  useEffect(() => {
    if (visible) setName(initialName);
  }, [visible, initialName]);

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Ошибка', 'Имя не может быть пустым.');
      return;
    }
    setIsSaving(true);
    try {
      await api.patch('/users/me', { name: trimmed });
      onSaved(trimmed);
      onClose();
    } catch {
      Alert.alert('Ошибка', 'Не удалось сохранить. Попробуйте снова.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={modalStyles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={modalStyles.container}>
          {/* Header */}
          <View style={modalStyles.header}>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Text style={modalStyles.cancelBtn}>Отмена</Text>
            </TouchableOpacity>
            <Text style={modalStyles.title}>Редактировать профиль</Text>
            <View style={modalStyles.headerPlaceholder} />
          </View>

          {/* Fields */}
          <View style={modalStyles.body}>
            <Text style={modalStyles.label}>Имя</Text>
            <TextInput
              style={modalStyles.input}
              value={name}
              onChangeText={setName}
              placeholder="Ваше имя"
              placeholderTextColor={Colors.textMuted}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />

            <Text style={[modalStyles.label, modalStyles.mt20]}>Email</Text>
            <TextInput
              style={[modalStyles.input, modalStyles.inputDisabled]}
              value={email}
              editable={false}
              selectTextOnFocus={false}
            />
            <Text style={modalStyles.hint}>Email изменить нельзя.</Text>
          </View>

          {/* Save button */}
          <TouchableOpacity
            style={[modalStyles.saveBtn, isSaving && modalStyles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={modalStyles.saveBtnText}>Сохранить</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  cancelBtn: {
    color: Colors.primary,
    fontSize: Typography.sizes.md,
  },
  title: {
    color: Colors.text,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  headerPlaceholder: {
    width: 60,
  },
  body: {
    flex: 1,
  },
  label: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    letterSpacing: Typography.letterSpacing.wider,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  mt20: { marginTop: Spacing.md },
  input: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.input,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    color: Colors.text,
    fontSize: Typography.sizes.md,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  hint: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.xs,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: Radius.card,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: Colors.textInverse,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
});

// ── Plan labels ───────────────────────────────────────────────────────────────

const PLAN_LABELS: Record<string, string> = {
  FREE: 'Бесплатный',
  PREMIUM: 'Премиум',
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { user, logout, setUser } = useAuthStore();
  const { colors, isDark, setTheme } = useTheme();
  const { unreadCount } = useNotificationsContext();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);

  // Notification prefs
  const [notifBookings, setNotifBookings] = useState(true);
  const [notifPrices, setNotifPrices] = useState(true);

  // Theme / language
  const [language, setLanguageState] = useState<'ru' | 'en'>('ru');

  // Load prefs once on mount
  useEffect(() => {
    async function loadPrefs() {
      try {
        const [b, p, lang] = await Promise.all([
          AsyncStorage.getItem(NOTIF_BOOKINGS_KEY),
          AsyncStorage.getItem(NOTIF_PRICES_KEY),
          AsyncStorage.getItem(LANGUAGE_KEY),
        ]);
        // null means key never saved → keep default true
        if (b !== null) setNotifBookings(b === 'true');
        if (p !== null) setNotifPrices(p === 'true');
        if (lang === 'ru' || lang === 'en') setLanguageState(lang);
      } catch {
        // Read failure is non-fatal
      }
    }
    loadPrefs();
  }, []);

  async function handleNotifBookingsChange(value: boolean) {
    setNotifBookings(value);
    try {
      await AsyncStorage.setItem(NOTIF_BOOKINGS_KEY, String(value));
    } catch {
      // Ignore
    }
  }

  async function handleNotifPricesChange(value: boolean) {
    setNotifPrices(value);
    try {
      await AsyncStorage.setItem(NOTIF_PRICES_KEY, String(value));
    } catch {
      // Ignore
    }
  }

  function handleDarkModeChange(value: boolean) {
    setTheme(value ? 'dark' : 'light');
    toast.info(value ? 'Тёмная тема включена' : 'Светлая тема включена');
  }

  async function handleLanguageToggle() {
    const next: 'ru' | 'en' = language === 'ru' ? 'en' : 'ru';
    setLanguageState(next);
    try {
      await Promise.all([
        i18n.changeLanguage(next),
        AsyncStorage.setItem(LANGUAGE_KEY, next),
      ]);
      toast.success(next === 'ru' ? 'Язык изменён на русский' : 'Language changed to English');
    } catch {
      // non-fatal
    }
  }

  const handleProfileSaved = useCallback(
    (newName: string) => {
      if (user) {
        setUser({ ...user, name: newName });
      }
    },
    [user, setUser],
  );

  async function handleLogout() {
    Alert.alert('Выйти из аккаунта?', 'Вы уверены, что хотите выйти?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Выйти',
        style: 'destructive',
        onPress: async () => {
          setIsLoggingOut(true);
          try {
            await logout();
            router.replace('/(auth)/login');
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  }

  if (!user) return null;

  const isPremium = user.subscription?.plan === 'PREMIUM';

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        {/* Avatar + name */}
        <View style={styles.avatarSection}>
          <Avatar name={user.name} />
          <Text style={[styles.name, { color: colors.text }]}>{user.name}</Text>
          <Text style={[styles.email, { color: colors.textSecondary }]}>{user.email}</Text>

          {/* Edit profile button */}
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => setIsEditModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.editBtnText}>Редактировать профиль</Text>
          </TouchableOpacity>

          {/* Bell icon → notifications */}
          <TouchableOpacity
            style={styles.bellBtn}
            onPress={() => router.push('/(tabs)/notifications')}
            activeOpacity={0.7}
          >
            <View style={styles.bellIconWrap}>
              <Ionicons name="notifications-outline" size={22} color={Colors.primary} />
              {unreadCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>
                    {unreadCount > 99 ? '99+' : String(unreadCount)}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.bellBtnText}>Уведомления</Text>
          </TouchableOpacity>

          {/* Settings button */}
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => router.push('/settings')}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={18} color={Colors.primary} />
            <Text style={styles.settingsBtnText}>Настройки</Text>
          </TouchableOpacity>
        </View>

        {/* Subscription block */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Подписка</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.subscriptionRow}>
              <View>
                <Text style={styles.planName}>
                  {PLAN_LABELS[user.subscription?.plan ?? 'FREE']}
                </Text>
                {user.subscription?.expiresAt && (
                  <Text style={styles.planExpiry}>
                    до {formatDate(user.subscription.expiresAt)}
                  </Text>
                )}
              </View>
              <View
                style={[
                  styles.planBadge,
                  isPremium ? styles.planBadgePremium : styles.planBadgeFree,
                ]}
              >
                <Text
                  style={[
                    styles.planBadgeText,
                    isPremium
                      ? styles.planBadgeTextPremium
                      : styles.planBadgeTextFree,
                  ]}
                >
                  {isPremium ? 'PREMIUM' : 'FREE'}
                </Text>
              </View>
            </View>
            {!isPremium && (
              <TouchableOpacity
                style={styles.upgradeBtn}
                onPress={() => router.push('/subscription/plans')}
                activeOpacity={0.8}
              >
                <Text style={styles.upgradeBtnText}>Улучшить до Premium</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Account info block */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Данные аккаунта</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Имя</Text>
              <Text style={styles.infoValue}>{user.name}</Text>
            </View>
            <View style={[styles.infoRow, !user.phone && styles.infoRowNoBorder]}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user.email}</Text>
            </View>
            {user.phone && (
              <View style={[styles.infoRow, styles.infoRowNoBorder]}>
                <Text style={styles.infoLabel}>Телефон</Text>
                <Text style={styles.infoValue}>{user.phone}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Settings section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Настройки</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Dark mode */}
            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text style={[styles.switchTitle, { color: colors.text }]}>Тёмная тема</Text>
                <Text style={[styles.switchSubtitle, { color: colors.textSecondary }]}>
                  Переключить внешний вид приложения
                </Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={handleDarkModeChange}
                trackColor={{ false: Colors.border, true: `${Colors.primary}80` }}
                thumbColor={isDark ? Colors.primary : Colors.textMuted}
              />
            </View>

            {/* Language */}
            <View style={[styles.switchRow, styles.switchRowNoBorder]}>
              <View style={styles.switchLabel}>
                <Text style={[styles.switchTitle, { color: colors.text }]}>Язык</Text>
                <Text style={[styles.switchSubtitle, { color: colors.textSecondary }]}>
                  Язык интерфейса приложения
                </Text>
              </View>
              <TouchableOpacity
                style={styles.langToggle}
                onPress={handleLanguageToggle}
                activeOpacity={0.75}
              >
                <Text style={[styles.langOption, language === 'ru' && styles.langOptionActive]}>
                  RU
                </Text>
                <Text style={styles.langDivider}>|</Text>
                <Text style={[styles.langOption, language === 'en' && styles.langOptionActive]}>
                  EN
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Notifications section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Уведомления</Text>
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text style={styles.switchTitle}>Уведомления о бронированиях</Text>
                <Text style={styles.switchSubtitle}>
                  Статус и изменения по броням
                </Text>
              </View>
              <Switch
                value={notifBookings}
                onValueChange={handleNotifBookingsChange}
                trackColor={{ false: Colors.border, true: `${Colors.primary}80` }}
                thumbColor={notifBookings ? Colors.primary : Colors.textMuted}
              />
            </View>

            <View style={[styles.switchRow, styles.switchRowNoBorder]}>
              <View style={styles.switchLabel}>
                <Text style={styles.switchTitle}>Уведомления об изменении цен</Text>
                <Text style={styles.switchSubtitle}>
                  Снижение цен на рейсы и отели
                </Text>
              </View>
              <Switch
                value={notifPrices}
                onValueChange={handleNotifPricesChange}
                trackColor={{ false: Colors.border, true: `${Colors.primary}80` }}
                thumbColor={notifPrices ? Colors.primary : Colors.textMuted}
              />
            </View>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={[styles.logoutBtn, isLoggingOut && styles.logoutBtnDisabled]}
          onPress={handleLogout}
          disabled={isLoggingOut}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutText}>
            {isLoggingOut ? 'Выход...' : 'Выйти из аккаунта'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit modal */}
      <EditProfileModal
        visible={isEditModalVisible}
        initialName={user.name}
        email={user.email}
        onClose={() => setIsEditModalVisible(false)}
        onSaved={handleProfileSaved}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 24,
    paddingBottom: 48,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  name: {
    color: Colors.text,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.xs,
  },
  email: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
    marginBottom: 14,
  },
  editBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.chip,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  editBtnText: {
    color: Colors.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  bellBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: Spacing.xs,
  },
  bellIconWrap: {
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: Radius.badge,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    color: Colors.textInverse,
    fontSize: 9,
    fontWeight: Typography.weights.bold,
    lineHeight: 11,
  },
  bellBtnText: {
    color: Colors.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  settingsBtnText: {
    color: Colors.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    letterSpacing: Typography.letterSpacing.wider,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.card,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  subscriptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  planName: {
    color: Colors.text,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  planExpiry: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
    marginTop: 2,
  },
  planBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.chip,
  },
  planBadgePremium: {
    backgroundColor: Colors.primaryMuted,
  },
  planBadgeFree: {
    backgroundColor: `${Colors.textMuted}20`,
  },
  planBadgeText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    letterSpacing: Typography.letterSpacing.wide,
  },
  planBadgeTextPremium: {
    color: Colors.primary,
  },
  planBadgeTextFree: {
    color: Colors.textMuted,
  },
  upgradeBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  upgradeBtnText: {
    color: Colors.textInverse,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoRowNoBorder: {
    borderBottomWidth: 0,
  },
  infoLabel: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
  },
  infoValue: {
    color: Colors.text,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  // Notification switches
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  switchRowNoBorder: {
    borderBottomWidth: 0,
  },
  switchLabel: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  switchTitle: {
    color: Colors.text,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  switchSubtitle: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  logoutBtn: {
    marginTop: Spacing.sm,
    paddingVertical: 14,
    borderRadius: Radius.input,
    borderWidth: 1.5,
    borderColor: Colors.error,
    alignItems: 'center',
  },
  logoutBtnDisabled: {
    opacity: 0.5,
  },
  logoutText: {
    color: Colors.error,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  // Language toggle
  langToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  langOption: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  langOptionActive: {
    color: Colors.primary,
  },
  langDivider: {
    color: Colors.border,
    fontSize: Typography.sizes.sm,
  },
});
