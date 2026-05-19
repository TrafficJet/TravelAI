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
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
// expo-image-picker loaded lazily to avoid crash when native module not compiled in
type ImagePickerModule = typeof import('expo-image-picker');
let _ImagePicker: ImagePickerModule | null = null;
async function getImagePicker(): Promise<ImagePickerModule | null> {
  if (_ImagePicker) return _ImagePicker;
  try {
    _ImagePicker = await import('expo-image-picker');
    return _ImagePicker;
  } catch {
    return null;
  }
}
import { useAuthStore } from '../../stores/authStore';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Radius } from '../../constants/radius';
import { Spacing } from '../../constants/spacing';
import { useTheme } from '../../src/theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

// ── Scanned document data type ────────────────────────────────────────────────

interface ScannedDocumentData {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  nationality?: string;
  documentNumber?: string;
  expiryDate?: string;
}

// ── AsyncStorage keys for notification prefs ──────────────────────────────────
const NOTIF_BOOKINGS_KEY = 'notif_bookings';
const NOTIF_PRICES_KEY = 'notif_prices';

// ── Helpers ───────────────────────────────────────────────────────────────────


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

function Avatar({ name, size = 90 }: { name?: string; size?: number }) {
  const safeName = name ?? '';
  const initials =
    safeName
      .split(' ')
      .map((w) => w[0] ?? '')
      .filter(Boolean)
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';

  return (
    <LinearGradient
      colors={['#F59E0B', '#D97706']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        avatarStyles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Text style={[avatarStyles.initials, { fontSize: size * 0.33 }]}>{initials}</Text>
    </LinearGradient>
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
    fontFamily: 'Sora',
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  cancelBtn: {
    color: Colors.primary,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.md,
  },
  title: {
    color: Colors.text,
    fontFamily: 'Sora',
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
    fontFamily: 'Inter',
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
    fontFamily: 'Inter',
    fontSize: Typography.sizes.md,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  hint: {
    color: Colors.textMuted,
    fontFamily: 'Inter',
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
    fontFamily: 'Inter',
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  cancelBtn: {
    color: Colors.primary,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.md,
  },
  title: {
    color: Colors.text,
    fontFamily: 'Sora',
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  headerPlaceholder: { width: 60 },
  scroll: { flex: 1 },
  sectionLabel: {
    color: Colors.textMuted,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    letterSpacing: Typography.letterSpacing.wider,
    textTransform: 'uppercase',
    marginBottom: Spacing.md,
  },
  label: {
    color: Colors.textMuted,
    fontFamily: 'Inter',
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
    fontFamily: 'Inter',
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
    fontFamily: 'Inter',
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
    fontFamily: 'Inter',
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
    fontFamily: 'Inter',
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
});

// ── Plan labels ───────────────────────────────────────────────────────────────

const PLAN_LABELS: Record<string, string> = {
  FREE: 'Бесплатный',
  PRO: 'Про',
  PREMIUM: 'Премиум',
};

const SUBSCRIPTION_PRICE = 9.99;

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { user, logout, setUser } = useAuthStore();
  const { colors, isDark, setTheme } = useTheme();
  const { unreadCount } = useNotificationsContext();
  const insets = useSafeAreaInsets();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isBookingModalVisible, setIsBookingModalVisible] = useState(false);

  // Document scanning
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<ScannedDocumentData | null>(null);
  const [showScanConfirmModal, setShowScanConfirmModal] = useState(false);

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

  async function pickAndScanDocument(source: 'camera' | 'gallery') {
    const ImagePicker = await getImagePicker();
    if (!ImagePicker) {
      Alert.alert(
        'Недоступно',
        'Сканирование документов недоступно в этой версии приложения. Пожалуйста, обновите приложение.',
        [{ text: 'ОК' }],
      );
      return;
    }

    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Нет доступа',
          'Разрешите доступ к камере в настройках устройства.',
          [{ text: 'ОК' }],
        );
        return;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Нет доступа',
          'Разрешите доступ к галерее в настройках устройства.',
          [{ text: 'ОК' }],
        );
        return;
      }
    }

    const pickerOptions = {
      mediaTypes: ['images'] as import('expo-image-picker').MediaType[],
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    };

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(pickerOptions)
        : await ImagePicker.launchImageLibraryAsync(pickerOptions);

    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset?.base64) return;

    setIsScanning(true);
    try {
      const response = await api.post<{
        success: boolean;
        data?: ScannedDocumentData;
      }>('/documents/scan', {
        image: asset.base64,
        mimeType: 'image/jpeg',
        documentType: 'international_passport',
      });

      if (!response.data.success || !response.data.data) {
        Alert.alert(
          'Не удалось распознать',
          'Не удалось распознать документ. Убедитесь, что документ хорошо освещён и чётко виден.',
          [{ text: 'ОК' }],
        );
        return;
      }

      setScannedData(response.data.data);
      setShowScanConfirmModal(true);
    } catch (err: unknown) {
      const isNetworkError =
        err !== null &&
        typeof err === 'object' &&
        'message' in err &&
        typeof (err as { message?: unknown }).message === 'string' &&
        ((err as { message: string }).message.toLowerCase().includes('network') ||
          (err as { message: string }).message.toLowerCase().includes('timeout'));

      if (isNetworkError) {
        Alert.alert('Ошибка сети', 'Проверьте интернет-соединение и попробуйте снова.', [
          { text: 'ОК' },
        ]);
      } else {
        Alert.alert(
          'Не удалось распознать',
          'Не удалось распознать документ. Убедитесь, что документ хорошо освещён и чётко виден.',
          [{ text: 'ОК' }],
        );
      }
    } finally {
      setIsScanning(false);
    }
  }

  function handleScanDocument() {
    Alert.alert('Сканировать документ', 'Выберите способ загрузки', [
      {
        text: 'Сфотографировать',
        onPress: () => pickAndScanDocument('camera'),
      },
      {
        text: 'Из галереи',
        onPress: () => pickAndScanDocument('gallery'),
      },
      { text: 'Отмена', style: 'cancel' },
    ]);
  }

  function applyScanResult() {
    if (!scannedData) return;
    const scannedName =
      [scannedData.firstName, scannedData.lastName].filter(Boolean).join(' ') || undefined;
    setBookingData((prev) => ({
      ...prev,
      dateOfBirth: scannedData.dateOfBirth ?? prev.dateOfBirth,
      nationality: scannedData.nationality ?? prev.nationality,
      passportNumber: scannedData.documentNumber ?? prev.passportNumber,
      passportExpiry: scannedData.expiryDate ?? prev.passportExpiry,
      emergencyName: scannedName ?? prev.emergencyName,
    }));
    setShowScanConfirmModal(false);
    setScannedData(null);
    toast.success('Данные из документа применены');
  }

  function cancelScanResult() {
    setShowScanConfirmModal(false);
    setScannedData(null);
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

  const isPremium = user.subscription?.plan === 'PREMIUM' || user.subscription?.plan === 'PRO';

  // ── render helpers ──────────────────────────────────────────────────────────

  function renderInfoRow(icon: string, label: string, value: string, isLast = false) {
    // Map emoji strings to Ionicon names to avoid [?] squares on iOS
    const iconMap: Record<string, string> = {
      '📞': 'call-outline',
      '🎂': 'calendar-outline',
      '🌍': 'earth-outline',
      '🛂': 'card-outline',
      '📅': 'today-outline',
      '👤': 'person-outline',
    };
    const ionName = iconMap[icon] || 'information-circle-outline';
    return (
      <View style={[styles.infoRow, isLast && styles.infoRowNoBorder]} key={label}>
        <View style={styles.infoRowLeft}>
          <Ionicons name={ionName as any} size={16} color={Colors.primary} style={{ marginRight: 6 }} />
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
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]}
      >
        {/* ── Profile header ──────────────────────────────────────────── */}
        <View style={styles.avatarSection}>
          <Avatar name={user.name} size={90} />

          {/* Name + pencil */}
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.text }]}>{user.name}</Text>
            <TouchableOpacity
              style={{ backgroundColor: Colors.primaryMuted, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: Colors.border }}
              onPress={() => setIsEditModalVisible(true)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="pencil-outline" size={18} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Subscription badge */}
          <View
            style={[
              styles.subscriptionBadge,
              isPremium ? styles.subscriptionBadgePremium : styles.subscriptionBadgeFree,
            ]}
          >
            <Text
              style={[
                styles.subscriptionBadgeText,
                isPremium ? styles.subscriptionBadgeTextPremium : styles.subscriptionBadgeTextFree,
              ]}
            >
              {isPremium ? 'PREMIUM' : 'FREE'}
            </Text>
          </View>

          {/* Email */}
          <Text style={[styles.email, { color: colors.textSecondary }]}>{user.email}</Text>

          {/* Quick links: Notifications + Settings */}
          <View style={styles.quickLinksRow}>
            <TouchableOpacity
              style={styles.quickLinkItem}
              onPress={() => router.push('/(tabs)/notifications')}
              activeOpacity={0.7}
            >
              <View style={styles.quickLinkIconWrap}>
                <Ionicons name="notifications-outline" size={20} color={Colors.primary} />
                {unreadCount > 0 && (
                  <View style={styles.quickLinkBadge}>
                    <Text style={styles.quickLinkBadgeText}>{unreadCount > 9 ? '9+' : String(unreadCount)}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.quickLinkText}>Уведомления</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </TouchableOpacity>

            <View style={styles.quickLinkDivider} />

            <TouchableOpacity
              style={styles.quickLinkItem}
              onPress={() => router.push('/settings')}
              activeOpacity={0.7}
            >
              <View style={styles.quickLinkIconWrap}>
                <Ionicons name="settings-outline" size={20} color={Colors.primary} />
              </View>
              <Text style={styles.quickLinkText}>Настройки</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: Colors.success, fontFamily: 'Inter', fontSize: 13, fontWeight: '600' }}>
                    ${`${SUBSCRIPTION_PRICE}`}/мес
                  </Text>
                  <View style={styles.planBadgePremium}>
                    <Text style={styles.planBadgeTextPremium}>PREMIUM</Text>
                  </View>
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
                <Text style={styles.upgradeBtnText}>Перейти на Premium</Text>
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

          {/* Scan document button — passport card style */}
          <TouchableOpacity
            style={[styles.scanDocumentCard, isScanning && styles.scanBtnDisabled]}
            onPress={handleScanDocument}
            disabled={isScanning}
            activeOpacity={0.75}
          >
            {/* Mini passport illustration */}
            <View style={styles.passportMini}>
              <View style={styles.passportMiniTop} />
              <View style={styles.passportMiniBody}>
                <View style={styles.passportMiniPhoto} />
                <View style={styles.passportMiniLines}>
                  <View style={styles.passportMiniLine} />
                  <View style={[styles.passportMiniLine, { width: '55%' }]} />
                  <View style={[styles.passportMiniLine, { width: '75%' }]} />
                </View>
              </View>
              <View style={styles.passportMiniMRZ}>
                <View style={[styles.passportMiniLine, { width: '100%' }]} />
                <View style={[styles.passportMiniLine, { width: '100%', marginTop: 3 }]} />
              </View>
            </View>

            {/* Text block */}
            <View style={styles.scanCardContent}>
              {isScanning ? (
                <>
                  <ActivityIndicator color={Colors.primary} size="small" style={{ marginBottom: 4 }} />
                  <Text style={styles.scanCardTitle}>Распознаём документ...</Text>
                </>
              ) : (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Ionicons name="scan-outline" size={16} color={Colors.primary} />
                    <Text style={styles.scanCardTitle}>Сканировать документ</Text>
                  </View>
                  <Text style={styles.scanCardSub}>Паспорт · Загранпаспорт · Права</Text>
                  <Text style={styles.scanCardHint}>Данные заполнятся автоматически</Text>
                </>
              )}
            </View>
          </TouchableOpacity>

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
                style={{ transform: [{ scale: 0.82 }] }}
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
                style={{ transform: [{ scale: 0.82 }] }}
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
                style={{ transform: [{ scale: 0.82 }] }}
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
              <Ionicons name="notifications-outline" size={18} color={Colors.primary} />
              <View>
                <Text style={styles.priceAlertsBtnTitle}>Ценовые алерты</Text>
                <Text style={styles.priceAlertsBtnSub}>Слежка за ценами на рейсы и отели</Text>
              </View>
            </View>
            <Text style={styles.priceAlertsBtnChevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── Legal / Info section ─────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Информация</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.legalRow}
              onPress={() => router.push('/privacy-policy')}
              activeOpacity={0.7}
            >
              <Text style={styles.legalRowText}>Политика конфиденциальности</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </TouchableOpacity>

            <View style={styles.legalDivider} />

            <TouchableOpacity
              style={styles.legalRow}
              onPress={() => void Linking.openURL('https://travelai.app/terms')}
              activeOpacity={0.7}
            >
              <Text style={styles.legalRowText}>Условия использования</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </TouchableOpacity>

            <View style={styles.legalDivider} />

            <View style={[styles.legalRow, styles.legalRowNoPress]}>
              <Text style={styles.legalRowText}>Версия</Text>
              <Text style={styles.legalRowValue}>1.0.0</Text>
            </View>
          </View>
        </View>

        {/* ── About app ───────────────────────────────────────────────── */}
        <View style={styles.aboutSection}>
          <Ionicons name="airplane" size={32} color={Colors.primary} />
          <Text style={styles.aboutName}>TravelAI</Text>
          <Text style={styles.aboutVersion}>Версия 1.0.0</Text>
          <Text style={styles.aboutCopy}>Ваш AI-ассистент для путешествий</Text>
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

      {/* Scan confirm modal */}
      <Modal
        visible={showScanConfirmModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={cancelScanResult}
      >
        <View style={scanModalStyles.container}>
          <View style={scanModalStyles.header}>
            <TouchableOpacity onPress={cancelScanResult} activeOpacity={0.7}>
              <Text style={scanModalStyles.cancelBtn}>Отмена</Text>
            </TouchableOpacity>
            <Text style={scanModalStyles.title}>Данные из документа</Text>
            <View style={scanModalStyles.headerPlaceholder} />
          </View>

          <Text style={scanModalStyles.subtitle}>
            Проверьте распознанные данные перед применением
          </Text>

          <View style={scanModalStyles.dataCard}>
            {scannedData?.firstName || scannedData?.lastName ? (
              <View style={scanModalStyles.dataRow}>
                <View style={scanModalStyles.dataRowLeft}>
                  <Ionicons name="person-outline" size={16} color={Colors.primary} />
                  <Text style={scanModalStyles.dataLabel}>ФИО</Text>
                </View>
                <Text style={scanModalStyles.dataValue}>
                  {[scannedData.firstName, scannedData.lastName].filter(Boolean).join(' ')}
                </Text>
              </View>
            ) : null}

            {scannedData?.dateOfBirth ? (
              <View style={scanModalStyles.dataRow}>
                <View style={scanModalStyles.dataRowLeft}>
                  <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
                  <Text style={scanModalStyles.dataLabel}>Дата рождения</Text>
                </View>
                <Text style={scanModalStyles.dataValue}>{scannedData.dateOfBirth}</Text>
              </View>
            ) : null}

            {scannedData?.nationality ? (
              <View style={scanModalStyles.dataRow}>
                <View style={scanModalStyles.dataRowLeft}>
                  <Ionicons name="earth-outline" size={16} color={Colors.primary} />
                  <Text style={scanModalStyles.dataLabel}>Гражданство</Text>
                </View>
                <Text style={scanModalStyles.dataValue}>{scannedData.nationality}</Text>
              </View>
            ) : null}

            {scannedData?.documentNumber ? (
              <View style={scanModalStyles.dataRow}>
                <View style={scanModalStyles.dataRowLeft}>
                  <Ionicons name="card-outline" size={16} color={Colors.primary} />
                  <Text style={scanModalStyles.dataLabel}>Номер документа</Text>
                </View>
                <Text style={scanModalStyles.dataValue}>{scannedData.documentNumber}</Text>
              </View>
            ) : null}

            {scannedData?.expiryDate ? (
              <View style={[scanModalStyles.dataRow, scanModalStyles.dataRowLast]}>
                <View style={scanModalStyles.dataRowLeft}>
                  <Ionicons name="today-outline" size={16} color={Colors.primary} />
                  <Text style={scanModalStyles.dataLabel}>Срок действия</Text>
                </View>
                <Text style={scanModalStyles.dataValue}>{scannedData.expiryDate}</Text>
              </View>
            ) : null}
          </View>

          <Text style={scanModalStyles.hint}>
            Проверьте данные — они будут применены к полям бронирования и имени контакта.
          </Text>

          <View style={scanModalStyles.btnRow}>
            <TouchableOpacity
              style={scanModalStyles.cancelPill}
              onPress={cancelScanResult}
              activeOpacity={0.7}
            >
              <Text style={scanModalStyles.cancelPillText}>Отмена</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={scanModalStyles.applyPill}
              onPress={applyScanResult}
              activeOpacity={0.8}
            >
              <Text style={scanModalStyles.applyPillText}>Применить</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    fontFamily: 'Sora',
    color: Colors.text,
    fontSize: 22,
    fontWeight: Typography.weights.bold,
  },
  email: {
    fontFamily: 'Inter',
    color: Colors.textMuted,
    fontSize: 14,
    marginBottom: 14,
    marginTop: 4,
  },
  subscriptionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
    marginTop: 6,
    borderWidth: 1,
  },
  subscriptionBadgePremium: {
    backgroundColor: Colors.primaryMuted,
    borderColor: Colors.primary,
  },
  subscriptionBadgeFree: {
    backgroundColor: `${Colors.textMuted}18`,
    borderColor: Colors.border,
  },
  subscriptionBadgeText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1,
  },
  subscriptionBadgeTextPremium: {
    color: Colors.primary,
  },
  subscriptionBadgeTextFree: {
    color: Colors.textMuted,
  },
  quickLinksRow: {
    alignSelf: 'stretch',
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 16,
    overflow: 'hidden',
  },
  quickLinkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  quickLinkIconWrap: {
    position: 'relative',
    width: 24,
    alignItems: 'center',
  },
  quickLinkBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  quickLinkBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700' as const,
    lineHeight: 10,
  },
  quickLinkText: {
    flex: 1,
    color: Colors.text,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    fontWeight: '500' as const,
  },
  quickLinkDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 52,
  },

  // ── Section ───────────────────────────────────────────────────────────────
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    color: Colors.textMuted,
    fontFamily: 'Inter',
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
    fontFamily: 'Sora',
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    marginBottom: 2,
  },
  sectionSubtitle: {
    color: Colors.textMuted,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xs,
    lineHeight: 16,
  },
  editSectionBtn: {
    color: Colors.primary,
    fontFamily: 'Inter',
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
    fontFamily: 'Sora',
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  planNameFree: {
    color: Colors.text,
    fontFamily: 'Sora',
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  planFreeSub: {
    color: Colors.textMuted,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
    marginTop: 2,
  },
  planExpiry: {
    color: Colors.success,
    fontFamily: 'Inter',
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
    fontFamily: 'Inter',
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
    fontFamily: 'Inter',
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
    fontFamily: 'Inter',
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
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
  },
  infoValue: {
    color: Colors.text,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
    maxWidth: '55%',
    textAlign: 'right',
  },
  infoValueMuted: {
    color: Colors.textMuted,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
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
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
  switchSubtitle: {
    color: Colors.textMuted,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
    marginTop: 2,
  },

  // ── Logout ────────────────────────────────────────────────────────────────
  logoutBtn: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
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
    fontFamily: 'Inter',
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
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  langOptionActive: {
    color: Colors.primary,
  },
  langDivider: {
    color: Colors.border,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
  },

  // ── Legal / Info rows ────────────────────────────────────────────────────
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: Spacing.md,
  },
  legalRowNoPress: {
    // static row, no press feedback needed
  },
  legalRowText: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    color: Colors.text,
    fontWeight: Typography.weights.medium,
  },
  legalRowValue: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
    color: Colors.textMuted,
    fontWeight: Typography.weights.medium,
  },
  legalDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
  },

  // ── About section ─────────────────────────────────────────────────────────
  aboutSection: {
    alignItems: 'center',
    marginTop: Spacing.xl,
    paddingBottom: Spacing.md,
    gap: 4,
  },
  aboutName: {
    fontFamily: 'Sora',
    color: Colors.textMuted,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  aboutVersion: {
    color: Colors.textDisabled,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xs,
  },
  aboutCopy: {
    color: Colors.textDisabled,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xs,
    textAlign: 'center',
    marginTop: 2,
  },

  // ── Scan document card ────────────────────────────────────────────────────
  scanDocumentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryMuted,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    gap: 14,
  },
  scanBtnDisabled: {
    opacity: 0.6,
  },
  // Passport mini illustration
  passportMini: {
    width: 54,
    height: 74,
    backgroundColor: '#1D4ED8',
    borderRadius: 6,
    padding: 6,
    justifyContent: 'space-between',
    flexShrink: 0,
  },
  passportMiniTop: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 2,
  },
  passportMiniBody: {
    flexDirection: 'row',
    gap: 5,
    flex: 1,
    marginTop: 6,
  },
  passportMiniPhoto: {
    width: 16,
    height: 22,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 2,
    flexShrink: 0,
  },
  passportMiniLines: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  passportMiniLine: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 1.5,
    width: '100%',
  },
  passportMiniMRZ: {
    marginTop: 4,
  },
  // Scan card text content
  scanCardContent: {
    flex: 1,
  },
  scanCardTitle: {
    color: Colors.primary,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  scanCardSub: {
    color: Colors.textMuted,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  scanCardHint: {
    color: Colors.textDisabled,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xs,
    marginTop: 4,
    fontStyle: 'italic',
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
  priceAlertsBtnTitle: {
    color: Colors.text,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    marginBottom: 2,
  },
  priceAlertsBtnSub: {
    color: Colors.textMuted,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xs,
  },
  priceAlertsBtnChevron: {
    color: Colors.primary,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    lineHeight: 24,
  },
});

// ── Scan confirm modal styles ─────────────────────────────────────────────────

const scanModalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  cancelBtn: {
    color: Colors.primary,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.md,
  },
  title: {
    color: Colors.text,
    fontFamily: 'Sora',
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  headerPlaceholder: {
    width: 60,
  },
  subtitle: {
    color: Colors.textMuted,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  dataCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  dataRowLast: {
    borderBottomWidth: 0,
  },
  dataRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  dataLabel: {
    color: Colors.textMuted,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
  },
  dataValue: {
    color: Colors.text,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
    maxWidth: '55%',
    textAlign: 'right',
  },
  hint: {
    color: Colors.textDisabled,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xs,
    lineHeight: 18,
    marginBottom: Spacing.xl,
  },
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
    fontFamily: 'Inter',
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  applyPill: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: Radius.button,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  applyPillText: {
    color: Colors.textInverse,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
});
