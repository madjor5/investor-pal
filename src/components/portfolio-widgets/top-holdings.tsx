import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { prisma } from "@/lib/prisma"
import type { TopHoldingItem } from "./top-holdings.types"
import { TopHoldingsList } from "./top-holdings-client"

export const TopHoldings = async () => {
  const instruments = await prisma.instrument.findMany({
    include: { purchases: true },
  });

  const aggregated: TopHoldingItem[] = instruments
    .map((inst) => {
      const totalQty = inst.purchases.reduce((acc, p) => acc + p.quantity, 0);
      if (totalQty <= 0) return null; // no open position

      // Compute average cost using only buy lots; sells should not change avg cost
      const buyQty = inst.purchases.reduce((acc, p) => acc + (p.quantity > 0 ? p.quantity : 0), 0);
      const totalBuyCost = inst.purchases.reduce(
        (acc, p) => acc + (p.quantity > 0 ? p.quantity * p.price + p.fees : 0),
        0
      );
      const avgCost = buyQty > 0 ? totalBuyCost / buyQty : 0;

      const currentValue = totalQty * inst.currentPrice;
      const changePct = avgCost > 0 ? ((inst.currentPrice - avgCost) / avgCost) * 100 : 0;

      return {
        symbol: inst.symbol,
        name: inst.name,
        isin: inst.isin,
        value: currentValue,
        weight: 0, // placeholder until we know total value
        change: Math.round(changePct * 100) / 100, // 2 decimals
        quantity: totalQty,
      } as TopHoldingItem;
    })
    .filter(Boolean) as TopHoldingItem[];

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
          <TopHoldingsList holdings={holdings} />
        )}
      </CardContent>
    </Card>
  )
}
