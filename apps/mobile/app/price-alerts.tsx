import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../src/theme/ThemeContext';
import { Typography } from '../constants/typography';
import { Radius } from '../constants/radius';
import { Spacing } from '../constants/spacing';
import {
  priceAlertsService,
  type PriceAlert,
  type PriceAlertType,
  type CreateAlertData,
} from '../services/priceAlertsService';

// ── Alert card ────────────────────────────────────────────────────────────────

interface AlertCardProps {
  alert: PriceAlert;
  onToggle: (id: string, value: boolean) => void;
  onDelete: (id: string) => void;
  delay: number;
}

function AlertCard({ alert, onToggle, onDelete, delay }: AlertCardProps) {
  const { colors } = useTheme();
  const isPriceOk = alert.currentPrice <= alert.maxPrice;
  const isFlight = alert.type === 'flight';

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(350)}>
      <View style={[
        {
          backgroundColor: colors.card,
          borderRadius: Radius.card,
          padding: 16,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: colors.border,
        },
        !alert.active && { opacity: 0.6 },
      ]}>
        {/* Top row: emoji + label + status */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <Text style={{ fontSize: 22 }}>{isFlight ? '✈️' : '🏨'}</Text>
            <Text style={{
              color: alert.active ? colors.text : colors.textMuted,
              fontSize: Typography.sizes.md,
              fontWeight: Typography.weights.semibold,
            }}>
              {alert.label}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {alert.active ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View style={{
                  width: 7,
                  height: 7,
                  borderRadius: 999,
                  backgroundColor: isPriceOk ? colors.success : colors.error,
                }} />
                <Text style={{
                  fontSize: Typography.sizes.xs,
                  fontWeight: Typography.weights.semibold,
                  color: isPriceOk ? colors.success : colors.error,
                }}>
                  Активный
                </Text>
              </View>
            ) : (
              <Text style={{ color: colors.textMuted, fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold }}>Пауза</Text>
            )}
            <Switch
              value={alert.active}
              onValueChange={(v) => onToggle(alert.id, v)}
              trackColor={{ false: colors.border, true: `${colors.primary}70` }}
              thumbColor={alert.active ? colors.primary : colors.textMuted}
              style={{ marginLeft: 4 }}
            />
            <TouchableOpacity
              onPress={() => onDelete(alert.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ marginLeft: 2, padding: 4 }}
            >
              <Text style={{ color: colors.textMuted, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold }}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Divider */}
        <View style={{ height: 1, backgroundColor: colors.border, marginBottom: 12 }} />

        {/* Price row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View>
            <Text style={{ color: colors.textMuted, fontSize: Typography.sizes.xs, marginBottom: 3, letterSpacing: 0.3 }}>Макс. цена</Text>
            <Text style={{ color: alert.active ? colors.text : colors.textMuted, fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold }}>
              {alert.currency}{alert.maxPrice}
              {alert.type === 'hotel' ? '/н' : ''}
            </Text>
          </View>
          <View style={{ width: 1, height: 32, backgroundColor: colors.border }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textMuted, fontSize: Typography.sizes.xs, marginBottom: 3, letterSpacing: 0.3 }}>Сейчас</Text>
            <Text style={{
              fontSize: Typography.sizes.base,
              fontWeight: Typography.weights.bold,
              color: alert.active
                ? isPriceOk ? colors.success : colors.error
                : colors.textMuted,
            }}>
              {alert.currency}{alert.currentPrice}
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

// ── New alert form (modal) ────────────────────────────────────────────────────

interface NewAlertFormProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (alert: PriceAlert) => void;
}

function NewAlertForm({ visible, onClose, onCreate }: NewAlertFormProps) {
  const { colors } = useTheme();
  const [type, setType] = useState<PriceAlertType>('flight');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [city, setCity] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleReset() {
    setType('flight');
    setOrigin('');
    setDestination('');
    setCity('');
    setMaxPrice('');
    setSubmitting(false);
  }

  async function handleCreate() {
    const price = parseFloat(maxPrice);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Ошибка', 'Укажите корректную максимальную цену.');
      return;
    }
    if (type === 'flight' && (!origin.trim() || !destination.trim())) {
      Alert.alert('Ошибка', 'Укажите откуда и куда.');
      return;
    }
    if (type === 'hotel' && !city.trim()) {
      Alert.alert('Ошибка', 'Укажите город.');
      return;
    }

    let payload: CreateAlertData;
    if (type === 'flight') {
      payload = {
        type: 'flight',
        origin: origin.trim().toUpperCase(),
        destination: destination.trim().toUpperCase(),
        maxPrice: price,
      };
    } else {
      payload = {
        type: 'hotel',
        city: city.trim(),
        maxPrice: price,
      };
    }

    setSubmitting(true);
    try {
      const created = await priceAlertsService.createPriceAlert(payload);
      onCreate(created);
      handleReset();
      onClose();
    } catch {
      Alert.alert('Ошибка', 'Не удалось создать алерт. Попробуйте ещё раз.');
      setSubmitting(false);
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
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{
          flex: 1,
          backgroundColor: colors.background,
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: 32,
        }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Text style={{ color: colors.primary, fontSize: Typography.sizes.md }}>Отмена</Text>
            </TouchableOpacity>
            <Text style={{ color: colors.text, fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold }}>Новый алерт</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Type selector */}
            <Text style={{
              color: colors.textMuted,
              fontSize: Typography.sizes.xs,
              fontWeight: Typography.weights.bold,
              letterSpacing: 1,
              textTransform: 'uppercase',
              marginBottom: Spacing.sm,
            }}>Тип</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
              <TouchableOpacity
                style={[
                  {
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    paddingVertical: 14,
                    borderRadius: Radius.md,
                    backgroundColor: colors.card,
                    borderWidth: 1.5,
                    borderColor: colors.border,
                  },
                  type === 'flight' && { borderColor: colors.primary, backgroundColor: `${colors.primary}15` },
                ]}
                onPress={() => setType('flight')}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 18 }}>✈️</Text>
                <Text style={[
                  { color: colors.textMuted, fontSize: Typography.sizes.base, fontWeight: Typography.weights.semibold },
                  type === 'flight' && { color: colors.primary },
                ]}>Рейс</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  {
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    paddingVertical: 14,
                    borderRadius: Radius.md,
                    backgroundColor: colors.card,
                    borderWidth: 1.5,
                    borderColor: colors.border,
                  },
                  type === 'hotel' && { borderColor: colors.primary, backgroundColor: `${colors.primary}15` },
                ]}
                onPress={() => setType('hotel')}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 18 }}>🏨</Text>
                <Text style={[
                  { color: colors.textMuted, fontSize: Typography.sizes.base, fontWeight: Typography.weights.semibold },
                  type === 'hotel' && { color: colors.primary },
                ]}>Отель</Text>
              </TouchableOpacity>
            </View>

            {/* Flight fields */}
            {type === 'flight' ? (
              <>
                <Text style={{ color: colors.textMuted, fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>Откуда</Text>
                <TextInput
                  style={{
                    backgroundColor: colors.card,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: Radius.input,
                    paddingHorizontal: Spacing.md,
                    paddingVertical: 14,
                    color: colors.text,
                    fontSize: Typography.sizes.md,
                  }}
                  value={origin}
                  onChangeText={setOrigin}
                  placeholder="Код города или аэропорта (WAW)"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                  returnKeyType="next"
                />
                <Text style={{ color: colors.textMuted, fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8, marginTop: 14 }}>Куда</Text>
                <TextInput
                  style={{
                    backgroundColor: colors.card,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: Radius.input,
                    paddingHorizontal: Spacing.md,
                    paddingVertical: 14,
                    color: colors.text,
                    fontSize: Typography.sizes.md,
                  }}
                  value={destination}
                  onChangeText={setDestination}
                  placeholder="Код города или аэропорта (BCN)"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                  returnKeyType="next"
                />
              </>
            ) : (
              <>
                <Text style={{ color: colors.textMuted, fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>Город</Text>
                <TextInput
                  style={{
                    backgroundColor: colors.card,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: Radius.input,
                    paddingHorizontal: Spacing.md,
                    paddingVertical: 14,
                    color: colors.text,
                    fontSize: Typography.sizes.md,
                  }}
                  value={city}
                  onChangeText={setCity}
                  placeholder="Барселона, Рим, Париж..."
                  placeholderTextColor={colors.textMuted}
                  returnKeyType="next"
                />
              </>
            )}

            {/* Max price */}
            <Text style={{ color: colors.textMuted, fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8, marginTop: 14 }}>Максимальная цена (€)</Text>
            <TextInput
              style={{
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: Radius.input,
                paddingHorizontal: Spacing.md,
                paddingVertical: 14,
                color: colors.text,
                fontSize: Typography.sizes.md,
              }}
              value={maxPrice}
              onChangeText={setMaxPrice}
              placeholder="200"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              returnKeyType="done"
            />

            <View style={{ height: 16 }} />
          </ScrollView>

          {/* Submit */}
          <TouchableOpacity
            style={[
              {
                backgroundColor: colors.primary,
                borderRadius: Radius.button,
                paddingVertical: 16,
                alignItems: 'center',
                marginTop: 12,
              },
              submitting && { opacity: 0.6 },
            ]}
            onPress={handleCreate}
            activeOpacity={0.85}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold }}>Создать алерт</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function PriceAlertsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchAlerts = useCallback(async () => {
    try {
      const data = await priceAlertsService.getPriceAlerts();
      setAlerts(data);
    } catch {
      Alert.alert('Ошибка', 'Не удалось загрузить ценовые алерты.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAlerts();
  }, [fetchAlerts]);

  async function handleToggle(id: string, value: boolean) {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, active: value } : a)),
    );
    try {
      await priceAlertsService.togglePriceAlert(id, value);
    } catch {
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, active: !value } : a)),
      );
      Alert.alert('Ошибка', 'Не удалось изменить статус алерта.');
    }
  }

  async function handleDelete(id: string) {
    Alert.alert(
      'Удалить алерт',
      'Вы уверены, что хотите удалить этот алерт?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            const prev = alerts.find((a) => a.id === id);
            setAlerts((current) => current.filter((a) => a.id !== id));
            try {
              await priceAlertsService.deletePriceAlert(id);
            } catch {
              if (prev) {
                setAlerts((current) => [prev, ...current]);
              }
              Alert.alert('Ошибка', 'Не удалось удалить алерт.');
            }
          },
        },
      ],
    );
  }

  function handleCreate(alert: PriceAlert) {
    setAlerts((prev) => [alert, ...prev]);
  }

  const activeCount = alerts.filter((a) => a.active).length;

  return (
    <>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(0).duration(350)} style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.back()}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.backArrow, { color: colors.text }]}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Ценовые алерты</Text>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowForm(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Stats row */}
        <Animated.View entering={FadeInDown.delay(60).duration(350)} style={styles.statsRow}>
          {loading ? (
            <Text style={[styles.statsText, { color: colors.textMuted }]}>Загрузка...</Text>
          ) : (
            <Text style={[styles.statsText, { color: colors.textMuted }]}>
              {activeCount} активных из {alerts.length}
            </Text>
          )}
        </Animated.View>

        {/* Separator */}
        <View style={[styles.separator, { backgroundColor: colors.border }]} />

        {/* List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {alerts.length === 0 ? (
              <Animated.View
                entering={FadeInDown.delay(120).duration(350)}
                style={styles.emptyState}
              >
                <Text style={styles.emptyEmoji}>🔔</Text>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>Нет алертов</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                  Нажмите + чтобы добавить первый ценовой алерт
                </Text>
              </Animated.View>
            ) : (
              alerts.map((alert, index) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  delay={120 + index * 60}
                />
              ))
            )}
          </ScrollView>
        )}
      </View>

      <NewAlertForm
        visible={showForm}
        onClose={() => setShowForm(false)}
        onCreate={handleCreate}
      />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: Typography.sizes.lg,
    lineHeight: 22,
  },
  headerTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#fff',
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    lineHeight: 28,
  },
  statsRow: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  statsText: {
    fontSize: Typography.sizes.sm,
  },
  separator: {
    height: 1,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: Typography.sizes.base,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 24,
  },
});
