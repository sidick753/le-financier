-- AlterTable
ALTER TABLE "funding_requests" ADD COLUMN     "disbursedAmount" DECIMAL(14,2),
ADD COLUMN     "disbursedAt" TIMESTAMP(3),
ADD COLUMN     "disbursedById" TEXT;

-- AlterTable
ALTER TABLE "investments" ADD COLUMN     "settlementRejectionReason" TEXT,
ADD COLUMN     "settlementValidatedAt" TIMESTAMP(3),
ADD COLUMN     "settlementValidatedById" TEXT;

-- AlterTable
ALTER TABLE "repayment_payments" ADD COLUMN     "disbursedAt" TIMESTAMP(3),
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "validatedAt" TIMESTAMP(3),
ADD COLUMN     "validatedById" TEXT,
ALTER COLUMN "status" SET DEFAULT 'PENDING_VALIDATION';

-- AddForeignKey
ALTER TABLE "funding_requests" ADD CONSTRAINT "funding_requests_disbursedById_fkey" FOREIGN KEY ("disbursedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investments" ADD CONSTRAINT "investments_settlementValidatedById_fkey" FOREIGN KEY ("settlementValidatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repayment_payments" ADD CONSTRAINT "repayment_payments_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
