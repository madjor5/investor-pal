import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { getPortfolioRiskMetrics } from "@/lib/risk"
import { AlertTriangle, Shield, Target } from "lucide-react"

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

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

const formatPercent = (value: number, options: { sign?: boolean } = {}) => {
  if (!Number.isFinite(value)) {
    return "N/A"
  }

  const formatted = Math.abs(value).toFixed(2)
  const prefix = options.sign ? (value > 0 ? "+" : value < 0 ? "-" : "") : ""
  return `${prefix}${formatted}%`
}

export const RiskAnalysis = async () => {
  const metrics = await getPortfolioRiskMetrics()
  const hasData = metrics.observations >= 5

  const riskScoreDisplay = hasData ? metrics.riskScore.toFixed(1) : "N/A"
  const riskLevelDisplay = hasData ? `${metrics.riskLevel} Risk` : "Not enough data"
  const riskColor = hasData ? riskColorClass(metrics.riskLevel) : "text-muted-foreground"

  const details = [
    {
      label: "Volatility",
      value: hasData ? formatPercent(metrics.volatility) : "N/A",
      tone: hasData ? "text-foreground" : "text-muted-foreground",
    },
    {
      label: "Sharpe Ratio",
      value: hasData ? metrics.sharpeRatio.toFixed(2) : "N/A",
      tone: hasData
        ? metrics.sharpeRatio >= 1
          ? "text-gain"
          : metrics.sharpeRatio <= 0
            ? "text-loss"
            : "text-foreground"
        : "text-muted-foreground",
    },
    {
      label: "Max Drawdown",
      value: hasData ? formatPercent(metrics.maxDrawdown, { sign: true }) : "N/A",
      tone: hasData ? "text-loss" : "text-muted-foreground",
    },
    {
      label: "VaR (95%)",
      value: hasData ? formatPercent(metrics.valueAtRisk, { sign: true }) : "N/A",
      tone: hasData ? "text-loss" : "text-muted-foreground",
    },
    {
      label: "Annual Return",
      value: hasData ? formatPercent(metrics.annualReturn, { sign: true }) : "N/A",
      tone: hasData ? (metrics.annualReturn >= 0 ? "text-gain" : "text-loss") : "text-muted-foreground",
    },
    {
      label: "Observations",
      value: hasData ? metrics.observations.toString() : "N/A",
      tone: hasData ? "text-foreground" : "text-muted-foreground",
    },
  ]

  const forecast = (() => {
    if (!hasData) {
      return {
        headline: "N/A",
        confidence: "N/A",
        scenarios: [
          { name: "Optimistic", probability: 33, value: "N/A" },
          { name: "Expected", probability: 34, value: "N/A" },
          { name: "Pessimistic", probability: 33, value: "N/A" },
        ] as const,
      }
    }

    const expected = metrics.annualReturn
    const volatility = metrics.volatility
    const headline = formatPercent(expected, { sign: true })
    const confidence = `${clamp(Math.round(70 + metrics.sharpeRatio * 8), 55, 92)}%`
    const optimistic = expected + Math.max(volatility * 0.8, 2)
    const baseCase = expected
    const pessimistic = expected - Math.max(volatility, 4)

    return {
      headline,
      confidence,
      scenarios: [
        { name: "Optimistic", probability: 25, value: formatPercent(optimistic, { sign: true }) },
        { name: "Expected", probability: 50, value: formatPercent(baseCase, { sign: true }) },
        { name: "Pessimistic", probability: 25, value: formatPercent(pessimistic, { sign: true }) },
      ] as const,
    }
  })()

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-card to-card/80 shadow-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Risk Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <div className={`text-3xl font-bold ${riskColor}`}>{riskScoreDisplay}</div>
            <Badge variant={hasData ? "secondary" : "outline"} className="text-xs">
              {riskLevelDisplay}
            </Badge>
            {metrics.latestDate && hasData && (
              <div className="text-xs text-muted-foreground">
                Updated {new Date(metrics.latestDate).toLocaleDateString()}
              </div>
            )}
          </div>
          <div className="space-y-3">
            {details.map((item) => (
              <div key={item.label} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span className={item.tone}>{item.value}</span>
              </div>
            ))}
          </div>
          {metrics.warnings.length > 0 && (
            <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              {metrics.warnings[0]}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-card to-card/80 shadow-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Forecast
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-1">
            <div className={`text-2xl font-bold ${hasData ? (metrics.annualReturn >= 0 ? "text-gain" : "text-loss") : "text-muted-foreground"}`}>
              {forecast.headline}
            </div>
            <div className="text-sm text-muted-foreground">Next 12 months expected return</div>
            <div className="flex items-center justify-center gap-1 text-xs text-neutral">
              <AlertTriangle className="h-3 w-3" />
              {forecast.confidence} confidence
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-medium text-foreground">Scenarios</div>
            {forecast.scenarios.map((scenario) => (
              <div key={scenario.name} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{scenario.name}</span>
                  <span
                    className={`font-medium ${
                      scenario.value.startsWith("-")
                        ? "text-loss"
                        : scenario.value === "N/A"
                          ? "text-muted-foreground"
                          : "text-gain"
                    }`}
                  >
                    {scenario.value}
                  </span>
                </div>
                <Progress value={scenario.probability} className="h-1" />
                <div className="text-xs text-muted-foreground text-right">
                  {scenario.probability}% probability
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
