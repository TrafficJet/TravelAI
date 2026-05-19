-- AlterTable: add type and city fields to price_alerts, make origin/destination optional (default '')
ALTER TABLE "price_alerts"
  ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'flight',
  ADD COLUMN IF NOT EXISTS "city" TEXT,
  ALTER COLUMN "origin" SET DEFAULT '',
  ALTER COLUMN "destination" SET DEFAULT '';
