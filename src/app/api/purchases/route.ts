import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"

const parseNumber = (value: unknown) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) {
      return null
    }

    const parsed = Number.parseFloat(trimmed)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

const parseInteger = (value: unknown) => {
  const parsed = parseNumber(value)
  if (parsed === null) {
    return null
  }

  const rounded = Math.round(parsed)
  if (!Number.isFinite(rounded) || Math.abs(rounded - parsed) > Number.EPSILON) {
    return null
  }

  return rounded
}

export async function POST(request: Request) {
  try {
    const payload = await request.json()

    const symbol = typeof payload?.symbol === "string" ? payload.symbol.trim() : ""
    const yahooSymbol = typeof payload?.yahooSymbol === "string" ? payload.yahooSymbol.trim() : ""
    const name = typeof payload?.name === "string" ? payload.name.trim() : ""
    const tradeDateRaw = typeof payload?.tradeDate === "string" ? payload.tradeDate : ""
    const quantity = parseInteger(payload?.quantity)
    const price = parseNumber(payload?.price)
    const latestMarketPrice = parseNumber(payload?.marketPrice)
    const accountId = typeof payload?.accountId === "string" ? payload.accountId.trim() : ""

    if (!symbol || !yahooSymbol || !name) {
      return NextResponse.json({ error: "Missing instrument details" }, { status: 400 })
    }

    if (quantity === null || quantity <= 0) {
      return NextResponse.json({ error: "Quantity must be a positive whole number" }, { status: 400 })
    }

    if (price === null || price <= 0) {
      return NextResponse.json({ error: "Price must be a positive number" }, { status: 400 })
    }

    if (!tradeDateRaw) {
      return NextResponse.json({ error: "Trade date is required" }, { status: 400 })
    }

    const tradeDate = new Date(tradeDateRaw)
    if (Number.isNaN(tradeDate.getTime())) {
      return NextResponse.json({ error: "Invalid trade date" }, { status: 400 })
    }

    let account = null
    if (accountId) {
      account = await prisma.account.findUnique({ where: { id: accountId } })
      if (!account) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 })
      }
    } else {
      account = await prisma.account.findFirst()
      if (!account) {
        return NextResponse.json({ error: "No trading accounts are configured" }, { status: 400 })
      }
    }

    const existingInstrument = await prisma.instrument.findFirst({
      where: {
        OR: [{ symbol }, { isin: yahooSymbol }],
      },
    })

    const instrument = existingInstrument
      ? await prisma.instrument.update({
          where: { id: existingInstrument.id },
          data: {
            name,
            currentPrice: latestMarketPrice ?? price,
          },
        })
      : await prisma.instrument.create({
          data: {
            symbol,
            name,
            isin: yahooSymbol,
            currentPrice: latestMarketPrice ?? price,
          },
        })

    const purchase = await prisma.purchase.create({
      data: {
        accountId: account.id,
        instrumentId: instrument.id,
        quantity,
        price,
        fees: 0,
        tradeDate,
      },
      include: { instrument: true, account: true },
    })

    revalidatePath("/")

    return NextResponse.json({ purchase })
  } catch (error) {
    console.error("Failed to record purchase", error)
    return NextResponse.json({ error: "Failed to record purchase" }, { status: 500 })
  }
}
