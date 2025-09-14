import { HeaderBar } from "@/components/header/header-bar";
import { PortfolioOverview } from "@/components/porfolio-overview";


export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <HeaderBar />
      <main className="container mx-auto px-6 py-8">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Portfolio Overview - Takes 2 columns */}
          <div className="md:col-span-2">
            <PortfolioOverview />
          </div>

          {/* Side Panel - Stock Search & Risk */}
          <div className="space-y-6">
            Sidebar
          </div>
        </div>
      </main>
    </div>
  );
}
