import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getPortfolioRiskMetrics } from "@/lib/risk"

const riskColorClass = (level: "Low" | "Moderate" | "High") => {
  switch (level) {
    case "Low":
      return "text-gain"
    case "Moderate":
      return "text-neutral"
    case "High":
      return "text-loss"
    default:
      return "text-foreground"
  }
}

export const RiskScore = async () => {
  const metrics = await getPortfolioRiskMetrics()
  const hasSufficientData = metrics.observations >= 5

  const scoreDisplay = hasSufficientData ? metrics.riskScore.toFixed(1) : "N/A"
  const riskBadge = hasSufficientData ? `${metrics.riskLevel} Risk` : "Not enough data"
  const scoreColor = hasSufficientData ? riskColorClass(metrics.riskLevel) : "text-muted-foreground"

  return (
    <Card className="bg-gradient-to-br from-card to-card/80 shadow-card border-border/50 gap-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Risk Score</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-1">
        <div className={`text-2xl font-bold ${scoreColor}`}>{scoreDisplay}</div>
        <Badge variant={hasSufficientData ? "secondary" : "outline"} className="text-xs">
          {riskBadge}
        </Badge>
        {metrics.warnings.length > 0 && (
          <div className="text-xs text-muted-foreground">
            {metrics.warnings[0]}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
