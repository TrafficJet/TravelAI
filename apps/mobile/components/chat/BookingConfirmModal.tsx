import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { sendBookingConfirmation } from '../../services/notifications.service';
import { analytics, Events } from '../../src/analytics';
import { toast } from '../../lib/toast';
import type { BookingDraft, FlightDetails } from '../../types';

interface Props {
  visible: boolean;
  booking: BookingDraft;
  walletBalance: number;
  walletCurrency: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

function BookingDetails({ booking }: { booking: BookingDraft }) {
  // summary приходит с бэкенда как fallback, если детали не распознаны
  const summary = booking.summary;

  if (booking.type === 'FLIGHT') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const details = booking.details as any;
    const origin = details?.origin || details?.segments?.[0]?.origin || '';
    const destination = details?.destination || details?.segments?.[0]?.destination || '';
    const airline = details?.airline || details?.segments?.[0]?.marketingCarrier || '';
    const flightNumber = details?.flightNumber || details?.segments?.[0]?.flightNumber || '';
    const departure = details?.departureDate || details?.segments?.[0]?.departureAt || '';
    const passengers = details?.passengers || details?.passengerCount || 1;

    return (
      <View style={styles.detailsSection}>
        <Text style={styles.detailTitle}>Авиабилет</Text>
        {summary && (
          <Text style={styles.detailValue}>{summary.title}</Text>
        )}
        {origin && destination ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Маршрут</Text>
            <Text style={styles.detailValue}>{origin} → {destination}</Text>
          </View>
        ) : null}
        {airline ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Авиакомпания</Text>
            <Text style={styles.detailValue}>{airline}</Text>
          </View>
        ) : null}
        {flightNumber ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Рейс</Text>
            <Text style={styles.detailValue}>{flightNumber}</Text>
          </View>
        ) : null}
        {departure ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Дата вылета</Text>
            <Text style={styles.detailValue}>{new Date(departure).toLocaleDateString('ru-RU')}</Text>
          </View>
        ) : null}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Пассажиры</Text>
          <Text style={styles.detailValue}>{passengers}</Text>
        </View>
      </View>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const details = booking.details as any;
  const hotelName = details?.name || details?.hotelName || summary?.title || 'Отель';
  const address = details?.address || '';
  const checkIn = details?.checkIn || details?.check_in || '';
  const checkOut = details?.checkOut || details?.check_out || '';
  const rooms = details?.rooms || 1;

  return (
    <View style={styles.detailsSection}>
      <Text style={styles.detailTitle}>Отель</Text>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Название</Text>
        <Text style={styles.detailValue}>{hotelName}</Text>
      </View>
      {address ? (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Адрес</Text>
          <Text style={styles.detailValue}>{address}</Text>
        </View>
      ) : null}
      {checkIn ? (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Заезд</Text>
          <Text style={styles.detailValue}>{new Date(checkIn).toLocaleDateString('ru-RU')}</Text>
        </View>
      ) : null}
      {checkOut ? (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Выезд</Text>
          <Text style={styles.detailValue}>{new Date(checkOut).toLocaleDateString('ru-RU')}</Text>
        </View>
      ) : null}
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Номеров</Text>
        <Text style={styles.detailValue}>{rooms}</Text>
      </View>
    </View>
  );
}

export function BookingConfirmModal({
  visible,
  booking,
  walletBalance,
  walletCurrency,
  onConfirm,
  onCancel,
}: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const hasEnoughBalance = walletBalance >= booking.totalPrice;

  async function handleConfirm() {
    if (!hasEnoughBalance) {
      Alert.alert(
        'Недостаточно средств',
        'Пополните кошелёк и повторите попытку.',
      );
      return;
    }

    setIsLoading(true);
    try {
      await onConfirm();
      toast.success('Бронирование успешно оплачено!');

      // Send local notification on successful booking
      if (booking.type === 'FLIGHT') {
        const details = booking.details as Partial<FlightDetails>;
        await sendBookingConfirmation({
          airline: details.airline ?? '',
          from: details.origin ?? '',
          to: details.destination ?? '',
          date: details.departureDate ?? '',
          price: booking.totalPrice,
        });
      } else {
        await sendBookingConfirmation({
          airline: '',
          from: '',
          to: booking.summary?.title ?? 'Отель',
          date: '',
          price: booking.totalPrice,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <Text style={styles.title}>Подтверждение брони</Text>
          <Text style={styles.provider}>Провайдер: {booking.provider}</Text>

          <BookingDetails booking={booking} />

          <View style={styles.priceSection}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Итого к оплате</Text>
              <Text style={styles.priceValue}>
                {booking.totalPrice.toLocaleString('ru-RU')} {booking.currency}
              </Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.balanceLabel}>Баланс кошелька</Text>
              <Text
                style={[
                  styles.balanceValue,
                  !hasEnoughBalance && styles.balanceInsufficient,
                ]}
              >
                {walletBalance.toLocaleString('ru-RU')} {walletCurrency}
              </Text>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onCancel}
              disabled={isLoading}
            >
              <Text style={styles.cancelText}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                !hasEnoughBalance && styles.confirmBtnDisabled,
              ]}
              onPress={() => {
                analytics.track(Events.BOOKING_STARTED, {
                  type: booking.type,
                  price: booking.totalPrice,
                  currency: booking.currency,
                });
                handleConfirm();
              }}
              disabled={isLoading || !hasEnoughBalance}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.confirmText}>
                  {hasEnoughBalance ? 'Оплатить' : 'Пополнить кошелёк'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    color: Colors.text,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    marginBottom: 4,
  },
  provider: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
    marginBottom: 20,
  },
  detailsSection: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  detailTitle: {
    color: Colors.primary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    letterSpacing: 1,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailLabel: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
  },
  detailValue: {
    color: Colors.text,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    maxWidth: '60%',
    textAlign: 'right',
  },
  priceSection: {
    marginBottom: 24,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceLabel: {
    color: Colors.text,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  priceValue: {
    color: Colors.text,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  balanceLabel: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
  },
  balanceValue: {
    color: Colors.success,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  balanceInsufficient: {
    color: Colors.error,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  cancelText: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  confirmBtn: {
    flex: 2,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
  },
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmText: {
    color: Colors.textInverse,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
});
