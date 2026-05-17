-- Rename table AnalyticsEvent -> analytics_events to match @@map convention
ALTER TABLE "AnalyticsEvent" RENAME TO "analytics_events";

-- Rename indexes to match new table name
ALTER INDEX "AnalyticsEvent_userId_idx"    RENAME TO "analytics_events_userId_idx";
ALTER INDEX "AnalyticsEvent_event_idx"     RENAME TO "analytics_events_event_idx";
ALTER INDEX "AnalyticsEvent_createdAt_idx" RENAME TO "analytics_events_createdAt_idx";

-- Rename primary key constraint
ALTER TABLE "analytics_events" RENAME CONSTRAINT "AnalyticsEvent_pkey" TO "analytics_events_pkey";
