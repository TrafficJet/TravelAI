import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
  Platform,
  TextInput,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Colors } from '../constants/colors';
import { Typography } from '../constants/typography';
import { useTheme } from '../src/theme/ThemeContext';
import { toast } from '../lib/toast';
import i18n from '../src/i18n';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';

const SETTINGS_KEY = 'user_settings';

type ThemeOption = 'light' | 'dark' | 'system';
type LanguageOption = 'ru' | 'en';

interface UserSettings {
  notifPrices: boolean;
  notifBookings: boolean;
  notifSystem: boolean;
  theme: ThemeOption;
  language: LanguageOption;
}

interface UserPreferences {
  theme: ThemeOption;
  language: LanguageOption;
  notifications: {
    priceAlerts: boolean;
    bookings: boolean;
    system: boolean;
  };
}

interface PreferencesResponse {
  preferences: UserPreferences;
}

const DEFAULT_SETTINGS: UserSettings = {
  notifPrices: true,
  notifBookings: true,
  notifSystem: true,
  theme: 'system',
  language: 'ru',
};

function prefsToSettings(prefs: UserPreferences): UserSettings {
  return {
    notifPrices: prefs.notifications.priceAlerts,
    notifBookings: prefs.notifications.bookings,
    notifSystem: prefs.notifications.system,
    theme: prefs.theme,
    language: prefs.language,
  };
}

function settingsToPrefsPayload(s: UserSettings): Record<string, unknown> {
  return {
    theme: s.theme,
    language: s.language,
    notifications: {
      priceAlerts: s.notifPrices,
      bookings: s.notifBookings,
      system: s.notifSystem,
    },
  };
}

// ── Android delete-account modal ──────────────────────────────────────────────

interface DeleteAccountModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: (password: string) => void;
}

