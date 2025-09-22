import { prisma } from "./prisma"
import { fetchYahooHistory } from "./yahoo-finance"

type SymbolCandidateInstrument = {
  id: string
  symbol: string
  yahooSymbol?: string | null
}

const MS_PER_DAY = 86_400_000
const DAYS_IN_YEAR = 365
const MONTHS_FIVE_YEARS = 60

const toUTCDate = (dateString: string) => {
  const [year, month, day] = dateString.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

const startOfUTCMonth = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))

const differenceInDays = (later: Date, earlier: Date) =>
  Math.floor((startOfDay(later).getTime() - startOfDay(earlier).getTime()) / MS_PER_DAY)

const differenceInMonths = (later: Date, earlier: Date) =>
  (later.getUTCFullYear() - earlier.getUTCFullYear()) * 12 + (later.getUTCMonth() - earlier.getUTCMonth())

const startOfDay = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))

const buildSymbolCandidates = (instrument: SymbolCandidateInstrument): string[] => {
  const candidates = [instrument.yahooSymbol, instrument.symbol]

  const cleaned = candidates
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => value.length > 0)

  if (cleaned.length === 0) {
    return []
  }

  return Array.from(new Set(cleaned))
}

type HistoryFetchResult = {
  symbol: string
  series: Awaited<ReturnType<typeof fetchYahooHistory>>
}

const fetchHistoryWithCandidates = async (
  symbolCandidates: string[],
  options: Parameters<typeof fetchYahooHistory>[1]
): Promise<HistoryFetchResult> => {
  if (symbolCandidates.length === 0) {
    throw new Error("No symbol candidates available for history fetch")
  }

  let lastError: unknown = null

  for (const candidate of symbolCandidates) {
    try {
      const series = await fetchYahooHistory(candidate, options)
      return { symbol: candidate, series }
    } catch (error) {
      lastError = error

      const status = typeof error === "object" && error !== null ? (error as { status?: number }).status : undefined
      if (status === 404) {
        continue
      }

      throw error
    }
  }

  if (lastError instanceof Error) {
    throw lastError
  }

  throw new Error("Failed to fetch history for provided symbols")
}

const ensureDailyHistory = async (
  instrument: SymbolCandidateInstrument,
  symbolCandidates: string[]
): Promise<string | null> => {
  const now = new Date()
  const requiredStart = startOfDay(new Date(now.getTime() - (DAYS_IN_YEAR + 30) * MS_PER_DAY))

  const [earliest, latest] = await Promise.all([
    prisma.priceHistory.findFirst({
      where: { instrumentId: instrument.id, interval: "DAILY" },
      orderBy: { date: "asc" },
    }),
    prisma.priceHistory.findFirst({
      where: { instrumentId: instrument.id, interval: "DAILY" },
      orderBy: { date: "desc" },
    }),
  ])

  const needsCoverage = !earliest || earliest.date > requiredStart
  const needsFreshData = !latest || differenceInDays(now, latest.date) >= 2

  if (!needsCoverage && !needsFreshData) {
    return null
  }

  const { symbol: resolvedSymbol, series } = await fetchHistoryWithCandidates(symbolCandidates, {
    range: needsCoverage ? "max" : "2y",
    interval: "1d",
  })

  const filtered = series.filter((point) => toUTCDate(point.date) >= requiredStart)
  if (filtered.length === 0) {
    return resolvedSymbol
  }

  await prisma.priceHistory.createMany({
    data: filtered.map((point) => ({
      instrumentId: instrument.id,
      interval: "DAILY" as const,
      date: toUTCDate(point.date),
      close: point.close,
    })),
    skipDuplicates: true,
  })

  return resolvedSymbol
}

const ensureMonthlyHistory = async (
  instrument: SymbolCandidateInstrument,
  symbolCandidates: string[]
): Promise<string | null> => {
  const now = new Date()
  const requiredStart = startOfUTCMonth(new Date(Date.UTC(now.getUTCFullYear() - 5, now.getUTCMonth(), 1)))

  const [earliest, latest] = await Promise.all([
    prisma.priceHistory.findFirst({
      where: { instrumentId: instrument.id, interval: "MONTHLY" },
      orderBy: { date: "asc" },
    }),
    prisma.priceHistory.findFirst({
      where: { instrumentId: instrument.id, interval: "MONTHLY" },
      orderBy: { date: "desc" },
    }),
  ])

  const needsCoverage = !earliest || earliest.date > requiredStart
  const needsFreshData = !latest || differenceInMonths(now, latest.date) >= 1

  if (!needsCoverage && !needsFreshData) {
    return null
  }

  const { symbol: resolvedSymbol, series } = await fetchHistoryWithCandidates(symbolCandidates, {
    range: "max",
    interval: "1mo",
  })
  const filtered = series.filter((point) => toUTCDate(point.date) >= requiredStart)

  if (filtered.length === 0) {
    return resolvedSymbol
  }

  await prisma.priceHistory.createMany({
    data: filtered.map((point) => ({
      instrumentId: instrument.id,
      interval: "MONTHLY" as const,
      date: toUTCDate(point.date),
      close: point.close,
    })),
    skipDuplicates: true,
  })

  return resolvedSymbol
}

export const ensureInstrumentPriceHistory = async (instrument: SymbolCandidateInstrument) => {
  const symbolCandidates = buildSymbolCandidates(instrument)

  let resolvedSymbol: string | null = null

  const dailySymbol = await ensureDailyHistory(instrument, symbolCandidates)
  if (dailySymbol) {
    resolvedSymbol = dailySymbol
  }

  const monthlySymbol = await ensureMonthlyHistory(instrument, resolvedSymbol ? [resolvedSymbol] : symbolCandidates)
  if (monthlySymbol) {
    resolvedSymbol = monthlySymbol
  }

  if (resolvedSymbol && resolvedSymbol !== instrument.symbol) {
    await prisma.instrument.update({
      where: { id: instrument.id },
      data: { symbol: resolvedSymbol },
    })
  }
}

export type StoredPricePoint = {
  date: string
  close: number
}

type SeriesOptions = {
  startDate?: Date
  endDate?: Date
  limit?: number
}

const formatISODate = (date: Date) => date.toISOString().slice(0, 10)

export const getStoredPriceHistory = async (
  instrumentId: string,
  interval: "DAILY" | "MONTHLY",
  options: SeriesOptions = {}
): Promise<StoredPricePoint[]> => {
  const { startDate, endDate, limit } = options

  const records = await prisma.priceHistory.findMany({
    where: {
      instrumentId,
      interval,
      ...(startDate ? { date: { gte: startDate } } : {}),
      ...(endDate ? { date: { lte: endDate } } : {}),
    },
    orderBy: { date: "asc" },
    ...(typeof limit === "number" ? { take: limit } : {}),
  })

  return records.map((record) => ({
    date: formatISODate(record.date),
    close: record.close,
  }))
}

export const MONTHS_IN_HISTORY_TARGET = MONTHS_FIVE_YEARS
export const DAYS_IN_HISTORY_TARGET = DAYS_IN_YEAR
