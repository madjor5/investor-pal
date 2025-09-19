import { cache } from "react"
import type { Instrument, Purchase } from "@prisma/client"
import { prisma } from "./prisma"

export type InstrumentWithPurchases = Instrument & { purchases: Purchase[] }

type Lot = {
  quantity: number
  totalCost: number
}

export type AggregatedInstrument = {
  quantity: number
  costBasis: number
  marketValue: number
  realizedPnL: number
  invested: number
}

export type PortfolioTotals = {
  marketValue: number
  costBasis: number
  realizedPnL: number
  invested: number
}

export type PortfolioHolding = AggregatedInstrument & {
  id: string
  symbol: string
  name: string
  currentPrice: number
}

const sortByTradeDate = (a: Purchase, b: Purchase) =>
  a.tradeDate.getTime() - b.tradeDate.getTime()

export const aggregateInstrument = (
  instrument: InstrumentWithPurchases
): AggregatedInstrument => {
  const sortedTrades = [...instrument.purchases].sort(sortByTradeDate)
  const lots: Lot[] = []
  let realizedPnL = 0
  let invested = 0

  for (const trade of sortedTrades) {
    if (trade.quantity > 0) {
      const cost = trade.quantity * trade.price + trade.fees
      lots.push({ quantity: trade.quantity, totalCost: cost })
      invested += cost
      continue
    }

    const sharesToSell = Math.abs(trade.quantity)
    let remainingToSell = sharesToSell
    let costForSoldShares = 0
    let matchedShares = 0

    while (remainingToSell > 0 && lots.length > 0) {
      const lot = lots[0]
      const costPerShare = lot.totalCost / lot.quantity
      const sellFromLot = Math.min(lot.quantity, remainingToSell)
      const costPortion = costPerShare * sellFromLot

      lot.quantity -= sellFromLot
      lot.totalCost -= costPortion
      remainingToSell -= sellFromLot
      costForSoldShares += costPortion
      matchedShares += sellFromLot

      if (lot.quantity === 0) {
        lots.shift()
      }
    }

    const proceeds = matchedShares * trade.price - trade.fees
    realizedPnL += proceeds - costForSoldShares
  }

  const remaining = lots.reduce(
    (acc, lot) => {
      acc.quantity += lot.quantity
      acc.totalCost += lot.totalCost
      return acc
    },
    { quantity: 0, totalCost: 0 }
  )

  return {
    quantity: remaining.quantity,
    costBasis: remaining.totalCost,
    marketValue: remaining.quantity * instrument.currentPrice,
    realizedPnL,
    invested,
  }
}

export const summarizePortfolio = (
  instruments: InstrumentWithPurchases[]
): PortfolioTotals => {
  return instruments.reduce<PortfolioTotals>(
    (acc, instrument) => {
      const aggregated = aggregateInstrument(instrument)
      acc.marketValue += aggregated.marketValue
      acc.costBasis += aggregated.costBasis
      acc.realizedPnL += aggregated.realizedPnL
      acc.invested += aggregated.invested
      return acc
    },
    { marketValue: 0, costBasis: 0, realizedPnL: 0, invested: 0 }
  )
}

export const getPortfolioTotals = cache(async () => {
  const instruments = await prisma.instrument.findMany({
    include: { purchases: true },
  })

  return summarizePortfolio(instruments)
})

export const getPortfolioHoldings = cache(async (): Promise<PortfolioHolding[]> => {
  const instruments = await prisma.instrument.findMany({
    include: { purchases: true },
  })

  return instruments
    .map((instrument) => {
      const aggregated = aggregateInstrument(instrument)

      return {
        ...aggregated,
        id: instrument.id,
        symbol: instrument.symbol,
        name: instrument.name,
        currentPrice: instrument.currentPrice,
      }
    })
    .filter((holding) => holding.quantity > 0 && holding.marketValue > 0)
})
