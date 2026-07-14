-- CreateEnum
CREATE TYPE "FundingInvestorMode" AS ENUM ('SINGLE_INVESTOR', 'MULTIPLE_INVESTORS');

-- AlterTable
ALTER TABLE "funding_requests" ADD COLUMN     "investorMode" "FundingInvestorMode" NOT NULL DEFAULT 'MULTIPLE_INVESTORS';

