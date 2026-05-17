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
    typeof first['origin'] === 'string' &&
    typeof first['destination'] === 'string' &&
    typeof first['price'] === 'number'
  );
}

function isHotelArray(data: unknown): data is Hotel[] {
  if (!Array.isArray(data) || data.length === 0) return false;
  const first = data[0] as Record<string, unknown>;
  return (
    typeof first === 'object' &&
    first !== null &&
    typeof first['name'] === 'string' &&
    typeof first['pricePerNight'] === 'number'
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

export function ChatToolResult({ toolName, result }: ChatToolResultProps) {
  const lower = toolName.toLowerCase();
  const isFlight = lower.includes('flight');
  const isHotel = lower.includes('hotel');

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

  // ── Fallback chip ──
  return (
    <View style={chatResultStyles.chip}>
      <Text style={chatResultStyles.chipIcon}>{isFlight ? '✈️' : isHotel ? '🏨' : '🔍'}</Text>
      <Text style={chatResultStyles.chipText}>Поиск завершён</Text>
    </View>
  );
}

const chatResultStyles = StyleSheet.create({
  wrap: {
    gap: 0,
    paddingHorizontal: 12,
    paddingVertical: 6,
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
});
