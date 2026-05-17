-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "preferences" JSONB NOT NULL DEFAULT '{}';
