import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getPortfolioTotals } from "@/lib/portfolio"
import { DollarSign, TrendingDown, TrendingUp } from "lucide-react"

export const PortfolioOverview = async () => {
  const totals = await getPortfolioTotals()

  const portfolioValue = totals.marketValue
  const change = portfolioValue - totals.costBasis
  const changePercent = totals.costBasis > 0 ? (change / totals.costBasis) * 100 : 0
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
