import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getPortfolioTotals } from "@/lib/portfolio"
import { Percent, TrendingUp, TrendingDown } from "lucide-react"

export const TotalReturn = async () => {
  const totals = await getPortfolioTotals()

  const unrealized = totals.marketValue - totals.costBasis
  const totalReturn = totals.realizedPnL + unrealized
  const totalReturnPercent = totals.invested > 0 ? (totalReturn / totals.invested) * 100 : 0
  const isGain = totalReturn >= 0

  return (
    <Card className="bg-gradient-to-br from-card to-card/80 shadow-card border-border/50 gap-0">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Return</CardTitle>
          <Percent className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className={`text-2xl font-bold ${isGain ? 'text-gain' : 'text-loss'}`}>
          {`${isGain ? '+' : '-'}$${Math.abs(totalReturn).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`}
        </div>
        <div className={`flex items-center text-sm ${isGain ? 'text-gain' : 'text-loss'}`}>
          {isGain ? (
            <TrendingUp className="mr-1 h-3 w-3" />
          ) : (
            <TrendingDown className="mr-1 h-3 w-3" />
          )}
          {`${totalReturnPercent >= 0 ? '+' : '-'}${Math.abs(totalReturnPercent).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}%`}
        </div>
      </CardContent>
    </Card>
  )
}
