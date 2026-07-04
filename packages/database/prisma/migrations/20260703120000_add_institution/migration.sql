-- CreateEnum
CREATE TYPE "InstitutionMemberRole" AS ENUM ('OWNER', 'ANALYST', 'COMPLIANCE');

-- CreateEnum
CREATE TYPE "InstitutionMemberStatus" AS ENUM ('ACTIVE', 'TRAINING');

-- CreateTable
CREATE TABLE "institutions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "bceaoApprovalNumber" TEXT,
    "country" TEXT NOT NULL DEFAULT 'CI',
    "address" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "envelopeMax" DECIMAL(16,2),
    "ticketMin" DECIMAL(16,2),
    "ticketMax" DECIMAL(16,2),
    "excludedSectors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "apiKeyHash" TEXT,
    "apiKeyLastFour" TEXT,
    "apiKeyGeneratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "institution_members" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "role" "InstitutionMemberRole" NOT NULL DEFAULT 'ANALYST',
    "status" "InstitutionMemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "specialty" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "institution_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "institution_members_userId_key" ON "institution_members"("userId");

-- CreateIndex
CREATE INDEX "institution_members_institutionId_idx" ON "institution_members"("institutionId");

-- AddForeignKey
ALTER TABLE "institution_members" ADD CONSTRAINT "institution_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "institution_members" ADD CONSTRAINT "institution_members_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
