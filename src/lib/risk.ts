import { cache } from "react"
import {
  ensureInstrumentPriceHistory,
  getStoredPriceHistory,
  DAYS_IN_HISTORY_TARGET,
  MONTHS_IN_HISTORY_TARGET,
} from "./market-data"
import { getPortfolioHoldings, type PortfolioHolding } from "./portfolio"

type RiskLevel = "Low" | "Moderate" | "High"

export type PortfolioRiskMetrics = {
  riskScore: number
  riskLevel: RiskLevel
  volatility: number
  sharpeRatio: number
  maxDrawdown: number
  valueAtRisk: number
  annualReturn: number
  observations: number
  latestDate: string | null
  warnings: string[]
}

const MS_PER_DAY = 86_400_000

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

const buildReturnMap = (series: { date: string; close: number }[]) => {
  const returns = new Map<string, number>()

  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1]
    const current = series[i]
    if (prev.close <= 0) {
      continue
    }

    const change = current.close / prev.close - 1
    returns.set(current.date, change)
  }

  return returns
}

const calculateMean = (values: number[]) => {
  if (values.length === 0) {
    return 0
  }
  return values.reduce((acc, value) => acc + value, 0) / values.length
}

const calculateGeometricAnnualisedReturn = (returns: number[], periodsPerYear: number) => {
  if (returns.length === 0) {
    return 0
  }

  let logSum = 0
  for (const value of returns) {
    const factor = 1 + value
    if (factor <= 0) {
      return 0
    }
    logSum += Math.log(factor)
  }

  const averageLog = logSum / returns.length
  return Math.expm1(averageLog * periodsPerYear)
}

const calculateStdDev = (values: number[], mean: number) => {
  if (values.length === 0) {
    return 0
  }

  const variance = values.reduce((acc, value) => {
    const diff = value - mean
    return acc + diff * diff
  }, 0) / values.length

  return Math.sqrt(variance)
}

const calculateMaxDrawdown = (returns: number[]) => {
  let peak = 1
  let value = 1
  let maxDrawdown = 0

  for (const dailyReturn of returns) {
    value *= 1 + dailyReturn
    if (value > peak) {
      peak = value
      continue
    }

    const drawdown = (value - peak) / peak
    if (drawdown < maxDrawdown) {
      maxDrawdown = drawdown
    }
  }

  return maxDrawdown
}

const calculatePercentile = (values: number[], percentile: number) => {
  if (values.length === 0) {
    return 0
  }

  const sorted = [...values].sort((a, b) => a - b)
  const rank = clamp(Math.floor((sorted.length - 1) * percentile), 0, sorted.length - 1)
  return sorted[rank]
}

const deriveRiskScore = (
  annualVolatility: number,
  maxDrawdown: number,
  valueAtRisk: number,
  sharpeRatio: number
) => {
  const normalizedVolatility = clamp(annualVolatility / 0.25, 0, 1)
  const normalizedDrawdown = clamp(Math.abs(maxDrawdown) / 0.4, 0, 1)
  const normalizedVaR = clamp(Math.abs(valueAtRisk) * Math.sqrt(252) / 0.18, 0, 1)

  let risk = normalizedVolatility * 0.6 + normalizedDrawdown * 0.25 + normalizedVaR * 0.15

  if (sharpeRatio < 0) {
    risk += clamp(Math.abs(sharpeRatio) * 0.1, 0, 0.2)
  } else if (sharpeRatio > 1.2) {
    risk -= clamp((sharpeRatio - 1.2) * 0.1, 0, 0.2)
  }

  return clamp(risk * 10, 0, 10)
}

const determineRiskLevel = (score: number): RiskLevel => {
  if (score < 3.5) {
    return "Low"
  }

  if (score < 7) {
    return "Moderate"
  }

  return "High"
}

