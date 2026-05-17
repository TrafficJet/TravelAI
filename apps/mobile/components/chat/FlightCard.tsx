import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { FavoriteButton } from '../ui/FavoriteButton';
import type { FlightOffer } from '../../types';

interface Props {
  flight: FlightOffer;
  onBook?: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}ч ${m}м`;
  if (h > 0) return `${h}ч`;
  return `${m}м`;
}

function formatCurrency(currency: string): string {
  if (currency === 'USD') return '$';
  if (currency === 'EUR') return '€';
  if (currency === 'RUB') return '₽';
  return currency;
}

function cabinLabel(cabin: string): string {
  const c = cabin.toLowerCase();
  if (c === 'economy' || c === 'econom') return 'Эконом';
  if (c === 'business') return 'Бизнес';
  if (c === 'first') return 'Первый класс';
  return cabin;
}

// ── RouteArrow ────────────────────────────────────────────────────────────────

function RouteArrow() {
  return (
    <View style={arrowStyles.wrap}>
      <View style={arrowStyles.line} />
      <View style={arrowStyles.arrowHead} />
    </View>
  );
}

const arrowStyles = StyleSheet.create({
  wrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  arrowHead: {
    width: 0,
    height: 0,
    borderTopWidth: 4,
    borderBottomWidth: 4,
    borderLeftWidth: 6,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: Colors.border,
    marginLeft: -1,
  },
});

// ── FlightCard ────────────────────────────────────────────────────────────────

export function FlightCard({ flight, onBook }: Props) {
  const currencySymbol = formatCurrency(flight.currency);

  function handlePress() {
    router.push({
      pathname: '/flight-detail',
      params: {
        origin: flight.origin,
        destination: flight.destination,
        departureDate: flight.departureDate,
        departureTime: flight.departureTime ?? '',
        arrivalTime: flight.arrivalTime ?? '',
        airline: flight.airline,
        flightNumber: flight.flightNumber,
        cabin: flight.cabin,
        stops: String(flight.stops ?? 0),
        durationMin: flight.durationMin !== undefined ? String(flight.durationMin) : '',
        price: String(flight.price),
        currency: flight.currency,
      },
    });
  }

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.82} style={styles.card}>

      {/* ── Top row: flight info + price + buy button ── */}
      <View style={styles.topRow}>
        <View style={styles.topLeft}>
          <Text style={styles.flightNumber}>✈  {flight.flightNumber}</Text>
          <Text style={styles.airlineName}>{flight.airline}</Text>
        </View>

        <View style={styles.topRight}>
          <Text style={styles.price}>
            {currencySymbol}{flight.price.toLocaleString('ru-RU')}
          </Text>
          <TouchableOpacity
            style={styles.buyBtn}
            onPress={onBook ?? handlePress}
            activeOpacity={0.8}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Text style={styles.buyBtnText}>Купить →</Text>
          </TouchableOpacity>
        </View>

        {/* Favorite — absolute top-right corner */}
        <View style={styles.favWrap}>
          <FavoriteButton type="flight" item={flight} size={18} />
        </View>
      </View>

      {/* ── Cabin row ── */}
      <View style={styles.cabinRow}>
        <Text style={styles.cabinText}>{cabinLabel(flight.cabin)}</Text>
      </View>

      {/* ── Divider ── */}
      <View style={styles.divider} />

      {/* ── Route row ── */}
      <View style={styles.routeRow}>
        {/* Origin */}
        <View style={styles.routePoint}>
          <Text style={styles.iataCode}>{flight.origin}</Text>
          {flight.departureTime ? (
            <Text style={styles.routeTime}>{flight.departureTime}</Text>
          ) : null}
        </View>

        {/* Center: duration + arrow */}
        <View style={styles.routeCenter}>
          {flight.durationMin !== undefined && (
            <Text style={styles.duration}>{formatDuration(flight.durationMin)}</Text>
          )}
          <RouteArrow />
        </View>

        {/* Destination */}
        <View style={[styles.routePoint, styles.routePointRight]}>
          <Text style={styles.iataCode}>{flight.destination}</Text>
          {flight.arrivalTime ? (
            <Text style={styles.routeTime}>{flight.arrivalTime}</Text>
          ) : null}
        </View>
      </View>

    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    marginHorizontal: 0,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  // Top row
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
    paddingRight: 28,
  },
  topLeft: {
    flex: 1,
  },
  flightNumber: {
    color: Colors.text,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    letterSpacing: 0.3,
  },
  airlineName: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    marginTop: 1,
  },
  topRight: {
    alignItems: 'flex-end',
    gap: 5,
  },
  price: {
    color: Colors.primary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    lineHeight: 22,
  },
  buyBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  buyBtnText: {
    color: Colors.textInverse,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  favWrap: {
    position: 'absolute',
    top: 0,
    right: 0,
  },

  // Cabin row
  cabinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cabinText: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 12,
  },

  // Route row
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routePoint: {
    alignItems: 'flex-start',
    minWidth: 44,
  },
  routePointRight: {
    alignItems: 'flex-end',
  },
  iataCode: {
    color: Colors.text,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    fontFamily: 'Sora',
    lineHeight: 28,
  },
  routeTime: {
    color: Colors.text,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    marginTop: 1,
  },
  routeCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 4,
  },
  duration: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    textAlign: 'center',
  },
});
