import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, TrendingDown, TrendingUp } from "lucide-react"

export const PortfolioOverview = () => {
  // Mock portfolio data
  const portfolioValue = 245750;
  const dayChange = 2840;
  const dayChangePercent = 1.17;

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
          ${portfolioValue.toLocaleString()}
        </div>
        <div className={`flex items-center text-sm ${dayChange >= 0 ? 'text-gain' : 'text-loss'}`}>
          {dayChange >= 0 ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
          ${Math.abs(dayChange).toLocaleString()} ({dayChangePercent >= 0 ? '+' : ''}{dayChangePercent}%)
        </div>
      </CardContent>
    </Card>
  )
}