const buildWarnings = (
  holdings: PortfolioHolding[],
  usedHoldings: PortfolioHolding[],
  monthlyCoverage: number
) => {
  if (holdings.length === 0) {
    return ["Your portfolio has no active positions"]
  }

  if (usedHoldings.length === 0) {
    return [
      "Unable to retrieve market data for your holdings. Check the configured symbols or API quota.",
    ]
  }

  const warnings: string[] = []

  if (usedHoldings.length < holdings.length) {
    const missingSymbols = holdings
      .filter((holding) => !usedHoldings.includes(holding))
      .map((holding) => holding.symbol)

    warnings.push(`Missing market data for: ${missingSymbols.join(", ")}`)
  }

  if (monthlyCoverage < 12) {
    warnings.push("Monthly history is limited; long-term trend may be less reliable")
  }

  return warnings
}

export const getPortfolioRiskMetrics = cache(async (): Promise<PortfolioRiskMetrics> => {
  const holdings = await getPortfolioHoldings()
  const totalMarketValue = holdings.reduce((acc, holding) => acc + holding.marketValue, 0)

  if (holdings.length === 0 || totalMarketValue <= 0) {
    return {
      riskScore: 0,
      riskLevel: "Low",
      volatility: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      valueAtRisk: 0,
      annualReturn: 0,
      observations: 0,
      latestDate: null,
      warnings: ["No portfolio holdings available for risk analysis"],
    }
  }

  const now = new Date()
  const dailyStartDate = new Date(now.getTime() - (DAYS_IN_HISTORY_TARGET + 30) * MS_PER_DAY)
  const monthlyStartDate = new Date(Date.UTC(now.getUTCFullYear() - 5, now.getUTCMonth(), 1))

  const seriesResults: Array<{
    holding: PortfolioHolding
    dailySeries: { date: string; close: number }[]
    monthlySeries: { date: string; close: number }[]
  } | null> = []

  for (const holding of holdings) {
    try {
      await ensureInstrumentPriceHistory(holding)
      const [dailySeries, monthlySeries] = await Promise.all([
        getStoredPriceHistory(holding.id, "DAILY", { startDate: dailyStartDate }),
        getStoredPriceHistory(holding.id, "MONTHLY", { startDate: monthlyStartDate }),
      ])

      seriesResults.push({ holding, dailySeries, monthlySeries })
    } catch (error) {
      console.error(`Failed to prepare market data for ${holding.symbol}`, error)
      seriesResults.push(null)
    }
  }

  const usable = seriesResults.filter((result): result is {
    holding: PortfolioHolding
    dailySeries: { date: string; close: number }[]
    monthlySeries: { date: string; close: number }[]
  } => {
    if (!result) {
      return false
    }

    return result.dailySeries.length >= 10
  })

  if (usable.length === 0) {
    return {
      riskScore: 0,
      riskLevel: "Low",
      volatility: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      valueAtRisk: 0,
      annualReturn: 0,
      observations: 0,
      latestDate: null,
      warnings: buildWarnings(holdings, [], 0),
    }
  }

  const usedHoldings = usable.map((entry) => entry.holding)
  const usedMarketValue = usedHoldings.reduce((acc, holding) => acc + holding.marketValue, 0)

  if (usedMarketValue <= 0) {
    return {
      riskScore: 0,
      riskLevel: "Low",
      volatility: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      valueAtRisk: 0,
      annualReturn: 0,
      observations: 0,
      latestDate: null,
      warnings: ["Portfolio holdings have no market value for risk analysis"],
    }
  }

  const weights = usedHoldings.map((holding) => holding.marketValue / usedMarketValue)
  const dailyReturnMaps = usable.map((entry) => buildReturnMap(entry.dailySeries))

  const dateSet = new Set<string>()
  for (const map of dailyReturnMaps) {
    for (const date of map.keys()) {
      dateSet.add(date)
    }
  }

  const sortedDates = Array.from(dateSet).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  )

  const portfolioReturns: number[] = []
  const availableDates: string[] = []

  for (const date of sortedDates) {
    let weightedReturn = 0
    let coveredWeight = 0

    for (let i = 0; i < weights.length; i++) {
      const dailyReturn = dailyReturnMaps[i].get(date)
      if (typeof dailyReturn === "number") {
        weightedReturn += dailyReturn * weights[i]
        coveredWeight += weights[i]
      }
    }

    if (coveredWeight === 0) {
      continue
    }

    const normalizedReturn = weightedReturn / coveredWeight
    portfolioReturns.push(normalizedReturn)
    availableDates.push(date)
  }

  if (portfolioReturns.length < 5) {
    return {
      riskScore: 0,
      riskLevel: "Low",
      volatility: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      valueAtRisk: 0,
      annualReturn: 0,
      observations: portfolioReturns.length,
      latestDate: availableDates.at(-1) ?? null,
      warnings: ["Not enough historical data to compute risk metrics"],
    }
  }

  const tradingDays = 252
  const dailyMean = calculateMean(portfolioReturns)
  const dailyStdDev = calculateStdDev(portfolioReturns, dailyMean)
  const annualVolatility = dailyStdDev * Math.sqrt(tradingDays)

  const monthlyReturnMaps = usable.map((entry) => buildReturnMap(entry.monthlySeries))
  const monthSet = new Set<string>()
  for (const map of monthlyReturnMaps) {
    for (const date of map.keys()) {
      if (new Date(date) >= monthlyStartDate) {
        monthSet.add(date)
      }
    }
  }

  const sortedMonths = Array.from(monthSet).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  )

  const relevantMonths = sortedMonths.slice(-MONTHS_IN_HISTORY_TARGET)
  const monthlyPortfolioReturns: number[] = []

  for (const month of relevantMonths) {
    let weightedReturn = 0
    let coveredWeight = 0

    for (let i = 0; i < weights.length; i++) {
      const monthlyReturn = monthlyReturnMaps[i].get(month)
      if (typeof monthlyReturn === "number") {
        weightedReturn += monthlyReturn * weights[i]
        coveredWeight += weights[i]
      }
    }

    if (coveredWeight === 0) {
      continue
    }

    monthlyPortfolioReturns.push(weightedReturn / coveredWeight)
  }

  const trailingMonthlyReturns = monthlyPortfolioReturns.slice(-12)
  const annualReturnLongTerm = calculateGeometricAnnualisedReturn(trailingMonthlyReturns, 12)
  const recentReturnsWindow = portfolioReturns.slice(-30)
  const annualReturnRecent = calculateGeometricAnnualisedReturn(recentReturnsWindow, tradingDays)

  const annualReturn =
    trailingMonthlyReturns.length >= 6
      ? annualReturnLongTerm * 0.6 + annualReturnRecent * 0.4
      : calculateGeometricAnnualisedReturn(portfolioReturns, tradingDays)

  const sharpeRatio = annualVolatility === 0 ? 0 : annualReturn / annualVolatility
  const maxDrawdown = calculateMaxDrawdown(portfolioReturns)
  const valueAtRisk = calculatePercentile(portfolioReturns, 0.05)

  const riskScore = Number(deriveRiskScore(annualVolatility, maxDrawdown, valueAtRisk, sharpeRatio).toFixed(1))
  const riskLevel = determineRiskLevel(riskScore)
  const warnings = buildWarnings(holdings, usedHoldings, trailingMonthlyReturns.length)

  return {
    riskScore,
    riskLevel,
    volatility: Number((annualVolatility * 100).toFixed(2)),
    sharpeRatio: Number(sharpeRatio.toFixed(2)),
    maxDrawdown: Number((maxDrawdown * 100).toFixed(2)),
    valueAtRisk: Number((valueAtRisk * 100).toFixed(2)),
    annualReturn: Number((annualReturn * 100).toFixed(2)),
    observations: portfolioReturns.length,
    latestDate: availableDates.at(-1) ?? null,
    warnings,
  }
})
