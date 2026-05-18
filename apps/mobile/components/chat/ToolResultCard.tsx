import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { FlightCard } from './FlightCard';
import { HotelCard } from './HotelCard';
import type { FlightDetails, HotelDetails, FlightOffer, Hotel } from '../../types';

// ── Search result summary cards (shown when AI returns search results) ─────────

interface FlightSearchSummaryProps {
  count: number;
  minPrice: number;
  maxPrice: number;
  currency: string;
}

export function FlightSearchSummary({ count, minPrice, maxPrice, currency }: FlightSearchSummaryProps) {
  return (
    <View style={summaryStyles.card}>
      <View style={summaryStyles.iconRow}>
        <Text style={summaryStyles.icon}>✈️</Text>
        <Text style={summaryStyles.label}>Найдено рейсов</Text>
      </View>
      <Text style={summaryStyles.count}>{count}</Text>
      <View style={summaryStyles.divider} />
      <View style={summaryStyles.priceRow}>
        <Text style={summaryStyles.priceLabel}>Цены от</Text>
        <Text style={summaryStyles.priceValue}>
          {minPrice.toLocaleString('ru-RU')} {currency}
        </Text>
        {maxPrice > minPrice && (
          <>
            <Text style={summaryStyles.priceLabel}> до </Text>
            <Text style={summaryStyles.priceValue}>
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
  return (
    <View style={summaryStyles.card}>
      <View style={summaryStyles.iconRow}>
        <Text style={summaryStyles.icon}>🏨</Text>
        <Text style={summaryStyles.label}>Найдено отелей</Text>
      </View>
      <Text style={summaryStyles.count}>{count}</Text>
      <View style={summaryStyles.divider} />
      <View style={summaryStyles.priceRow}>
        <Text style={summaryStyles.priceLabel}>от </Text>
        <Text style={summaryStyles.priceValue}>
          {minPrice.toLocaleString('ru-RU')} {currency}/ночь
        </Text>
        {maxPrice > minPrice && (
          <>
            <Text style={summaryStyles.priceLabel}> до </Text>
            <Text style={summaryStyles.priceValue}>
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
  return (
    <View style={summaryStyles.card}>
      <View style={summaryStyles.iconRow}>
        <Text style={summaryStyles.icon}>🚗</Text>
        <Text style={summaryStyles.label}>Варианты трансфера</Text>
      </View>
      <Text style={summaryStyles.count}>{options.length}</Text>
      {options.length > 0 && (
        <>
          <View style={summaryStyles.divider} />
          {options.map((opt, i) => (
            <View key={i} style={summaryStyles.transferRow}>
              <Text style={summaryStyles.transferType}>{opt.type}</Text>
              <View style={summaryStyles.transferRight}>
                {opt.duration ? (
                  <Text style={summaryStyles.transferDuration}>{opt.duration}</Text>
                ) : null}
                <Text style={summaryStyles.priceValue}>
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
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: Colors.border,
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
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  count: {
    color: Colors.text,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 10,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  priceLabel: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
  },
  priceValue: {
    color: Colors.primary,
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
    color: Colors.text,
    fontSize: Typography.sizes.sm,
    flex: 1,
  },
  transferRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  transferDuration: {
    color: Colors.textMuted,
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
  return (
    <Text style={legacyStyles.stars}>{'★'.repeat(stars)}{'☆'.repeat(5 - stars)}</Text>
  );
}

export function ToolResultCard(props: ToolResultCardProps) {
  if (props.type === 'flight') {
    const { data, price, currency, onBook } = props;
    return (
      <View style={legacyStyles.card}>
        <View style={legacyStyles.header}>
          <Text style={legacyStyles.typeLabel}>РЕЙС</Text>
          <Text style={legacyStyles.airline}>{data.airline}</Text>
        </View>
        <View style={legacyStyles.routeRow}>
          <View style={legacyStyles.routePoint}>
            <Text style={legacyStyles.city}>{data.origin}</Text>
            <Text style={legacyStyles.date}>{formatDate(data.departureDate)}</Text>
          </View>
          <View style={legacyStyles.arrowContainer}>
            <Text style={legacyStyles.arrow}>→</Text>
            <Text style={legacyStyles.flightNum}>{data.flightNumber}</Text>
          </View>
          <View style={legacyStyles.routePoint}>
            <Text style={legacyStyles.city}>{data.destination}</Text>
            {data.returnDate && (
              <Text style={legacyStyles.date}>обр. {formatDate(data.returnDate)}</Text>
            )}
          </View>
        </View>
        <View style={legacyStyles.detailsRow}>
          <Text style={legacyStyles.detail}>Класс: {data.cabin}</Text>
          <Text style={legacyStyles.detail}>Пасс.: {data.passengers}</Text>
        </View>
        <View style={legacyStyles.footer}>
          <Text style={legacyStyles.price}>
            {price.toLocaleString('ru-RU')} {currency}
          </Text>
          <TouchableOpacity style={legacyStyles.bookBtn} onPress={onBook}>
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
    <TouchableOpacity style={legacyStyles.card} onPress={handleHotelPress} activeOpacity={0.85}>
      <View style={legacyStyles.header}>
        <Text style={legacyStyles.typeLabel}>ОТЕЛЬ</Text>
        <StarRating stars={data.stars} />
      </View>
      <Text style={legacyStyles.hotelName}>{data.name}</Text>
      <Text style={legacyStyles.address}>{data.address}</Text>
      <View style={legacyStyles.detailsRow}>
        <Text style={legacyStyles.detail}>
          {formatDate(data.checkIn)} — {formatDate(data.checkOut)}
        </Text>
        <Text style={legacyStyles.detail}>
          {data.rooms} ном., {data.guests} гост.
        </Text>
      </View>
      <View style={legacyStyles.footer}>
        <Text style={legacyStyles.price}>
          {data.pricePerNight.toLocaleString('ru-RU')} {currency}/ночь
        </Text>
        <TouchableOpacity style={legacyStyles.bookBtn} onPress={onBook}>
          <Text style={legacyStyles.bookBtnText}>Забронировать</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const legacyStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeLabel: {
    color: Colors.primary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    letterSpacing: 1,
  },
  airline: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
  },
  stars: {
    color: Colors.warning,
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
    color: Colors.text,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  date: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  arrowContainer: {
    alignItems: 'center',
  },
  arrow: {
    color: Colors.primary,
    fontSize: Typography.sizes.xl,
  },
  flightNum: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detail: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
  },
  hotelName: {
    color: Colors.text,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    marginBottom: 4,
  },
  address: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
    marginBottom: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  price: {
    color: Colors.primary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  bookBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 32,
  },
  bookBtnText: {
    color: Colors.textInverse,
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
    <View style={transferCardStyles.card}>
      <View style={transferCardStyles.left}>
        <Text style={transferCardStyles.icon}>{icon}</Text>
        <View>
          <Text style={transferCardStyles.type}>{rawType}</Text>
          {duration ? <Text style={transferCardStyles.duration}>{duration}</Text> : null}
        </View>
      </View>
      <Text style={transferCardStyles.price}>
        {price} {currency}
      </Text>
    </View>
  );
}

const transferCardStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: Colors.border,
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
    color: Colors.text,
    fontSize: Typography.sizes.sm,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  duration: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  price: {
    color: Colors.primary,
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
    <View style={activityCardStyles.card}>
      <View style={activityCardStyles.header}>
        <Text style={activityCardStyles.icon}>🎯</Text>
        <View style={{ flex: 1 }}>
          <Text style={activityCardStyles.name} numberOfLines={2}>
            {name}
          </Text>
          {duration ? <Text style={activityCardStyles.meta}>{duration}</Text> : null}
        </View>
        {price ? (
          <Text style={activityCardStyles.price}>
            {price} {currency}
          </Text>
        ) : null}
      </View>
      {description ? (
        <Text style={activityCardStyles.description} numberOfLines={2}>
          {description}
        </Text>
      ) : null}
    </View>
  );
}

const activityCardStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: Colors.border,
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
    color: Colors.text,
    fontSize: Typography.sizes.sm,
    fontWeight: '600',
    flex: 1,
  },
  meta: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  price: {
    color: Colors.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: '700',
    flexShrink: 0,
  },
  description: {
    color: Colors.textMuted,
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
  const isTight = data.isTight ?? false;
  return (
    <View style={[timingStyles.card, isTight && timingStyles.cardWarning]}>
      <View style={timingStyles.row}>
        <Text style={timingStyles.icon}>{isTight ? '⚠️' : 'ℹ️'}</Text>
        <Text style={[timingStyles.title, isTight && timingStyles.titleWarning]}>
          {isTight ? 'Стыковка под угрозой' : 'Время в пути'}
        </Text>
      </View>
      {data.connectionTime ? (
        <Text style={timingStyles.meta}>Время стыковки: {data.connectionTime}</Text>
      ) : null}
      {data.warning ? (
        <Text style={timingStyles.warning}>{data.warning}</Text>
      ) : null}
      {data.recommendation ? (
        <Text style={timingStyles.recommendation}>{data.recommendation}</Text>
      ) : null}
    </View>
  );
}

const timingStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: Colors.border,
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
  icon: { fontSize: 16 },
  title: {
    color: Colors.text,
    fontSize: Typography.sizes.sm,
    fontWeight: '700',
  },
  titleWarning: {
    color: Colors.primary,
  },
  meta: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    marginBottom: 4,
  },
  warning: {
    color: Colors.primary,
    fontSize: Typography.sizes.sm,
    lineHeight: 18,
  },
  recommendation: {
    color: Colors.text,
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
  const lower = toolName.toLowerCase();
  const isFlight = lower.includes('flight');
  const isHotel = lower.includes('hotel');
  const isTransfer = lower.includes('transfer');
  const isJourneyTiming = lower.includes('journey') || lower.includes('timing');
  const isActivities = lower.includes('activit');

  const offers = extractOffers(result);

  // ── Flight results ──
  if (isFlight && offers !== null && isFlightOfferArray(offers)) {
    return (
      <View style={chatResultStyles.wrap}>
        {offers.slice(0, 3).map((flight, i) => (
          <FlightCard key={flight.id ?? i} flight={flight} />
        ))}
        {offers.length > 3 && (
          <Text style={chatResultStyles.moreText}>+ ещё {offers.length - 3} рейсов</Text>
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
          <Text style={chatResultStyles.moreText}>+ ещё {offers.length - 3} отелей</Text>
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
          <Text style={chatResultStyles.sectionTitle}>Варианты трансфера</Text>
        </View>
        {items.slice(0, 4).map((opt, i) => (
          <TransferOptionCard key={i} option={opt} index={i} />
        ))}
        {items.length > 4 && (
          <Text style={chatResultStyles.moreText}>+ ещё {items.length - 4} вариантов</Text>
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
          <Text style={chatResultStyles.sectionTitle}>Активности</Text>
        </View>
        {items.slice(0, 3).map((act, i) => (
          <ActivityCard key={i} activity={act} index={i} />
        ))}
        {items.length > 3 && (
          <Text style={chatResultStyles.moreText}>+ ещё {items.length - 3} активностей</Text>
        )}
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
  const fallbackIcon = isFlight ? '✈️' : isHotel ? '🏨' : isTransfer ? '🚗' : isActivities ? '🎯' : '🔍';
  return (
    <View style={chatResultStyles.fallback}>
      <Text style={chatResultStyles.fallbackIcon}>{fallbackIcon}</Text>
      <Text style={chatResultStyles.fallbackText}>{fallbackText}</Text>
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
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  moreText: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    textAlign: 'center',
    paddingVertical: 6,
  },
  chip: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
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
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  fallback: {
    flexDirection: 'row' as const,
    alignSelf: 'flex-start' as const,
    alignItems: 'center' as const,
    gap: 6,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 16,
    marginVertical: 4,
  },
  fallbackIcon: {
    fontSize: 13,
  },
  fallbackText: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium as '500',
  },
});
