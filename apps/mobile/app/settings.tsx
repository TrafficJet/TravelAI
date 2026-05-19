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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
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
        <View style={[modalStyles.container, { backgroundColor: Colors.card }]}>
          <Text style={[modalStyles.title, { color: Colors.text }]}>Удалить аккаунт</Text>
          <Text style={[modalStyles.subtitle, { color: Colors.textMuted }]}>
            Введите пароль для подтверждения. Это действие нельзя отменить.
          </Text>
          <TextInput
            style={[modalStyles.input, { backgroundColor: Colors.surface, borderColor: Colors.border, color: Colors.text }]}
            placeholder="Пароль"
            placeholderTextColor={Colors.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            autoFocus
          />
          <View style={modalStyles.buttons}>
            <TouchableOpacity
              style={[modalStyles.btn, { borderColor: Colors.border }]}
              onPress={handleCancel}
              activeOpacity={0.7}
            >
              <Text style={[modalStyles.btnText, { color: Colors.text }]}>Отмена</Text>
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
    backgroundColor: Colors.error,
    borderColor: Colors.error,
  },
  btnText: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
});

// ── Reusable row components ───────────────────────────────────────────────────

interface RowItem {
  icon: React.ComponentProps<typeof Ionicons>['name'];
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
  iconColor = Colors.primary,
  label,
  sublabel,
  onPress,
  rightElement,
  isLast,
  disabled,
  labelColor,
}: RowItem) {
  return (
    <TouchableOpacity
      style={[
        rowStyles.row,
        !isLast && rowStyles.rowBorder,
        disabled && rowStyles.rowDisabled,
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={disabled || !onPress}
    >
      <View style={[rowStyles.iconWrap, { backgroundColor: `${iconColor}18` }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={rowStyles.labelBlock}>
        <Text style={[rowStyles.label, labelColor ? { color: labelColor } : undefined]}>
          {label}
        </Text>
        {sublabel ? (
          <Text style={rowStyles.sublabel}>{sublabel}</Text>
        ) : null}
      </View>
      <View style={rowStyles.right}>
        {rightElement ?? (
          onPress ? (
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
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
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
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
    color: Colors.text,
  },
  sublabel: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
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
  return (
    <View style={presetStyles.row}>
      {options.map((opt, idx) => {
        const isActive = opt.value === selected;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[
              presetStyles.btn,
              idx < options.length - 1 && presetStyles.btnGap,
              isActive && presetStyles.btnActive,
            ]}
            onPress={() => onSelect(opt.value)}
            activeOpacity={0.75}
          >
            <Text style={[presetStyles.btnText, isActive && presetStyles.btnTextActive]}>
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
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  btnGap: {
    marginRight: 8,
  },
  btnActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}15`,
  },
  btnText: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.textMuted,
  },
  btnTextActive: {
    color: Colors.primary,
  },
});

// ── Section wrapper ───────────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <View style={sectionStyles.section}>
      <Text style={sectionStyles.title}>{title}</Text>
      <View style={sectionStyles.card}>{children}</View>
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
    color: Colors.textMuted,
    letterSpacing: Typography.letterSpacing.wider,
    textTransform: 'uppercase',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
});

// ── Option row inside a card (with inline label + preset group below) ─────────

interface OptionGroupRowProps<T extends string> {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor?: string;
  label: string;
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (v: T) => void;
  isLast?: boolean;
}

function OptionGroupRow<T extends string>({
  icon,
  iconColor = Colors.primary,
  label,
  options,
  selected,
  onSelect,
  isLast,
}: OptionGroupRowProps<T>) {
  return (
    <View style={[optGroupStyles.wrapper, !isLast && optGroupStyles.wrapperBorder]}>
      <View style={optGroupStyles.header}>
        <View style={[optGroupStyles.iconWrap, { backgroundColor: `${iconColor}18` }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        <Text style={optGroupStyles.label}>{label}</Text>
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
  wrapperBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
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
    color: Colors.text,
  },
  presetArea: {
    paddingLeft: 46,
  },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const { setTheme: applyTheme } = useTheme();
  const logout = useAuthStore((s) => s.logout);
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
    const labels: Record<ThemeOption, string> = {
      light: 'Светлая тема',
      dark: 'Тёмная тема',
      system: 'Системная тема',
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
      <StatusBar barStyle="light-content" />

      {/* Custom header */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? 48 : insets.top + 16 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Настройки</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* APPEARANCE */}
        <Section title="Внешний вид">
          <OptionGroupRow
            icon="color-palette-outline"
            iconColor={Colors.secondary}
            label="Тема"
            options={themeOptions}
            selected={settings.theme}
            onSelect={handleThemeSelect}
            isLast={false}
          />
          <OptionGroupRow
            icon="language-outline"
            iconColor={Colors.info}
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
            iconColor={Colors.primary}
            label="Изменение цен"
            sublabel="Снижение цен на рейсы и отели"
            rightElement={
              <Switch
                value={settings.notifPrices}
                onValueChange={handleNotifChange('notifPrices')}
                trackColor={{ false: Colors.border, true: `${Colors.primary}80` }}
                thumbColor={settings.notifPrices ? Colors.primary : Colors.textMuted}
              />
            }
          />
          <SettingsRow
            icon="airplane-outline"
            iconColor={Colors.secondary}
            label="Бронирования"
            sublabel="Статус и изменения по броням"
            rightElement={
              <Switch
                value={settings.notifBookings}
                onValueChange={handleNotifChange('notifBookings')}
                trackColor={{ false: Colors.border, true: `${Colors.primary}80` }}
                thumbColor={settings.notifBookings ? Colors.primary : Colors.textMuted}
              />
            }
          />
          <SettingsRow
            icon="notifications-outline"
            iconColor={Colors.textMuted}
            label="Системные"
            sublabel="Обновления приложения и сервиса"
            isLast
            rightElement={
              <Switch
                value={settings.notifSystem}
                onValueChange={handleNotifChange('notifSystem')}
                trackColor={{ false: Colors.border, true: `${Colors.primary}80` }}
                thumbColor={settings.notifSystem ? Colors.primary : Colors.textMuted}
              />
            }
          />
        </Section>

        {/* SECURITY */}
        <Section title="Безопасность">
          <SettingsRow
            icon="lock-closed-outline"
            iconColor={Colors.warning}
            label="Изменить пароль"
            sublabel="Обновите пароль аккаунта"
            onPress={() => {
              Alert.alert(
                'Смена пароля',
                'Письмо с ссылкой для сброса пароля будет отправлено на ваш email.',
                [
                  { text: 'Отмена', style: 'cancel' },
                  { text: 'Отправить', onPress: () => toast.success('Письмо отправлено') },
                ],
              );
            }}
          />
          <SettingsRow
            icon="finger-print-outline"
            iconColor={Colors.secondary}
            label="Биометрия"
            sublabel={Platform.OS === 'ios' ? 'Face ID / Touch ID' : 'Отпечаток пальца'}
            rightElement={
              <Switch
                value={settings.biometrics}
                onValueChange={handleBiometricsToggle}
                trackColor={{ false: Colors.border, true: `${Colors.primary}80` }}
                thumbColor={settings.biometrics ? Colors.primary : Colors.textMuted}
              />
            }
          />
          <SettingsRow
            icon="shield-checkmark-outline"
            iconColor={Colors.textMuted}
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
            iconColor={Colors.info}
            label="Версия приложения"
            sublabel="TravelAI"
            rightElement={
              <Text style={styles.versionText}>{APP_VERSION}</Text>
            }
          />
          <SettingsRow
            icon="mail-outline"
            iconColor={Colors.secondary}
            label="Написать нам"
            sublabel="support@travelai.app"
            onPress={() => Linking.openURL('mailto:support@travelai.app')}
          />
          <SettingsRow
            icon="document-text-outline"
            iconColor={Colors.textMuted}
            label="Политика конфиденциальности"
            onPress={() => router.push('/privacy-policy')}
          />
          <SettingsRow
            icon="reader-outline"
            iconColor={Colors.textMuted}
            label="Условия использования"
            isLast
            onPress={() => router.push('/privacy-policy')}
          />
        </Section>

        {/* ACCOUNT — danger zone */}
        <Section title="Аккаунт">
          <SettingsRow
            icon="trash-outline"
            iconColor={Colors.error}
            label={isDeleting ? 'Удаление...' : 'Удалить аккаунт'}
            labelColor={Colors.error}
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
    backgroundColor: Colors.background,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Inter',
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  headerRight: {
    width: 38,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 48,
  },
  versionText: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
    color: Colors.textMuted,
    fontWeight: Typography.weights.medium,
  },
});
