/**
 * Manual Duffel API smoke-test script.
 *
 * Usage (from apps/backend/):
 *   npx ts-node scripts/test-duffel.ts
 *
 * The script reads DUFFEL_API_KEY from the environment (or .env file).
 * It performs a real offer-request search: WAW → BCN, departure = today + 14 days.
 * Output: HTTP response status (via thrown error details), offer count, and first offer summary.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from the backend root
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import { Duffel } from '@duffel/api';
import type { Offer } from '@duffel/api/types';

const ORIGIN = 'WAW';
const DESTINATION = 'BCN';

async function main(): Promise<void> {
  const apiKey = process.env.DUFFEL_API_KEY;

  if (!apiKey) {
    console.error('[test-duffel] ERROR: DUFFEL_API_KEY is not set in environment / .env file');
    process.exit(1);
  }

  // Departure: 14 days from today
  const departureDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  })();

  console.log(`[test-duffel] Key prefix : ${apiKey.slice(0, 20)}...`);
  console.log(`[test-duffel] Route      : ${ORIGIN} → ${DESTINATION}`);
  console.log(`[test-duffel] Date       : ${departureDate}`);
  console.log('[test-duffel] Sending offer request to Duffel API...\n');

  const client = new Duffel({ token: apiKey });

  try {
    const response = await client.offerRequests.create({
      slices: [
        {
          origin: ORIGIN,
          destination: DESTINATION,
          departure_date: departureDate,
          arrival_time: null,
          departure_time: null,
        },
      ],
      passengers: [{ type: 'adult' }],
      cabin_class: 'economy',
      return_offers: true,
    });

    const offerRequest = response.data;
    const offers = offerRequest.offers as Offer[];

    console.log(`[test-duffel] Offer request id : ${offerRequest.id}`);
    console.log(`[test-duffel] Offers returned  : ${offers.length}`);

    if (offers.length === 0) {
      console.warn('[test-duffel] No offers found for this route/date combination.');
      return;
    }

    // Sort by price ascending to get cheapest first
    const sorted = [...offers].sort(
      (a, b) => parseFloat(a.total_amount) - parseFloat(b.total_amount),
    );

    const first = sorted[0];
    const firstSegment = first.slices[0]?.segments[0];

    console.log('\n[test-duffel] --- Cheapest offer ---');
    console.log(`  Offer ID     : ${first.id}`);
    console.log(`  Total price  : ${first.total_amount} ${first.total_currency}`);
    console.log(`  Expires at   : ${first.expires_at}`);
    console.log(`  Slices       : ${first.slices.length}`);

    if (firstSegment) {
      console.log(`  Airline      : ${firstSegment.operating_carrier.name} (${firstSegment.operating_carrier.iata_code})`);
      console.log(`  Flight no.   : ${firstSegment.operating_carrier_flight_number}`);
      console.log(`  Departure    : ${firstSegment.departing_at}`);
      console.log(`  Arrival      : ${firstSegment.arriving_at}`);
      console.log(`  Duration     : ${firstSegment.duration ?? 'n/a'}`);
    }

    console.log('\n[test-duffel] --- Top 5 offers (price summary) ---');
    sorted.slice(0, 5).forEach((o, idx) => {
      const seg = o.slices[0]?.segments[0];
      const airline = seg?.operating_carrier.iata_code ?? '??';
      console.log(
        `  ${idx + 1}. ${o.total_amount} ${o.total_currency}  [${airline}]  expires: ${o.expires_at}`,
      );
    });
  } catch (err: unknown) {
    // Log full error details for diagnosis
    if (err instanceof Error) {
      console.error(`[test-duffel] API call failed: ${err.message}`);
      // Duffel SDK wraps HTTP errors — try to extract status/errors if present
      const anyErr = err as unknown as Record<string, unknown>;
      if (anyErr['status']) {
        console.error(`[test-duffel] HTTP status  : ${anyErr['status']}`);
      }
      if (anyErr['errors']) {
        console.error('[test-duffel] API errors   :', JSON.stringify(anyErr['errors'], null, 2));
      }
    } else {
      console.error('[test-duffel] Unknown error:', err);
    }
    process.exit(1);
  }
}

main();
