-- AlterTable
ALTER TABLE "wallet_transactions" ADD COLUMN     "external_id" TEXT;

-- CreateIndex
CREATE INDEX "wallet_transactions_external_id_idx" ON "wallet_transactions"("external_id");
