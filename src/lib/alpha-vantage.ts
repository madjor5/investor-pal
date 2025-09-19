const BASE_URL = "https://www.alphavantage.co/query"

export type DailyPricePoint = {
  date: string
  close: number
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
