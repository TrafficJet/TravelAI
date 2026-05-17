-- AlterTable: add OAuth provider fields to users
ALTER TABLE "users" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'email';
ALTER TABLE "users" ADD COLUMN "provider_id" TEXT;

-- AlterTable: make password nullable (for OAuth users)
ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;

-- CreateIndex: unique constraint on (provider, provider_id)
CREATE UNIQUE INDEX "users_provider_provider_id_key" ON "users"("provider", "provider_id");
