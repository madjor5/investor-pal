This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Database & Prisma

This app uses PostgreSQL with Prisma as ORM.

- Models: `Asset`, `AssetListing`
- Enums: `AssetType` (`STOCK`, `ETF`, `FUND`), `DistributionType` (`ACC`, `DIST`)
- Constraints:
  - `Asset.isin` is unique when set (nullable unique in Postgres allows multiple NULLs)
  - An Asset has many listings
  - `AssetListing` composite uniqueness: `(assetId, exchange, ticker)`
  - Deleting an Asset cascades to its listings (`onDelete: Cascade` on the FK)

Prisma schema lives in `prisma/schema.prisma`.

### Setup

1) Copy env and set your database URL

```bash
cp .env.example .env
# then edit .env and set DATABASE_URL
```

2) Install Prisma and generate client

```bash
npm install prisma @prisma/client
npm run prisma:generate
```

3) Create the database schema

```bash
# Option A: tracked migrations (recommended for dev)
npm run prisma:migrate -- --name init

# Option B: push schema directly (quick, no migration files)
npm run db:push
```

4) Open Prisma Studio (optional)

```bash
npm run prisma:studio
```

### Using Prisma in code

Import the shared client from `src/lib/prisma.ts`:

```ts
import { prisma } from '@/lib/prisma'

// example: create an asset with a listing
await prisma.asset.create({
  data: {
    type: 'ETF',
    isin: 'IE00B4L5Y983',
    distribution: 'ACC',
    listings: {
      create: {
        exchange: 'XLON',
        ticker: 'VUSA',
        yahooSymbol: 'VUSA.L'
      }
    }
  }
})
```

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
