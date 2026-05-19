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
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors } from '../constants/colors';
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
  const isPriceOk = alert.currentPrice <= alert.maxPrice;
  const isFlight = alert.type === 'flight';

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(350)}>
      <View style={[cardStyles.card, !alert.active && cardStyles.cardInactive]}>
        {/* Top row: emoji + label + status */}
        <View style={cardStyles.topRow}>
          <View style={cardStyles.leftBlock}>
            <Text style={cardStyles.typeEmoji}>{isFlight ? '✈️' : '🏨'}</Text>
            <Text style={[cardStyles.label, !alert.active && cardStyles.labelMuted]}>
              {alert.label}
            </Text>
          </View>
          <View style={cardStyles.statusBlock}>
            {alert.active ? (
              <View style={cardStyles.statusDot}>
                <View
                  style={[
                    cardStyles.dot,
                    { backgroundColor: isPriceOk ? Colors.success : Colors.error },
                  ]}
                />
                <Text
                  style={[
                    cardStyles.statusText,
                    { color: isPriceOk ? Colors.success : Colors.error },
                  ]}
                >
                  Активный
                </Text>
              </View>
            ) : (
              <Text style={cardStyles.pausedText}>Пауза</Text>
            )}
            <Switch
              value={alert.active}
              onValueChange={(v) => onToggle(alert.id, v)}
              trackColor={{ false: Colors.border, true: `${Colors.primary}70` }}
              thumbColor={alert.active ? Colors.primary : Colors.textMuted}
              style={cardStyles.toggle}
            />
            <TouchableOpacity
              onPress={() => onDelete(alert.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={cardStyles.deleteBtn}
            >
              <Text style={cardStyles.deleteText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Divider */}
        <View style={cardStyles.divider} />

        {/* Price row */}
        <View style={cardStyles.priceRow}>
          <View>
            <Text style={cardStyles.priceLabel}>Макс. цена</Text>
            <Text style={[cardStyles.priceValue, !alert.active && cardStyles.labelMuted]}>
              {alert.currency}{alert.maxPrice}
              {alert.type === 'hotel' ? '/н' : ''}
            </Text>
          </View>
          <View style={cardStyles.priceSeparator} />
          <View style={cardStyles.currentPriceBlock}>
            <Text style={cardStyles.priceLabel}>Сейчас</Text>
            <Text
              style={[
                cardStyles.currentPriceValue,
                {
                  color: alert.active
                    ? isPriceOk
                      ? Colors.success
                      : Colors.error
                    : Colors.textMuted,
                },
              ]}
            >
              {alert.currency}{alert.currentPrice}
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.card,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardInactive: {
    opacity: 0.6,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  leftBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  typeEmoji: {
    fontSize: 22,
  },
  label: {
    color: Colors.text,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  labelMuted: {
    color: Colors.textMuted,
  },
  statusBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  statusText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  pausedText: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  toggle: {
    marginLeft: 4,
  },
  deleteBtn: {
    marginLeft: 2,
    padding: 4,
  },
  deleteText: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  priceLabel: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    marginBottom: 3,
    letterSpacing: 0.3,
  },
  priceValue: {
    color: Colors.text,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  priceSeparator: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  currentPriceBlock: {
    flex: 1,
  },
  currentPriceValue: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
});

// ── New alert form (modal) ────────────────────────────────────────────────────

interface NewAlertFormProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (alert: PriceAlert) => void;
}

function NewAlertForm({ visible, onClose, onCreate }: NewAlertFormProps) {
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
        style={formStyles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={formStyles.container}>
          {/* Header */}
          <View style={formStyles.header}>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Text style={formStyles.cancelText}>Отмена</Text>
            </TouchableOpacity>
            <Text style={formStyles.title}>Новый алерт</Text>
            <View style={formStyles.placeholder} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Type selector */}
            <Text style={formStyles.sectionLabel}>Тип</Text>
            <View style={formStyles.typeRow}>
              <TouchableOpacity
                style={[formStyles.typeBtn, type === 'flight' && formStyles.typeBtnActive]}
                onPress={() => setType('flight')}
                activeOpacity={0.8}
              >
                <Text style={formStyles.typeEmoji}>✈️</Text>
                <Text style={[formStyles.typeLabel, type === 'flight' && formStyles.typeLabelActive]}>
                  Рейс
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[formStyles.typeBtn, type === 'hotel' && formStyles.typeBtnActive]}
                onPress={() => setType('hotel')}
                activeOpacity={0.8}
              >
                <Text style={formStyles.typeEmoji}>🏨</Text>
                <Text style={[formStyles.typeLabel, type === 'hotel' && formStyles.typeLabelActive]}>
                  Отель
                </Text>
              </TouchableOpacity>
            </View>

            {/* Flight fields */}
            {type === 'flight' ? (
              <>
                <Text style={formStyles.label}>Откуда</Text>
                <TextInput
                  style={formStyles.input}
                  value={origin}
                  onChangeText={setOrigin}
                  placeholder="Код города или аэропорта (WAW)"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="characters"
                  returnKeyType="next"
                />
                <Text style={[formStyles.label, formStyles.mt14]}>Куда</Text>
                <TextInput
                  style={formStyles.input}
                  value={destination}
                  onChangeText={setDestination}
                  placeholder="Код города или аэропорта (BCN)"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="characters"
                  returnKeyType="next"
                />
              </>
            ) : (
              <>
                <Text style={formStyles.label}>Город</Text>
                <TextInput
                  style={formStyles.input}
                  value={city}
                  onChangeText={setCity}
                  placeholder="Барселона, Рим, Париж..."
                  placeholderTextColor={Colors.textMuted}
                  returnKeyType="next"
                />
              </>
            )}

            {/* Max price */}
            <Text style={[formStyles.label, formStyles.mt14]}>Максимальная цена (€)</Text>
            <TextInput
              style={formStyles.input}
              value={maxPrice}
              onChangeText={setMaxPrice}
              placeholder="200"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
              returnKeyType="done"
            />

            <View style={formStyles.bottomPad} />
          </ScrollView>

          {/* Submit */}
          <TouchableOpacity
            style={[formStyles.createBtn, submitting && formStyles.createBtnDisabled]}
            onPress={handleCreate}
            activeOpacity={0.85}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={Colors.textInverse} />
            ) : (
              <Text style={formStyles.createBtnText}>Создать алерт</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const formStyles = StyleSheet.create({
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
    marginBottom: 28,
  },
  cancelText: {
    color: Colors.primary,
    fontSize: Typography.sizes.md,
  },
  title: {
    color: Colors.text,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  placeholder: { width: 60 },
  sectionLabel: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: Radius.md,
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  typeBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}15`,
  },
  typeEmoji: {
    fontSize: 18,
  },
  typeLabel: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  typeLabelActive: {
    color: Colors.primary,
  },
  label: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
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
  bottomPad: { height: 16 },
  createBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.button,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  createBtnDisabled: {
    opacity: 0.6,
  },
  createBtnText: {
    color: Colors.textInverse,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
});

// ── Screen ────────────────────────────────────────────────────────────────────

export default function PriceAlertsScreen() {
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
    // Optimistic update
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, active: value } : a)),
    );
    try {
      await priceAlertsService.togglePriceAlert(id, value);
    } catch {
      // Rollback
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
            // Optimistic remove
            setAlerts((current) => current.filter((a) => a.id !== id));
            try {
              await priceAlertsService.deletePriceAlert(id);
            } catch {
              // Rollback
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
      <View style={screenStyles.container}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(0).duration(350)} style={screenStyles.header}>
          <TouchableOpacity
            style={screenStyles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={screenStyles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={screenStyles.headerTitle}>Ценовые алерты</Text>
          <TouchableOpacity
            style={screenStyles.addBtn}
            onPress={() => setShowForm(true)}
            activeOpacity={0.7}
          >
            <Text style={screenStyles.addBtnText}>+</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Stats row */}
        <Animated.View entering={FadeInDown.delay(60).duration(350)} style={screenStyles.statsRow}>
          {loading ? (
            <Text style={screenStyles.statsText}>Загрузка...</Text>
          ) : (
            <Text style={screenStyles.statsText}>
              {activeCount} активных из {alerts.length}
            </Text>
          )}
        </Animated.View>

        {/* Separator */}
        <View style={screenStyles.separator} />

        {/* List */}
        {loading ? (
          <View style={screenStyles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <ScrollView
            style={screenStyles.scroll}
            contentContainerStyle={screenStyles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {alerts.length === 0 ? (
              <Animated.View
                entering={FadeInDown.delay(120).duration(350)}
                style={screenStyles.emptyState}
              >
                <Text style={screenStyles.emptyEmoji}>🔔</Text>
                <Text style={screenStyles.emptyTitle}>Нет алертов</Text>
                <Text style={screenStyles.emptySubtitle}>
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

const screenStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    color: Colors.text,
    fontSize: Typography.sizes.lg,
    lineHeight: 22,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    color: Colors.textInverse,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    lineHeight: 28,
  },
  statsRow: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  statsText: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
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
    color: Colors.text,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.base,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 24,
  },
});
