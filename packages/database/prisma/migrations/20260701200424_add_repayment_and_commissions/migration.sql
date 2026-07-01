-- CreateEnum
CREATE TYPE "RepaymentNature" AS ENUM ('INTEREST', 'INSTALLMENT', 'FINAL_PAYMENT');

-- CreateEnum
CREATE TYPE "RepaymentScheduleStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RepaymentPaymentStatus" AS ENUM ('CONFIRMED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('FUNDING_FEE', 'INTEREST_FEE');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'COLLECTED');

-- CreateTable
CREATE TABLE "repayment_schedules" (
    "id" TEXT NOT NULL,
    "fundingRequestId" TEXT NOT NULL,
    "investmentId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amountDue" DECIMAL(14,2) NOT NULL,
    "interestAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "principalAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "nature" "RepaymentNature" NOT NULL,
    "status" "RepaymentScheduleStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repayment_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repayment_payments" (
    "id" TEXT NOT NULL,
    "repaymentScheduleId" TEXT NOT NULL,
    "amountPaid" DECIMAL(14,2) NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "status" "RepaymentPaymentStatus" NOT NULL DEFAULT 'CONFIRMED',
    "proofDocumentId" TEXT,
    "confirmedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repayment_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commissions" (
    "id" TEXT NOT NULL,
    "type" "CommissionType" NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "fundingRequestId" TEXT NOT NULL,
    "repaymentPaymentId" TEXT,
    "baseAmount" DECIMAL(14,2) NOT NULL,
    "rate" DECIMAL(5,4) NOT NULL,
    "commissionAmount" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "repayment_schedules_fundingRequestId_idx" ON "repayment_schedules"("fundingRequestId");

-- CreateIndex
CREATE INDEX "repayment_schedules_investmentId_idx" ON "repayment_schedules"("investmentId");

-- CreateIndex
CREATE INDEX "repayment_schedules_dueDate_idx" ON "repayment_schedules"("dueDate");

-- CreateIndex
CREATE INDEX "repayment_schedules_status_idx" ON "repayment_schedules"("status");

-- CreateIndex
CREATE INDEX "repayment_payments_repaymentScheduleId_idx" ON "repayment_payments"("repaymentScheduleId");

-- CreateIndex
CREATE INDEX "commissions_fundingRequestId_idx" ON "commissions"("fundingRequestId");

-- CreateIndex
CREATE INDEX "commissions_status_idx" ON "commissions"("status");

-- AddForeignKey
ALTER TABLE "repayment_schedules" ADD CONSTRAINT "repayment_schedules_fundingRequestId_fkey" FOREIGN KEY ("fundingRequestId") REFERENCES "funding_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repayment_schedules" ADD CONSTRAINT "repayment_schedules_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "investments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repayment_payments" ADD CONSTRAINT "repayment_payments_repaymentScheduleId_fkey" FOREIGN KEY ("repaymentScheduleId") REFERENCES "repayment_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repayment_payments" ADD CONSTRAINT "repayment_payments_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_fundingRequestId_fkey" FOREIGN KEY ("fundingRequestId") REFERENCES "funding_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_repaymentPaymentId_fkey" FOREIGN KEY ("repaymentPaymentId") REFERENCES "repayment_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
