-- CreateEnum
CREATE TYPE "NegotiationOfferAuthor" AS ENUM ('INVESTOR', 'PME');

-- CreateEnum
CREATE TYPE "NegotiationOfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'COUNTERED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InvestmentStatus" ADD VALUE 'NEGOTIATING';
ALTER TYPE "InvestmentStatus" ADD VALUE 'REJECTED';

-- CreateTable
CREATE TABLE "negotiation_offers" (
    "id" TEXT NOT NULL,
    "investmentId" TEXT NOT NULL,
    "proposedBy" "NegotiationOfferAuthor" NOT NULL,
    "proposedReturn" DECIMAL(5,2) NOT NULL,
    "status" "NegotiationOfferStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "negotiation_offers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "negotiation_offers_investmentId_idx" ON "negotiation_offers"("investmentId");

-- AddForeignKey
ALTER TABLE "negotiation_offers" ADD CONSTRAINT "negotiation_offers_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "investments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
