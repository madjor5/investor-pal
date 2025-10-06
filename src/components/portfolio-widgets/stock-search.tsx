'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Loader2, Search, TrendingDown, TrendingUp } from "lucide-react"
import type { TickerMatch } from "@/lib/ticker-resolution"
import type { YahooQuote } from "@/lib/yahoo-finance"

const MIN_QUERY_LENGTH = 2

const parseQuantityValue = (value: string): number | null => {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

const parsePriceValue = (value: string): number | null => {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

const formatTotalValue = (quantity: number, price: number): string => (quantity * price).toFixed(2)

export const StockSearch = () => {
  const [searchQuery, setSearchQuery] = useState("")
  const [matches, setMatches] = useState<TickerMatch[]>([])
  const [selectedMatch, setSelectedMatch] = useState<TickerMatch | null>(null)
  const [quote, setQuote] = useState<YahooQuote | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isFetchingQuote, setIsFetchingQuote] = useState(false)
  const [isBuyDialogOpen, setIsBuyDialogOpen] = useState(false)
  const [isSubmittingBuy, setIsSubmittingBuy] = useState(false)
  const [tradeQuantity, setTradeQuantity] = useState("")
  const [tradePrice, setTradePrice] = useState("")
  const [tradeDate, setTradeDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [tradeTotal, setTradeTotal] = useState("")
  const [hasEditedTradePrice, setHasEditedTradePrice] = useState(false)
  const [suggestedPrice, setSuggestedPrice] = useState<number | null>(null)

  const router = useRouter()

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
      setIsBuyDialogOpen(false)
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

  const handleOpenBuyDialog = useCallback(() => {
    const priceSource = (() => {
      const marketPrice = typeof quote?.price === "number" ? quote.price : null
      if (marketPrice !== null && Number.isFinite(marketPrice)) {
        return marketPrice
      }

      const previousClose = typeof quote?.previousClose === "number" ? quote.previousClose : null
      if (previousClose !== null && Number.isFinite(previousClose)) {
        return previousClose
      }

      return null
    })()

    const fallbackQuantity = (() => {
      const existing = parseQuantityValue(tradeQuantity)
      if (existing !== null && existing > 0) {
        return existing
      }
      return 10
    })()

    const nextQuantity = String(fallbackQuantity)
    const nextPrice = priceSource !== null ? priceSource.toFixed(2) : ""
    const nextTotal =
      priceSource !== null && Number.isFinite(priceSource)
        ? formatTotalValue(fallbackQuantity, priceSource)
        : ""

    setTradeQuantity(nextQuantity)
    setTradePrice(nextPrice)
    setTradeTotal(nextTotal)
    setTradeDate(new Date().toISOString().slice(0, 10))
    setSuggestedPrice(priceSource)
    setHasEditedTradePrice(false)
    setError(null)
    setIsBuyDialogOpen(true)
  }, [quote, tradeQuantity])

  const handleCloseBuyDialog = useCallback(() => {
    setIsBuyDialogOpen(false)
    setSuggestedPrice(null)
    setTradeTotal("")
    setHasEditedTradePrice(false)
  }, [])

  const getHistoricalPriceForDate = useCallback(
    (targetDate: string): number | null => {
      if (!quote?.history?.length) {
        return null
      }

      let latest: number | null = null
      for (const point of quote.history) {
        if (point.date === targetDate) {
          return point.close
        }

        if (point.date < targetDate) {
          latest = point.close
          continue
        }

        if (point.date > targetDate) {
          break
        }
      }

      return latest
    },
    [quote?.history]
  )

  useEffect(() => {
    if (!isBuyDialogOpen || !tradeDate) {
      return
    }

    const normalized = tradeDate.trim()
    if (normalized.length === 0) {
      setSuggestedPrice(null)
      return
    }

    const historicalPrice = getHistoricalPriceForDate(normalized)
    setSuggestedPrice(historicalPrice)

    if (!hasEditedTradePrice && historicalPrice !== null) {
      setTradePrice(historicalPrice.toFixed(2))
      const quantityValue = parseQuantityValue(tradeQuantity)
      if (quantityValue !== null) {
        setTradeTotal(formatTotalValue(quantityValue, historicalPrice))
      }
    }

    if (historicalPrice === null) {
      setTradeTotal("")
    }
  }, [getHistoricalPriceForDate, hasEditedTradePrice, isBuyDialogOpen, tradeDate, tradeQuantity])

  const handleSubmitBuy = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!selectedMatch) {
        return
      }

      const quantityValue = Number.parseFloat(tradeQuantity)
      const priceValue = Number.parseFloat(tradePrice)

      if (!Number.isFinite(quantityValue) || quantityValue <= 0 || !Number.isInteger(quantityValue)) {
        setError("Quantity must be a positive whole number")
        return
      }

      if (!Number.isFinite(priceValue) || priceValue <= 0) {
        setError("Price must be a positive number")
        return
      }

      if (!tradeDate) {
        setError("Trade date is required")
        return
      }

      setIsSubmittingBuy(true)
      setError(null)

      try {
        const response = await fetch("/api/purchases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symbol: selectedMatch.symbol,
            yahooSymbol: selectedMatch.yahooSymbol,
            name: selectedMatch.name,
            quantity: quantityValue,
            price: priceValue,
            tradeDate,
            marketPrice: quote?.price ?? null,
          }),
        })

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}))
          const message = typeof payload?.error === "string" ? payload.error : "Failed to record purchase"
          throw new Error(message)
        }

        setIsBuyDialogOpen(false)
        setTradeQuantity("")
        setTradePrice("")
        setTradeDate(new Date().toISOString().slice(0, 10))
        setTradeTotal("")
        setHasEditedTradePrice(false)
        router.refresh()
      } catch (submitError) {
        const message =
          submitError instanceof Error ? submitError.message : "Unexpected error creating purchase"
        setError(message)
      } finally {
        setIsSubmittingBuy(false)
      }
    },
    [quote?.price, router, selectedMatch, tradeDate, tradePrice, tradeQuantity]
  )

  return (
    <>
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
              {isSearching ? (
                <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
              ) : (
                <Search aria-hidden className="h-4 w-4" />
              )}
              <span className="sr-only">{isSearching ? "Searching" : "Search"}</span>
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
                <div className="flex items-start justify-between gap-4">
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
                  <div className="text-right space-y-2">
                    <div className="font-medium text-foreground min-h-[1.5rem] flex items-center justify-end">
                      {isFetchingQuote ? (
                        <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
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
                    <Button
                      size="sm"
                      className="ml-auto"
                      onClick={handleOpenBuyDialog}
                      disabled={!quote || isFetchingQuote}
                    >
                      Buy
                    </Button>
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

      {isBuyDialogOpen && selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-lg border border-border bg-card shadow-xl">
            <div className="border-b border-border px-4 py-3">
              <div className="text-sm font-semibold text-foreground">Buy {selectedMatch.yahooSymbol}</div>
              <div className="text-xs text-muted-foreground">{selectedMatch.name}</div>
            </div>
            <form className="space-y-4 px-4 py-4" onSubmit={handleSubmitBuy}>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="trade-quantity">
                  Amount (shares)
                </label>
                <Input
                  id="trade-quantity"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={tradeQuantity}
                  onChange={(event) => {
                    setTradeQuantity(event.target.value)
                  }}
                  onBlur={() => {
                    const quantityValue = parseQuantityValue(tradeQuantity)
                    if (quantityValue === null) {
                      setTradeQuantity("")
                      setTradeTotal("")
                      return
                    }

                    setTradeQuantity(String(quantityValue))
                    const priceValue = parsePriceValue(tradePrice)
                    if (priceValue !== null) {
                      setTradeTotal(formatTotalValue(quantityValue, priceValue))
                    }
                  }}
                  placeholder="10"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="trade-price">
                  Price per share
                </label>
                <Input
                  id="trade-price"
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  value={tradePrice}
                  onChange={(event) => {
                    setTradePrice(event.target.value)
                    setHasEditedTradePrice(true)
                  }}
                  onBlur={() => {
                    const priceValue = parsePriceValue(tradePrice)
                    if (priceValue === null) {
                      return
                    }

                    setTradePrice(priceValue.toFixed(2))
                    const quantityValue = parseQuantityValue(tradeQuantity)
                    if (quantityValue !== null) {
                      setTradeTotal(formatTotalValue(quantityValue, priceValue))
                    }
                  }}
                  placeholder="0.00"
                  required
                />
                {suggestedPrice !== null && (
                  <div className="text-[11px] text-muted-foreground">
                    Suggested close price for {tradeDate}: {formatCurrency(suggestedPrice)}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="trade-total">
                  Total price
                </label>
                <Input
                  id="trade-total"
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  value={tradeTotal}
                  onChange={(event) => {
                    setTradeTotal(event.target.value)
                  }}
                  onBlur={() => {
                    const priceValue = parsePriceValue(tradePrice)
                    if (priceValue === null) {
                      return
                    }

                    const totalValue = Number.parseFloat(tradeTotal)
                    if (!Number.isFinite(totalValue) || totalValue < 0) {
                      setTradeTotal("")
                      return
                    }

                    const nextQuantity = Math.floor(totalValue / priceValue)
                    setTradeQuantity(String(nextQuantity))

                    const normalizedTotal = formatTotalValue(nextQuantity, priceValue)
                    setTradeTotal(normalizedTotal)
                  }}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="trade-date">
                  Trade date
                </label>
                <Input
                  id="trade-date"
                  type="date"
                  value={tradeDate}
                  onChange={(event) => {
                    setTradeDate(event.target.value)
                    setHasEditedTradePrice(false)
                  }}
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCloseBuyDialog}
                  disabled={isSubmittingBuy}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={
                    isSubmittingBuy ||
                    !tradeQuantity ||
                    !tradePrice ||
                    !tradeTotal ||
                    !tradeDate ||
                    Number.isNaN(Number.parseFloat(tradePrice)) ||
                    Number.isNaN(Number.parseFloat(tradeQuantity)) ||
                    Number.isNaN(Number.parseFloat(tradeTotal))
                  }
                >
                  {isSubmittingBuy ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : "Confirm Buy"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
