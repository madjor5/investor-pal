import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { prisma } from "@/lib/prisma";

type HoldingRow = {
  symbol: string;
  name: string;
  isin: string;
  value: number; // current market value
  weight: number; // percent of portfolio
  change: number; // percent vs avg cost
};

export const TopHoldings = async () => {
  const instruments = await prisma.instrument.findMany({
    include: { purchases: true },
  });

  const aggregated: HoldingRow[] = instruments
    .map((inst) => {
      const totalQty = inst.purchases.reduce((acc, p) => acc + p.quantity, 0);
      if (totalQty <= 0) return null;

      const totalCost = inst.purchases.reduce(
        (acc, p) => acc + p.quantity * p.price + p.fees,
        0
      );
      const avgCost = totalQty > 0 ? totalCost / totalQty : 0;
      const currentValue = totalQty * inst.currentPrice;
      const changePct = avgCost > 0 ? ((inst.currentPrice - avgCost) / avgCost) * 100 : 0;

      return {
        symbol: inst.symbol,
        name: inst.name,
        isin: inst.isin,
        value: currentValue,
        weight: 0, // placeholder until we know total value
        change: Math.round(changePct * 100) / 100, // 2 decimals
      } as HoldingRow;
    })
    .filter(Boolean) as HoldingRow[];

  const totalValue = aggregated.reduce((sum, h) => sum + h.value, 0);
  const holdings = aggregated
    .map((h) => ({
      ...h,
      weight: totalValue > 0 ? Math.round(((h.value / totalValue) * 100) * 10) / 10 : 0, // 1 decimal
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return (
    <Card className="bg-gradient-to-br from-card to-card/80 shadow-card border-border/50">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">Top Holdings</CardTitle>
      </CardHeader>
      <CardContent>
        {holdings.length === 0 ? (
          <div className="text-sm text-muted-foreground">No holdings found.</div>
        ) : (
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
        )}
      </CardContent>
    </Card>
  )
}
