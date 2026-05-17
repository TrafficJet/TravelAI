import type Anthropic from '@anthropic-ai/sdk';

// Tool definition for Claude API
export const checkJourneyTimingTool: Anthropic.Tool = {
  name: 'check_journey_timing',
  description:
    'Проверяет временные конфликты в маршруте: разрыв между прилётом и заселением, пересадки, время трансфера. ВСЕГДА используй когда известны время прилёта и check-in отеля.',
  input_schema: {
    type: 'object' as const,
    properties: {
      arrival_time: {
        type: 'string',
        description: 'Время прилёта ISO формат или HH:MM',
      },
      checkin_time: {
        type: 'string',
        description: 'Время заселения в отель (обычно 14:00 или 15:00)',
      },
      airport_to_hotel_minutes: {
        type: 'number',
        description: 'Время трансфера от аэропорта до отеля в минутах',
      },
    },
    required: ['arrival_time', 'checkin_time'],
  },
};

export interface JourneyTimingResult {
  hasConflict: boolean;
  gapMinutes: number;
  gapDescription: string;
  recommendations: string[];
  severity: 'none' | 'minor' | 'major';
}

export interface CheckJourneyTimingInput {
  arrival_time: string;
  checkin_time: string;
  airport_to_hotel_minutes?: number;
}

// Parse a time string (HH:MM or ISO 8601) to minutes-since-midnight
function parseTimeToMinutes(t: string): number {
  if (t.includes('T')) {
    const d = new Date(t);
    return d.getHours() * 60 + d.getMinutes();
  }
  const parts = t.split(':');
  const h = parseInt(parts[0] ?? '0', 10);
  const m = parseInt(parts[1] ?? '0', 10);
  return h * 60 + m;
}

// Check for timing conflicts between arrival and hotel check-in
export function executeCheckJourneyTiming(
  input: CheckJourneyTimingInput,
): JourneyTimingResult {
  const arrivalMins = parseTimeToMinutes(input.arrival_time);
  const checkinMins = parseTimeToMinutes(input.checkin_time);
  const transferMins = input.airport_to_hotel_minutes ?? 30;

  const arrivalAtHotelMins = arrivalMins + transferMins;
  const gapMinutes = checkinMins - arrivalAtHotelMins;

  if (gapMinutes <= 0) {
    return {
      hasConflict: false,
      gapMinutes: 0,
      gapDescription: 'Всё ок — прибываете в отель после времени заселения',
      recommendations: [],
      severity: 'none',
    };
  }

  const gapHours = Math.floor(gapMinutes / 60);
  const gapMins = gapMinutes % 60;
  const gapDesc =
    gapHours > 0
      ? `${gapHours}ч ${gapMins}мин до заселения`
      : `${gapMinutes} минут до заселения`;

  if (gapMinutes < 60) {
    return {
      hasConflict: false,
      gapMinutes,
      gapDescription: gapDesc,
      recommendations: ['Небольшое ожидание — можно выпить кофе в лобби'],
      severity: 'minor',
    };
  }

  const recommendations: string[] = [
    '🔑 Попросить отель о раннем заселении (early check-in) — обычно +€20-50',
    '🧳 Оставить багаж на хранение в отеле и пойти гулять',
    `🚶 У вас есть ${gapDesc} — отличное время для завтрака и прогулки по городу`,
  ];

  if (gapMinutes >= 240) {
    recommendations.push(
      '💤 Рассмотреть дневной отдых в капсульном отеле у аэропорта',
    );
  }

  return {
    hasConflict: true,
    gapMinutes,
    gapDescription: gapDesc,
    recommendations,
    severity: gapMinutes >= 180 ? 'major' : 'minor',
  };
}
