import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const DEMO_EMAIL = 'demo@travelai.app';
const DEMO_PASSWORD = 'Demo1234!';

/**
 * Ensures demo user exists with PREMIUM subscription.
 * Called once on server startup — safe to run multiple times (idempotent).
 */
export async function ensureDemoUser(prisma: PrismaClient): Promise<void> {
  try {
    // 1. Upsert user
    let user = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
    if (!user) {
      const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);
      user = await prisma.user.create({
        data: {
          email: DEMO_EMAIL,
          name: 'Demo User',
          password: hashedPassword,
          provider: 'email',
        },
      });
      console.log('[seed] Created demo user');
    }

    // 2. Ensure FREE subscription (upsert)
    await prisma.subscription.upsert({
      where: { userId: user.id },
      update: { plan: 'FREE', status: 'ACTIVE', expiresAt: null },
      create: { userId: user.id, plan: 'FREE', status: 'ACTIVE' },
    });
    console.log('[seed] Demo user has FREE subscription');

    // 3. Ensure wallet exists with $500.00
    const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
    if (!wallet) {
      await prisma.wallet.create({
        data: { userId: user.id, balance: 500, currency: 'USD' },
      });
      console.log('[seed] Created demo wallet with 500.00 USD');
    } else if (Number(wallet.balance) < 10) {
      // Replenish if nearly empty
      await prisma.wallet.update({
        where: { userId: user.id },
        data: { balance: 500 },
      });
      console.log('[seed] Replenished demo wallet to 500.00 USD');
    }
  } catch (err) {
    // Never crash server startup because of seed failure
    console.error('[seed] ensureDemoUser failed (non-fatal):', err);
  }
}
