'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, TrendingUp, TrendingDown } from "lucide-react"
import { useState } from "react";

export const StockSearch = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);

  // Mock search result
  const handleSearch = () => {
    if (searchQuery.trim()) {
      setSearchResult({
        symbol: "AAPL",
        name: "Apple Inc.",
        isin: "US0378331005",
        price: 182.52,
        change: 2.34,
        changePercent: 1.30,
        tradingVenues: [
          { name: "NASDAQ", currency: "USD", available: true },
          { name: "XETRA", currency: "EUR", available: true },
          { name: "LSE", currency: "GBP", available: true },
          { name: "SIX", currency: "CHF", available: false },
        ],
        portfolioImpact: {
          wouldIncrease: "Technology",
          riskChange: "+0.2",
          diversificationChange: "-1.5%"
        }
      });
    }
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Search className="h-5 w-5 text-primary" />
          Stock Search
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter ISIN or symbol..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1"
          />
          <Button onClick={handleSearch} size="sm" className="px-3">
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {searchResult && (
          <div className="space-y-4 pt-4 border-t border-border">
            {/* Stock Info */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-foreground">{searchResult.symbol}</div>
                  <div className="text-sm text-muted-foreground">{searchResult.name}</div>
                  <div className="text-xs text-neutral font-mono">{searchResult.isin}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-foreground">${searchResult.price}</div>
                  <div className={`text-sm flex items-center ${searchResult.change >= 0 ? 'text-gain' : 'text-loss'}`}>
                    {searchResult.change >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                    {searchResult.change >= 0 ? '+' : ''}{searchResult.change} ({searchResult.changePercent >= 0 ? '+' : ''}{searchResult.changePercent}%)
                  </div>
                </div>
              </div>
            </div>

            {/* Trading Venues */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">Trading Venues</div>
              <div className="grid grid-cols-2 gap-2">
                {searchResult.tradingVenues.map((venue: any) => (
                  <div key={venue.name} className={`p-2 rounded-md border text-xs ${
                    venue.available 
                      ? 'border-gain/30 bg-gain/10 text-gain' 
                      : 'border-loss/30 bg-loss/10 text-loss'
                  }`}>
                    <div className="font-medium">{venue.name}</div>
                    <div className="text-xs opacity-80">{venue.currency}</div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Portfolio Impact */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">Portfolio Impact</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sector exposure:</span>
                  <span className="text-foreground">{searchResult.portfolioImpact.wouldIncrease}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Risk change:</span>
                  <span className="text-neutral">{searchResult.portfolioImpact.riskChange}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Diversification:</span>
                  <span className="text-loss">{searchResult.portfolioImpact.diversificationChange}</span>
                </div>
              </div>
            </div>

          </div>
        )}
      </CardContent>
    </Card>
  )
}