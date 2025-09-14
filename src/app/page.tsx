import { HeaderBar } from "@/components/header/header-bar";
import { Diversification } from "@/components/portfolio-widgets/diversification";
import { PortfolioOverview } from "@/components/portfolio-widgets/porfolio-overview";
import { RiskScore } from "@/components/portfolio-widgets/risk-score";
import { StockSearch } from "@/components/portfolio-widgets/stock-search";
import { TopHoldings } from "@/components/portfolio-widgets/top-holdings";
import { TotalReturn } from "@/components/portfolio-widgets/total-return";


export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <HeaderBar />
      <main className="container mx-auto px-6 py-8">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Portfolio Overview - Takes 2 columns */}
          <div className="md:col-span-2">
            <div className="space-y-6">
              {/* Portfolio Summary Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <PortfolioOverview />
                <TotalReturn />
                <RiskScore />
                <Diversification />
              </div>
              <TopHoldings />
            </div>
          </div>

          {/* Side Panel - Stock Search & Risk */}
          <div className="space-y-6">
            <StockSearch />
          </div>
        </div>
      </main>
    </div>
  );
}
