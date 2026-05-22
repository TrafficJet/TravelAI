import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Share,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useBookingStore } from '../../stores/bookingStore';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useTheme } from '../../src/theme/ThemeContext';
import { Typography } from '../../constants/typography';
import { toast } from '../../lib/toast';
import type { BookingStatus, FlightDetails, HotelDetails } from '../../types';

const STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: 'Ожидает подтверждения',
  CONFIRMED: 'Подтверждено',
  CANCELLED: 'Отменено',
  FAILED: 'Ошибка',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

// ── Booking number block ──────────────────────────────────────────────────────

function BookingNumber({ id }: { id: string }) {
  const { colors } = useTheme();
  const short = id.toUpperCase().slice(0, 8);
  return (
    <View style={[numStyles.wrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[numStyles.label, { color: colors.textMuted }]}>Номер бронирования</Text>
      <Text style={[numStyles.number, { color: colors.text }]}>{short}</Text>
      <Text style={[numStyles.hint, { color: colors.textMuted }]}>Предъявите на стойке регистрации</Text>
    </View>
  );
}

const numStyles = StyleSheet.create({
  wrap: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  label: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  number: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.extrabold,
    letterSpacing: 4,
    fontVariant: ['tabular-nums'],
  },
  hint: {
    fontSize: Typography.sizes.xs,
    marginTop: 8,
  },
});