function DeleteAccountModal({ visible, onCancel, onConfirm }: DeleteAccountModalProps) {
  const { colors } = useTheme();
  const [password, setPassword] = useState('');

  function handleConfirm() {
    const trimmed = password.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
    setPassword('');
  }

  function handleCancel() {
    setPassword('');
    onCancel();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.container, { backgroundColor: colors.card }]}>
          <Text style={[modalStyles.title, { color: colors.text }]}>
            Удалить аккаунт
          </Text>
          <Text style={[modalStyles.subtitle, { color: colors.textSecondary }]}>
            Введите пароль для подтверждения. Это действие нельзя отменить.
          </Text>
          <TextInput
            style={[
              modalStyles.input,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            placeholder="Пароль"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            autoFocus
          />
          <View style={modalStyles.buttons}>
            <TouchableOpacity
              style={[modalStyles.btn, { borderColor: colors.border }]}
              onPress={handleCancel}
              activeOpacity={0.7}
            >
              <Text style={[modalStyles.btnText, { color: colors.text }]}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalStyles.btn, modalStyles.btnDanger]}
              onPress={handleConfirm}
              activeOpacity={0.7}
            >
              <Text style={[modalStyles.btnText, { color: Colors.textInverse }]}>Удалить</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    borderRadius: 16,
    padding: 24,
  },
  title: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
    marginBottom: 16,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: Typography.sizes.base,
    marginBottom: 20,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  btnDanger: {
    backgroundColor: Colors.error,
    borderColor: Colors.error,
  },
  btnText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const { colors, setTheme: applyTheme } = useTheme();
  const logout = useAuthStore((s) => s.logout);

  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Debounce timer ref for PATCH
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load preferences on mount ─────────────────────────────────────────────

  useEffect(() => {
    async function loadPreferences() {
      // Try to get from AsyncStorage as fallback first
      let fallback: UserSettings = DEFAULT_SETTINGS;
      try {
        const raw = await AsyncStorage.getItem(SETTINGS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<UserSettings>;
          fallback = { ...DEFAULT_SETTINGS, ...parsed };
        }
      } catch {
        // ignore
      }

      try {
        const { data } = await api.get<PreferencesResponse>('/api/users/me/preferences');
        const loaded = prefsToSettings(data.preferences);
        setSettings(loaded);
        // Keep AsyncStorage in sync
        await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(loaded));
      } catch {
        // Offline or error — use fallback
        setSettings(fallback);
      } finally {
        setIsLoaded(true);
      }
    }
    loadPreferences();
  }, []);

  // ── Save with debounce ────────────────────────────────────────────────────

  const debouncedPatch = useCallback((updated: UserSettings) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(async () => {
      try {
        await api.patch('/users/me/preferences', settingsToPrefsPayload(updated));
        await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      } catch {
        // Offline — AsyncStorage already updated below in handleChange
      }
    }, 500);
  }, []);

  function handleChange(updated: UserSettings) {
    setSettings(updated);
    // Always write to AsyncStorage immediately for offline fallback
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated)).catch(() => {});
    debouncedPatch(updated);
  }

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleNotifChange(
    key: keyof Pick<UserSettings, 'notifPrices' | 'notifBookings' | 'notifSystem'>,
  ) {
    return (value: boolean) => {
      handleChange({ ...settings, [key]: value });
    };
  }

  function handleThemeSelect(theme: ThemeOption) {
    handleChange({ ...settings, theme });
    applyTheme(theme);
    const labels: Record<ThemeOption, string> = {
      light: 'Светлая тема',
      dark: 'Тёмная тема',
      system: 'Тема по умолчанию системы',
    };
    toast.info(labels[theme]);
  }

  async function handleLanguageSelect(lang: LanguageOption) {
    handleChange({ ...settings, language: lang });
    try {
      await i18n.changeLanguage(lang);
      toast.success(lang === 'ru' ? 'Язык изменён на русский' : 'Language changed to English');
    } catch {
      // non-fatal
    }
  }

  // ── Delete account ────────────────────────────────────────────────────────

  async function performDeleteAccount(password: string) {
    setIsDeleting(true);
    try {
      await api.delete('/users/me', { data: { password } });
      // Success — clear everything and go to login
      await logout();
      router.replace('/(auth)/login');
    } catch (err: unknown) {
      const status =
        err !== null &&
        typeof err === 'object' &&
        'response' in err &&
        err.response !== null &&
        typeof err.response === 'object' &&
        'status' in err.response
          ? (err.response as { status: number }).status
          : 0;

      if (status === 401 || status === 403) {
        toast.error('Неверный пароль');
      } else {
        toast.error('Не удалось удалить аккаунт. Попробуйте позже.');
      }
    } finally {
      setIsDeleting(false);
    }
  }

  function handleDeleteAccount() {
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Удалить аккаунт',
        'Введите пароль для подтверждения. Это действие нельзя отменить.',
        [
          { text: 'Отмена', style: 'cancel' },
          {
            text: 'Удалить',
            style: 'destructive',
            onPress: (password?: string) => {
              if (password && password.trim()) {
                performDeleteAccount(password.trim());
              }
            },
          },
        ],
        'secure-text',
      );
    } else {
      setShowDeleteModal(true);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (!isLoaded) return null;

  const themeOptions: { value: ThemeOption; label: string }[] = [
    { value: 'light', label: 'Светлая' },
    { value: 'dark', label: 'Тёмная' },
    { value: 'system', label: 'Авто' },
  ];

  const langOptions: { value: LanguageOption; label: string }[] = [
    { value: 'ru', label: 'Русский' },
    { value: 'en', label: 'English' },
  ];

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        {/* Header */}
        <View style={styles.pageHeader}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Text style={[styles.backBtnText, { color: colors.primary }]}>{'← Назад'}</Text>
          </TouchableOpacity>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Настройки</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        {/* Notifications section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Уведомления
          </Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text style={[styles.switchTitle, { color: colors.text }]}>
                  Изменение цен
                </Text>
                <Text style={[styles.switchSubtitle, { color: colors.textSecondary }]}>
                  Снижение цен на рейсы и отели
                </Text>
              </View>
              <Switch
                value={settings.notifPrices}
                onValueChange={handleNotifChange('notifPrices')}
                trackColor={{ false: Colors.border, true: `${Colors.primary}80` }}
                thumbColor={settings.notifPrices ? Colors.primary : Colors.textMuted}
              />
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text style={[styles.switchTitle, { color: colors.text }]}>
                  Бронирования
                </Text>
                <Text style={[styles.switchSubtitle, { color: colors.textSecondary }]}>
                  Статус и изменения по броням
                </Text>
              </View>
              <Switch
                value={settings.notifBookings}
                onValueChange={handleNotifChange('notifBookings')}
                trackColor={{ false: Colors.border, true: `${Colors.primary}80` }}
                thumbColor={settings.notifBookings ? Colors.primary : Colors.textMuted}
              />
            </View>

            <View style={[styles.switchRow, styles.switchRowLast]}>
              <View style={styles.switchLabel}>
                <Text style={[styles.switchTitle, { color: colors.text }]}>
                  Системные
                </Text>
                <Text style={[styles.switchSubtitle, { color: colors.textSecondary }]}>
                  Обновления приложения и сервиса
                </Text>
              </View>
              <Switch
                value={settings.notifSystem}
                onValueChange={handleNotifChange('notifSystem')}
                trackColor={{ false: Colors.border, true: `${Colors.primary}80` }}
                thumbColor={settings.notifSystem ? Colors.primary : Colors.textMuted}
              />
            </View>
          </View>
        </View>

        {/* Interface section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Интерфейс
          </Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Theme */}
            <View
              style={[
                styles.optionGroup,
                styles.optionGroupBorder,
                { borderBottomColor: colors.border },
              ]}
            >
              <Text style={[styles.optionGroupLabel, { color: colors.text }]}>Тема</Text>
              <View style={styles.segmentRow}>
                {themeOptions.map((opt) => {
                  const isActive = settings.theme === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.segmentBtn,
                        { borderColor: colors.border, backgroundColor: colors.surface },
                        isActive && styles.segmentBtnActive,
                      ]}
                      onPress={() => handleThemeSelect(opt.value)}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.segmentBtnText,
                          { color: colors.textSecondary },
                          isActive && styles.segmentBtnTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Language */}
            <View style={styles.optionGroup}>
              <Text style={[styles.optionGroupLabel, { color: colors.text }]}>Язык</Text>
              <View style={styles.segmentRow}>
                {langOptions.map((opt) => {
                  const isActive = settings.language === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.segmentBtn,
                        { borderColor: colors.border, backgroundColor: colors.surface },
                        isActive && styles.segmentBtnActive,
                      ]}
                      onPress={() => handleLanguageSelect(opt.value)}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.segmentBtnText,
                          { color: colors.textSecondary },
                          isActive && styles.segmentBtnTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </View>

        {/* Account section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Аккаунт
          </Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.actionRow,
                styles.actionRowBorder,
                { borderBottomColor: colors.border },
              ]}
              onPress={() => router.push('/(auth)/forgot-password')}
              activeOpacity={0.7}
            >
              <Text style={[styles.actionRowText, { color: colors.text }]}>
                Сменить пароль
              </Text>
              <Text style={[styles.actionRowChevron, { color: colors.textSecondary }]}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionRow, isDeleting && styles.actionRowDisabled]}
              onPress={handleDeleteAccount}
              disabled={isDeleting}
              activeOpacity={0.7}
            >
              <Text style={[styles.actionRowText, styles.actionRowTextDanger]}>
                {isDeleting ? 'Удаление...' : 'Удалить аккаунт'}
              </Text>
              <Text style={[styles.actionRowChevron, { color: Colors.error }]}>›</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Android password modal */}
      {Platform.OS !== 'ios' && (
        <DeleteAccountModal
          visible={showDeleteModal}
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={(password) => {
            setShowDeleteModal(false);
            performDeleteAccount(password);
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 48,
    paddingTop: Platform.OS === 'android' ? 48 : 60,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  backBtn: {
    paddingVertical: 4,
    paddingRight: 12,
    minWidth: 80,
  },
  backBtnText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  pageTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  headerPlaceholder: {
    minWidth: 80,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  switchRowLast: {
    borderBottomWidth: 0,
  },
  switchLabel: {
    flex: 1,
    marginRight: 12,
  },
  switchTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
  switchSubtitle: {
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  optionGroup: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  optionGroupBorder: {
    borderBottomWidth: 1,
  },
  optionGroupLabel: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
    marginBottom: 12,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  segmentBtnText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  segmentBtnTextActive: {
    color: Colors.textInverse,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  actionRowBorder: {
    borderBottomWidth: 1,
  },
  actionRowDisabled: {
    opacity: 0.5,
  },
  actionRowText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
  actionRowTextDanger: {
    color: Colors.error,
  },
  actionRowChevron: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.regular,
    lineHeight: 24,
  },
});
