-- Data migration: ensure demo user has PREMIUM subscription
-- Safe to run multiple times (idempotent UPDATE — affects 0 rows if user doesn't exist)
DO $$
BEGIN
  UPDATE subscriptions
  SET plan = 'PREMIUM'::"SubscriptionPlan",
      status = 'ACTIVE'::"SubscriptionStatus",
      expires_at = NULL,
      updated_at = NOW()
  WHERE user_id = (
    SELECT id FROM users WHERE email = 'demo@travelai.app'
  );
END $$;
