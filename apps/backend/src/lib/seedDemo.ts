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

    // 2. Ensure PREMIUM subscription (upsert)
    await prisma.subscription.upsert({
      where: { userId: user.id },
      update: { plan: 'PREMIUM', status: 'ACTIVE', expiresAt: null },
      create: { userId: user.id, plan: 'PREMIUM', status: 'ACTIVE' },
    });
    console.log('[seed] Demo user has PREMIUM subscription');

    // 3. Ensure wallet exists with $5000
    const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
    if (!wallet) {
      await prisma.wallet.create({
        data: { userId: user.id, balance: 5000, currency: 'USD' },
      });
      console.log('[seed] Created demo wallet');
    } else if (wallet.balance < 100) {
      // Replenish if nearly empty
      await prisma.wallet.update({
        where: { userId: user.id },
        data: { balance: 5000 },
      });
      console.log('[seed] Replenished demo wallet');
    }
  } catch (err) {
    // Never crash server startup because of seed failure
    console.error('[seed] ensureDemoUser failed (non-fatal):', err);
  }
}
