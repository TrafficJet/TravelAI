// Creates demo user and test data for presentation
// Usage: npx ts-node prisma/seed-demo.ts

import { PrismaClient, BookingType, BookingStatus, BookingProvider, NotificationType, SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEMO_EMAIL = 'demo@travelai.app';
const DEMO_PASSWORD = 'Demo1234!';
const DEMO_NAME = 'Demo User';
const BCRYPT_ROUNDS = 10;

async function main() {
  console.log('Starting demo seed...');

  // Cleanup old chat sessions so demo starts fresh
  const existingUser = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existingUser) {
    await prisma.chatSession.deleteMany({ where: { userId: existingUser.id } });
    console.log('Cleared old chat sessions for demo user.');
  }

  // 1. Create or find the demo user
  let user = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });

  if (user) {
    console.log(`User ${DEMO_EMAIL} already exists — skipping user creation.`);
  } else {
    const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);
    user = await prisma.user.create({
      data: {
        email: DEMO_EMAIL,
        name: DEMO_NAME,
        password: hashedPassword,
        provider: 'email',
      },
    });
    console.log(`Created user: ${user.email} (id: ${user.id})`);
  }

  // 2. Wallet — create if missing, otherwise set balance to 5 000 USD
  const existingWallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
  if (existingWallet) {
    await prisma.wallet.update({
      where: { userId: user.id },
      data: { balance: 5000, currency: 'USD' },
    });
    console.log('Updated existing wallet balance to 5 000 USD.');
  } else {
    await prisma.wallet.create({
      data: { userId: user.id, balance: 5000, currency: 'USD' },
    });
    console.log('Created wallet with balance 5 000 USD.');
  }

  // 3. Subscription PREMIUM — upsert so demo account always has full access
  await prisma.subscription.upsert({
    where: { userId: user.id },
    update: {
      plan: SubscriptionPlan.PREMIUM,
      status: SubscriptionStatus.ACTIVE,
      expiresAt: null,
    },
    create: {
      userId: user.id,
      plan: SubscriptionPlan.PREMIUM,
      status: SubscriptionStatus.ACTIVE,
    },
  });
  console.log('Upserted PREMIUM subscription for demo user.');

  // 4. Bookings (only create if the user has fewer than 2 bookings)
  const bookingCount = await prisma.booking.count({ where: { userId: user.id } });
  if (bookingCount < 2) {
    // Flight: Moscow → Dubai
    const flightBooking = await prisma.booking.create({
      data: {
        userId: user.id,
        type: BookingType.FLIGHT,
        status: BookingStatus.CONFIRMED,
        provider: BookingProvider.AVIASALES,
        totalPrice: 499,
        currency: 'USD',
        details: {
          origin: 'SVO',
          destination: 'DXB',
          originCity: 'Москва',
          destinationCity: 'Дубай',
          departureDate: '2026-06-15',
          airline: 'Emirates',
          flightNumber: 'EK 132',
          passengers: 1,
        },
      },
    });
    console.log(`Created flight booking: ${flightBooking.id}`);

    // Hotel: Atlantis The Palm, Dubai
    const hotelBooking = await prisma.booking.create({
      data: {
        userId: user.id,
        type: BookingType.HOTEL,
        status: BookingStatus.CONFIRMED,
        provider: BookingProvider.BOOKING,
        totalPrice: 920,
        currency: 'USD',
        details: {
          hotelName: 'Atlantis The Palm',
          city: 'Дубай',
          checkIn: '2026-06-15',
          checkOut: '2026-06-18',
          nights: 3,
          roomType: 'Deluxe Ocean View',
          guests: 2,
        },
      },
    });
    console.log(`Created hotel booking: ${hotelBooking.id}`);
  } else {
    console.log(`User already has ${bookingCount} booking(s) — skipping.`);
  }

  // 4.5 Wallet transactions — show history in app
  const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
  if (wallet) {
    const txCount = await prisma.walletTransaction.count({ where: { walletId: wallet.id } });
    if (txCount === 0) {
      await prisma.walletTransaction.createMany({
        data: [
          {
            walletId: wallet.id,
            amount: 1000,
            type: 'TOPUP',
            status: 'COMPLETED',
            description: 'Пополнение счёта',
          },
          {
            walletId: wallet.id,
            amount: -499,
            type: 'DEBIT',
            status: 'COMPLETED',
            description: 'Рейс EK 132 SVO → DXB',
          },
          {
            walletId: wallet.id,
            amount: -920,
            type: 'DEBIT',
            status: 'COMPLETED',
            description: 'Atlantis The Palm, 3 ночи',
          },
          {
            walletId: wallet.id,
            amount: 350,
            type: 'TOPUP',
            status: 'COMPLETED',
            description: 'Возврат по бронированию',
          },
        ],
      });
      console.log('Created 4 wallet transactions.');
    } else {
      console.log('Wallet transactions already exist — skipping.');
    }
  }

  // 5. Search history
  const searchCount = await prisma.searchHistory.count({ where: { userId: user.id } });
  if (searchCount < 2) {
    await prisma.searchHistory.createMany({
      data: [
        {
          userId: user.id,
          query: 'Рейсы Москва → Дубай июнь 2026',
          type: 'flight',
          results: { count: 12, topPrice: 420, currency: 'USD' },
        },
        {
          userId: user.id,
          query: 'Отели Дубай 15-18 июня 2026',
          type: 'hotel',
          results: { count: 47, topPrice: 240, currency: 'USD' },
        },
        {
          userId: user.id,
          query: 'Что посмотреть в Дубае',
          type: 'ai_chat',
          results: { messageCount: 5 },
        },
      ],
    });
    console.log('Created 3 search history entries.');
  } else {
    console.log('Search history already populated — skipping.');
  }

  // 6. Welcome notification
  const notifCount = await prisma.notification.count({ where: { userId: user.id } });
  if (notifCount === 0) {
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: NotificationType.SYSTEM,
        title: 'Добро пожаловать в TravelAI!',
        body: 'Вы успешно зарегистрированы. Начните планировать своё путешествие с помощью AI-помощника.',
        isRead: false,
      },
    });
    console.log('Created welcome notification.');
  } else {
    console.log('Notifications already exist — skipping.');
  }

  console.log('Demo seed completed successfully.');
  console.log(`\nDemo credentials:\n  Email:    ${DEMO_EMAIL}\n  Password: ${DEMO_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
