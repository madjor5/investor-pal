import { prisma } from "./prisma"
import { getDailySeries, getMonthlySeries } from "./alpha-vantage"

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

const ensureDailyHistory = async (instrument: { id: string; symbol: string }) => {
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
    return
  }

  const fetchDays = needsCoverage ? 1_200 : 200
  const series = await getDailySeries(instrument.symbol, { days: fetchDays })

  const filtered = series.filter((point) => toUTCDate(point.date) >= requiredStart)
  if (filtered.length === 0) {
    return
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
}

const ensureMonthlyHistory = async (instrument: { id: string; symbol: string }) => {
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
    return
  }

  const series = await getMonthlySeries(instrument.symbol)
  const filtered = series.filter((point) => toUTCDate(point.date) >= requiredStart)

  if (filtered.length === 0) {
    return
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
}

export const ensureInstrumentPriceHistory = async (instrument: { id: string; symbol: string }) => {
  await ensureDailyHistory(instrument)
  await ensureMonthlyHistory(instrument)
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
