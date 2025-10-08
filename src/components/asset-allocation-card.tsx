'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const AssetAllocationCard = () => {
  const data = [
    { name: 'North America', value: 42, color: 'var(--chart-1)' },
    { name: 'Europe', value: 35, color: 'var(--chart-2)' },
    { name: 'Asia', value: 16, color: 'var(--chart-3)' },
    { name: 'Other', value: 7, color: 'var(--chart-4)' }
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium text-card-foreground">{payload[0].name}</p>
          <p className="text-sm text-primary">
            {payload[0].value}% of portfolio
          </p>
        </div>
      );
    }
    return null;
  };

  const LegendList = () => (
    <div className="flex flex-col gap-1 w-full max-w-[180px]">
      {data.map((entry, index) => (
        <div key={index} className="flex items-center gap-3">
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
        <CardTitle className="flex items-center gap-2 text-lg">Asset Allocation</CardTitle>
        <CardDescription className="text-xs sm:text-sm text-muted-foreground">Portfolio distribution by region</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="h-100 w-full lg:flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <LegendList />
        </div>
      </CardContent>
    </Card>
  )
}

export default AssetAllocationCard;