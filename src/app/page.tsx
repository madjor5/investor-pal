import PortfolioHeader from "@/components/portfolio-header";
import { DollarSign, GitBranch, Percent, Target, TrendingUp, TrendingDown, Activity, AlertTriangle } from "lucide-react";
import MetricCard from "@/components/metric-card";
import PerformanceChart from "@/components/performance-chart";


export default function Home() {
  const performanceMetrics = [
    {
      icon: DollarSign,
      label: "Total Value",
      value: "$1,238,000",
      subtitle: "Portfolio Value",
      change: "+$45,230",
      changeType: "positive" as const,
    },
    {
      icon: TrendingUp,
      label: "CAGR (5Y)",
      value: "7.1%",
      subtitle: "Annualized Return",
      change: "+5.2%",
      changeType: "positive" as const,
    },
    {
      icon: Percent,
      label: "Yield",
      value: "2.8%",
      subtitle: "Dividend Yield",
      change: "+0.3%",
      changeType: "positive" as const,
    },
    {
      icon: Activity,
      label: "Alpha",
      value: "1.9%",
      subtitle: "Risk-Adjusted Return",
      change: "+0.8%",
      changeType: "positive" as const,
    },
  ];

  const riskMetrics = [
    {
      icon: Activity,
      label: "Volatility",
      value: "14.8%",
      subtitle: "Risk Measure",
      change: "12 Month",
      changeType: "neutral" as const,
    },
    {
      icon: TrendingDown,
      label: "Max Drawdown",
      value: "-22.5%",
      subtitle: "Worst Decline",
      change: "Oct 2022",
      changeType: "negative" as const,
    },
    {
      icon: Target,
      label: "Sharpe Ratio",
      value: "1.42",
      subtitle: "Return per Risk",
      change: "+0.28",
      changeType: "positive" as const,
    },
    {
      icon: GitBranch,
      label: "Correlation Score",
      value: "0.73",
      subtitle: "Portfolio Diversity",
      change: "Low Correlation",
      changeType: "positive" as const,
    },
  ];
  return (
    <div className="min-h-screen bg-background">
      <PortfolioHeader />
      <main className="container mx-auto px-6 py-6">
        <div className="text-blue-500">TODO: tabs</div>
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MetricCard
              title="Performance"
              icon={TrendingUp}
              metrics={performanceMetrics}
              variant="performance"
            />
            <MetricCard
              title="Risk"
              icon={AlertTriangle}
              metrics={riskMetrics}
              variant="risk"
            />
          </div>

          <PerformanceChart />
        </div>
      </main>
    </div>
  );
}
