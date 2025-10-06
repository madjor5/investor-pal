import { Settings, TrendingUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "./ui/button";
import { ThemeSwitch } from "./theme/theme-switch";

const PortfolioHeader = () => {
  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <TrendingUp className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Portfolio Manager</h1>
              <p className="text-sm text-muted-foreground">Track performance and analyze your investments</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Select defaultValue="1y">
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1m">1M</SelectItem>
                <SelectItem value="3m">3M</SelectItem>
                <SelectItem value="6m">6M</SelectItem>
                <SelectItem value="1y">1Y</SelectItem>
                <SelectItem value="3y">3Y</SelectItem>
                <SelectItem value="5y">5Y</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="usd">
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="usd">USD</SelectItem>
                <SelectItem value="eur">EUR</SelectItem>
                <SelectItem value="gbp">GBP</SelectItem>
                <SelectItem value="jpy">JPY</SelectItem>
              </SelectContent>
            </Select>

            <ThemeSwitch />

            <Button variant="ghost" size="icon">
              <Settings aria-hidden className="h-5 w-5" />
              <span className="sr-only">Open settings</span>
            </Button>
          </div>
        </div>
      </div>
    </header >
  )
}

export default PortfolioHeader;
