import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchIsinData } from "@/lib/providers/isin";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(req: NextRequest) {
  try {
    const { isin } = await req.json();
    if (!isin || typeof isin !== "string") return badRequest("Missing ISIN");

    const normalized = isin.trim().toUpperCase();
    if (!/^[A-Z0-9]{12}$/.test(normalized))
      return badRequest("ISIN must be 12 alphanumeric characters");

    // Fetch data from provider (stubbed for now)
    const data = await fetchIsinData(normalized);

    // Map provider data to Prisma enums
    const type = data.type; // 'STOCK' | 'ETF' | 'FUND'
    const distribution = data.distribution ?? null; // 'ACC' | 'DIST' | null

    // Upsert asset by unique ISIN
    const existing = await prisma.asset.findUnique({ where: { isin: normalized } });

    const asset = await prisma.asset.upsert({
      where: { isin: normalized },
      create: {
        isin: normalized,
        type: type as any,
        distribution: distribution as any,
      },
      update: {
        type: type as any,
        distribution: distribution as any,
      },
      select: { id: true, isin: true, type: true, distribution: true },
    });

    // Prepare listings for createMany
    const listingsInput = (data.listings || []).map((l) => ({
      assetId: asset.id,
      exchange: l.exchange,
      ticker: l.ticker,
      yahooSymbol: l.yahooSymbol,
    }));

    // Insert listings with skipDuplicates against the unique index
    if (listingsInput.length > 0) {
      await prisma.assetListing.createMany({
        data: listingsInput,
        skipDuplicates: true,
      });
    }

    const listings = await prisma.assetListing.findMany({
      where: { assetId: asset.id },
      select: { id: true, exchange: true, ticker: true, yahooSymbol: true },
      orderBy: [{ exchange: "asc" }, { ticker: "asc" }],
    });

    return NextResponse.json({
      created: !existing,
      asset,
      listings,
      preferredYahooSymbol: data.preferredYahooSymbol ?? null,
    });
  } catch (err: any) {
    console.error(err);
    const msg = typeof err?.message === "string" ? err.message : "Server error";
    const notFound = /not found/i.test(msg);
    const clientErr = /missing|invalid|must be/i.test(msg);
    const status = notFound ? 404 : clientErr ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
