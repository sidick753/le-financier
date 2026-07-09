-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "rejectionReason" TEXT;

-- AlterTable
ALTER TABLE "funding_requests" ADD COLUMN     "rejectionReason" TEXT;
