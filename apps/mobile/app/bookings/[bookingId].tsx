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
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBookingStore } from '../../stores/bookingStore';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { toast } from '../../lib/toast';
import type { BookingStatus, FlightDetails, HotelDetails } from '../../types';

const STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: 'Ожидает подтверждения',
  CONFIRMED: 'Подтверждено',
  CANCELLED: 'Отменено',
  FAILED: 'Ошибка',
};

const STATUS_COLORS: Record<BookingStatus, string> = {
  PENDING: Colors.warning,
  CONFIRMED: Colors.success,
  CANCELLED: Colors.error,
  FAILED: Colors.error,
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
  const short = id.toUpperCase().slice(0, 8);
  return (
    <View style={numStyles.wrap}>
      <Text style={numStyles.label}>Номер бронирования</Text>
      <Text style={numStyles.number}>{short}</Text>
      <Text style={numStyles.hint}>Предъявите на стойке регистрации</Text>
    </View>
  );
}

const numStyles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  label: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  number: {
    color: Colors.text,
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.extrabold,
    letterSpacing: 4,
    fontVariant: ['tabular-nums'],
  },
  hint: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    marginTop: 8,
  },
});

// ── Info row ──────────────────────────────────────────────────────────────────

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[detailStyles.infoRow, last && detailStyles.infoRowLast]}>
      <Text style={detailStyles.infoLabel}>{label}</Text>
      <Text style={detailStyles.infoValue}>{value}</Text>
    </View>
  );
}

// ── Flight details ────────────────────────────────────────────────────────────

