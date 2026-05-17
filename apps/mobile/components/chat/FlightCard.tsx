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

// ── DashedRoute ───────────────────────────────────────────────────────────────

function DashedRoute() {
  const DASH_COUNT = 8;
  return (
    <View style={arrowStyles.wrap}>
      <View style={arrowStyles.dot} />
      <View style={arrowStyles.dashRow}>
        {Array.from({ length: DASH_COUNT }).map((_, i) => (
          <View key={i} style={arrowStyles.dash} />
        ))}
      </View>
      <View style={arrowStyles.arrowHead} />
    </View>
  );
}

const arrowStyles = StyleSheet.create({
  wrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.background,
    flexShrink: 0,
  },
  dashRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    overflow: 'hidden',
    marginHorizontal: 2,
  },
  dash: {
    flex: 1,
    height: 1.5,
    backgroundColor: `${Colors.primary}60`,
    marginHorizontal: 1,
    borderRadius: 1,
  },
  arrowHead: {
    width: 0,
    height: 0,
    borderTopWidth: 4,
    borderBottomWidth: 4,
    borderLeftWidth: 6,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: Colors.primary,
    marginLeft: -1,
    flexShrink: 0,
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
        airline: flight.airline,
        price: String(flight.price),
        currency: flight.currency,
        departureTime: flight.departureTime ?? '',
        arrivalTime: flight.arrivalTime ?? '',
        durationMin: String(flight.durationMin ?? 0),
        flightNumber: flight.flightNumber,
        cabin: flight.cabin,
      },
    } as never);
  }

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.82} style={styles.card}>

      {/* Favorite — absolute top-right */}
      <View style={styles.favWrap}>
        <FavoriteButton type="flight" item={flight} size={18} />
      </View>

      {/* ── 1. Top: airline + plane icon ── */}
      <View style={styles.airlineRow}>
        <Text style={styles.airlineIcon}>✈️</Text>
        <Text style={styles.airlineName}>{flight.airline}</Text>
        <Text style={styles.flightNumber}>{flight.flightNumber}</Text>
      </View>

      {/* ── Divider ── */}
      <View style={styles.divider} />

      {/* ── 2. Big route row: WAW → BCN with times ── */}
      <View style={styles.routeRow}>
        {/* Origin */}
        <View style={styles.routePoint}>
          <Text style={styles.iataCode}>{flight.origin}</Text>
          {flight.departureTime ? (
            <Text style={styles.routeTime}>{flight.departureTime}</Text>
          ) : null}
        </View>

        {/* Center: duration + dashed line */}
        <View style={styles.routeCenter}>
          {flight.durationMin !== undefined && (
            <Text style={styles.duration}>{formatDuration(flight.durationMin)}</Text>
          )}
          <DashedRoute />
        </View>

        {/* Destination */}
        <View style={[styles.routePoint, styles.routePointRight]}>
          <Text style={styles.iataCode}>{flight.destination}</Text>
          {flight.arrivalTime ? (
            <Text style={styles.routeTime}>{flight.arrivalTime}</Text>
          ) : null}
        </View>
      </View>

      {/* ── 4. Bottom: price + cabin + select button ── */}
      <View style={styles.bottomDivider} />
      <View style={styles.bottomRow}>
        {/* Price + cabin class */}
        <View style={styles.priceBlock}>
          <Text style={styles.price}>
            {currencySymbol}{flight.price.toLocaleString('ru-RU')}
          </Text>
          <Text style={styles.cabinText}>{cabinLabel(flight.cabin)}</Text>
        </View>

        {/* Select button */}
        <TouchableOpacity
          style={styles.selectBtn}
          onPress={onBook ?? handlePress}
          activeOpacity={0.8}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Text style={styles.selectBtnText}>Выбрать →</Text>
        </TouchableOpacity>
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

  // Fav button
  favWrap: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
  },

  // 1. Airline row
  airlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    paddingRight: 28,
  },
  airlineIcon: {
    fontSize: 14,
    lineHeight: 18,
  },
  airlineName: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
    flex: 1,
  },
  flightNumber: {
    color: Colors.textDisabled,
    fontSize: Typography.sizes.xs,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 12,
  },

  // 2. Route row
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
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
    marginTop: 2,
  },
  routeCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 4,
  },

  // 3. Duration
  duration: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    textAlign: 'center',
  },

  // 4. Bottom row
  bottomDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginTop: 14,
    marginBottom: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceBlock: {
    gap: 2,
  },
  price: {
    color: Colors.primary,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    fontFamily: 'Sora',
    lineHeight: 28,
  },
  cabinText: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
  },
  selectBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
  },
  selectBtnText: {
    color: Colors.textInverse,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    letterSpacing: 0.3,
  },
});