// ── Info row ──────────────────────────────────────────────────────────────────

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[detailStyles.infoRow, { borderBottomColor: colors.border }, last && detailStyles.infoRowLast]}>
      <Text style={[detailStyles.infoLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[detailStyles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

// ── Flight details ────────────────────────────────────────────────────────────

function FlightDetailsBlock({ details }: { details: FlightDetails }) {
  const { colors } = useTheme();
  return (
    <View style={[detailStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={detailStyles.sectionHeader}>
        <Ionicons name="airplane-outline" size={16} color={colors.primary} />
        <Text style={[detailStyles.sectionTitle, { color: colors.primary }]}>РЕЙС</Text>
      </View>
      <View style={detailStyles.row}>
        <View>
          <Text style={[detailStyles.city, { color: colors.text }]}>{details.origin}</Text>
          <Text style={[detailStyles.date, { color: colors.textMuted }]}>
            {new Date(details.departureDate).toLocaleDateString('ru-RU')}
          </Text>
        </View>
        <Text style={[detailStyles.arrow, { color: colors.primary }]}>→</Text>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[detailStyles.city, { color: colors.text }]}>{details.destination}</Text>
          {details.returnDate && (
            <Text style={[detailStyles.date, { color: colors.textMuted }]}>
              {new Date(details.returnDate).toLocaleDateString('ru-RU')}
            </Text>
          )}
        </View>
      </View>
      <InfoRow label="Авиакомпания" value={details.airline} />
      <InfoRow label="Рейс" value={details.flightNumber} />
      <InfoRow label="Класс" value={details.cabin} />
      <InfoRow label="Пассажиры" value={String(details.passengers)} last />
    </View>
  );
}

// ── Hotel details ─────────────────────────────────────────────────────────────

function HotelDetailsBlock({ details, currency }: { details: HotelDetails; currency: string }) {
  const { colors } = useTheme();
  return (
    <View style={[detailStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={detailStyles.sectionHeader}>
        <Ionicons name="bed-outline" size={16} color={colors.primary} />
        <Text style={[detailStyles.sectionTitle, { color: colors.primary }]}>ОТЕЛЬ</Text>
      </View>
      <Text style={[detailStyles.hotelName, { color: colors.text }]}>{details.name}</Text>
      <Text style={[detailStyles.hotelAddress, { color: colors.textMuted }]}>{details.address}</Text>
      <InfoRow label="Звёзды" value={'★'.repeat(details.stars)} />
      <InfoRow
        label="Заезд"
        value={new Date(details.checkIn).toLocaleDateString('ru-RU')}
      />
      <InfoRow
        label="Выезд"
        value={new Date(details.checkOut).toLocaleDateString('ru-RU')}
      />
      <InfoRow label="Номеров" value={String(details.rooms)} />
      <InfoRow label="Гостей" value={String(details.guests)} />
      <InfoRow
        label="Цена/ночь"
        value={`${details.pricePerNight.toLocaleString('ru-RU')} ${currency}`}
        last
      />
    </View>
  );
}

const detailStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  city: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
  },
  date: {
    fontSize: Typography.sizes.sm,
    marginTop: 2,
  },
  arrow: {
    fontSize: Typography.sizes.xl,
  },
  hotelName: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    marginBottom: 4,
  },
  hotelAddress: {
    fontSize: Typography.sizes.sm,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoLabel: {
    fontSize: Typography.sizes.sm,
  },
  infoValue: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
});

// ── Status Timeline ───────────────────────────────────────────────────────────

interface TimelineStep {
  key: BookingStatus;
  label: string;
  icon: string;
}

const TIMELINE_STEPS: TimelineStep[] = [
  { key: 'PENDING',   label: 'Ожидает',       icon: '...' },
  { key: 'CONFIRMED', label: 'Подтверждено',   icon: '✓' },
];

function StatusTimeline({ status }: { status: BookingStatus }) {
  const { colors } = useTheme();

  if (status === 'FAILED' || status === 'CANCELLED') {
    return (
      <View style={[tlStyles.cancelledWrap, { backgroundColor: `${colors.error}12`, borderColor: `${colors.error}30` }]}>
        <Ionicons
          name={status === 'CANCELLED' ? 'ban-outline' : 'close-circle-outline'}
          size={28}
          color={colors.error}
          style={tlStyles.cancelledIcon}
        />
        <View>
          <Text style={[tlStyles.cancelledTitle, { color: colors.error }]}>
            {status === 'CANCELLED' ? 'Бронирование отменено' : 'Ошибка бронирования'}
          </Text>
          <Text style={[tlStyles.cancelledSub, { color: colors.textMuted }]}>
            {status === 'CANCELLED'
              ? 'Средства возвращены на кошелёк'
              : 'Обратитесь в поддержку'}
          </Text>
        </View>
      </View>
    );
  }

  const currentIdx = TIMELINE_STEPS.findIndex((s) => s.key === status);

  return (
    <View style={[tlStyles.wrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[tlStyles.heading, { color: colors.textMuted }]}>СТАТУС БРОНИРОВАНИЯ</Text>
      <View style={tlStyles.steps}>
        {TIMELINE_STEPS.map((step, idx) => {
          const isDone = idx <= currentIdx;
          const isActive = idx === currentIdx;
          return (
            <React.Fragment key={step.key}>
              <View style={tlStyles.step}>
                <View style={[
                  tlStyles.stepDot,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  isDone && { backgroundColor: `${colors.success}15`, borderColor: colors.success },
                  isActive && { shadowColor: colors.success },
                ]}>
                  {isDone
                    ? <Text style={tlStyles.stepDotIcon}>{step.icon}</Text>
                    : <View style={[tlStyles.stepDotEmpty, { backgroundColor: colors.border }]} />
                  }
                </View>
                <Text style={[tlStyles.stepLabel, { color: colors.textMuted }, isDone && { color: colors.text, fontWeight: Typography.weights.semibold }]}>
                  {step.label}
                </Text>
              </View>
              {idx < TIMELINE_STEPS.length - 1 ? (
                <View style={[tlStyles.connector, { backgroundColor: colors.border }, idx < currentIdx && { backgroundColor: colors.success }]} />
              ) : null}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const tlStyles = StyleSheet.create({
  wrap: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  heading: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  steps: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  step: {
    alignItems: 'center',
    gap: 6,
    minWidth: 72,
  },
  stepDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  stepDotIcon: {
    fontSize: 18,
  },
  stepDotEmpty: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stepLabel: {
    fontSize: Typography.sizes.xs,
    textAlign: 'center',
  },
  connector: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    marginBottom: 20,
  },
  cancelledWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    gap: 12,
  },
  cancelledIcon: {
    flexShrink: 0,
  },
  cancelledTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    marginBottom: 2,
  },
  cancelledSub: {
    fontSize: Typography.sizes.sm,
  },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function BookingDetailScreen() {
  const { colors } = useTheme();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { currentBooking, loadBooking, confirmBooking, cancelBooking, isLoading } =
    useBookingStore();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const STATUS_COLORS: Record<BookingStatus, string> = {
    PENDING: colors.warning,
    CONFIRMED: colors.success,
    CANCELLED: colors.error,
    FAILED: colors.error,
  };

  useEffect(() => {
    if (!bookingId) return;

    // Сначала проверяем локальный store — избегаем лишнего сетевого запроса
    const { bookings } = useBookingStore.getState();
    const localBooking = (bookings ?? []).find((b) => b.id === bookingId);
    if (localBooking) {
      useBookingStore.setState({ currentBooking: localBooking });
      return;
    }

    // Если не нашли локально — грузим с бэкенда
    setLoadError(null);
    loadBooking(bookingId).catch((err) => {
      const msg = err instanceof Error ? err.message : 'Не удалось загрузить бронирование';
      setLoadError(msg);
      toast.error('Не удалось загрузить бронирование');
    });
  }, [bookingId, loadBooking]);

  async function handleConfirm() {
    if (!currentBooking) return;
    setIsConfirming(true);
    try {
      await confirmBooking(currentBooking.id);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({
        pathname: '/booking-success',
        params: {
          bookingId: currentBooking.id,
          type: currentBooking.type,
          totalPrice: String(currentBooking.totalPrice),
          currency: currentBooking.currency,
        },
      });
    } catch (err: unknown) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = err instanceof Error ? err.message : 'Ошибка подтверждения';
      toast.error(msg);
    } finally {
      setIsConfirming(false);
    }
  }

  function handleCancelConfirm() {
    if (!currentBooking) return;
    Alert.alert(
      'Отменить бронирование?',
      'Это действие нельзя отменить. Средства будут возвращены на кошелёк.',
      [
        { text: 'Не отменять', style: 'cancel' },
        {
          text: 'Отменить бронь',
          style: 'destructive',
          onPress: handleCancel,
        },
      ],
    );
  }

  async function handleCancel() {
    if (!currentBooking) return;
    setIsCancelling(true);
    try {
      await cancelBooking(currentBooking.id);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.info('Бронирование отменено');
    } catch (err: unknown) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = err instanceof Error ? err.message : 'Ошибка отмены';
      toast.error(msg);
    } finally {
      setIsCancelling(false);
    }
  }

  async function handleShare() {
    if (!currentBooking) return;
    try {
      const typeLabel = currentBooking.type === 'FLIGHT' ? 'Рейс' : 'Отель';
      await Share.share({
        message:
          `${typeLabel} | ${currentBooking.id.slice(0, 8).toUpperCase()}\n` +
          `Стоимость: ${currentBooking.totalPrice.toLocaleString('ru-RU')} ${currentBooking.currency}\n` +
          `Статус: ${STATUS_LABELS[currentBooking.status]}\n` +
          `Создано: ${formatDate(currentBooking.createdAt)}`,
      });
    } catch {
      // User cancelled share sheet — ignore
    }
  }

  function handleDownloadTicket() {
    Alert.alert('Скоро', 'Скачивание PDF-билета будет доступно в следующем обновлении.');
  }

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!isLoading && loadError) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, padding: 32 }}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>{'!'}</Text>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' }}>
          Не удалось загрузить
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
          {loadError}
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: colors.primary, borderRadius: 32, paddingHorizontal: 24, paddingVertical: 12 }}
          onPress={() => { setLoadError(null); loadBooking(bookingId!).catch((e) => setLoadError(e instanceof Error ? e.message : 'Ошибка')); }}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>Попробовать снова</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ marginTop: 12 }} onPress={() => router.back()}>
          <Text style={{ color: colors.textMuted }}>Назад</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!currentBooking) {
    return (
      <View style={[styles.container, errorStyles.center, { backgroundColor: colors.background }]}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>{'⚠'}</Text>
        <Text style={[errorStyles.title, { color: colors.text }]}>Бронь не найдена</Text>
        <Text style={[errorStyles.sub, { color: colors.textMuted }]}>
          Не удалось загрузить бронирование
        </Text>
        <TouchableOpacity
          style={[errorStyles.btn, { backgroundColor: colors.primary }]}
          onPress={() => router.replace('/(tabs)/bookings' as never)}
        >
          <Text style={errorStyles.btnText}>В мои брони</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusColor = STATUS_COLORS[currentBooking.status];
  const statusLabel = STATUS_LABELS[currentBooking.status];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Status banner */}
      <View style={[styles.statusBanner, { backgroundColor: `${statusColor}20`, borderWidth: 1, borderColor: `${statusColor}35` }]}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
      </View>

      {/* Status timeline */}
      <StatusTimeline status={currentBooking.status} />

      {/* Booking number */}
      <BookingNumber id={currentBooking.id} />

      {/* Details */}
      {currentBooking.type === 'FLIGHT' ? (
        <FlightDetailsBlock details={currentBooking.details as FlightDetails} />
      ) : (
        <HotelDetailsBlock details={currentBooking.details as HotelDetails} currency={currentBooking.currency} />
      )}

      {/* Price */}
      <View style={[styles.priceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.priceLabel, { color: colors.text }]}>Итого</Text>
        <Text style={[styles.priceValue, { color: colors.text }]}>
          {currentBooking.totalPrice.toLocaleString('ru-RU')} {currentBooking.currency}
        </Text>
      </View>

      <Text style={[styles.createdAt, { color: colors.textMuted }]}>Создано {formatDate(currentBooking.createdAt)}</Text>

      {/* Action buttons */}
      <View style={styles.actions}>
        {currentBooking.status === 'PENDING' && (
          <>
            <Button
              title="Оплатить с кошелька"
              onPress={handleConfirm}
              loading={isConfirming}
              fullWidth
              style={styles.actionBtn}
            />
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.error, backgroundColor: `${colors.error}10` }]}
              onPress={handleCancelConfirm}
              disabled={isCancelling}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 18, color: colors.error, lineHeight: 22  }}>{'⊗'}</Text>
              <Text style={[styles.cancelBtnText, { color: colors.error }]}>
                {isCancelling ? 'Отменяем...' : 'Отменить бронирование'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        <View style={[styles.secondaryActions, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleShare} activeOpacity={0.7}>
            <Text style={{ fontSize: 20, color: colors.primary, lineHeight: 24  }}>{'⇪'}</Text>
            <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>Поделиться</Text>
          </TouchableOpacity>

          <View style={[styles.secondaryDivider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={handleDownloadTicket}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 20, color: colors.primary, lineHeight: 24  }}>{'↓'}</Text>
            <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>Скачать билет</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  statusBanner: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  priceCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
  },
  priceLabel: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  priceValue: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  createdAt: {
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    marginBottom: 24,
  },
  actions: {
    gap: 12,
  },
  actionBtn: {
    marginTop: 0,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  cancelBtnText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  secondaryActions: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  secondaryBtnText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  secondaryDivider: {
    width: 1,
  },
});

const errorStyles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  title: { fontFamily: 'Sora', fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  sub: { fontFamily: 'Inter', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  btn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 100 },
  btnText: { color: '#fff', fontFamily: 'Inter', fontSize: 15, fontWeight: '700' },
});
