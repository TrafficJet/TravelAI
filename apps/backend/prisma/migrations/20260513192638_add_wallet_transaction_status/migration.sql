-- CreateEnum
CREATE TYPE "WalletTransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "wallet_transactions" ADD COLUMN     "status" "WalletTransactionStatus" NOT NULL DEFAULT 'COMPLETED';
