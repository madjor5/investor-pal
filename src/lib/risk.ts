import { cache } from "react"
import { getDailySeries } from "./alpha-vantage"
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

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

const calculateDailyReturns = (series: { date: string; close: number }[]) => {
  const returns = new Map<string, number>()

  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1]
    const current = series[i]
    if (prev.close <= 0) {
      continue
    }

    const dailyReturn = current.close / prev.close - 1
    returns.set(current.date, dailyReturn)
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
  const normalizedVolatility = clamp(annualVolatility / 0.25, 0, 1) // 25% annual vol saturates
  const normalizedDrawdown = clamp(Math.abs(maxDrawdown) / 0.4, 0, 1) // 40% drawdown saturates
  const normalizedVaR = clamp(Math.abs(valueAtRisk) * Math.sqrt(252) / 0.18, 0, 1) // annualise approx

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

const buildWarnings = (holdings: PortfolioHolding[], usedHoldings: PortfolioHolding[]) => {
  if (holdings.length === 0) {
    return ["Your portfolio has no active positions"]
  }

  if (usedHoldings.length === 0) {
    return [
      "Unable to retrieve market data for your holdings. Check the configured symbols or API quota.",
    ]
  }

  if (usedHoldings.length < holdings.length) {
    const missingSymbols = holdings
      .filter((holding) => !usedHoldings.includes(holding))
      .map((holding) => holding.symbol)

    return [
      `Missing market data for: ${missingSymbols.join(", ")}`,
    ]
  }

  return []
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

  const seriesResults = await Promise.all(
    holdings.map(async (holding) => {
      try {
        const series = await getDailySeries(holding.symbol, { days: 400 })
        return { holding, series }
      } catch (error) {
        console.error(`Failed to fetch Alpha Vantage data for ${holding.symbol}`, error)
        return null
      }
    })
  )

  const usable = seriesResults.filter((result): result is { holding: PortfolioHolding; series: { date: string; close: number }[] } => {
    if (!result) {
      return false
    }

    return result.series.length >= 10
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
      warnings: buildWarnings(holdings, []),
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
  const returnMaps = usable.map((entry) => calculateDailyReturns(entry.series))

  const dateSet = new Set<string>()
  for (const map of returnMaps) {
    for (const date of map.keys()) {
      dateSet.add(date)
    }
  }

  const sortedDates = Array.from(dateSet).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  )

  const portfolioReturns: number[] = []
  const availableDates: string[] = []
  const portfolioValues: number[] = []
  let cumulativeValue = 1

  for (const date of sortedDates) {
    let weightedReturn = 0
    let coveredWeight = 0

    for (let i = 0; i < weights.length; i++) {
      const dailyReturn = returnMaps[i].get(date)
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
    cumulativeValue *= 1 + normalizedReturn
    portfolioValues.push(cumulativeValue)
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
  const longHorizonReturns = (() => {
    if (portfolioValues.length === 0) {
      return [] as number[]
    }

    const monthlyMap = new Map<string, { value: number }>()
    for (let i = 0; i < availableDates.length; i++) {
      const monthKey = availableDates[i].slice(0, 7)
      monthlyMap.set(monthKey, { value: portfolioValues[i] })
    }

    const monthlyPoints = Array.from(monthlyMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))

    const monthlyReturns: number[] = []
    for (let i = 1; i < monthlyPoints.length; i++) {
      const prev = monthlyPoints[i - 1][1].value
      const current = monthlyPoints[i][1].value
      if (prev > 0 && current > 0) {
        monthlyReturns.push(current / prev - 1)
      }
    }

    return monthlyReturns
  })()

  const trailingMonthlyReturns = longHorizonReturns.slice(-12)
  const annualReturnLongTerm = calculateGeometricAnnualisedReturn(trailingMonthlyReturns, 12)

  const recentReturnsWindow = portfolioReturns.slice(-30)
  const annualReturnRecent = calculateGeometricAnnualisedReturn(recentReturnsWindow, tradingDays)

  const annualReturn =
    trailingMonthlyReturns.length >= 3
      ? annualReturnLongTerm * 0.6 + annualReturnRecent * 0.4
      : calculateGeometricAnnualisedReturn(portfolioReturns, tradingDays)

  const sharpeRatio = annualVolatility === 0 ? 0 : annualReturn / annualVolatility
  const maxDrawdown = calculateMaxDrawdown(portfolioReturns)
  const valueAtRisk = calculatePercentile(portfolioReturns, 0.05)

  const riskScore = Number(deriveRiskScore(annualVolatility, maxDrawdown, valueAtRisk, sharpeRatio).toFixed(1))
  const riskLevel = determineRiskLevel(riskScore)

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
    warnings: buildWarnings(holdings, usedHoldings),
  }
})
