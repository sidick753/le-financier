-- CreateEnum
CREATE TYPE "PayoutClaimDirection" AS ENUM ('FUNDING_TO_PME', 'REPAYMENT_TO_INVESTOR');

-- CreateEnum
CREATE TYPE "PayoutClaimStatus" AS ENUM ('REQUESTED', 'PAID', 'REJECTED');

-- AlterEnum
ALTER TYPE "RepaymentScheduleStatus" ADD VALUE 'PARTIALLY_PAID';

-- CreateTable
CREATE TABLE "payout_claims" (
    "id" TEXT NOT NULL,
    "direction" "PayoutClaimDirection" NOT NULL,
    "fundingRequestId" TEXT,
    "repaymentScheduleId" TEXT,
    "amountRequested" DECIMAL(14,2) NOT NULL,
    "amountNet" DECIMAL(14,2),
    "status" "PayoutClaimStatus" NOT NULL DEFAULT 'REQUESTED',
    "requestedById" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payout_claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payout_claims_fundingRequestId_idx" ON "payout_claims"("fundingRequestId");

-- CreateIndex
CREATE INDEX "payout_claims_repaymentScheduleId_idx" ON "payout_claims"("repaymentScheduleId");

-- CreateIndex
CREATE INDEX "payout_claims_status_idx" ON "payout_claims"("status");

-- AddForeignKey
ALTER TABLE "payout_claims" ADD CONSTRAINT "payout_claims_fundingRequestId_fkey" FOREIGN KEY ("fundingRequestId") REFERENCES "funding_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_claims" ADD CONSTRAINT "payout_claims_repaymentScheduleId_fkey" FOREIGN KEY ("repaymentScheduleId") REFERENCES "repayment_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_claims" ADD CONSTRAINT "payout_claims_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_claims" ADD CONSTRAINT "payout_claims_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

