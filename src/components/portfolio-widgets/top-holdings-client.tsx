'use client'

import { FormEvent, useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { TopHoldingItem } from "./top-holdings.types"

type TopHoldingsListProps = {
  holdings: TopHoldingItem[]
}

export const TopHoldingsList = ({ holdings }: TopHoldingsListProps) => {
  const router = useRouter()
  const [selectedHolding, setSelectedHolding] = useState<TopHoldingItem | null>(null)
  const [sellQuantity, setSellQuantity] = useState("")
  const [sellPrice, setSellPrice] = useState("")
  const [sellDate, setSellDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [isSellDialogOpen, setIsSellDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleOpenSellDialog = useCallback((holding: TopHoldingItem) => {
    setSelectedHolding(holding)
    setSellQuantity(String(holding.quantity))
    const impliedPrice = holding.quantity > 0 ? holding.value / holding.quantity : 0
    setSellPrice(impliedPrice > 0 ? impliedPrice.toFixed(2) : "")
    setSellDate(new Date().toISOString().slice(0, 10))
    setError(null)
    setIsSellDialogOpen(true)
  }, [])

  const handleCloseSellDialog = useCallback(() => {
    setIsSellDialogOpen(false)
    setSelectedHolding(null)
    setSellQuantity("")
    setSellPrice("")
    setSellDate(new Date().toISOString().slice(0, 10))
    setError(null)
  }, [])

  const handleSubmitSell = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!selectedHolding) {
        return
      }

      const quantityValue = Number.parseInt(sellQuantity, 10)
      const priceValue = Number.parseFloat(sellPrice)
      const tradeDate = sellDate.trim()

      if (!Number.isFinite(quantityValue) || quantityValue <= 0) {
        setError("Quantity must be a positive whole number")
        return
      }

      if (!Number.isInteger(quantityValue)) {
        setError("Quantity must be a whole number")
        return
      }

      if (quantityValue > selectedHolding.quantity) {
        setError("Cannot sell more shares than you hold")
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

      setIsSubmitting(true)
      setError(null)

      try {
        const response = await fetch("/api/purchases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symbol: selectedHolding.symbol,
            yahooSymbol: selectedHolding.isin,
            name: selectedHolding.name,
            quantity: quantityValue,
            price: priceValue,
            tradeDate,
            marketPrice: priceValue,
            side: "sell",
          }),
        })

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}))
          const message = typeof payload?.error === "string" ? payload.error : "Failed to record sale"
          throw new Error(message)
        }

        handleCloseSellDialog()
        router.refresh()
      } catch (submitError) {
        const message = submitError instanceof Error ? submitError.message : "Unexpected error creating sale"
        setError(message)
      } finally {
        setIsSubmitting(false)
      }
    },
    [handleCloseSellDialog, router, sellPrice, sellQuantity, sellDate, selectedHolding]
  )

  return (
    <>
      <div className="space-y-4">
        {holdings.map((holding) => (
          <div
            key={holding.symbol}
            className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div>
                  <div className="font-medium text-foreground">{holding.symbol}</div>
                  <div className="text-sm text-muted-foreground">{holding.name}</div>
                  <div className="text-xs text-neutral font-mono">{holding.isin}</div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="font-medium text-foreground">${holding.value.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">{holding.weight}%</div>
                <div className={`text-sm ${holding.change >= 0 ? 'text-gain' : 'text-loss'}`}>
                  {holding.change >= 0 ? '+' : ''}{holding.change}%
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenSellDialog(holding)}
              >
                Sell
              </Button>
            </div>
          </div>
        ))}
      </div>

      {isSellDialogOpen && selectedHolding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-lg border border-border bg-card shadow-xl">
            <div className="border-b border-border px-4 py-3">
              <div className="text-sm font-semibold text-foreground">Sell {selectedHolding.symbol}</div>
              <div className="text-xs text-muted-foreground">{selectedHolding.name}</div>
              <div className="text-[11px] text-muted-foreground">Available: {selectedHolding.quantity} shares</div>
            </div>
            <form className="space-y-4 px-4 py-4" onSubmit={handleSubmitSell}>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="sell-quantity">
                  Amount (shares)
                </label>
                <Input
                  id="sell-quantity"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={sellQuantity}
                  onChange={(event) => setSellQuantity(event.target.value)}
                  placeholder={String(selectedHolding.quantity)}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="sell-price">
                  Price per share
                </label>
                <Input
                  id="sell-price"
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  value={sellPrice}
                  onChange={(event) => setSellPrice(event.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="sell-date">
                  Trade date
                </label>
                <Input
                  id="sell-date"
                  type="date"
                  value={sellDate}
                  onChange={(event) => setSellDate(event.target.value)}
                  required
                />
              </div>
              {error && <div className="text-xs text-destructive">{error}</div>}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCloseSellDialog}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  size="sm"
                  disabled={
                    isSubmitting ||
                    !sellQuantity ||
                    !sellPrice ||
                    !sellDate ||
                    Number.isNaN(Number.parseFloat(sellPrice)) ||
                    Number.isNaN(Number.parseFloat(sellQuantity))
                  }
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Sell"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
