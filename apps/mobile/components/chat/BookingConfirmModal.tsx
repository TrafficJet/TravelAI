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
import { router } from 'expo-router';
import { Typography } from '../../constants/typography';
import { Radius } from '../../constants/radius';
import { sendBookingConfirmation } from '../../services/notifications.service';
import { analytics, Events } from '../../src/analytics';
import { useTheme } from '../../src/theme/ThemeContext';
import type { BookingDraft, FlightDetails } from '../../types';

interface Props {
  visible: boolean;
  booking: BookingDraft;
  walletBalance: number;
  walletCurrency: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isWalletLoading?: boolean;
}

function BookingDetails({ booking }: { booking: BookingDraft }) {
  const { colors } = useTheme();
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
      <View style={[detailStyles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[detailStyles.title, { color: colors.primary }]}>Авиабилет</Text>
        {summary && (
          <Text style={[detailStyles.value, { color: colors.text }]}>{summary.title}</Text>
        )}
        {origin && destination ? (
          <View style={detailStyles.row}>
            <Text style={[detailStyles.label, { color: colors.textMuted }]}>Маршрут</Text>
            <Text style={[detailStyles.value, { color: colors.text }]}>{origin} → {destination}</Text>
          </View>
        ) : null}
        {airline ? (
          <View style={detailStyles.row}>
            <Text style={[detailStyles.label, { color: colors.textMuted }]}>Авиакомпания</Text>
            <Text style={[detailStyles.value, { color: colors.text }]}>{airline}</Text>
          </View>
        ) : null}
        {flightNumber ? (
          <View style={detailStyles.row}>
            <Text style={[detailStyles.label, { color: colors.textMuted }]}>Рейс</Text>
            <Text style={[detailStyles.value, { color: colors.text }]}>{flightNumber}</Text>
          </View>
        ) : null}
        {departure ? (
          <View style={detailStyles.row}>
            <Text style={[detailStyles.label, { color: colors.textMuted }]}>Дата вылета</Text>
            <Text style={[detailStyles.value, { color: colors.text }]}>{new Date(departure).toLocaleDateString('ru-RU')}</Text>
          </View>
        ) : null}
        <View style={detailStyles.row}>
          <Text style={[detailStyles.label, { color: colors.textMuted }]}>Пассажиры</Text>
          <Text style={[detailStyles.value, { color: colors.text }]}>{passengers}</Text>
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
    <View style={[detailStyles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[detailStyles.title, { color: colors.primary }]}>Отель</Text>
      <View style={detailStyles.row}>
        <Text style={[detailStyles.label, { color: colors.textMuted }]}>Название</Text>
        <Text style={[detailStyles.value, { color: colors.text }]}>{hotelName}</Text>
      </View>
      {address ? (
        <View style={detailStyles.row}>
          <Text style={[detailStyles.label, { color: colors.textMuted }]}>Адрес</Text>
          <Text style={[detailStyles.value, { color: colors.text }]}>{address}</Text>
        </View>
      ) : null}
      {checkIn ? (
        <View style={detailStyles.row}>
          <Text style={[detailStyles.label, { color: colors.textMuted }]}>Заезд</Text>
          <Text style={[detailStyles.value, { color: colors.text }]}>{new Date(checkIn).toLocaleDateString('ru-RU')}</Text>
        </View>
      ) : null}
      {checkOut ? (
        <View style={detailStyles.row}>
          <Text style={[detailStyles.label, { color: colors.textMuted }]}>Выезд</Text>
          <Text style={[detailStyles.value, { color: colors.text }]}>{new Date(checkOut).toLocaleDateString('ru-RU')}</Text>
        </View>
      ) : null}
      <View style={detailStyles.row}>
        <Text style={[detailStyles.label, { color: colors.textMuted }]}>Номеров</Text>
        <Text style={[detailStyles.value, { color: colors.text }]}>{rooms}</Text>
      </View>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  section: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
  },
  title: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    letterSpacing: 1,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  label: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
  },
  value: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    maxWidth: '60%',
    textAlign: 'right',
  },
});

export function BookingConfirmModal({
  visible,
  booking,
  walletBalance,
  walletCurrency,
  onConfirm,
  onCancel,
  isWalletLoading,
}: Props) {
  const { colors } = useTheme();
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка при оплате';
      Alert.alert('Ошибка оплаты', msg);
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
      <View style={[staticStyles.overlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
        <View style={[staticStyles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[staticStyles.handle, { backgroundColor: colors.border }]} />

          <Text style={[staticStyles.title, { color: colors.text }]}>Подтверждение брони</Text>
          <Text style={[staticStyles.provider, { color: colors.textMuted }]}>Провайдер: {booking.provider}</Text>

          <BookingDetails booking={booking} />

          <View style={staticStyles.priceSection}>
            <View style={staticStyles.priceRow}>
              <Text style={[staticStyles.priceLabel, { color: colors.text }]}>Итого к оплате</Text>
              <Text style={[staticStyles.priceValue, { color: colors.text }]}>
                {booking.totalPrice.toLocaleString('ru-RU')} {booking.currency}
              </Text>
            </View>
            <View style={staticStyles.priceRow}>
              <Text style={[staticStyles.balanceLabel, { color: colors.textMuted }]}>Баланс кошелька</Text>
              <Text
                style={[
                  staticStyles.balanceValue,
                  { color: colors.success },
                  !hasEnoughBalance && { color: colors.error },
                ]}
              >
                {walletBalance.toLocaleString('ru-RU')} {walletCurrency}
              </Text>
            </View>
          </View>

          <View style={staticStyles.actions}>
            <TouchableOpacity
              style={[staticStyles.cancelBtn, { borderColor: colors.border }]}
              onPress={onCancel}
              disabled={isLoading}
            >
              <Text style={[staticStyles.cancelText, { color: colors.textMuted }]}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                staticStyles.confirmBtn,
                { backgroundColor: colors.primary },
                !hasEnoughBalance && staticStyles.confirmBtnDisabled,
              ]}
              onPress={() => {
                if (!hasEnoughBalance) {
                  onCancel();
                  router.push('/wallet/topup' as never);
                  return;
                }
                analytics.track(Events.BOOKING_STARTED, {
                  type: booking.type,
                  price: booking.totalPrice,
                  currency: booking.currency,
                });
                void handleConfirm();
              }}
              disabled={isLoading || isWalletLoading}
            >
              {isLoading || isWalletLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={staticStyles.confirmText}>
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

const staticStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: 'Sora',
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    marginBottom: 4,
  },
  provider: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
    marginBottom: 20,
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
    fontFamily: 'Inter',
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  priceValue: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  balanceLabel: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
  },
  balanceValue: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: Radius.buttonSm,
    borderWidth: 1.5,
  },
  cancelText: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  confirmBtn: {
    flex: 2,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: Radius.buttonSm,
  },
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmText: {
    color: '#0A0A14',
    fontFamily: 'Inter',
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
});
