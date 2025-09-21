'use client';

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Loader2, Search, TrendingDown, TrendingUp } from "lucide-react"
import type { TickerMatch } from "@/lib/ticker-resolution"
import type { YahooQuote } from "@/lib/yahoo-finance"

const MIN_QUERY_LENGTH = 2

export const StockSearch = () => {
  const [searchQuery, setSearchQuery] = useState("")
  const [matches, setMatches] = useState<TickerMatch[]>([])
  const [selectedMatch, setSelectedMatch] = useState<TickerMatch | null>(null)
  const [quote, setQuote] = useState<YahooQuote | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isFetchingQuote, setIsFetchingQuote] = useState(false)

  const latestQueryRef = useRef<string>("")
  const suppressNextSearchRef = useRef(false)

  const changeValue = quote?.change ?? null
  const changePercentValue = quote?.changePercent ?? null
  const dayLowValue = quote?.dayLow ?? null
  const dayHighValue = quote?.dayHigh ?? null
  const volumeValue = quote?.volume ?? null
  const currencyCode = quote?.currency ?? "USD"
  const formatCurrency = (value: number | null) => {
    if (value === null) {
      return "—"
    }

    const code = currencyCode.trim().length > 0 ? currencyCode : "USD"
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: code,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value)
    } catch {
      return `${code} ${value.toFixed(2)}`
    }
  }
  const marketTimeDisplay = (() => {
    if (!quote?.marketTime) {
      return "—"
    }

    const parsed = new Date(quote.marketTime)
    return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleString()
  })()

  const fetchMatches = useCallback(
    async (query: string): Promise<TickerMatch[]> => {
      latestQueryRef.current = query
      setIsSearching(true)
      try {
        const response = await fetch(`/api/stocks/search?q=${encodeURIComponent(query)}`)
        const payload = await response.json()

        if (!response.ok) {
          throw new Error(payload?.error ?? "Unable to fetch stock matches")
        }

        const nextMatches = Array.isArray(payload?.matches)
          ? (payload.matches as TickerMatch[])
          : []

        if (latestQueryRef.current === query) {
          setMatches(nextMatches)
        }

        return nextMatches
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unexpected error searching for stock"
        if (latestQueryRef.current === query) {
          setMatches([])
          setError(message)
        }
        return []
      } finally {
        if (latestQueryRef.current === query) {
          setIsSearching(false)
        }
      }
    },
    []
  )

  const fetchQuote = useCallback(async (symbol: string) => {
    setIsFetchingQuote(true)
    try {
      const response = await fetch(
        `/api/stocks/search?symbol=${encodeURIComponent(symbol)}&range=5y&interval=1d`
      )
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to fetch quote")
      }

      setQuote((payload?.quote ?? null) as YahooQuote | null)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error fetching quote"
      setError(message)
      setQuote(null)
    } finally {
      setIsFetchingQuote(false)
    }
  }, [])

  const handleSelectMatch = useCallback(
    async (match: TickerMatch) => {
      suppressNextSearchRef.current = true
      setSearchQuery(match.yahooSymbol)
      setSelectedMatch(match)
      setMatches([])
      setError(null)
      await fetchQuote(match.yahooSymbol)
    },
    [fetchQuote]
  )

  const handleSearch = useCallback(async () => {
    const query = searchQuery.trim()
    if (!query) {
      return
    }

    setError(null)

    const normalizedQuery = query.toLowerCase()
    const existingMatch = matches.find((match) =>
      [match.symbol, match.yahooSymbol].some(
        (value) => value.toLowerCase() === normalizedQuery
      )
    )

    if (existingMatch) {
      await handleSelectMatch(existingMatch)
      return
    }

    const fetchedMatches = await fetchMatches(query)
    if (fetchedMatches.length === 0) {
      setError("No matches found for that query")
      return
    }

    await handleSelectMatch(fetchedMatches[0])
  }, [fetchMatches, handleSelectMatch, matches, searchQuery])

  useEffect(() => {
    if (suppressNextSearchRef.current) {
      suppressNextSearchRef.current = false
      return
    }

    const query = searchQuery.trim()
    if (query.length < MIN_QUERY_LENGTH) {
      setMatches([])
      return
    }

    setError(null)
    const timer = window.setTimeout(() => {
      void fetchMatches(query)
    }, 300)

    return () => window.clearTimeout(timer)
  }, [fetchMatches, searchQuery])

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
          <Button onClick={handleSearch} size="sm" className="px-3" disabled={isSearching}>
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        {error && <div className="text-sm text-destructive">{error}</div>}

        {matches.length > 0 && (
          <div className="rounded-md border border-border/60 bg-background/40 text-sm">
            {matches.map((match) => (
              <button
                key={match.yahooSymbol}
                onClick={() => void handleSelectMatch(match)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted"
              >
                <div>
                  <div className="font-medium text-foreground">{match.yahooSymbol}</div>
                  <div className="text-xs text-muted-foreground">{match.name}</div>
                  {match.symbol.toUpperCase() !== match.yahooSymbol.toUpperCase() && (
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Base ticker: {match.symbol}
                    </div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground text-right">
                  {(() => {
                    const parts = [match.exchange, match.region].filter(
                      (value): value is string => Boolean(value && value.trim().length > 0)
                    )
                    if (match.description) {
                      parts.push(match.description)
                    }
                    if (typeof match.confidence === "number" && match.confidence > 0) {
                      parts.push(`conf ${(match.confidence * 100).toFixed(0)}%`)
                    }
                    return parts.join(" · ")
                  })() || ""}
                </div>
              </button>
            ))}
            {isSearching && (
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Searching…
              </div>
            )}
          </div>
        )}

        {selectedMatch && (
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-foreground">{selectedMatch.yahooSymbol}</div>
                  <div className="text-sm text-muted-foreground">{selectedMatch.name}</div>
                  <div className="text-xs text-neutral font-mono">
                    {(() => {
                      const parts = [selectedMatch.exchange, selectedMatch.region].filter(
                        (value): value is string => Boolean(value && value.trim().length > 0)
                      )
                      if (selectedMatch.description) {
                        parts.push(selectedMatch.description)
                      }
                      return parts.length > 0 ? parts.join(" · ") : "—"
                    })()}
                  </div>
                  {selectedMatch.symbol.toUpperCase() !== selectedMatch.yahooSymbol.toUpperCase() && (
                    <div className="text-[10px] text-muted-foreground">
                      Base ticker: {selectedMatch.symbol}
                    </div>
                  )}
                </div>
                <div className="text-right space-y-1">
                  <div className="font-medium text-foreground min-h-[1.5rem] flex items-center justify-end">
                    {isFetchingQuote ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      formatCurrency(quote?.price ?? null)
                    )}
                  </div>
                  {changeValue !== null && (
                    <div
                      className={`text-sm flex items-center justify-end ${
                        changeValue >= 0 ? "text-gain" : "text-loss"
                      }`}
                    >
                      {changeValue >= 0 ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {(() => {
                        const formattedChange = formatCurrency(Math.abs(changeValue))
                        return formattedChange === "—"
                          ? "—"
                          : `${changeValue >= 0 ? "+" : "-"}${formattedChange.replace(/^[-+]/, "")}`
                      })()}
                      {changePercentValue !== null &&
                        ` (${changePercentValue >= 0 ? "+" : ""}${changePercentValue.toFixed(2)}%)`}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="space-y-1">
                <div className="text-muted-foreground">Latest trading day</div>
                <div className="text-foreground">{marketTimeDisplay}</div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">Previous close</div>
                <div className="text-foreground">{formatCurrency(quote?.previousClose ?? null)}</div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">Day range</div>
                <div className="text-foreground">
                  {dayLowValue !== null && dayHighValue !== null
                    ? `${formatCurrency(dayLowValue)} - ${formatCurrency(dayHighValue)}`
                    : "—"}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">Volume</div>
                <div className="text-foreground">
                  {volumeValue !== null ? volumeValue.toLocaleString() : "—"}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
