-- CreateEnum
CREATE TYPE "FundingCategory" AS ENUM ('FACTURE', 'PRET', 'EQUITY');

-- AlterTable
ALTER TABLE "funding_requests" ADD COLUMN     "category" "FundingCategory" NOT NULL DEFAULT 'PRET';

-- AlterTable
ALTER TABLE "investments" ADD COLUMN     "lockedReturn" DECIMAL(5,2);
