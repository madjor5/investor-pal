import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
export const TopHoldings = () => {
  const holdings = [
    { symbol: "AAPL", name: "Apple Inc.", value: 45200, weight: 18.4, change: 2.1, isin: "US0378331005" },
    { symbol: "MSFT", name: "Microsoft Corp.", value: 38600, weight: 15.7, change: 1.8, isin: "US5949181045" },
    { symbol: "GOOGL", name: "Alphabet Inc.", value: 32100, weight: 13.1, change: -0.9, isin: "US02079K3059" },
    { symbol: "TSLA", name: "Tesla Inc.", value: 28900, weight: 11.8, change: 3.2, isin: "US88160R1014" },
    { symbol: "NVDA", name: "NVIDIA Corp.", value: 24650, weight: 10.0, change: 4.5, isin: "US67066G1040" },
  ];

  return (
    <Card className="bg-gradient-to-br from-card to-card/80 shadow-card border-border/50">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">Top Holdings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {holdings.map((holding) => (
            <div key={holding.symbol} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="font-medium text-foreground">{holding.symbol}</div>
                    <div className="text-sm text-muted-foreground">{holding.name}</div>
                    <div className="text-xs text-neutral font-mono">{holding.isin}</div>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-foreground">${holding.value.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">{holding.weight}%</div>
                <div className={`text-sm ${holding.change >= 0 ? 'text-gain' : 'text-loss'}`}>
                  {holding.change >= 0 ? '+' : ''}{holding.change}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}