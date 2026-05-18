-- Fix: idempotently add profile columns that were baselined but never executed
-- Safe to run multiple times due to IF NOT EXISTS

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "date_of_birth"   TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "nationality"     TEXT,
  ADD COLUMN IF NOT EXISTS "passport_number" TEXT,
  ADD COLUMN IF NOT EXISTS "passport_expiry" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "emergency_name"  TEXT,
  ADD COLUMN IF NOT EXISTS "emergency_phone" TEXT,
  ADD COLUMN IF NOT EXISTS "preferred_lang"  TEXT NOT NULL DEFAULT 'ru';

-- Fix oauth fields too (also may be missing if baselined)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "provider"    TEXT NOT NULL DEFAULT 'email';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "provider_id" TEXT;

-- Make password nullable for OAuth users (safe if already nullable)
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

-- Ensure unique index exists for oauth
CREATE UNIQUE INDEX IF NOT EXISTS "users_provider_provider_id_key" ON "users"("provider", "provider_id");
