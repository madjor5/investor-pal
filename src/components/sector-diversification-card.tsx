'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { TooltipContentProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";

type SectorSlice = {
  name: string;
  value: number;
  color: string;
};

const SectorDiversificationCard = () => {
  const data: SectorSlice[] = [
    { name: 'Technology', value: 30, color: 'var(--chart-1)' },
    { name: 'Healthcare', value: 22, color: 'var(--chart-2)' },
    { name: 'Financials', value: 18, color: 'var(--chart-3)' },
    { name: 'Consumer Discretionary', value: 16, color: 'var(--chart-4)' },
    { name: 'Industrials', value: 14, color: 'var(--chart-5)' },
  ];

  const CustomTooltip = ({ active, payload }: TooltipContentProps<ValueType, NameType>) => {
    if (active && payload && payload.length) {
      const entry = payload[0];
      const name = entry?.name ? String(entry.name) : '';
      const valueRaw = entry?.value;
      const value = typeof valueRaw === 'number' ? valueRaw : Number(valueRaw ?? 0);

      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium text-card-foreground">{name}</p>
          <p className="text-sm text-primary">
            {Number.isFinite(value) ? `${value}% of portfolio` : '—'}
          </p>
        </div>
      );
    }
    return null;
  };

  const LegendList = () => (
    <div className="flex flex-col gap-1 w-full max-w-[200px]">
      {data.map((entry) => (
        <div key={entry.name} className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm text-muted-foreground flex-1 truncate">{entry.name}</span>
          <span className="text-sm font-medium text-card-foreground">
            {entry.value}%
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">Sector Diversification</CardTitle>
        <CardDescription className="text-xs sm:text-sm text-muted-foreground">Portfolio exposure across major sectors</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-6 items-center">
          <div className="h-100 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value">
                  {data.map((entry, index) => (
                    <Cell key={`sector-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={CustomTooltip} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <LegendList />
        </div>
      </CardContent>
    </Card>
  )
}

export default SectorDiversificationCard;
