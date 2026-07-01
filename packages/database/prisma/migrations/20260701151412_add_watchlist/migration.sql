-- CreateTable
CREATE TABLE "watchlist" (
    "id" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "fundingRequestId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watchlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "watchlist_investorId_idx" ON "watchlist"("investorId");

-- CreateIndex
CREATE UNIQUE INDEX "watchlist_investorId_fundingRequestId_key" ON "watchlist"("investorId", "fundingRequestId");

-- AddForeignKey
ALTER TABLE "watchlist" ADD CONSTRAINT "watchlist_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist" ADD CONSTRAINT "watchlist_fundingRequestId_fkey" FOREIGN KEY ("fundingRequestId") REFERENCES "funding_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
