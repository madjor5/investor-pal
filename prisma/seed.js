// CommonJS seed script to avoid extra tooling
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const UNIVERSE = [
  { symbol: "AAPL", name: "Apple Inc.", isin: "US0378331005", ref: 180 },
  { symbol: "MSFT", name: "Microsoft Corp.", isin: "US5949181045", ref: 420 },
  { symbol: "GOOGL", name: "Alphabet Inc. Class A", isin: "US02079K3059", ref: 160 },
  { symbol: "NVDA", name: "NVIDIA Corp.", isin: "US67066G1040", ref: 800 },
  { symbol: "AMZN", name: "Amazon.com, Inc.", isin: "US0231351067", ref: 180 },
  { symbol: "TSLA", name: "Tesla, Inc.", isin: "US88160R1014", ref: 250 },
];

function pick(arr, n) {
  const copy = [...arr];
  const out = [];
  while (out.length < n && copy.length) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

async function main() {
  const accountsCount = await prisma.account.count();
  const purchasesCount = await prisma.purchase.count();
  if (accountsCount > 0 || purchasesCount > 0) {
    console.log("Database already seeded; skipping");
    return;
  }

  const [a1, a2] = await Promise.all([
    prisma.account.create({ data: { name: "Main Brokerage", type: "Brokerage", currency: "USD" } }),
    prisma.account.create({ data: { name: "Retirement 401k", type: "Retirement", currency: "USD" } }),
  ]);

  const count = 3 + Math.floor(Math.random() * 3); // 3–5 instruments
  const picks = pick(UNIVERSE, count);

  for (let i = 0; i < picks.length; i++) {
    const p = picks[i];
    const volatility = p.ref * 0.15;
    const currentPrice = Math.max(5, +(p.ref + (Math.random() - 0.5) * 2 * volatility).toFixed(2));
    const instrument = await prisma.instrument.create({
      data: { symbol: p.symbol, name: p.name, isin: p.isin, currentPrice },
    });

    const lotCount = 2 + Math.floor(Math.random() * 3); // 2–4 trades total per instrument
    let boughtQty = 0;
    // First create 1–3 buy lots
    const buyLots = 1 + Math.floor(Math.random() * 3);
    for (let k = 0; k < buyLots; k++) {
      const tradeSpread = currentPrice * 0.1;
      const price = Math.max(1, +(currentPrice + (Math.random() - 0.5) * 2 * tradeSpread).toFixed(2));
      const quantity = 5 + Math.floor(Math.random() * 60);
      const daysAgo = 7 + Math.floor(Math.random() * 300);
      const tradeDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      await prisma.purchase.create({
        data: {
          accountId: (i % 2 === 0 ? a1 : a2).id,
          instrumentId: instrument.id,
          quantity,
          price,
          fees: +(Math.random() * 5).toFixed(2),
          tradeDate,
        },
      });
      boughtQty += quantity;
    }

    // Optionally create 0–1 sell lots up to 60% of accumulated buys
    const makeSell = Math.random() < 0.7 && boughtQty > 0; // 70% chance to have a sell
    if (makeSell) {
      const sellLots = Math.random() < 0.5 ? 1 : 2;
      let remainingSellCapacity = Math.floor(boughtQty * 0.6);
      for (let s = 0; s < sellLots && remainingSellCapacity > 0; s++) {
        const tradeSpread = currentPrice * 0.08;
        const price = Math.max(1, +(currentPrice + (Math.random() - 0.5) * 2 * tradeSpread).toFixed(2));
        const maxThisLot = Math.max(1, Math.floor(remainingSellCapacity / (sellLots - s)));
        const quantity = -1 * (1 + Math.floor(Math.random() * maxThisLot)); // negative for sell
        const daysAgo = 3 + Math.floor(Math.random() * 150);
        const tradeDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
        await prisma.purchase.create({
          data: {
            accountId: (i % 2 === 0 ? a1 : a2).id,
            instrumentId: instrument.id,
            quantity,
            price,
            fees: +(Math.random() * 5).toFixed(2), // still pay fees on sells
            tradeDate,
          },
        });
        remainingSellCapacity += quantity; // quantity is negative, so subtracts
      }
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
