-- Add push_token column to users table for Expo push notifications
ALTER TABLE "users" ADD COLUMN "push_token" TEXT;

-- Add BOOKING_CONFIRMED value to NotificationType enum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'BOOKING_CONFIRMED';
