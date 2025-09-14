import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Shield, Target } from "lucide-react"

export const RiskAnalysis = () => {
  const riskMetrics = {
    volatility: 18.5,
    sharpeRatio: 1.24,
    maxDrawdown: -12.8,
    beta: 1.15,
    var95: -2.1,
  };

  const riskScore = 7.2;
  const riskLevel = riskScore <= 4 ? "Low" : riskScore <= 7 ? "Moderate" : "High";
  const riskColor = riskScore <= 4 ? "text-gain" : riskScore <= 7 ? "text-neutral" : "text-loss";

  const forecast = {
    expectedReturn: 8.5,
    confidence: 72,
    timeHorizon: "12 months",
    scenarios: [
      { name: "Optimistic", probability: 25, return: 15.2 },
      { name: "Expected", probability: 50, return: 8.5 },
      { name: "Pessimistic", probability: 25, return: -2.1 },
    ]
  };
  return (
    <div className="space-y-6">
      {/* Risk Score */}
      
      <Card className="bg-gradient-to-br from-card to-card/80 shadow-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Risk Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <div className={`text-3xl font-bold ${riskColor}`}>{riskScore}</div>
            <Badge variant="secondary" className="text-xs">{riskLevel} Risk</Badge>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Volatility</span>
              <span className="text-foreground">{riskMetrics.volatility}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sharpe Ratio</span>
              <span className="text-foreground">{riskMetrics.sharpeRatio}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Max Drawdown</span>
              <span className="text-loss">{riskMetrics.maxDrawdown}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Beta</span>
              <span className="text-foreground">{riskMetrics.beta}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">VaR (95%)</span>
              <span className="text-loss">{riskMetrics.var95}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Forecast */}
      <Card className="bg-gradient-to-br from-card to-card/80 shadow-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Forecast
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-1">
            <div className="text-2xl font-bold text-gain">+{forecast.expectedReturn}%</div>
            <div className="text-sm text-muted-foreground">{forecast.timeHorizon} expected return</div>
            <div className="flex items-center justify-center gap-1 text-xs text-neutral">
              <AlertTriangle className="h-3 w-3" />
              {forecast.confidence}% confidence
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-medium text-foreground">Scenarios</div>
            {forecast.scenarios.map((scenario) => (
              <div key={scenario.name} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{scenario.name}</span>
                  <span className={`font-medium ${
                    scenario.return >= 0 ? 'text-gain' : 'text-loss'
                  }`}>
                    {scenario.return >= 0 ? '+' : ''}{scenario.return}%
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