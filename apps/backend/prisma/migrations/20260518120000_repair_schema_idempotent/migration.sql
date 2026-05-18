-- Repair migration: idempotently ensures the full schema is present.
-- Addresses the Railway P3005 baselining problem where earlier migrations
-- were marked as applied without their SQL actually running.
-- Every statement uses IF NOT EXISTS / DO-BLOCK guards so it is safe to run
-- multiple times on any DB state.

-- ── Enums (create only if absent) ────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WalletTransactionType') THEN
    CREATE TYPE "WalletTransactionType" AS ENUM ('TOPUP', 'DEBIT');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WalletTransactionStatus') THEN
    CREATE TYPE "WalletTransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubscriptionPlan') THEN
    CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'PREMIUM');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubscriptionStatus') THEN
    CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MessageRole') THEN
    CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT', 'TOOL_USE', 'TOOL_RESULT');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BookingType') THEN
    CREATE TYPE "BookingType" AS ENUM ('FLIGHT', 'HOTEL');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BookingStatus') THEN
    CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'FAILED');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BookingProvider') THEN
    CREATE TYPE "BookingProvider" AS ENUM ('DUFFEL', 'AVIASALES', 'BOOKING');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationType') THEN
    CREATE TYPE "NotificationType" AS ENUM ('PRICE_ALERT', 'BOOKING_UPDATE', 'SYSTEM');
  END IF;
END $$;

-- ── Core tables ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "name" TEXT NOT NULL,
    "password" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'email',
    "provider_id" TEXT,
    "deleted_at" TIMESTAMP(3),
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "date_of_birth" TIMESTAMP(3),
    "nationality" TEXT,
    "passport_number" TEXT,
    "passport_expiry" TIMESTAMP(3),
    "emergency_name" TEXT,
    "emergency_phone" TEXT,
    "preferred_lang" TEXT NOT NULL DEFAULT 'ru',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "users_provider_provider_id_key" ON "users"("provider", "provider_id");

-- Ensure password is nullable (for OAuth users) if the column exists as NOT NULL
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users'
      AND column_name = 'password'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;
  END IF;
END $$;

-- Add any missing columns to existing users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "provider"        TEXT NOT NULL DEFAULT 'email';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "provider_id"     TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deleted_at"      TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferences"     JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "date_of_birth"   TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "nationality"     TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passport_number" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passport_expiry" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emergency_name"  TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emergency_phone" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferred_lang"  TEXT NOT NULL DEFAULT 'ru';

CREATE TABLE IF NOT EXISTS "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "refresh_tokens_token_key" ON "refresh_tokens"("token");
CREATE INDEX IF NOT EXISTS "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'refresh_tokens_user_id_fkey'
  ) THEN
    ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "wallets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "wallets_user_id_key" ON "wallets"("user_id");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wallets_user_id_fkey'
  ) THEN
    ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "wallet_transactions" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "status" "WalletTransactionStatus" NOT NULL DEFAULT 'COMPLETED',
    "description" TEXT NOT NULL,
    "booking_id" TEXT,
    "external_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "wallet_transactions" ADD COLUMN IF NOT EXISTS "status"     "WalletTransactionStatus" NOT NULL DEFAULT 'COMPLETED';
ALTER TABLE "wallet_transactions" ADD COLUMN IF NOT EXISTS "external_id" TEXT;

CREATE INDEX IF NOT EXISTS "wallet_transactions_wallet_id_idx"    ON "wallet_transactions"("wallet_id");
CREATE INDEX IF NOT EXISTS "wallet_transactions_external_id_idx"  ON "wallet_transactions"("external_id");
CREATE INDEX IF NOT EXISTS "wallet_transactions_created_at_idx"   ON "wallet_transactions"("created_at");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wallet_transactions_wallet_id_fkey'
  ) THEN
    ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_fkey"
      FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_user_id_key" ON "subscriptions"("user_id");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_user_id_fkey'
  ) THEN
    ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "chat_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Новый чат',
    "system_prompt" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "chat_sessions" ADD COLUMN IF NOT EXISTS "system_prompt" TEXT;

