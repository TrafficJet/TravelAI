import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { Typography } from '../../constants/typography';
import { FavoriteButton } from '../ui/FavoriteButton';
import { useTheme } from '../../src/theme/ThemeContext';
import type { FlightOffer, FlightProvider } from '../../types';

type BadgeType = 'budget' | 'value' | 'premium';

interface Props {
  flight: FlightOffer;
  onBook?: () => void;
  badge?: BadgeType;
  provider?: FlightProvider;
}

// ── Provider badge config ──────────────────────────────────────────────────────

const PROVIDER_CONFIG: Record<FlightProvider, { label: string; bg: string; color: string }> = {
  AVIASALES: { label: 'Aviasales', bg: 'rgba(255, 107, 0, 0.15)', color: '#FF6B00' },
  DUFFEL:    { label: 'Duffel',    bg: 'rgba(59,  130, 246, 0.15)', color: '#3B82F6' },
};

const BADGE_CONFIG: Record<BadgeType, { label: string; glyph: string; bg: string; color: string }> = {
  budget:  { label: 'Дешевле',       glyph: '⚡',  bg: 'rgba(16, 185, 129, 0.15)', color: '#10B981' },
  value:   { label: 'Лучший выбор',  glyph: '★', bg: 'rgba(232, 160, 32, 0.15)', color: '#E8A020' },
  premium: { label: 'Премиум',       glyph: '✦',   bg: 'rgba(124, 92, 252, 0.15)', color: '#7C5CFC' },
};

// ── Airline logo helpers ───────────────────────────────────────────────────────

const AIRLINE_IATA: Record<string, string> = {
  'Wizz Air': 'W6',
  'Ryanair': 'FR',
  'LOT Polish Airlines': 'LO',
  'LOT': 'LO',
  'British Airways': 'BA',
  'Lufthansa': 'LH',
  'Air France': 'AF',
  'KLM': 'KL',
  'Turkish Airlines': 'TK',
  'easyJet': 'U2',
  'EasyJet': 'U2',
  'Iberia': 'IB',
  'Vueling': 'VY',
  'Swiss': 'LX',
  'Austrian': 'OS',
  'SAS': 'SK',
  'Finnair': 'AY',
  'Alitalia': 'AZ',
  'ITA Airways': 'AZ',
  'Aeroflot': 'SU',
  'Ukraine International': 'PS',
  'UIA': 'PS',
  'Qatar Airways': 'QR',
  'Emirates': 'EK',
  'Pegasus': 'PC',
  'Flydubai': 'FZ',
};

const AIRLINE_COLORS = [
  '#E63946',
  '#2196F3',
  '#4CAF50',
  '#FF9800',
  '#9C27B0',
  '#00BCD4',
  '#F44336',
  '#3F51B5',
];

function airlineColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return AIRLINE_COLORS[h % AIRLINE_COLORS.length];
}

function airlineInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

interface AirlineLogoProps {
  name: string;
}

function AirlineLogo({ name }: AirlineLogoProps) {
  const iata = AIRLINE_IATA[name];
  const [failed, setFailed] = useState(false);

  if (iata && !failed) {
    return (
      <Image
        source={{ uri: `https://pics.avs.io/80/80/${iata}.png` }}
        style={logoStyles.logo}
        resizeMode="contain"
        onError={() => setFailed(true)}
      />
    );
  }

  // Fallback: coloured circle with initials
  return (
    <View style={[logoStyles.fallback, { backgroundColor: airlineColor(name) }]}>
      <Text style={logoStyles.fallbackText}>{airlineInitials(name)}</Text>
    </View>
  );
}

const logoStyles = StyleSheet.create({
  logo: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  fallback: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    color: '#FFFFFF',
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

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
  if (currency === 'KZT') return '₸';
  if (currency === 'UAH') return '₴';
  return '$';
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
  const { colors } = useTheme();
  const DASH_COUNT = 8;
  return (
    <View style={arrowStyles.wrap}>
      <View style={[arrowStyles.dot, { borderColor: colors.primary, backgroundColor: colors.card }]} />
      <View style={arrowStyles.dashRow}>
        {Array.from({ length: DASH_COUNT }).map((_, i) => (
          <View key={i} style={[arrowStyles.dash, { backgroundColor: `${colors.primary}60` }]} />
        ))}
      </View>
      <View style={[arrowStyles.arrowHead, { borderLeftColor: colors.primary }]} />
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
    marginLeft: -1,
    flexShrink: 0,
  },
});

// ── FlightCard ────────────────────────────────────────────────────────────────

