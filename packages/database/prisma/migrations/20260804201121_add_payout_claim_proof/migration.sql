-- AlterTable
ALTER TABLE "payout_claims" ADD COLUMN "proofDocumentId" TEXT,
ADD COLUMN "paidAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "payout_claims_proofDocumentId_key" ON "payout_claims"("proofDocumentId");