CREATE INDEX IF NOT EXISTS "chat_sessions_user_id_idx"  ON "chat_sessions"("user_id");
CREATE INDEX IF NOT EXISTS "chat_sessions_updated_at_idx" ON "chat_sessions"("updated_at");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chat_sessions_user_id_fkey'
  ) THEN
    ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "messages" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "tool_name" TEXT,
    "tool_input" JSONB,
    "tool_result" JSONB,
    "tool_use_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "messages_session_id_idx" ON "messages"("session_id");
CREATE INDEX IF NOT EXISTS "messages_created_at_idx"  ON "messages"("created_at");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'messages_session_id_fkey'
  ) THEN
    ALTER TABLE "messages" ADD CONSTRAINT "messages_session_id_fkey"
      FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "bookings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "BookingType" NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "provider" "BookingProvider" NOT NULL,
    "external_id" TEXT,
    "details" JSONB NOT NULL,
    "total_price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "bookings_user_id_idx"    ON "bookings"("user_id");
CREATE INDEX IF NOT EXISTS "bookings_status_idx"     ON "bookings"("status");
CREATE INDEX IF NOT EXISTS "bookings_created_at_idx" ON "bookings"("created_at");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_user_id_fkey'
  ) THEN
    ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- ── Analytics events ──────────────────────────────────────────────────────────
-- Handle rename: old name was "AnalyticsEvent", new name is "analytics_events"
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'AnalyticsEvent' AND schemaname = 'public') THEN
    ALTER TABLE "AnalyticsEvent" RENAME TO "analytics_events";
    ALTER INDEX IF EXISTS "AnalyticsEvent_userId_idx"    RENAME TO "analytics_events_userId_idx";
    ALTER INDEX IF EXISTS "AnalyticsEvent_event_idx"     RENAME TO "analytics_events_event_idx";
    ALTER INDEX IF EXISTS "AnalyticsEvent_createdAt_idx" RENAME TO "analytics_events_createdAt_idx";
    ALTER TABLE "analytics_events" RENAME CONSTRAINT "AnalyticsEvent_pkey" TO "analytics_events_pkey";
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "analytics_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "event" TEXT NOT NULL,
    "properties" JSONB NOT NULL DEFAULT '{}',
    "platform" TEXT NOT NULL DEFAULT 'mobile',
    "appVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "analytics_events_userId_idx"    ON "analytics_events"("userId");
CREATE INDEX IF NOT EXISTS "analytics_events_event_idx"     ON "analytics_events"("event");
CREATE INDEX IF NOT EXISTS "analytics_events_createdAt_idx" ON "analytics_events"("createdAt");

-- ── Search history & price alerts ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "search_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "results" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "search_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "search_history_userId_idx" ON "search_history"("userId");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'search_history_userId_fkey'
  ) THEN
    ALTER TABLE "search_history" ADD CONSTRAINT "search_history_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "price_alerts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "maxPrice" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "triggeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "price_alerts_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'price_alerts_userId_fkey'
  ) THEN
    ALTER TABLE "price_alerts" ADD CONSTRAINT "price_alerts_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ── Notifications ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "notifications_user_id_idx"  ON "notifications"("user_id");
CREATE INDEX IF NOT EXISTS "notifications_is_read_idx"  ON "notifications"("is_read");
CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" ON "notifications"("created_at");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notifications_user_id_fkey'
  ) THEN
    ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ── Password reset tokens ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'password_reset_tokens_userId_fkey'
  ) THEN
    ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ── Favorites ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "favorites" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "favorites_userId_idx"           ON "favorites"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "favorites_userId_type_itemId_key" ON "favorites"("userId", "type", "itemId");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'favorites_userId_fkey'
  ) THEN
    ALTER TABLE "favorites" ADD CONSTRAINT "favorites_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
