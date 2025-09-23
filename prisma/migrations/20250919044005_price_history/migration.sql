-- CreateEnum
CREATE TYPE "PriceInterval" AS ENUM ('DAILY', 'MONTHLY');

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "interval" "PriceInterval" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PriceHistory_instrumentId_interval_date_idx" ON "PriceHistory"("instrumentId", "interval", "date");

-- CreateIndex
CREATE UNIQUE INDEX "PriceHistory_instrumentId_interval_date_key" ON "PriceHistory"("instrumentId", "interval", "date");

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "Instrument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
