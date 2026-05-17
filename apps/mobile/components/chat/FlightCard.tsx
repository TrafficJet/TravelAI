import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { FavoriteButton } from '../ui/FavoriteButton';
import type { FlightOffer } from '../../types';

interface Props {
  flight: FlightOffer;
  onBook?: () => void;
}

const IATA_PALETTE = [
  '#6366F1', '#0EA5E9', '#10B981', '#F59E0B',
  '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6',
];

function iataColor(code: string): string {
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = (hash * 31 + code.charCodeAt(i)) & 0xffffffff;
  }
  return IATA_PALETTE[Math.abs(hash) % IATA_PALETTE.length];
}

function AirlineLogo({ code }: { code: string }) {
  const letters = code.slice(0, 2).toUpperCase();
  const bg = iataColor(code);
  return (
    <View style={[logoStyles.wrap, { backgroundColor: bg }]}>
      <Text style={logoStyles.letters}>{letters}</Text>
    </View>
  );
}

const logoStyles = StyleSheet.create({
  wrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letters: {
    color: Colors.textInverse,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    letterSpacing: 0.5,
  },
});

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'short',
  });
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}ч ${m}мин` : `${m}мин`;
}

function StopsBadge({ stops }: { stops: number }) {
  const label =
    stops === 0 ? 'Прямой' : stops === 1 ? '1 пересадка' : `${stops} пересадки`;
  const color = stops === 0 ? Colors.success : stops === 1 ? Colors.warning : Colors.error;
  return (
    <View style={[stopStyles.wrap, { backgroundColor: `${color}22` }]}>
      <Text style={[stopStyles.text, { color }]}>{label}</Text>
    </View>
  );
}

const stopStyles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  text: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
});

export function FlightCard({ flight, onBook }: Props) {
  const iataCode = flight.flightNumber.slice(0, 2) || flight.airline.slice(0, 2);
  const currencySymbol = flight.currency === 'RUB' ? '₽' : flight.currency;

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
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8} style={styles.card}>
      {/* Favorite button — top right corner */}
      <View style={styles.favBtn}>
        <FavoriteButton type="flight" item={flight} size={20} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <AirlineLogo code={iataCode} />
          <View>
            <Text style={styles.airline}>{flight.airline}</Text>
            <Text style={styles.flightNum}>{flight.flightNumber}</Text>
          </View>
        </View>
      </View>

      {/* Route */}
      <View style={styles.routeRow}>
        <View style={styles.routePoint}>
          <Text style={styles.city}>{flight.origin}</Text>
          <Text style={styles.date}>{formatDate(flight.departureDate)}</Text>
          {flight.departureTime && <Text style={styles.time}>{flight.departureTime}</Text>}
        </View>

        <View style={styles.routeCenter}>
          <Ionicons name="airplane" size={18} color={Colors.primary} />
          {flight.durationMin !== undefined && (
            <Text style={styles.duration}>{formatDuration(flight.durationMin)}</Text>
          )}
        </View>

        <View style={[styles.routePoint, styles.routePointRight]}>
          <Text style={styles.city}>{flight.destination}</Text>
          {flight.returnDate && (
            <Text style={styles.date}>обр. {formatDate(flight.returnDate)}</Text>
          )}
          {flight.arrivalTime && <Text style={styles.time}>{flight.arrivalTime}</Text>}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <StopsBadge stops={flight.stops ?? 0} />
        </View>
        <Text style={styles.price}>
          {flight.price.toLocaleString('ru-RU')} {currencySymbol}
        </Text>
        {onBook && (
          <TouchableOpacity style={styles.bookBtn} onPress={onBook}>
            <Text style={styles.bookBtnText}>Забронировать</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  favBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingRight: 32,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  airline: {
    color: Colors.text,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  flightNum: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  routePoint: {
    flex: 1,
  },
  routePointRight: {
    alignItems: 'flex-end',
  },
  routeCenter: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  city: {
    color: Colors.text,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  date: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  time: {
    color: Colors.text,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    marginTop: 1,
  },
  duration: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    flexWrap: 'wrap',
    gap: 8,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  price: {
    color: Colors.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  bookBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  bookBtnText: {
    color: Colors.textInverse,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
});
