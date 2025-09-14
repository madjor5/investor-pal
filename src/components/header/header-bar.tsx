import { BarChart3 } from "lucide-react";
import { ThemeSwitch } from "../theme/theme-switch";

export function HeaderBar() {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <BarChart3 className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Portfolio Pal</h1>
              <p className="text-sm text-muted-foreground">Investment monitoring & forecasting</p>
            </div>
          </div>
          <ThemeSwitch />
        </div>
      </div>
    </header>
  );
}