export function FlightCard({ flight, onBook, badge, provider }: Props) {
  const { colors } = useTheme();
  const currencySymbol = formatCurrency(flight.currency);
  // Resolve provider: explicit prop overrides field from flight object
  const resolvedProvider: FlightProvider | undefined =
    provider ?? flight.provider;

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
    <TouchableOpacity onPress={handlePress} activeOpacity={0.82} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>

      {/* Badge — absolute top-left */}
      {badge && (
        <View
          style={[
            styles.badgePill,
            { backgroundColor: BADGE_CONFIG[badge].bg },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 11, color: BADGE_CONFIG[badge].color }}>{BADGE_CONFIG[badge].glyph}</Text>
            <Text style={[styles.badgeText, { color: BADGE_CONFIG[badge].color }]}>
              {BADGE_CONFIG[badge].label}
            </Text>
          </View>
        </View>
      )}


      {/* Favorite — absolute top-right */}
      <View style={styles.favWrap}>
        <FavoriteButton type="flight" item={flight} size={18} />
      </View>

      {/* ── 1. Top: airline logo + name + flight number ── */}
      <View style={[styles.airlineRow, badge && styles.airlineRowWithBadge]}>
        <AirlineLogo name={flight.airline} />
        <View style={styles.airlineTextBlock}>
          <Text style={[styles.airlineName, { color: colors.textMuted }]}>{flight.airline}</Text>
          <View style={styles.flightNumberRow}>
            <Text style={[styles.flightNumber, { color: colors.textDisabled }]}>{flight.flightNumber}</Text>
            {resolvedProvider && (
              <View
                style={[
                  styles.providerBadge,
                  { backgroundColor: PROVIDER_CONFIG[resolvedProvider].bg },
                ]}
              >
                <Text
                  style={[
                    styles.providerBadgeText,
                    { color: PROVIDER_CONFIG[resolvedProvider].color },
                  ]}
                >
                  {PROVIDER_CONFIG[resolvedProvider].label}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* ── Divider ── */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* ── 2. Big route row: WAW → BCN with times ── */}
      <View style={styles.routeRow}>
        {/* Origin */}
        <View style={styles.routePoint}>
          <Text style={[styles.iataCode, { color: colors.text }]}>{flight.origin}</Text>
          {flight.departureTime ? (
            <Text style={[styles.routeTime, { color: colors.text }]}>{flight.departureTime}</Text>
          ) : null}
        </View>

        {/* Center: duration + dashed line */}
        <View style={styles.routeCenter}>
          {flight.durationMin !== undefined && (
            <Text style={[styles.duration, { color: colors.textMuted }]}>{formatDuration(flight.durationMin)}</Text>
          )}
          <DashedRoute />
        </View>

        {/* Destination */}
        <View style={[styles.routePoint, styles.routePointRight]}>
          <Text style={[styles.iataCode, { color: colors.text }]}>{flight.destination}</Text>
          {flight.arrivalTime ? (
            <Text style={[styles.routeTime, { color: colors.text }]}>{flight.arrivalTime}</Text>
          ) : null}
        </View>
      </View>

      {/* ── 4. Bottom: price + cabin + select button ── */}
      <View style={[styles.bottomDivider, { backgroundColor: colors.border }]} />
      <View style={styles.bottomRow}>
        {/* Price + cabin class */}
        <View style={styles.priceBlock}>
          <Text style={[styles.price, { color: colors.primary }]}>
            {currencySymbol}{flight.price.toLocaleString('ru-RU')}
          </Text>
          <Text style={[styles.cabinText, { color: colors.textMuted }]}>{cabinLabel(flight.cabin)}</Text>
        </View>

        {/* Select button */}
        <TouchableOpacity
          style={[styles.selectBtn, { backgroundColor: colors.primary }]}
          onPress={onBook ?? handlePress}
          activeOpacity={0.8}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Text style={[styles.selectBtnText, { color: colors.textInverse }]}>Выбрать →</Text>
        </TouchableOpacity>
      </View>

    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 16,
    marginHorizontal: 0,
    marginVertical: 4,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  // Badge pill — top-left
  badgePill: {
    position: 'absolute',
    top: 10,
    left: 12,
    zIndex: 2,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
  },

  // Provider badge — inline next to flight number
  flightNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  providerBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  providerBadgeText: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
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
    gap: 10,
    marginBottom: 10,
    paddingRight: 32,
  },
  airlineRowWithBadge: {
    marginTop: 22,
  },
  airlineTextBlock: {
    flex: 1,
    gap: 1,
  },
  airlineName: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  flightNumber: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xs,
  },

  // Divider
  divider: {
    height: 1,
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
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    fontFamily: 'Sora',
    lineHeight: 28,
  },
  routeTime: {
    fontFamily: 'Inter',
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
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xs,
    textAlign: 'center',
  },

  // 4. Bottom row
  bottomDivider: {
    height: 1,
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
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    fontFamily: 'Sora',
    lineHeight: 28,
  },
  cabinText: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xs,
  },
  selectBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
  },
  selectBtnText: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    letterSpacing: 0.3,
  },
});
