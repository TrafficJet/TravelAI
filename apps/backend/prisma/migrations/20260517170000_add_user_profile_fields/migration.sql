-- Migration: add_user_profile_fields
-- Adds passport, emergency contact, DOB, nationality and preferred language to users table

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "date_of_birth"   TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "nationality"     TEXT,
  ADD COLUMN IF NOT EXISTS "passport_number" TEXT,
  ADD COLUMN IF NOT EXISTS "passport_expiry" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "emergency_name"  TEXT,
  ADD COLUMN IF NOT EXISTS "emergency_phone" TEXT,
  ADD COLUMN IF NOT EXISTS "preferred_lang"  TEXT NOT NULL DEFAULT 'ru';
