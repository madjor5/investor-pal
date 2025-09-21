const BASE_URL = "https://www.alphavantage.co/query"

export type DailyPricePoint = {
  date: string
  close: number
}

export type SymbolSearchMatch = {
  symbol: string
  name: string
  region: string
  currency: string
  matchScore: number
  type: string
}

export type GlobalQuote = {
  symbol: string
  open: number | null
  high: number | null
  low: number | null
  price: number | null
  volume: number | null
  latestTradingDay: string | null
  previousClose: number | null
  change: number | null
  changePercent: number | null
}

type TimeSeriesResponse = {
  [date: string]: {
    [key: string]: string
  }
}

type FetchOptions = {
  days?: number
}

const parseClose = (entry: Record<string, string>): number | null => {
  const closeValue = entry["5. adjusted close"] ?? entry["4. close"]
  if (!closeValue) {
    return null
  }

  const parsed = Number.parseFloat(closeValue)
  return Number.isFinite(parsed) ? parsed : null
}

export const getDailySeries = async (
  symbol: string,
  options: FetchOptions = {}
): Promise<DailyPricePoint[]> => {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY
  if (!apiKey) {
    throw new Error("Alpha Vantage API key is not configured")
  }

  const { days = 252 } = options
  const outputsize = days > 100 ? "full" : "compact"

  const searchParams = new URLSearchParams({
    function: "TIME_SERIES_DAILY",
    symbol,
    apikey: apiKey,
    outputsize,
  })

  const response = await fetch(`${BASE_URL}?${searchParams.toString()}`, {
    headers: { "User-Agent": "investor-pal/1.0" },
    next: { revalidate: 60 * 60 },
  })

  if (!response.ok) {
    throw new Error(`Alpha Vantage request failed with status ${response.status}`)
  }

  const payload = await response.json()

  if (payload?.Note) {
    throw new Error("Alpha Vantage API rate limit exceeded")
  }

  if (payload?.["Error Message"]) {
    throw new Error(`Alpha Vantage error: ${payload["Error Message"]}`)
  }

  const timeSeries: TimeSeriesResponse | undefined = payload?.["Time Series (Daily)"]
  if (!timeSeries) {
    const detail =
      payload?.Information ??
      payload?.Note ??
      payload?.["Error Message"] ??
      "Alpha Vantage response missing daily series"

    console.warn(`Alpha Vantage response missing daily series for ${symbol}: ${detail}`)
    return []
  }

  const entries = Object.entries(timeSeries)
    .map(([date, values]) => {
      const close = parseClose(values)
      if (close === null) {
        return null
      }

      return { date, close }
    })
    .filter((entry): entry is DailyPricePoint => entry !== null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  if (entries.length === 0) {
    throw new Error(`Alpha Vantage returned no price history for ${symbol}`)
  }

  if (typeof days === "number" && days > 0 && entries.length > days) {
    return entries.slice(entries.length - days)
  }

  return entries
}

export const getMonthlySeries = async (symbol: string): Promise<DailyPricePoint[]> => {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY
  if (!apiKey) {
    throw new Error("Alpha Vantage API key is not configured")
  }

  const searchParams = new URLSearchParams({
    function: "TIME_SERIES_MONTHLY",
    symbol,
    apikey: apiKey,
  })

  const response = await fetch(`${BASE_URL}?${searchParams.toString()}`, {
    headers: { "User-Agent": "investor-pal/1.0" },
    next: { revalidate: 60 * 60 * 24 },
  })

  if (!response.ok) {
    throw new Error(`Alpha Vantage request failed with status ${response.status}`)
  }

  const payload = await response.json()

  if (payload?.Note) {
    throw new Error("Alpha Vantage API rate limit exceeded")
  }

  if (payload?.["Error Message"]) {
    throw new Error(`Alpha Vantage error: ${payload["Error Message"]}`)
  }

  const timeSeries: TimeSeriesResponse | undefined = payload?.["Monthly Time Series"]
  if (!timeSeries) {
    const detail =
      payload?.Information ??
      payload?.Note ??
      payload?.["Error Message"] ??
      "Alpha Vantage response missing monthly series"

    console.warn(`Alpha Vantage response missing monthly series for ${symbol}: ${detail}`)
    return []
  }

  const entries = Object.entries(timeSeries)
    .map(([date, values]) => {
      const close = parseClose(values)
      if (close === null) {
        return null
      }

      return { date, close }
    })
    .filter((entry): entry is DailyPricePoint => entry !== null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return entries
}

const readRequiredKey = () => {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY
  if (!apiKey) {
    throw new Error("Alpha Vantage API key is not configured")
  }

  return apiKey
}

type AlphaVantageBaseResponse = {
  Note?: string
  Information?: string
  [key: string]: unknown
}

const handleAlphaVantageErrors = (payload: AlphaVantageBaseResponse, context: string) => {
  if (payload?.Note) {
    throw new Error("Alpha Vantage API rate limit exceeded")
  }

  const errorMessage = payload?.["Error Message"]
  if (typeof errorMessage === "string") {
    throw new Error(`Alpha Vantage error (${context}): ${errorMessage}`)
  }
}

const toNumberOrNull = (value: string | undefined): number | null => {
  if (!value) {
    return null
  }

  const parsed = Number.parseFloat(value.replace(/%$/, ""))
  return Number.isFinite(parsed) ? parsed : null
}

export const searchSymbols = async (keywords: string): Promise<SymbolSearchMatch[]> => {
  if (!keywords.trim()) {
    return []
  }

  const apiKey = readRequiredKey()
  const searchParams = new URLSearchParams({
    function: "SYMBOL_SEARCH",
    keywords,
    apikey: apiKey,
  })

  const response = await fetch(`${BASE_URL}?${searchParams.toString()}`, {
    headers: { "User-Agent": "investor-pal/1.0" },
    next: { revalidate: 60 * 60 },
  })

  if (!response.ok) {
    throw new Error(`Alpha Vantage request failed with status ${response.status}`)
  }

  const payload: AlphaVantageBaseResponse & { bestMatches?: Record<string, string>[] } =
    await response.json()

  handleAlphaVantageErrors(payload, "symbol search")

  const matches = payload?.bestMatches ?? []

  return matches
    .map((match) => ({
      symbol: match["1. symbol"] ?? "",
      name: match["2. name"] ?? "",
      type: match["3. type"] ?? "",
      region: match["4. region"] ?? "",
      currency: match["8. currency"] ?? "",
      matchScore: toNumberOrNull(match["9. matchScore"]) ?? 0,
    }))
    .filter((match) => Boolean(match.symbol))
    .sort((a, b) => b.matchScore - a.matchScore)
}

export const getGlobalQuote = async (symbol: string): Promise<GlobalQuote | null> => {
  if (!symbol.trim()) {
    return null
  }

  const apiKey = readRequiredKey()

  const searchParams = new URLSearchParams({
    function: "GLOBAL_QUOTE",
    symbol,
    apikey: apiKey,
  })

  const response = await fetch(`${BASE_URL}?${searchParams.toString()}`, {
    headers: { "User-Agent": "investor-pal/1.0" },
    next: { revalidate: 60 },
  })

  if (!response.ok) {
    throw new Error(`Alpha Vantage request failed with status ${response.status}`)
  }

  const payload: AlphaVantageBaseResponse & { ["Global Quote"]?: Record<string, string> } =
    await response.json()

  handleAlphaVantageErrors(payload, "global quote")

  const quote = payload?.["Global Quote"]
  if (!quote) {
    return null
  }

  const changePercentRaw = quote["10. change percent"]

  return {
    symbol: quote["01. symbol"] ?? symbol,
    open: toNumberOrNull(quote["02. open"]),
    high: toNumberOrNull(quote["03. high"]),
    low: toNumberOrNull(quote["04. low"]),
    price: toNumberOrNull(quote["05. price"]),
    volume: toNumberOrNull(quote["06. volume"]),
    latestTradingDay: quote["07. latest trading day"] ?? null,
    previousClose: toNumberOrNull(quote["08. previous close"]),
    change: toNumberOrNull(quote["09. change"]),
    changePercent: changePercentRaw ? toNumberOrNull(changePercentRaw) : null,
  }
}
