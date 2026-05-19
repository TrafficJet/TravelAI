import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Typography } from '../../constants/typography';
import { FlightCard } from './FlightCard';
import { HotelCard } from './HotelCard';
import { useTheme } from '../../src/theme/ThemeContext';
import type { FlightDetails, HotelDetails, FlightOffer, Hotel } from '../../types';

// ── Search result summary cards (shown when AI returns search results) ─────────

interface FlightSearchSummaryProps {
  count: number;
  minPrice: number;
  maxPrice: number;
  currency: string;
}

export function FlightSearchSummary({ count, minPrice, maxPrice, currency }: FlightSearchSummaryProps) {
  const { colors } = useTheme();
  return (
    <View style={[summaryStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={summaryStyles.iconRow}>
        <Text style={{ fontSize: 20, color: {colors.primary}, lineHeight: 24 }}>{'✈'}</Text>
        <Text style={[summaryStyles.label, { color: colors.textMuted }]}>Найдено рейсов</Text>
      </View>
      <Text style={[summaryStyles.count, { color: colors.text }]}>{count}</Text>
      <View style={[summaryStyles.divider, { backgroundColor: colors.border }]} />
      <View style={summaryStyles.priceRow}>
        <Text style={[summaryStyles.priceLabel, { color: colors.textMuted }]}>Цены от</Text>
        <Text style={[summaryStyles.priceValue, { color: colors.primary }]}>
          {minPrice.toLocaleString('ru-RU')} {currency}
        </Text>
        {maxPrice > minPrice && (
          <>
            <Text style={[summaryStyles.priceLabel, { color: colors.textMuted }]}> до </Text>
            <Text style={[summaryStyles.priceValue, { color: colors.primary }]}>
              {maxPrice.toLocaleString('ru-RU')} {currency}
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

interface HotelSearchSummaryProps {
  count: number;
  minPrice: number;
  maxPrice: number;
  currency: string;
}

export function HotelSearchSummary({ count, minPrice, maxPrice, currency }: HotelSearchSummaryProps) {
  const { colors } = useTheme();
  return (
    <View style={[summaryStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={summaryStyles.iconRow}>
        <Text style={{ fontSize: 20, color: {colors.primary}, lineHeight: 24 }}>{'🛏'}</Text>
        <Text style={[summaryStyles.label, { color: colors.textMuted }]}>Найдено отелей</Text>
      </View>
      <Text style={[summaryStyles.count, { color: colors.text }]}>{count}</Text>
      <View style={[summaryStyles.divider, { backgroundColor: colors.border }]} />
      <View style={summaryStyles.priceRow}>
        <Text style={[summaryStyles.priceLabel, { color: colors.textMuted }]}>от </Text>
        <Text style={[summaryStyles.priceValue, { color: colors.primary }]}>
          {minPrice.toLocaleString('ru-RU')} {currency}/ночь
        </Text>
        {maxPrice > minPrice && (
          <>
            <Text style={[summaryStyles.priceLabel, { color: colors.textMuted }]}> до </Text>
            <Text style={[summaryStyles.priceValue, { color: colors.primary }]}>
              {maxPrice.toLocaleString('ru-RU')} {currency}/ночь
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

interface TransferSearchSummaryProps {
  options: Array<{ type: string; price: number; currency: string; duration?: string }>;
}

export function TransferSearchSummary({ options }: TransferSearchSummaryProps) {
  const { colors } = useTheme();
  return (
    <View style={[summaryStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={summaryStyles.iconRow}>
        <Text style={summaryStyles.icon}>🚗</Text>
        <Text style={[summaryStyles.label, { color: colors.textMuted }]}>Варианты трансфера</Text>
      </View>
      <Text style={[summaryStyles.count, { color: colors.text }]}>{options.length}</Text>
      {options.length > 0 && (
        <>
          <View style={[summaryStyles.divider, { backgroundColor: colors.border }]} />
          {options.map((opt, i) => (
            <View key={i} style={summaryStyles.transferRow}>
              <Text style={[summaryStyles.transferType, { color: colors.text }]}>{opt.type}</Text>
              <View style={summaryStyles.transferRight}>
                {opt.duration ? (
                  <Text style={[summaryStyles.transferDuration, { color: colors.textMuted }]}>{opt.duration}</Text>
                ) : null}
                <Text style={[summaryStyles.priceValue, { color: colors.primary }]}>
                  {opt.price.toLocaleString('ru-RU')} {opt.currency}
                </Text>
              </View>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

const summaryStyles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  icon: {
    fontSize: 16,
  },
  label: {
    fontSize: Typography.sizes.sm,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  count: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  priceLabel: {
    fontSize: Typography.sizes.sm,
  },
  priceValue: {
    fontSize: Typography.sizes.base,
    fontWeight: '700',
  },
  transferRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  transferType: {
    fontSize: Typography.sizes.sm,
    flex: 1,
  },
  transferRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  transferDuration: {
    fontSize: Typography.sizes.xs,
  },
});

// ── ToolResultCard (legacy — kept for backward compatibility) ──────────────────

interface FlightResultProps {
  type: 'flight';
  data: FlightDetails;
  price: number;
  currency: string;
  onBook: () => void;
}

interface HotelResultProps {
  type: 'hotel';
  data: HotelDetails;
  currency: string;
  onBook: () => void;
}

type ToolResultCardProps = FlightResultProps | HotelResultProps;

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'short',
  });
}

function StarRating({ stars }: { stars: number }) {
  const { colors } = useTheme();
  return (
    <Text style={[legacyStyles.stars, { color: colors.warning }]}>{'★'.repeat(stars)}{'☆'.repeat(5 - stars)}</Text>
  );
}

export function ToolResultCard(props: ToolResultCardProps) {
  const { colors } = useTheme();

  if (props.type === 'flight') {
    const { data, price, currency, onBook } = props;
    return (
      <View style={[legacyStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={legacyStyles.header}>
          <Text style={[legacyStyles.typeLabel, { color: colors.primary }]}>РЕЙС</Text>
          <Text style={[legacyStyles.airline, { color: colors.textMuted }]}>{data.airline}</Text>
        </View>
        <View style={legacyStyles.routeRow}>
          <View style={legacyStyles.routePoint}>
            <Text style={[legacyStyles.city, { color: colors.text }]}>{data.origin}</Text>
            <Text style={[legacyStyles.date, { color: colors.textMuted }]}>{formatDate(data.departureDate)}</Text>
          </View>
          <View style={legacyStyles.arrowContainer}>
            <Text style={[legacyStyles.arrow, { color: colors.primary }]}>→</Text>
            <Text style={[legacyStyles.flightNum, { color: colors.textMuted }]}>{data.flightNumber}</Text>
          </View>
          <View style={legacyStyles.routePoint}>
            <Text style={[legacyStyles.city, { color: colors.text }]}>{data.destination}</Text>
            {data.returnDate && (
              <Text style={[legacyStyles.date, { color: colors.textMuted }]}>обр. {formatDate(data.returnDate)}</Text>
            )}
          </View>
        </View>
        <View style={legacyStyles.detailsRow}>
          <Text style={[legacyStyles.detail, { color: colors.textMuted }]}>Класс: {data.cabin}</Text>
          <Text style={[legacyStyles.detail, { color: colors.textMuted }]}>Пасс.: {data.passengers}</Text>
        </View>
        <View style={[legacyStyles.footer, { borderTopColor: colors.border }]}>
          <Text style={[legacyStyles.price, { color: colors.primary }]}>
            {price.toLocaleString('ru-RU')} {currency}
          </Text>
          <TouchableOpacity style={[legacyStyles.bookBtn, { backgroundColor: colors.primary }]} onPress={onBook}>
            <Text style={legacyStyles.bookBtnText}>Забронировать</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const { data, currency, onBook } = props;

  function handleHotelPress() {
    router.push({
      pathname: '/hotel-detail',
      params: {
        name: data.name,
        address: data.address,
        stars: String(data.stars),
        pricePerNight: String(data.pricePerNight),
        currency,
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        rooms: String(data.rooms),
        guests: String(data.guests),
      },
    });
  }

  return (
    <TouchableOpacity
      style={[legacyStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={handleHotelPress}
      activeOpacity={0.85}
    >
      <View style={legacyStyles.header}>
        <Text style={[legacyStyles.typeLabel, { color: colors.primary }]}>ОТЕЛЬ</Text>
        <StarRating stars={data.stars} />
      </View>
      <Text style={[legacyStyles.hotelName, { color: colors.text }]}>{data.name}</Text>
      <Text style={[legacyStyles.address, { color: colors.textMuted }]}>{data.address}</Text>
      <View style={legacyStyles.detailsRow}>
        <Text style={[legacyStyles.detail, { color: colors.textMuted }]}>
          {formatDate(data.checkIn)} — {formatDate(data.checkOut)}
        </Text>
        <Text style={[legacyStyles.detail, { color: colors.textMuted }]}>
          {data.rooms} ном., {data.guests} гост.
        </Text>
      </View>
      <View style={[legacyStyles.footer, { borderTopColor: colors.border }]}>
        <Text style={[legacyStyles.price, { color: colors.primary }]}>
          {data.pricePerNight.toLocaleString('ru-RU')} {currency}/ночь
        </Text>
        <TouchableOpacity style={[legacyStyles.bookBtn, { backgroundColor: colors.primary }]} onPress={onBook}>
          <Text style={legacyStyles.bookBtnText}>Забронировать</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const legacyStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    letterSpacing: 1,
  },
  airline: {
    fontSize: Typography.sizes.sm,
  },
  stars: {
    fontSize: Typography.sizes.sm,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  routePoint: {
    alignItems: 'center',
  },
  city: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  date: {
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  arrowContainer: {
    alignItems: 'center',
  },
  arrow: {
    fontSize: Typography.sizes.xl,
  },
  flightNum: {
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detail: {
    fontSize: Typography.sizes.sm,
  },
  hotelName: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    marginBottom: 4,
  },
  address: {
    fontSize: Typography.sizes.sm,
    marginBottom: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  price: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  bookBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 32,
  },
  bookBtnText: {
    color: '#0A0A14',
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
});

// ── ChatToolResult ─────────────────────────────────────────────────────────────
// Used in MessageBubble to render tool results inline in the chat.

interface ChatToolResultProps {
  toolName: string;
  result: unknown;
}

function isFlightOfferArray(data: unknown): data is FlightOffer[] {
  if (!Array.isArray(data) || data.length === 0) return false;
  const first = data[0] as Record<string, unknown>;
  return (
    typeof first === 'object' &&
    first !== null &&
    // Accept price:number (new normalised format) or totalPrice:string (legacy)
    (typeof first['price'] === 'number' || typeof first['totalPrice'] === 'string') &&
    // origin may live on top level or inside segments[0]
    (typeof first['origin'] === 'string' ||
      (Array.isArray(first['segments']) && (first['segments'] as unknown[])[0] !== undefined))
  );
}

function isHotelArray(data: unknown): data is Hotel[] {
  if (!Array.isArray(data) || data.length === 0) return false;
  const first = data[0] as Record<string, unknown>;
  return (
    typeof first === 'object' &&
    first !== null &&
    // Accept name (new format) or hotelName (legacy)
    (typeof first['name'] === 'string' || typeof first['hotelName'] === 'string') &&
    (typeof first['pricePerNight'] === 'number' || typeof first['pricePerNight'] === 'string')
  );
}

function extractOffers(result: unknown): unknown[] | null {
  if (Array.isArray(result)) return result;
  // Backend may wrap in { offers: [...] } or { hotels: [...] } or { data: [...] }
  if (result !== null && typeof result === 'object') {
    const r = result as Record<string, unknown>;
    if (Array.isArray(r['offers'])) return r['offers'];
    if (Array.isArray(r['hotels'])) return r['hotels'];
    if (Array.isArray(r['flights'])) return r['flights'];
    if (Array.isArray(r['data'])) return r['data'];
  }
  return null;
}

// ── Transfer option card ───────────────────────────────────────────────────────

interface TransferOptionCardProps {
  option: Record<string, unknown>;
  index: number;
}

function TransferOptionCard({ option, index }: TransferOptionCardProps) {
  const { colors } = useTheme();
  const typeIcons: Record<string, string> = {
    taxi: '🚕',
    bus: '🚌',
    train: '🚆',
    shuttle: '🚐',
    private: '🚗',
    metro: '🚇',
  };
  const rawType = typeof option['type'] === 'string' ? option['type'] : `Вариант ${index + 1}`;
  const icon = typeIcons[rawType.toLowerCase()] ?? '🚗';
  const price =
    typeof option['price'] === 'number'
      ? option['price'].toLocaleString('ru-RU')
      : typeof option['price'] === 'string'
      ? option['price']
      : '—';
  const currency = typeof option['currency'] === 'string' ? option['currency'] : '';
  const duration = typeof option['duration'] === 'string' ? option['duration'] : null;

  return (
    <View style={[transferCardStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={transferCardStyles.left}>
        <Text style={transferCardStyles.icon}>{icon}</Text>
        <View>
          <Text style={[transferCardStyles.type, { color: colors.text }]}>{rawType}</Text>
          {duration ? <Text style={[transferCardStyles.duration, { color: colors.textMuted }]}>{duration}</Text> : null}
        </View>
      </View>
      <Text style={[transferCardStyles.price, { color: colors.primary }]}>
        {price} {currency}
      </Text>
    </View>
  );
}

const transferCardStyles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  icon: {
    fontSize: 22,
  },
  type: {
    fontSize: Typography.sizes.sm,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  duration: {
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  price: {
    fontSize: Typography.sizes.base,
    fontWeight: '700',
  },
});

// ── Activity card ──────────────────────────────────────────────────────────────

interface ActivityCardProps {
  activity: Record<string, unknown>;
  index: number;
}

function ActivityCard({ activity, index }: ActivityCardProps) {
  const { colors } = useTheme();
  const name =
    typeof activity['name'] === 'string'
      ? activity['name']
      : typeof activity['title'] === 'string'
      ? activity['title']
      : `Активность ${index + 1}`;
  const price =
    typeof activity['price'] === 'number'
      ? activity['price'].toLocaleString('ru-RU')
      : typeof activity['price'] === 'string'
      ? activity['price']
      : null;
  const currency = typeof activity['currency'] === 'string' ? activity['currency'] : '';
  const description =
    typeof activity['description'] === 'string' ? activity['description'] : null;
  const duration = typeof activity['duration'] === 'string' ? activity['duration'] : null;

  return (
    <View style={[activityCardStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={activityCardStyles.header}>
        <Text style={activityCardStyles.icon}>🎯</Text>
        <View style={{ flex: 1 }}>
          <Text style={[activityCardStyles.name, { color: colors.text }]} numberOfLines={2}>
            {name}
          </Text>
          {duration ? <Text style={[activityCardStyles.meta, { color: colors.textMuted }]}>{duration}</Text> : null}
        </View>
        {price ? (
          <Text style={[activityCardStyles.price, { color: colors.primary }]}>
            {price} {currency}
          </Text>
        ) : null}
      </View>
      {description ? (
        <Text style={[activityCardStyles.description, { color: colors.textMuted }]} numberOfLines={2}>
          {description}
        </Text>
      ) : null}
    </View>
  );
}

const activityCardStyles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  icon: {
    fontSize: 22,
    marginTop: 1,
  },
  name: {
    fontSize: Typography.sizes.sm,
    fontWeight: '600',
    flex: 1,
  },
  meta: {
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  price: {
    fontSize: Typography.sizes.sm,
    fontWeight: '700',
    flexShrink: 0,
  },
  description: {
    fontSize: Typography.sizes.xs,
    marginTop: 6,
    lineHeight: 16,
  },
});

// ── Journey timing warning card ────────────────────────────────────────────────

interface JourneyTimingResult {
  warning?: string;
  recommendation?: string;
  departureTime?: string;
  arrivalTime?: string;
  connectionTime?: string;
  isTight?: boolean;
}

function JourneyTimingCard({ data }: { data: JourneyTimingResult }) {
  const { colors } = useTheme();
  const isTight = data.isTight ?? false;
  return (
    <View style={[
      timingStyles.card,
      { backgroundColor: colors.card, borderColor: colors.border },
      isTight && timingStyles.cardWarning,
    ]}>
      <View style={timingStyles.row}>
        <Text style={{ fontSize: 14, color: {isTight ? colors.warning : colors.textMuted}, lineHeight: 18 }}>{'•'}</Text>
        <Text style={[timingStyles.title, { color: colors.text }, isTight && { color: colors.primary }]}>
          {isTight ? 'Стыковка под угрозой' : 'Время в пути'}
        </Text>
      </View>
      {data.connectionTime ? (
        <Text style={[timingStyles.meta, { color: colors.textMuted }]}>Время стыковки: {data.connectionTime}</Text>
      ) : null}
      {data.warning ? (
        <Text style={[timingStyles.warning, { color: colors.primary }]}>{data.warning}</Text>
      ) : null}
      {data.recommendation ? (
        <Text style={[timingStyles.recommendation, { color: colors.text }]}>{data.recommendation}</Text>
      ) : null}
    </View>
  );
}

const timingStyles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 4,
    borderWidth: 1,
  },
  cardWarning: {
    borderColor: '#F59E0B66',
    backgroundColor: '#F59E0B11',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  title: {
    fontSize: Typography.sizes.sm,
    fontWeight: '700',
  },
  meta: {
    fontSize: Typography.sizes.xs,
    marginBottom: 4,
  },
  warning: {
    fontSize: Typography.sizes.sm,
    lineHeight: 18,
  },
  recommendation: {
    fontSize: Typography.sizes.xs,
    marginTop: 6,
    lineHeight: 16,
    fontStyle: 'italic',
  },
});

// ── Helpers ────────────────────────────────────────────────────────────────────

function isTransferArray(data: unknown[]): boolean {
  if (data.length === 0) return false;
  const first = data[0] as Record<string, unknown>;
  return (
    typeof first === 'object' &&
    first !== null &&
    (typeof first['type'] === 'string' || typeof first['vehicleType'] === 'string') &&
    (typeof first['price'] === 'number' || typeof first['price'] === 'string')
  );
}

function isActivityArray(data: unknown[]): boolean {
  if (data.length === 0) return false;
  const first = data[0] as Record<string, unknown>;
  return (
    typeof first === 'object' &&
    first !== null &&
    (typeof first['name'] === 'string' || typeof first['title'] === 'string')
  );
}

function isJourneyTimingResult(data: unknown): data is JourneyTimingResult {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d['warning'] === 'string' ||
    typeof d['recommendation'] === 'string' ||
    typeof d['connectionTime'] === 'string' ||
    typeof d['isTight'] === 'boolean'
  );
}

export function ChatToolResult({ toolName, result }: ChatToolResultProps) {
  const { colors } = useTheme();
  const lower = toolName.toLowerCase();
  const isFlight = lower.includes('flight');
  const isHotel = lower.includes('hotel');
  const isTransfer = lower.includes('transfer');
  const isJourneyTiming = lower.includes('journey') || lower.includes('timing');
  const isActivities = lower.includes('activit');

  const offers = extractOffers(result);

  // ── Flight results ──
  const FLIGHT_BADGES = ['budget', 'value', 'premium'] as const;
  if (isFlight && offers !== null && isFlightOfferArray(offers)) {
    return (
      <View style={chatResultStyles.wrap}>
        {offers.slice(0, 3).map((flight, i) => (
          <FlightCard key={flight.id ?? i} flight={flight} badge={FLIGHT_BADGES[i]} />
        ))}
        {offers.length > 3 && (
          <Text style={[chatResultStyles.moreText, { color: colors.textMuted }]}>+ ещё {offers.length - 3} рейсов</Text>
        )}
      </View>
    );
  }

  // ── Hotel results ──
  if (isHotel && offers !== null && isHotelArray(offers)) {
    return (
      <View style={chatResultStyles.wrap}>
        {offers.slice(0, 3).map((hotel, i) => (
          <HotelCard key={hotel.id ?? i} hotel={hotel} />
        ))}
        {offers.length > 3 && (
          <Text style={[chatResultStyles.moreText, { color: colors.textMuted }]}>+ ещё {offers.length - 3} отелей</Text>
        )}
      </View>
    );
  }

  // ── Transfer results ──
  if (isTransfer && offers !== null && isTransferArray(offers)) {
    const items = offers as Record<string, unknown>[];
    return (
      <View style={chatResultStyles.wrap}>
        <View style={chatResultStyles.sectionHeader}>
          <Text style={chatResultStyles.sectionIcon}>🚗</Text>
          <Text style={[chatResultStyles.sectionTitle, { color: colors.textMuted }]}>Варианты трансфера</Text>
        </View>
        {items.slice(0, 4).map((opt, i) => (
          <TransferOptionCard key={i} option={opt} index={i} />
        ))}
        {items.length > 4 && (
          <Text style={[chatResultStyles.moreText, { color: colors.textMuted }]}>+ ещё {items.length - 4} вариантов</Text>
        )}
      </View>
    );
  }

  // ── Journey timing ──
  if (isJourneyTiming && isJourneyTimingResult(result)) {
    return (
      <View style={chatResultStyles.wrap}>
        <JourneyTimingCard data={result} />
      </View>
    );
  }

  // ── Activities ──
  if (isActivities && offers !== null && isActivityArray(offers)) {
    const items = offers as Record<string, unknown>[];
    return (
      <View style={chatResultStyles.wrap}>
        <View style={chatResultStyles.sectionHeader}>
          <Text style={chatResultStyles.sectionIcon}>🎯</Text>
          <Text style={[chatResultStyles.sectionTitle, { color: colors.textMuted }]}>Активности</Text>
        </View>
        {items.slice(0, 3).map((act, i) => (
          <ActivityCard key={i} activity={act} index={i} />
        ))}
        {items.length > 3 && (
          <Text style={[chatResultStyles.moreText, { color: colors.textMuted }]}>+ ещё {items.length - 3} активностей</Text>
        )}
      </View>
    );
  }

  // ── Empty results ──
  if (isFlight && offers !== null && offers.length === 0) {
    return (
      <View style={[chatResultStyles.fallback, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={{ fontSize: 20, color: {colors.primary}, lineHeight: 24 }}>{'✈'}</Text>
        <Text style={[chatResultStyles.fallbackText, { color: colors.textMuted }]}>Рейсов не найдено по вашему запросу</Text>
      </View>
    );
  }

  if (isHotel && offers !== null && offers.length === 0) {
    return (
      <View style={[chatResultStyles.fallback, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={{ fontSize: 20, color: {colors.primary}, lineHeight: 24 }}>{'🛏'}</Text>
        <Text style={[chatResultStyles.fallbackText, { color: colors.textMuted }]}>Отелей не найдено по вашему запросу</Text>
      </View>
    );
  }

  // ── Fallback chip ──
  const fallbackText = isFlight
    ? 'Рейсы найдены'
    : isHotel
    ? 'Отели найдены'
    : isTransfer
    ? 'Трансфер найден'
    : isActivities
    ? 'Активности найдены'
    : 'Готово';
  const fallbackIconName: string = isFlight
    ? 'airplane'
    : isHotel
    ? 'bed-outline'
    : isTransfer
    ? 'car-outline'
    : isActivities
    ? 'flag-outline'
    : 'search-outline';
  return (
    <View style={[chatResultStyles.fallback, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={{ fontSize: 20, color: {colors.primary}, lineHeight: 24 }}>{'•'}</Text>
      <Text style={[chatResultStyles.fallbackText, { color: colors.textMuted }]}>{fallbackText}</Text>
    </View>
  );
}

const chatResultStyles = StyleSheet.create({
  wrap: {
    gap: 0,
    paddingHorizontal: 0,
    paddingVertical: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  sectionIcon: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: Typography.sizes.xs,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  moreText: {
    fontSize: Typography.sizes.xs,
    textAlign: 'center',
    paddingVertical: 6,
  },
  chip: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 16,
    marginVertical: 4,
  },
  chipIcon: {
    fontSize: 13,
  },
  chipText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  fallback: {
    flexDirection: 'row' as const,
    alignSelf: 'flex-start' as const,
    alignItems: 'center' as const,
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 16,
    marginVertical: 4,
  },
  fallbackText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium as '500',
  },
});
