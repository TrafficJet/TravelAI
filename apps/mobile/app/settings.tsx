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
  StatusBar,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { safeStorage as AsyncStorage } from '../utils/safeStorage';
import { router } from 'expo-router';
import { Typography } from '../constants/typography';
import { useTheme } from '../src/theme/ThemeContext';
import { toast } from '../lib/toast';
import i18n from '../src/i18n';
import { useAuthStore } from '../stores/authStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../services/api';

const SETTINGS_KEY = 'user_settings';
const APP_VERSION = '1.0.0';

type ThemeOption = 'light' | 'dark' | 'system';
type LanguageOption = 'ru' | 'en';

interface UserSettings {
  notifPrices: boolean;
  notifBookings: boolean;
  notifSystem: boolean;
  theme: ThemeOption;
  language: LanguageOption;
  biometrics: boolean;
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
  biometrics: false,
};

function prefsToSettings(prefs: UserPreferences): UserSettings {
  return {
    notifPrices: prefs.notifications.priceAlerts,
    notifBookings: prefs.notifications.bookings,
    notifSystem: prefs.notifications.system,
    theme: prefs.theme,
    language: prefs.language,
    biometrics: false,
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
      <View style={[modalStyles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[modalStyles.container, { backgroundColor: colors.card }]}>
          <Text style={[modalStyles.title, { color: colors.text }]}>Удалить аккаунт</Text>
          <Text style={[modalStyles.subtitle, { color: colors.textMuted }]}>
            Введите пароль для подтверждения. Это действие нельзя отменить.
          </Text>
          <TextInput
            style={[modalStyles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="Пароль"
            placeholderTextColor={colors.textMuted}
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
              style={[modalStyles.btn, modalStyles.btnDanger, { backgroundColor: colors.error, borderColor: colors.error }]}
              onPress={handleConfirm}
              activeOpacity={0.7}
            >
              <Text style={[modalStyles.btnText, { color: colors.textInverse }]}>Удалить</Text>
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
    fontFamily: 'Sora',
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
    marginBottom: 16,
  },
  input: {
    fontFamily: 'Inter',
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
    // background/border set via inline style
  },
  btnText: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
});

// ── Reusable row components ───────────────────────────────────────────────────

interface RowItem {
  icon: string;
  iconColor?: string;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  isLast?: boolean;
  disabled?: boolean;
  labelColor?: string;
}

function SettingsRow({
  icon,
  iconColor,
  label,
  sublabel,
  onPress,
  rightElement,
  isLast,
  disabled,
  labelColor,
}: RowItem) {
  const { colors } = useTheme();
  const resolvedIconColor = iconColor ?? colors.primary;
  return (
    <TouchableOpacity
      style={[
        rowStyles.row,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
        disabled && rowStyles.rowDisabled,
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={disabled || !onPress}
    >
      <View style={[rowStyles.iconWrap, { backgroundColor: `${resolvedIconColor}18` }]}>
        <Ionicons name={icon as any} size={18} color={resolvedIconColor} />
      </View>
      <View style={rowStyles.labelBlock}>
        <Text style={[rowStyles.label, { color: labelColor ?? colors.text }]}>
          {label}
        </Text>
        {sublabel ? (
          <Text style={[rowStyles.sublabel, { color: colors.textMuted }]}>{sublabel}</Text>
        ) : null}
      </View>
      <View style={rowStyles.right}>
        {rightElement ?? (
          onPress ? (
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          ) : null
        )}
      </View>
    </TouchableOpacity>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  rowDisabled: {
    opacity: 0.45,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  labelBlock: {
    flex: 1,
  },
  label: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
  sublabel: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xs,
    marginTop: 1,
  },
  right: {
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});

// ── Preset button group (Theme / Language) ────────────────────────────────────

interface PresetGroupProps<T extends string> {
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (v: T) => void;
}

function PresetGroup<T extends string>({ options, selected, onSelect }: PresetGroupProps<T>) {
  const { colors } = useTheme();
  return (
    <View style={presetStyles.row}>
      {options.map((opt, idx) => {
        const isActive = opt.value === selected;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[
              presetStyles.btn,
              { borderColor: colors.border, backgroundColor: colors.surface },
              idx < options.length - 1 && presetStyles.btnGap,
              isActive && { borderColor: colors.primary, backgroundColor: `${colors.primary}15` },
            ]}
            onPress={() => onSelect(opt.value)}
            activeOpacity={0.75}
          >
            <Text style={[
              presetStyles.btnText,
              { color: colors.textMuted },
              isActive && { color: colors.primary },
            ]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const presetStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  btn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  btnGap: {
    marginRight: 8,
  },
  btnText: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
});

// ── Section wrapper ───────────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  const { colors } = useTheme();
  return (
    <View style={sectionStyles.section}>
      <Text style={[sectionStyles.title, { color: colors.textMuted }]}>{title}</Text>
      <View style={[sectionStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>{children}</View>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  title: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    letterSpacing: Typography.letterSpacing.wider,
    textTransform: 'uppercase',
    marginBottom: 10,
    paddingHorizontal: 4,
    textAlign: 'center',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
});

// ── Option row inside a card (with inline label + preset group below) ─────────

interface OptionGroupRowProps<T extends string> {
  icon: string;
  iconColor?: string;
  label: string;
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (v: T) => void;
  isLast?: boolean;
}

function OptionGroupRow<T extends string>({
  icon,
  iconColor,
  label,
  options,
  selected,
  onSelect,
  isLast,
}: OptionGroupRowProps<T>) {
  const { colors } = useTheme();
  const resolvedIconColor = iconColor ?? colors.primary;
  return (
    <View style={[
      optGroupStyles.wrapper,
      !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    ]}>
      <View style={optGroupStyles.header}>
        <View style={[optGroupStyles.iconWrap, { backgroundColor: `${resolvedIconColor}18` }]}>
          <Ionicons name={icon as any} size={18} color={resolvedIconColor} />
        </View>
        <Text style={[optGroupStyles.label, { color: colors.text }]}>{label}</Text>
      </View>
      <View style={optGroupStyles.presetArea}>
        <PresetGroup options={options} selected={selected} onSelect={onSelect} />
      </View>
    </View>
  );
}

const optGroupStyles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingTop: 13,
    paddingBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  label: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
  presetArea: {
    paddingLeft: 46,
  },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const { setTheme: applyTheme, colors, isDark } = useTheme();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const insets = useSafeAreaInsets();

  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load preferences on mount ─────────────────────────────────────────────

  useEffect(() => {
    async function loadPreferences() {
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
        const { data } = await api.get<PreferencesResponse>('/users/me/preferences');
        const loaded = prefsToSettings(data.preferences);
        setSettings(loaded);
        await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(loaded));
      } catch {
        setSettings(fallback);
      } finally {
        setIsLoaded(true);
      }
    }
    loadPreferences();
  }, []);

  // ── Save with debounce ────────────────────────────────────────────────────

  const debouncedPatch = useCallback((updated: UserSettings) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        await api.patch('/users/me/preferences', settingsToPrefsPayload(updated));
        await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      } catch {
        // offline — AsyncStorage already written below
      }
    }, 500);
  }, []);

  function handleChange(updated: UserSettings) {
    setSettings(updated);
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated)).catch(() => {});
    debouncedPatch(updated);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleNotifChange(
    key: keyof Pick<UserSettings, 'notifPrices' | 'notifBookings' | 'notifSystem'>,
  ) {
    return (value: boolean) => handleChange({ ...settings, [key]: value });
  }

  function handleBiometricsToggle(value: boolean) {
    if (value) {
      Alert.alert(
        'Биометрическая аутентификация',
        'Войти в приложение по отпечатку пальца или Face ID?',
        [
          { text: 'Отмена', style: 'cancel' },
          {
            text: 'Включить',
            onPress: () => handleChange({ ...settings, biometrics: true }),
          },
        ],
      );
    } else {
      handleChange({ ...settings, biometrics: false });
      toast.info('Биометрия отключена');
    }
  }

  function handleThemeSelect(theme: ThemeOption) {
    handleChange({ ...settings, theme });
    applyTheme(theme);
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
              if (password && password.trim()) performDeleteAccount(password.trim());
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
    { value: 'dark', label: 'Тёмная' },
    { value: 'light', label: 'Светлая' },
    { value: 'system', label: 'Авто' },
  ];

  const langOptions: { value: LanguageOption; label: string }[] = [
    { value: 'ru', label: 'RU' },
    { value: 'en', label: 'EN' },
  ];

  return (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Custom header */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? 16 : insets.top + 4, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Настройки</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* APPEARANCE */}
        <Section title="Внешний вид">
          <OptionGroupRow
            icon="color-palette-outline"
            iconColor={colors.secondary}
            label="Тема"
            options={themeOptions}
            selected={settings.theme}
            onSelect={handleThemeSelect}
            isLast={false}
          />
          <OptionGroupRow
            icon="language-outline"
            iconColor={colors.info}
            label="Язык"
            options={langOptions}
            selected={settings.language}
            onSelect={handleLanguageSelect}
            isLast
          />
        </Section>

        {/* NOTIFICATIONS */}
        <Section title="Уведомления">
          <SettingsRow
            icon="pricetag-outline"
            iconColor={colors.primary}
            label="Изменение цен"
            sublabel="Снижение цен на рейсы и отели"
            rightElement={
              <Switch
                value={settings.notifPrices}
                onValueChange={handleNotifChange('notifPrices')}
                trackColor={{ false: colors.border, true: `${colors.primary}80` }}
                thumbColor={settings.notifPrices ? colors.primary : colors.textMuted}
              />
            }
          />
          <SettingsRow
            icon="airplane-outline"
            iconColor={colors.secondary}
            label="Бронирования"
            sublabel="Статус и изменения по броням"
            rightElement={
              <Switch
                value={settings.notifBookings}
                onValueChange={handleNotifChange('notifBookings')}
                trackColor={{ false: colors.border, true: `${colors.primary}80` }}
                thumbColor={settings.notifBookings ? colors.primary : colors.textMuted}
              />
            }
          />
          <SettingsRow
            icon="notifications-outline"
            iconColor={colors.textMuted}
            label="Системные"
            sublabel="Обновления приложения и сервиса"
            isLast
            rightElement={
              <Switch
                value={settings.notifSystem}
                onValueChange={handleNotifChange('notifSystem')}
                trackColor={{ false: colors.border, true: `${colors.primary}80` }}
                thumbColor={settings.notifSystem ? colors.primary : colors.textMuted}
              />
            }
          />
        </Section>

        {/* SECURITY */}
        <Section title="Безопасность">
          <SettingsRow
            icon="lock-closed-outline"
            iconColor={colors.warning}
            label="Изменить пароль"
            sublabel="Обновите пароль аккаунта"
            onPress={() => {
              Alert.alert(
                'Смена пароля',
                'Письмо с ссылкой для сброса пароля будет отправлено на ваш email.',
                [
                  { text: 'Отмена', style: 'cancel' },
                  {
                    text: 'Отправить',
                    onPress: async () => {
                      try {
                        const email = user?.email;
                        if (!email) {
                          toast.error('Email не найден');
                          return;
                        }
                        await api.post('/auth/forgot-password', { email });
                        toast.success('Письмо отправлено на ' + email);
                      } catch (err) {
                        const msg = err instanceof Error ? err.message : 'Ошибка';
                        toast.error('Не удалось отправить письмо: ' + msg);
                      }
                    },
                  },
                ],
              );
            }}
          />
          <SettingsRow
            icon="finger-print-outline"
            iconColor={colors.secondary}
            label="Биометрия"
            sublabel={Platform.OS === 'ios' ? 'Face ID / Touch ID' : 'Отпечаток пальца'}
            rightElement={
              <Switch
                value={settings.biometrics}
                onValueChange={handleBiometricsToggle}
                trackColor={{ false: colors.border, true: `${colors.primary}80` }}
                thumbColor={settings.biometrics ? colors.primary : colors.textMuted}
              />
            }
          />
          <SettingsRow
            icon="shield-checkmark-outline"
            iconColor={colors.textMuted}
            label="Двухфакторная аутентификация"
            sublabel="Скоро"
            isLast
            disabled
          />
        </Section>

        {/* ABOUT */}
        <Section title="О приложении">
          <SettingsRow
            icon="information-circle-outline"
            iconColor={colors.info}
            label="Версия приложения"
            sublabel="SVIT"
            rightElement={
              <Text style={[styles.versionText, { color: colors.textMuted }]}>{APP_VERSION}</Text>
            }
          />
          <SettingsRow
            icon="mail-outline"
            iconColor={colors.secondary}
            label="Написать нам"
            sublabel="support@travelai.app"
            onPress={() => Linking.openURL('mailto:support@travelai.app')}
          />
          <SettingsRow
            icon="document-text-outline"
            iconColor={colors.textMuted}
            label="Политика конфиденциальности"
            onPress={() => router.push('/privacy-policy')}
          />
          <SettingsRow
            icon="reader-outline"
            iconColor={colors.textMuted}
            label="Условия использования"
            isLast
            onPress={() => router.push('/terms-of-service')}
          />
        </Section>

        {/* ACCOUNT — danger zone */}
        <Section title="Аккаунт">
          <SettingsRow
            icon="trash-outline"
            iconColor={colors.error}
            label={isDeleting ? 'Удаление...' : 'Удалить аккаунт'}
            labelColor={colors.error}
            isLast
            disabled={isDeleting}
            onPress={handleDeleteAccount}
          />
        </Section>
      </ScrollView>

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

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Inter',
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  headerRight: {
    width: 38,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 48,
  },
  versionText: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
});
