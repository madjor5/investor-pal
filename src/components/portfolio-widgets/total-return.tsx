import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Percent, TrendingUp, TrendingDown } from "lucide-react"

export const TotalReturn = () => {
  const totalReturn = 28450;
  const totalReturnPercent = 13.1;
  const isGain = totalReturn >= 0;
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
          {isGain ? '+' : '-'}${Math.abs(totalReturn).toLocaleString()}
        </div>
        <div className={`flex items-center text-sm ${isGain ? 'text-gain' : 'text-loss'}`}>
          {isGain ? (
            <TrendingUp className="mr-1 h-3 w-3" />
          ) : (
            <TrendingDown className="mr-1 h-3 w-3" />
          )}
          {totalReturnPercent >= 0 ? '+' : '-'}{Math.abs(totalReturnPercent)}%
        </div>
      </CardContent>
    </Card>
  )
}
