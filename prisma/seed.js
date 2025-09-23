// CommonJS seed script to avoid extra tooling
// eslint-disable-next-line @typescript-eslint/no-require-imports
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
  const instrumentsCount = await prisma.instrument.count();
  if (accountsCount > 0 || purchasesCount > 0 || instrumentsCount > 0) {
    console.log("Database already seeded; skipping");
    return;
  }

  await prisma.account.createMany({
    data: [
      { name: "Main Brokerage", type: "Brokerage", currency: "USD" },
      { name: "Retirement 401k", type: "Retirement", currency: "USD" },
    ],
  });

  console.log("Seed complete: created accounts without holdings");
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
