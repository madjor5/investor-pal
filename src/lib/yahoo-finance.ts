const BASE_URL = "https://query1.finance.yahoo.com/v8/finance/chart"

export type YahooPricePoint = {
  date: string
  close: number
}

export type YahooQuote = {
  symbol: string
  name: string
  exchange: string | null
  currency: string | null
  price: number | null
  change: number | null
  changePercent: number | null
  previousClose: number | null
  marketTime: string | null
  dayLow: number | null
  dayHigh: number | null
  volume: number | null
  range: string
  interval: string
  history: YahooPricePoint[]
}

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: Record<string, unknown>
      timestamp?: number[]
      indicators?: {
        adjclose?: Array<{ adjclose?: Array<number | null> }>
        close?: Array<{ close?: Array<number | null> }>
      }
    }>
    error?: {
      code?: string
      description?: string
    }
  }
}

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const toStringOrNull = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value : null

const toISODate = (timestamp: number | null | undefined) =>
  typeof timestamp === "number" && Number.isFinite(timestamp)
    ? new Date(timestamp * 1000).toISOString()
    : null

export const fetchYahooQuote = async (
  symbol: string,
  options: { range?: string; interval?: string } = {}
): Promise<YahooQuote | null> => {
  const trimmed = symbol.trim()
  if (!trimmed) {
    return null
  }

  const { range = "5y", interval = "1d" } = options

  const searchParams = new URLSearchParams({ range, interval })
  const response = await fetch(`${BASE_URL}/${encodeURIComponent(trimmed)}?${searchParams.toString()}`, {
    headers: { "User-Agent": "investor-pal/1.0" },
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Yahoo Finance request failed with status ${response.status}`)
  }

  const payload: YahooChartResponse = await response.json()
  const result = payload.chart?.result?.[0]
  if (!result) {
    const description = payload.chart?.error?.description ?? "Unknown Yahoo Finance error"
    throw new Error(`Yahoo Finance error: ${description}`)
  }

  const meta = result.meta ?? {}
  const symbolValue = toStringOrNull(meta.symbol) ?? trimmed
  const name = toStringOrNull(meta.longName) ?? toStringOrNull(meta.shortName) ?? symbolValue
  const exchange = toStringOrNull(meta.fullExchangeName) ?? toStringOrNull(meta.exchangeName)
  const currency = toStringOrNull(meta.currency)

  const price = toNumber(meta.regularMarketPrice)
  const change = toNumber(meta.regularMarketChange)
  const changePercent = toNumber(meta.regularMarketChangePercent)
  const previousClose = toNumber(meta.previousClose) ?? toNumber(meta.chartPreviousClose)
  const marketTime = toISODate(toNumber(meta.regularMarketTime))
  const dayLow = toNumber(meta.regularMarketDayLow)
  const dayHigh = toNumber(meta.regularMarketDayHigh)
  const volume = toNumber(meta.regularMarketVolume)

  const timestamps = Array.isArray(result.timestamp) ? result.timestamp : []
  const adjCloseSeries = result.indicators?.adjclose?.[0]?.adjclose
  const closeSeries = result.indicators?.close?.[0]?.close
  const prices = Array.isArray(adjCloseSeries) ? adjCloseSeries : Array.isArray(closeSeries) ? closeSeries : []

  const history: YahooPricePoint[] = []
  for (let i = 0; i < Math.min(timestamps.length, prices.length); i++) {
    const ts = timestamps[i]
    const closeValue = prices[i]
    if (typeof ts !== "number" || closeValue === null || typeof closeValue !== "number") {
      continue
    }

    if (!Number.isFinite(closeValue)) {
      continue
    }

    history.push({ date: new Date(ts * 1000).toISOString().slice(0, 10), close: closeValue })
  }

  return {
    symbol: symbolValue,
    name,
    exchange,
    currency,
    price,
    change,
    changePercent,
    previousClose,
    marketTime,
    dayLow,
    dayHigh,
    volume,
    range,
    interval,
    history,
  }
}
