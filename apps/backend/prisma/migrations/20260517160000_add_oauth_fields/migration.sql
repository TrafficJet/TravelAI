-- AlterTable: add OAuth provider fields to users (idempotent)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT 'email';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "provider_id" TEXT;

-- AlterTable: make password nullable (for OAuth users)
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

-- CreateIndex: unique constraint on (provider, provider_id)
CREATE UNIQUE INDEX IF NOT EXISTS "users_provider_provider_id_key" ON "users"("provider", "provider_id");
