import { NextResponse } from "next/server"
import { findTickerCandidates } from "@/lib/ticker-resolution"
import { fetchYahooQuote } from "@/lib/yahoo-finance"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")?.trim() ?? ""
  const symbol = searchParams.get("symbol")?.trim() ?? ""
  const range = searchParams.get("range")?.trim() || undefined
  const interval = searchParams.get("interval")?.trim() || undefined

  if (symbol) {
    try {
      const quote = await fetchYahooQuote(symbol, { range, interval })
      return NextResponse.json({ quote })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      console.error("Stock quote fetch failed", message)
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }

  if (!query) {
    return NextResponse.json({ error: "Missing search query" }, { status: 400 })
  }

  try {
    const matches = await findTickerCandidates(query)
    return NextResponse.json({ matches })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("Stock search failed", message)

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
