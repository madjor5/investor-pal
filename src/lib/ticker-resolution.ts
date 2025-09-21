export type TickerMatch = {
  symbol: string
  yahooSymbol: string
  name: string
  exchange?: string
  region?: string
  confidence: number
  description?: string
}

const BASE_URL = "https://query2.finance.yahoo.com/v1/finance/search"

const KNOWN_SUFFIXES = new Set([
  ".CO",
  ".ST",
  ".OL",
  ".HE",
  ".DE",
  ".BE",
  ".PA",
  ".L",
  ".SW",
  ".AS",
  ".MI",
  ".VI",
  ".SI",
  ".TO",
  ".V",
  ".NE",
  ".AX",
  ".NZ",
  ".SA",
  ".HK",
  ".KS",
  ".KQ",
  ".TW",
  ".TWO",
  ".SS",
  ".SZ",
  ".F",
  ".ME",
  ".MC",
  ".BR",
  ".MX",
])

type YahooSearchQuote = {
  symbol?: string
  shortname?: string
  longname?: string
  exchange?: string
  exchDisp?: string
  quoteType?: string
  typeDisp?: string
  region?: string
  sector?: string
  industry?: string
  score?: number | string
}

type YahooSearchResponse = {
  quotes?: YahooSearchQuote[]
}

const normalize = (value: unknown): string =>
  typeof value === "string" ? value.trim().toLowerCase() : ""

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

const clampConfidence = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, Math.min(1, value))
}

const deriveSymbol = (yahooSymbol: string): string => {
  const trimmed = yahooSymbol.trim()
  const dotIndex = trimmed.indexOf(".")
  if (dotIndex === -1) {
    return trimmed
  }

  const suffix = trimmed.slice(dotIndex).toUpperCase()
  if (KNOWN_SUFFIXES.has(suffix)) {
    return trimmed.slice(0, dotIndex)
  }

  return trimmed
}

const buildDescription = (quote: YahooSearchQuote): string | undefined => {
  const parts: string[] = []
  if (quote.typeDisp) {
    parts.push(quote.typeDisp)
  } else if (quote.quoteType) {
    parts.push(quote.quoteType.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()))
  }

  if (quote.sector) {
    parts.push(quote.sector)
  }

  if (quote.industry) {
    parts.push(quote.industry)
  }

  return parts.length > 0 ? parts.join(" · ") : undefined
}

const computeConfidence = (quote: YahooSearchQuote, normalizedQuery: string): number => {
  if (!normalizedQuery) {
    return 0.5
  }

  const symbol = normalize(quote.symbol)
  const shortname = normalize(quote.shortname)
  const longname = normalize(quote.longname)

  if (symbol && symbol === normalizedQuery) {
    return 1
  }

  if (symbol && normalizedQuery.length > 1 && symbol.startsWith(normalizedQuery)) {
    return 0.94
  }

  if (symbol && symbol.length > 1 && normalizedQuery.startsWith(symbol)) {
    return 0.9
  }

  if (shortname === normalizedQuery || longname === normalizedQuery) {
    return 0.88
  }

  const names = [symbol, shortname, longname].filter(Boolean)

  if (
    normalizedQuery.length > 2 &&
    names.some((name) => name.includes(normalizedQuery))
  ) {
    return 0.72
  }

  const words = normalizedQuery.split(/\s+/).filter(Boolean)
  if (
    words.length > 1 &&
    words.every((word) => names.some((name) => name.includes(word)))
  ) {
    return 0.68
  }

  const rawScore = toNumber(quote.score)
  if (rawScore && rawScore > 0) {
    const normalizedScore = Math.log10(rawScore + 1) / 5
    return clampConfidence(Math.max(0.35, normalizedScore))
  }

  return 0.45
}

export const findTickerCandidates = async (query: string): Promise<TickerMatch[]> => {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) {
    return []
  }

  const searchParams = new URLSearchParams({
    q: trimmedQuery,
    quotesCount: "10",
    newsCount: "0",
    listsCount: "0",
    lang: "en-US",
  })

  const response = await fetch(`${BASE_URL}?${searchParams.toString()}`, {
    headers: { "User-Agent": "investor-pal/1.0" },
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Yahoo Finance search failed with status ${response.status}`)
  }

  const payload: YahooSearchResponse = await response.json()
  const quotes = Array.isArray(payload.quotes) ? payload.quotes : []

  const normalizedQuery = normalize(trimmedQuery)
  const seen = new Set<string>()

  const matches = quotes
    .map((quote) => {
      const yahooSymbol = typeof quote.symbol === "string" ? quote.symbol.trim() : ""
      if (!yahooSymbol) {
        return null
      }

      const baseSymbol = deriveSymbol(yahooSymbol)
      const name = quote.longname?.trim() || quote.shortname?.trim() || yahooSymbol

      if (!name) {
        return null
      }

      if (seen.has(yahooSymbol)) {
        return null
      }

      seen.add(yahooSymbol)

      const confidence = computeConfidence(quote, normalizedQuery)

      return {
        symbol: baseSymbol,
        yahooSymbol,
        name,
        exchange: quote.exchDisp?.trim() || quote.exchange?.trim() || undefined,
        region: quote.region?.trim() || undefined,
        confidence,
        description: buildDescription(quote),
      }
    })
    .filter((match): match is TickerMatch => Boolean(match))

  matches.sort((a, b) => b.confidence - a.confidence || a.name.localeCompare(b.name))

  return matches
}
