import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { prisma } from "@/lib/prisma"
import type { Purchase } from "@prisma/client"
import { DollarSign, TrendingDown, TrendingUp } from "lucide-react"

type PositionMetrics = {
  quantity: number
  costBasis: number
}

const calculateOpenPosition = (purchases: Purchase[]): PositionMetrics => {
  const sorted = [...purchases].sort(
    (a, b) => a.tradeDate.getTime() - b.tradeDate.getTime()
  )

  const lots: { quantity: number; totalCost: number }[] = []

  for (const trade of sorted) {
    if (trade.quantity > 0) {
      lots.push({
        quantity: trade.quantity,
        totalCost: trade.quantity * trade.price + trade.fees,
      })
      continue
    }

    let remainingToSell = Math.abs(trade.quantity)
    while (remainingToSell > 0 && lots.length > 0) {
      const lot = lots[0]
      const costPerShare = lot.totalCost / lot.quantity
      const sellFromLot = Math.min(lot.quantity, remainingToSell)

      lot.quantity -= sellFromLot
      lot.totalCost -= costPerShare * sellFromLot
      remainingToSell -= sellFromLot

      if (lot.quantity === 0) {
        lots.shift()
      }
    }
  }

  return lots.reduce<PositionMetrics>(
    (acc, lot) => {
      acc.quantity += lot.quantity
      acc.costBasis += lot.totalCost
      return acc
    },
    { quantity: 0, costBasis: 0 }
  )
}

export const PortfolioOverview = async () => {
  const instruments = await prisma.instrument.findMany({
    include: { purchases: true },
  })

  const totals = instruments.reduce(
    (acc, instrument) => {
      const { quantity, costBasis } = calculateOpenPosition(instrument.purchases)
      if (quantity <= 0) {
        return acc
      }

      const currentValue = quantity * instrument.currentPrice
      acc.value += currentValue
      acc.cost += costBasis
      return acc
    },
    { value: 0, cost: 0 }
  )

  const portfolioValue = totals.value
  const change = portfolioValue - totals.cost
  const changePercent = totals.cost > 0 ? (change / totals.cost) * 100 : 0
  const isGain = change >= 0

  return (
    <Card className="bg-gradient-to-br from-card to-card/80 shadow-card border-border/50 gap-0">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">Portfolio Value</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-2xl font-bold text-foreground">
          ${portfolioValue.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
        <div className={`flex items-center text-sm ${isGain ? 'text-gain' : 'text-loss'}`}>
          {isGain ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
          {`${isGain ? '+' : '-'}$${Math.abs(change).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} (${changePercent >= 0 ? '+' : ''}${Math.abs(changePercent).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}%)`}
        </div>
      </CardContent>
    </Card>
  )
}
