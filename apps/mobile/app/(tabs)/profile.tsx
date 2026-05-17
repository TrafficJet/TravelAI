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

// ── Booking data field type ───────────────────────────────────────────────────

interface BookingData {
  phone: string;
  dateOfBirth: string;
  nationality: string;
  passportNumber: string;
  passportExpiry: string;
  emergencyName: string;
  emergencyPhone: string;
}

const EMPTY_BOOKING_DATA: BookingData = {
  phone: '',
  dateOfBirth: '',
  nationality: '',
  passportNumber: '',
  passportExpiry: '',
  emergencyName: '',
  emergencyPhone: '',
};

// ── AsyncStorage keys for notification prefs ──────────────────────────────────
const NOTIF_BOOKINGS_KEY = 'notif_bookings';
const NOTIF_PRICES_KEY = 'notif_prices';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Deterministic colour from a string — same input always yields same colour. */
function hashColor(str: string): string {
  const palette = [
    '#F59E0B',
    '#14B8A6',
    '#10B981',
    '#F97316',
    '#B45309',
    '#0F766E',
    '#FCD34D',
    '#5EEAD4',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) & 0x7fffffff;
  }
  return palette[hash % palette.length];
}

function maskPassport(value: string): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (trimmed.length <= 4) return trimmed;
  const visible = trimmed.slice(-4);
  const masked = '•'.repeat(trimmed.length - 4);
  return masked + visible;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ name, size = 96 }: { name?: string; size?: number }) {
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
    <View
      style={[
        avatarStyles.container,
        {
          backgroundColor: bgColor,
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Text style={[avatarStyles.initials, { fontSize: size * 0.35 }]}>{initials}</Text>
    </View>
  );
}

const avatarStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  initials: {
    color: Colors.textInverse,
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
          <View style={modalStyles.header}>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Text style={modalStyles.cancelBtn}>Отмена</Text>
            </TouchableOpacity>
            <Text style={modalStyles.title}>Редактировать профиль</Text>
            <View style={modalStyles.headerPlaceholder} />
          </View>

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
    borderRadius: Radius.button,
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

// ── BookingData modal ─────────────────────────────────────────────────────────

interface BookingDataModalProps {
  visible: boolean;
  initial: BookingData;
  onClose: () => void;
  onSaved: (data: BookingData) => void;
}

function BookingDataModal({ visible, initial, onClose, onSaved }: BookingDataModalProps) {
  const [form, setForm] = useState<BookingData>(initial);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) setForm(initial);
  }, [visible, initial]);

  function field(key: keyof BookingData) {
    return (v: string) => setForm((prev) => ({ ...prev, [key]: v }));
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const payload: Partial<BookingData> = {
        phone: form.phone.trim() || undefined,
        dateOfBirth: form.dateOfBirth.trim() || undefined,
        nationality: form.nationality.trim() || undefined,
        passportNumber: form.passportNumber.trim() || undefined,
        passportExpiry: form.passportExpiry.trim() || undefined,
        emergencyName: form.emergencyName.trim() || undefined,
        emergencyPhone: form.emergencyPhone.trim() || undefined,
      };
      await api.patch('/users/me', payload);
      onSaved(form);
      onClose();
      toast.success('Данные сохранены');
    } catch {
      Alert.alert('Ошибка', 'Не удалось сохранить данные. Попробуйте снова.');
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
        style={bmStyles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={bmStyles.container}>
          {/* Header */}
          <View style={bmStyles.header}>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Text style={bmStyles.cancelBtn}>Отмена</Text>
            </TouchableOpacity>
            <Text style={bmStyles.title}>Данные для бронирования</Text>
            <View style={bmStyles.headerPlaceholder} />
          </View>

          <ScrollView
            style={bmStyles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Passport / personal */}
            <Text style={bmStyles.sectionLabel}>Личные данные</Text>

            <Text style={bmStyles.label}>Телефон</Text>
            <TextInput
              style={bmStyles.input}
              value={form.phone}
              onChangeText={field('phone')}
              placeholder="+48 123 456 789"
              placeholderTextColor={Colors.textMuted}
              keyboardType="phone-pad"
              returnKeyType="next"
            />

            <Text style={[bmStyles.label, bmStyles.mt14]}>Дата рождения</Text>
            <TextInput
              style={bmStyles.input}
              value={form.dateOfBirth}
              onChangeText={field('dateOfBirth')}
              placeholder="ДД.ММ.ГГГГ"
              placeholderTextColor={Colors.textMuted}
              returnKeyType="next"
            />

            <Text style={[bmStyles.label, bmStyles.mt14]}>Гражданство</Text>
            <TextInput
              style={bmStyles.input}
              value={form.nationality}
              onChangeText={field('nationality')}
              placeholder="Польша / Украина / Россия"
              placeholderTextColor={Colors.textMuted}
              returnKeyType="next"
            />

            <Text style={[bmStyles.label, bmStyles.mt14]}>Номер паспорта</Text>
            <TextInput
              style={bmStyles.input}
              value={form.passportNumber}
              onChangeText={field('passportNumber')}
              placeholder="AB 1234567"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="characters"
              returnKeyType="next"
            />

            <Text style={[bmStyles.label, bmStyles.mt14]}>Срок действия паспорта</Text>
            <TextInput
              style={bmStyles.input}
              value={form.passportExpiry}
              onChangeText={field('passportExpiry')}
              placeholder="ДД.ММ.ГГГГ"
              placeholderTextColor={Colors.textMuted}
              returnKeyType="next"
            />

            {/* Divider */}
            <View style={bmStyles.dividerRow}>
              <View style={bmStyles.dividerLine} />
              <Text style={bmStyles.dividerText}>Экстренный контакт</Text>
              <View style={bmStyles.dividerLine} />
            </View>

            <Text style={bmStyles.label}>Имя контакта</Text>
            <TextInput
              style={bmStyles.input}
              value={form.emergencyName}
              onChangeText={field('emergencyName')}
              placeholder="Иван Петров"
              placeholderTextColor={Colors.textMuted}
              returnKeyType="next"
            />

            <Text style={[bmStyles.label, bmStyles.mt14]}>Телефон контакта</Text>
            <TextInput
              style={bmStyles.input}
              value={form.emergencyPhone}
              onChangeText={field('emergencyPhone')}
              placeholder="+48 987 654 321"
              placeholderTextColor={Colors.textMuted}
              keyboardType="phone-pad"
              returnKeyType="done"
            />

            <View style={bmStyles.bottomPad} />
          </ScrollView>

          {/* Buttons */}
          <View style={bmStyles.btnRow}>
            <TouchableOpacity
              style={bmStyles.cancelPill}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={bmStyles.cancelPillText}>Отмена</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[bmStyles.savePill, isSaving && bmStyles.savePillDisabled]}
              onPress={handleSave}
              disabled={isSaving}
              activeOpacity={0.8}
            >
              {isSaving ? (
                <ActivityIndicator color={Colors.textInverse} size="small" />
              ) : (
                <Text style={bmStyles.savePillText}>Сохранить</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const bmStyles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
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
  headerPlaceholder: { width: 60 },
  scroll: { flex: 1 },
  sectionLabel: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    letterSpacing: Typography.letterSpacing.wider,
    textTransform: 'uppercase',
    marginBottom: Spacing.md,
  },
  label: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    letterSpacing: Typography.letterSpacing.wide,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  mt14: { marginTop: 14 },
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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    letterSpacing: Typography.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  bottomPad: { height: 16 },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cancelPill: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radius.button,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelPillText: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  savePill: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: Radius.button,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  savePillDisabled: { opacity: 0.6 },
  savePillText: {
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

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { user, logout, setUser } = useAuthStore();
  const { colors, isDark, setTheme } = useTheme();
  const { unreadCount } = useNotificationsContext();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isBookingModalVisible, setIsBookingModalVisible] = useState(false);

  // Notification prefs
  const [notifBookings, setNotifBookings] = useState(true);
  const [notifPrices, setNotifPrices] = useState(true);

  // Theme / language
  const [language, setLanguageState] = useState<'ru' | 'en'>('ru');

  // Booking data (read-only display; editing is done via modal)
  const [bookingData, setBookingData] = useState<BookingData>({
    phone: user?.phone ?? '',
    dateOfBirth: user?.dateOfBirth ?? '',
    nationality: user?.nationality ?? '',
    passportNumber: user?.passportNumber ?? '',
    passportExpiry: user?.passportExpiry ?? '',
    emergencyName: user?.emergencyName ?? '',
    emergencyPhone: user?.emergencyPhone ?? '',
  });

  // Load prefs + fresh booking data from server on mount
  useEffect(() => {
    async function loadAll() {
      try {
        const [b, p, lang] = await Promise.all([
          AsyncStorage.getItem(NOTIF_BOOKINGS_KEY),
          AsyncStorage.getItem(NOTIF_PRICES_KEY),
          AsyncStorage.getItem(LANGUAGE_KEY),
        ]);
        if (b !== null) setNotifBookings(b === 'true');
        if (p !== null) setNotifPrices(p === 'true');
        if (lang === 'ru' || lang === 'en') setLanguageState(lang);
      } catch {
        // non-fatal
      }

      try {
        const res = await api.get<{
          phone?: string;
          dateOfBirth?: string;
          nationality?: string;
          passportNumber?: string;
          passportExpiry?: string;
          emergencyName?: string;
          emergencyPhone?: string;
        }>('/users/me');
        const d = res.data;
        setBookingData({
          phone: d.phone ?? '',
          dateOfBirth: d.dateOfBirth ?? '',
          nationality: d.nationality ?? '',
          passportNumber: d.passportNumber ?? '',
          passportExpiry: d.passportExpiry ?? '',
          emergencyName: d.emergencyName ?? '',
          emergencyPhone: d.emergencyPhone ?? '',
        });
      } catch {
        // non-fatal — use data from auth store
      }
    }
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleNotifBookingsChange(value: boolean) {
    setNotifBookings(value);
    try {
      await AsyncStorage.setItem(NOTIF_BOOKINGS_KEY, String(value));
    } catch {
      // ignore
    }
  }

  async function handleNotifPricesChange(value: boolean) {
    setNotifPrices(value);
    try {
      await AsyncStorage.setItem(NOTIF_PRICES_KEY, String(value));
    } catch {
      // ignore
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

  function handleBookingDataSaved(data: BookingData) {
    setBookingData(data);
    if (user) {
      setUser({
        ...user,
        phone: data.phone || undefined,
        dateOfBirth: data.dateOfBirth || undefined,
        nationality: data.nationality || undefined,
        passportNumber: data.passportNumber || undefined,
        passportExpiry: data.passportExpiry || undefined,
        emergencyName: data.emergencyName || undefined,
        emergencyPhone: data.emergencyPhone || undefined,
      });
    }
  }

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

  if (!user) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  const isPremium = user.subscription?.plan === 'PREMIUM';

  // ── render helpers ──────────────────────────────────────────────────────────

  function renderInfoRow(icon: string, label: string, value: string, isLast = false) {
    return (
      <View style={[styles.infoRow, isLast && styles.infoRowNoBorder]} key={label}>
        <View style={styles.infoRowLeft}>
          <Text style={styles.infoRowIcon}>{icon}</Text>
          <Text style={styles.infoLabel}>{label}</Text>
        </View>
        <Text style={value ? styles.infoValue : styles.infoValueMuted}>
          {value || 'Не указан'}
        </Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: Colors.background }]}
        contentContainerStyle={styles.content}
      >
        {/* ── Profile header ──────────────────────────────────────────── */}
        <View style={styles.avatarSection}>
          <Avatar name={user.name} size={96} />

          {/* Name + pencil */}
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.text }]}>{user.name}</Text>
            <TouchableOpacity
              style={styles.pencilBtn}
              onPress={() => setIsEditModalVisible(true)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.pencilIcon}>✏️</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.email, { color: colors.textSecondary }]}>{user.email}</Text>

          {/* Bell icon */}
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

          {/* Settings shortcut */}
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => router.push('/settings')}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={18} color={Colors.primary} />
            <Text style={styles.settingsBtnText}>Настройки</Text>
          </TouchableOpacity>
        </View>

        {/* ── Subscription block ──────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Подписка</Text>
          {isPremium ? (
            <View style={[styles.card, styles.cardPremium]}>
              <View style={styles.subscriptionRow}>
                <View>
                  <Text style={styles.planNamePremium}>
                    {PLAN_LABELS['PREMIUM']}
                  </Text>
                  {user.subscription?.expiresAt && (
                    <Text style={styles.planExpiry}>
                      до {formatDate(user.subscription.expiresAt)}
                    </Text>
                  )}
                </View>
                <View style={styles.planBadgePremium}>
                  <Text style={styles.planBadgeTextPremium}>PREMIUM</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: Colors.card, borderColor: Colors.border }]}>
              <View style={styles.subscriptionRow}>
                <View>
                  <Text style={styles.planNameFree}>{PLAN_LABELS['FREE']}</Text>
                  <Text style={styles.planFreeSub}>Базовый доступ</Text>
                </View>
                <View style={styles.planBadgeFree}>
                  <Text style={styles.planBadgeTextFree}>FREE</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.upgradeBtn}
                onPress={() => {
                  try {
                    router.push('/subscription/plans' as any);
                  } catch {
                    Alert.alert('Скоро', 'Управление подпиской будет доступно в следующем обновлении.');
                  }
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.upgradeBtnText}>Upgrade to Premium</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Account info block ──────────────────────────────────────── */}
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

        {/* ── Booking data section (read-only) ────────────────────────── */}
        <View style={styles.section}>
          {/* Section header row */}
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <Text style={styles.sectionTitleWithIcon}>Данные для бронирования</Text>
              <Text style={styles.sectionSubtitle}>
                Заполните один раз — используем при каждом бронировании
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsBookingModalVisible(true)}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Text style={styles.editSectionBtn}>Редактировать</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            {renderInfoRow('📞', 'Телефон', bookingData.phone)}
            {renderInfoRow('🎂', 'Дата рождения', bookingData.dateOfBirth)}
            {renderInfoRow('🌍', 'Гражданство', bookingData.nationality)}
            {renderInfoRow(
              '🛂',
              'Номер паспорта',
              bookingData.passportNumber ? maskPassport(bookingData.passportNumber) : '',
            )}
            {renderInfoRow('📅', 'Срок действия паспорта', bookingData.passportExpiry, true)}
          </View>
        </View>

        {/* ── Emergency contact section ────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <Text style={styles.sectionTitleWithIcon}>Экстренный контакт</Text>
              <Text style={styles.sectionSubtitle}>На случай непредвиденных ситуаций</Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsBookingModalVisible(true)}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Text style={styles.editSectionBtn}>Редактировать</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            {renderInfoRow('👤', 'Имя контакта', bookingData.emergencyName)}
            {renderInfoRow('📞', 'Телефон контакта', bookingData.emergencyPhone, true)}
          </View>
        </View>

        {/* ── Settings section ────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Настройки</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
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

        {/* ── Notifications section ────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Уведомления</Text>
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text style={styles.switchTitle}>Уведомления о бронированиях</Text>
                <Text style={styles.switchSubtitle}>Статус и изменения по броням</Text>
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
                <Text style={styles.switchSubtitle}>Снижение цен на рейсы и отели</Text>
              </View>
              <Switch
                value={notifPrices}
                onValueChange={handleNotifPricesChange}
                trackColor={{ false: Colors.border, true: `${Colors.primary}80` }}
                thumbColor={notifPrices ? Colors.primary : Colors.textMuted}
              />
            </View>
          </View>

          {/* Price Alerts shortcut */}
          <TouchableOpacity
            style={styles.priceAlertsBtn}
            onPress={() => router.push('/price-alerts' as any)}
            activeOpacity={0.8}
          >
            <View style={styles.priceAlertsBtnLeft}>
              <Text style={styles.priceAlertsBtnEmoji}>🔔</Text>
              <View>
                <Text style={styles.priceAlertsBtnTitle}>Ценовые алерты</Text>
                <Text style={styles.priceAlertsBtnSub}>Слежка за ценами на рейсы и отели</Text>
              </View>
            </View>
            <Text style={styles.priceAlertsBtnChevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── Logout ──────────────────────────────────────────────────── */}
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

        {/* ── About app ───────────────────────────────────────────────── */}
        <View style={styles.aboutSection}>
          <Text style={styles.aboutEmoji}>✈️</Text>
          <Text style={styles.aboutName}>TravelAI</Text>
          <Text style={styles.aboutVersion}>Версия 1.0.0</Text>
          <Text style={styles.aboutCopy}>Ваш AI-ассистент для путешествий</Text>
        </View>
      </ScrollView>

      {/* Edit name modal */}
      <EditProfileModal
        visible={isEditModalVisible}
        initialName={user.name}
        email={user.email}
        onClose={() => setIsEditModalVisible(false)}
        onSaved={handleProfileSaved}
      />

      {/* Booking data modal */}
      <BookingDataModal
        visible={isBookingModalVisible}
        initial={bookingData}
        onClose={() => setIsBookingModalVisible(false)}
        onSaved={handleBookingDataSaved}
      />
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 24,
    paddingBottom: 48,
  },

  // ── Avatar section ────────────────────────────────────────────────────────
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.xs,
  },
  name: {
    color: Colors.text,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
  },
  pencilBtn: {
    padding: 2,
  },
  pencilIcon: {
    fontSize: 16,
  },
  email: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
    marginBottom: 14,
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

  // ── Section ───────────────────────────────────────────────────────────────
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
    gap: 8,
  },
  sectionHeaderLeft: {
    flex: 1,
  },
  sectionTitleWithIcon: {
    color: Colors.text,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    marginBottom: 2,
  },
  sectionSubtitle: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    lineHeight: 16,
  },
  editSectionBtn: {
    color: Colors.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    paddingTop: 2,
  },

  // ── Card ──────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.card,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardPremium: {
    backgroundColor: Colors.successLight,
    borderColor: Colors.success,
  },

  // ── Subscription ──────────────────────────────────────────────────────────
  subscriptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  planNamePremium: {
    color: Colors.success,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  planNameFree: {
    color: Colors.text,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  planFreeSub: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
    marginTop: 2,
  },
  planExpiry: {
    color: Colors.success,
    fontSize: Typography.sizes.sm,
    marginTop: 2,
  },
  planBadgePremium: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.chip,
    backgroundColor: Colors.successLight,
    borderWidth: 1,
    borderColor: Colors.success,
  },
  planBadgeTextPremium: {
    color: Colors.success,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    letterSpacing: Typography.letterSpacing.wide,
  },
  planBadgeFree: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.chip,
    backgroundColor: `${Colors.textMuted}20`,
  },
  planBadgeTextFree: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    letterSpacing: Typography.letterSpacing.wide,
  },
  upgradeBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.button,
    alignItems: 'center',
  },
  upgradeBtnText: {
    color: Colors.textInverse,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },

  // ── Info rows ─────────────────────────────────────────────────────────────
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  infoRowIcon: {
    fontSize: 14,
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
    maxWidth: '55%',
    textAlign: 'right',
  },
  infoValueMuted: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
    fontStyle: 'italic',
    maxWidth: '55%',
    textAlign: 'right',
  },

  // ── Switch rows ───────────────────────────────────────────────────────────
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

  // ── Logout ────────────────────────────────────────────────────────────────
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

  // ── Language toggle ───────────────────────────────────────────────────────
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

  // ── About section ────────────────────────────────────────────────────────
  aboutSection: {
    alignItems: 'center',
    marginTop: Spacing.xl,
    paddingBottom: Spacing.md,
    gap: 4,
  },
  aboutEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  aboutName: {
    fontFamily: 'Sora',
    color: Colors.textMuted,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  aboutVersion: {
    color: Colors.textDisabled,
    fontSize: Typography.sizes.xs,
  },
  aboutCopy: {
    color: Colors.textDisabled,
    fontSize: Typography.sizes.xs,
    textAlign: 'center',
    marginTop: 2,
  },

  // ── Price Alerts button ───────────────────────────────────────────────────
  priceAlertsBtn: {
    marginTop: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: Radius.card,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  priceAlertsBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  priceAlertsBtnEmoji: {
    fontSize: 22,
  },
  priceAlertsBtnTitle: {
    color: Colors.text,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    marginBottom: 2,
  },
  priceAlertsBtnSub: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
  },
  priceAlertsBtnChevron: {
    color: Colors.primary,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    lineHeight: 24,
  },
});
