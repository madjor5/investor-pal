-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('STOCK', 'ETF', 'FUND');

-- CreateEnum
CREATE TYPE "DistributionType" AS ENUM ('ACC', 'DIST');

-- CreateTable
CREATE TABLE "Asset" (
    "id" SERIAL NOT NULL,
    "isin" TEXT,
    "type" "AssetType" NOT NULL,
    "distribution" "DistributionType",

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetListing" (
    "id" SERIAL NOT NULL,
    "assetId" INTEGER NOT NULL,
    "exchange" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "yahooSymbol" TEXT NOT NULL,

    CONSTRAINT "AssetListing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Asset_isin_key" ON "Asset"("isin");

-- CreateIndex
CREATE UNIQUE INDEX "AssetListing_assetId_exchange_ticker_key" ON "AssetListing"("assetId", "exchange", "ticker");

-- AddForeignKey
ALTER TABLE "AssetListing" ADD CONSTRAINT "AssetListing_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
