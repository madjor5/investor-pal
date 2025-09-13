"use client";

type Listing = {
  id?: number;
  exchange: string;
  ticker: string;
  yahooSymbol: string;
};

type Asset = {
  id: number;
  isin: string | null;
  type: string;
  distribution: string | null;
};

export function ResultCard({ data }: { data: any }) {
  const asset: Asset | undefined = data?.asset;
  const listings: Listing[] = data?.listings ?? [];
  const created = data?.created ?? false;

  if (!asset) return null;

  return (
    <div className="w-full max-w-xl border rounded p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Asset Saved</h2>
        <span className="text-xs px-2 py-1 rounded bg-gray-100 border">
          {created ? "Created" : "Updated"}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="text-gray-500">ISIN</div>
        <div className="font-mono">{asset.isin ?? "-"}</div>
        <div className="text-gray-500">Type</div>
        <div>{asset.type}</div>
        <div className="text-gray-500">Distribution</div>
        <div>{asset.distribution ?? "-"}</div>
      </div>

      <div className="mt-4">
        <h3 className="text-sm font-medium mb-2">Listings</h3>
        {listings.length === 0 ? (
          <div className="text-sm text-gray-500">No listings</div>
        ) : (
          <ul className="text-sm divide-y">
            {listings.map((l, idx) => (
              <li key={`${l.exchange}-${l.ticker}-${idx}`} className="py-2 flex justify-between">
                <div className="flex flex-col">
                  <span className="font-mono">{l.ticker}</span>
                  <span className="text-gray-500 text-xs">{l.exchange}</span>
                </div>
                <div className="font-mono text-xs">{l.yahooSymbol}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