function FlightDetailsBlock({ details }: { details: FlightDetails }) {
  return (
    <View style={detailStyles.card}>
      <View style={detailStyles.sectionHeader}>
        <Ionicons name="airplane" size={16} color={Colors.primary} />
        <Text style={detailStyles.sectionTitle}>РЕЙС</Text>
      </View>
      <View style={detailStyles.row}>
        <View>
          <Text style={detailStyles.city}>{details.origin}</Text>
          <Text style={detailStyles.date}>
            {new Date(details.departureDate).toLocaleDateString('ru-RU')}
          </Text>
        </View>
        <Text style={detailStyles.arrow}>→</Text>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={detailStyles.city}>{details.destination}</Text>
          {details.returnDate && (
            <Text style={detailStyles.date}>
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

function HotelDetailsBlock({ details }: { details: HotelDetails }) {
  return (
    <View style={detailStyles.card}>
      <View style={detailStyles.sectionHeader}>
        <Ionicons name="bed" size={16} color={Colors.primary} />
        <Text style={detailStyles.sectionTitle}>ОТЕЛЬ</Text>
      </View>
      <Text style={detailStyles.hotelName}>{details.name}</Text>
      <Text style={detailStyles.hotelAddress}>{details.address}</Text>
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
        value={`${details.pricePerNight.toLocaleString('ru-RU')} USD`}
        last
      />
    </View>
  );
}

const detailStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  sectionTitle: {
    color: Colors.primary,
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
    color: Colors.text,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
  },
  date: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
    marginTop: 2,
  },
  arrow: {
    color: Colors.primary,
    fontSize: Typography.sizes.xl,
  },
  hotelName: {
    color: Colors.text,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    marginBottom: 4,
  },
  hotelAddress: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoRowLast: {
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
});

// ── Status Timeline ───────────────────────────────────────────────────────────

interface TimelineStep {
  key: BookingStatus;
  label: string;
  icon: string;
}

const TIMELINE_STEPS: TimelineStep[] = [
  { key: 'PENDING',   label: 'Ожидает',       icon: '🕐' },
  { key: 'CONFIRMED', label: 'Подтверждено',   icon: '✅' },
];

function StatusTimeline({ status }: { status: BookingStatus }) {
  if (status === 'FAILED' || status === 'CANCELLED') {
    return (
      <View style={tlStyles.cancelledWrap}>
        <Text style={tlStyles.cancelledIcon}>{status === 'CANCELLED' ? '🚫' : '❌'}</Text>
        <View>
          <Text style={tlStyles.cancelledTitle}>
            {status === 'CANCELLED' ? 'Бронирование отменено' : 'Ошибка бронирования'}
          </Text>
          <Text style={tlStyles.cancelledSub}>
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
    <View style={tlStyles.wrap}>
      <Text style={tlStyles.heading}>СТАТУС БРОНИРОВАНИЯ</Text>
      <View style={tlStyles.steps}>
        {TIMELINE_STEPS.map((step, idx) => {
          const isDone = idx <= currentIdx;
          const isActive = idx === currentIdx;
          return (
            <React.Fragment key={step.key}>
              <View style={tlStyles.step}>
                <View style={[
                  tlStyles.stepDot,
                  isDone && tlStyles.stepDotDone,
                  isActive && tlStyles.stepDotActive,
                ]}>
                  {isDone
                    ? <Text style={tlStyles.stepDotIcon}>{step.icon}</Text>
                    : <View style={tlStyles.stepDotEmpty} />
                  }
                </View>
                <Text style={[tlStyles.stepLabel, isDone && tlStyles.stepLabelDone]}>
                  {step.label}
                </Text>
              </View>
              {idx < TIMELINE_STEPS.length - 1 ? (
                <View style={[tlStyles.connector, idx < currentIdx && tlStyles.connectorDone]} />
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
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  heading: {
    color: Colors.textMuted,
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
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: {
    backgroundColor: `${Colors.success}15`,
    borderColor: Colors.success,
  },
  stepDotActive: {
    shadowColor: Colors.success,
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
    backgroundColor: Colors.border,
  },
  stepLabel: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    textAlign: 'center',
  },
  stepLabelDone: {
    color: Colors.text,
    fontWeight: Typography.weights.semibold,
  },
  connector: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.border,
    borderRadius: 1,
    marginBottom: 20,
  },
  connectorDone: {
    backgroundColor: Colors.success,
  },
  cancelledWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.error}12`,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: `${Colors.error}30`,
    gap: 12,
  },
  cancelledIcon: {
    fontSize: 28,
  },
  cancelledTitle: {
    color: Colors.error,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    marginBottom: 2,
  },
  cancelledSub: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
  },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function BookingDetailScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { currentBooking, loadBooking, confirmBooking, cancelBooking, isLoading } =
    useBookingStore();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (bookingId) {
      loadBooking(bookingId).catch(() => {});
    }
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

  if (isLoading || !currentBooking) {
    return <LoadingSpinner fullScreen />;
  }

  const statusColor = STATUS_COLORS[currentBooking.status];
  const statusLabel = STATUS_LABELS[currentBooking.status];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
        <HotelDetailsBlock details={currentBooking.details as HotelDetails} />
      )}

      {/* Price */}
      <View style={styles.priceCard}>
        <Text style={styles.priceLabel}>Итого</Text>
        <Text style={styles.priceValue}>
          {currentBooking.totalPrice.toLocaleString('ru-RU')} {currentBooking.currency}
        </Text>
      </View>

      <Text style={styles.createdAt}>Создано {formatDate(currentBooking.createdAt)}</Text>

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
              style={styles.cancelBtn}
              onPress={handleCancelConfirm}
              disabled={isCancelling}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle-outline" size={18} color={Colors.error} />
              <Text style={styles.cancelBtnText}>
                {isCancelling ? 'Отменяем...' : 'Отменить бронирование'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        <View style={styles.secondaryActions}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleShare} activeOpacity={0.7}>
            <Ionicons name="share-outline" size={20} color={Colors.primary} />
            <Text style={styles.secondaryBtnText}>Поделиться</Text>
          </TouchableOpacity>

          <View style={styles.secondaryDivider} />

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={handleDownloadTicket}
            activeOpacity={0.7}
          >
            <Ionicons name="download-outline" size={20} color={Colors.primary} />
            <Text style={styles.secondaryBtnText}>Скачать билет</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  priceLabel: {
    color: Colors.text,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  priceValue: {
    color: Colors.text,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  createdAt: {
    color: Colors.textMuted,
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
    borderColor: Colors.error,
    backgroundColor: `${Colors.error}10`,
  },
  cancelBtnText: {
    color: Colors.error,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  secondaryActions: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
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
    color: Colors.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  secondaryDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
});
