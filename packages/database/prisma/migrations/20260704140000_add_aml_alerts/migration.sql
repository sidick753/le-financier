-- CreateEnum
CREATE TYPE "AmlAlertType" AS ENUM ('TRANSACTION_INHABITUELLE', 'PEP_DETECTE', 'BENEFICIAIRE_NON_IDENTIFIE');

-- CreateEnum
CREATE TYPE "AmlAlertStatus" AS ENUM ('EN_ANALYSE', 'BLOQUE', 'RESOLU');

-- CreateTable
CREATE TABLE "aml_alerts" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "organizationId" TEXT,
    "clientLabel" TEXT NOT NULL,
    "alertType" "AmlAlertType" NOT NULL,
    "amount" DECIMAL(14,2),
    "status" "AmlAlertStatus" NOT NULL DEFAULT 'EN_ANALYSE',
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aml_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "aml_alerts_institutionId_idx" ON "aml_alerts"("institutionId");

-- CreateIndex
CREATE INDEX "aml_alerts_status_idx" ON "aml_alerts"("status");

-- AddForeignKey
ALTER TABLE "aml_alerts" ADD CONSTRAINT "aml_alerts_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aml_alerts" ADD CONSTRAINT "aml_alerts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
