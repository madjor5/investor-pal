'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area } from "recharts";


const PerformanceChart = () => {
  // Mock data with three forecast scenarios
  const data = [
    { month: 'Jan', value: 100000, optimistic: null, realistic: null, pessimistic: null },
    { month: 'Feb', value: 95000, optimistic: null, realistic: null, pessimistic: null },
    { month: 'Mar', value: 88000, optimistic: null, realistic: null, pessimistic: null },
    { month: 'Apr', value: 105000, optimistic: null, realistic: null, pessimistic: null },
    { month: 'May', value: 118000, optimistic: null, realistic: null, pessimistic: null },
    { month: 'Jun', value: 132000, optimistic: null, realistic: null, pessimistic: null },
    { month: 'Jul', value: 145000, optimistic: null, realistic: null, pessimistic: null },
    { month: 'Aug', value: 138000, optimistic: null, realistic: null, pessimistic: null },
    { month: 'Sep', value: 155000, optimistic: null, realistic: null, pessimistic: null },
    { month: 'Oct', value: 168000, optimistic: null, realistic: null, pessimistic: null },
    { month: 'Nov', value: 185000, optimistic: null, realistic: null, pessimistic: null },
    // Current month - bridge point to forecasts
    { month: 'Dec', value: 195000, optimistic: 195000, realistic: 195000, pessimistic: 195000 },
    // Forecast scenarios
    { month: 'Jan+1', value: null, optimistic: 210000, realistic: 205000, pessimistic: 198000 },
    { month: 'Feb+1', value: null, optimistic: 225000, realistic: 215000, pessimistic: 205000 },
    { month: 'Mar+1', value: null, optimistic: 240000, realistic: 225000, pessimistic: 210000 },
    { month: 'Apr+1', value: null, optimistic: 258000, realistic: 240000, pessimistic: 220000 },
    { month: 'May+1', value: null, optimistic: 275000, realistic: 250000, pessimistic: 225000 },
    { month: 'Jun+1', value: null, optimistic: 295000, realistic: 265000, pessimistic: 235000 },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const hasHistorical = payload.find((p: any) => p.dataKey === 'value' && p.value !== null);
      const hasForecasts = payload.filter((p: any) => ['optimistic', 'realistic', 'pessimistic'].includes(p.dataKey) && p.value !== null);
      
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3 min-w-48">
          <p className="font-medium text-card-foreground mb-2">{label}</p>
          
          {hasHistorical && (
            <div className="mb-2">
              <p className="text-sm text-primary">
                Actual: ${hasHistorical.value?.toLocaleString()}
              </p>
            </div>
          )}
          
          {hasForecasts.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Forecast Scenarios:</p>
              {hasForecasts.map((forecast: any) => (
                <p key={forecast.dataKey} className="text-sm">
                  <span className={`capitalize ${
                    forecast.dataKey === 'optimistic' ? 'text-success' :
                    forecast.dataKey === 'realistic' ? 'text-accent' :
                    'text-destructive'
                  }`}>
                    {forecast.dataKey}:
                  </span>
                  <span className="ml-1">${forecast.value?.toLocaleString()}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      );
    }
    return null;
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-text-base sm:text-lg font-semibold text-card-foreground">Cumulative Performance</CardTitle>
        <CardDescription className="text-xs sm:text-sm text-muted-foreground">Historical portfolio performance over time</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <defs>
                {/* Historical performance gradient */}
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                </linearGradient>
                
                {/* Forecast area gradient - covers the range between pessimistic and optimistic */}
                <linearGradient id="forecastArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="month" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Historical performance area */}
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--primary)"
                strokeWidth={3}
                fill="url(#colorValue)"
                connectNulls={false}
              />
              
              {/* Forecast scenario lines */}
              <Line
                type="monotone"
                dataKey="optimistic"
                stroke="var(--success)"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                connectNulls={true}
              />
              
              <Line
                type="monotone"
                dataKey="realistic"
                stroke="var(--accent)"
                strokeWidth={3}
                strokeDasharray="5 5"
                dot={false}
                connectNulls={true}
              />
              
              <Line
                type="monotone"
                dataKey="pessimistic"
                stroke="var(--destructive)"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                connectNulls={true}
              />
            </ComposedChart>
          </ResponsiveContainer>

          {/* Legend for forecast scenarios */}
          <div className="flex items-center justify-center gap-6 mt-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-success" style={{ background: 'linear-gradient(to right, hsl(var(--success)) 50%, transparent 50%)', backgroundSize: '8px 100%' }}></div>
              <span className="text-success">Optimistic</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-accent" style={{ background: 'linear-gradient(to right, hsl(var(--accent)) 50%, transparent 50%)', backgroundSize: '8px 100%' }}></div>
              <span className="text-accent">Realistic</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-destructive" style={{ background: 'linear-gradient(to right, hsl(var(--destructive)) 50%, transparent 50%)', backgroundSize: '8px 100%' }}></div>
              <span className="text-destructive">Pessimistic</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default  PerformanceChart;
