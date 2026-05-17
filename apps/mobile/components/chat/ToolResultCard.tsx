import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import type { FlightDetails, HotelDetails } from '../../types';

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
    <Text style={styles.stars}>{'★'.repeat(stars)}{'☆'.repeat(5 - stars)}</Text>
  );
}

export function ToolResultCard(props: ToolResultCardProps) {
  if (props.type === 'flight') {
    const { data, price, currency, onBook } = props;
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.typeLabel}>РЕЙС</Text>
          <Text style={styles.airline}>{data.airline}</Text>
        </View>
        <View style={styles.routeRow}>
          <View style={styles.routePoint}>
            <Text style={styles.city}>{data.origin}</Text>
            <Text style={styles.date}>{formatDate(data.departureDate)}</Text>
          </View>
          <View style={styles.arrowContainer}>
            <Text style={styles.arrow}>→</Text>
            <Text style={styles.flightNum}>{data.flightNumber}</Text>
          </View>
          <View style={styles.routePoint}>
            <Text style={styles.city}>{data.destination}</Text>
            {data.returnDate && (
              <Text style={styles.date}>обр. {formatDate(data.returnDate)}</Text>
            )}
          </View>
        </View>
        <View style={styles.detailsRow}>
          <Text style={styles.detail}>Класс: {data.cabin}</Text>
          <Text style={styles.detail}>Пасс.: {data.passengers}</Text>
        </View>
        <View style={styles.footer}>
          <Text style={styles.price}>
            {price.toLocaleString('ru-RU')} {currency}
          </Text>
          <TouchableOpacity style={styles.bookBtn} onPress={onBook}>
            <Text style={styles.bookBtnText}>Забронировать</Text>
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
    <TouchableOpacity style={styles.card} onPress={handleHotelPress} activeOpacity={0.85}>
      <View style={styles.header}>
        <Text style={styles.typeLabel}>ОТЕЛЬ</Text>
        <StarRating stars={data.stars} />
      </View>
      <Text style={styles.hotelName}>{data.name}</Text>
      <Text style={styles.address}>{data.address}</Text>
      <View style={styles.detailsRow}>
        <Text style={styles.detail}>
          {formatDate(data.checkIn)} — {formatDate(data.checkOut)}
        </Text>
        <Text style={styles.detail}>
          {data.rooms} ном., {data.guests} гост.
        </Text>
      </View>
      <View style={styles.footer}>
        <Text style={styles.price}>
          {data.pricePerNight.toLocaleString('ru-RU')} {currency}/ночь
        </Text>
        <TouchableOpacity style={styles.bookBtn} onPress={onBook}>
          <Text style={styles.bookBtnText}>Забронировать</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1C1C2E',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#2A2A42',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeLabel: {
    color: '#F59E0B',
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
    color: '#F59E0B',
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
    borderTopColor: '#2A2A42',
  },
  price: {
    color: '#F59E0B',
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  bookBtn: {
    backgroundColor: '#F59E0B',
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
