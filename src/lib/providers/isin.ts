export type ProviderListing = {
  exchange: string;
  ticker: string;
  yahooSymbol: string;
};

export type ProviderAsset = {
  isin: string;
  type: "STOCK" | "ETF" | "FUND";
  distribution?: "ACC" | "DIST";
  listings: ProviderListing[];
};

// Placeholder provider: replace with real API integration.
export async function fetchIsinData(isin: string): Promise<ProviderAsset> {
  // Basic mock for development; in production, query a data provider.
  // For example, integrate with OpenFIGI/Refinitiv/Yahoo APIs.
  const upper = isin.toUpperCase();

  // Simple heuristic for demo purposes only.
  const sample: Record<string, ProviderAsset> = {
    IE00B4L5Y983: {
      isin: "IE00B4L5Y983",
      type: "ETF",
      distribution: "ACC",
      listings: [
        { exchange: "LSE", ticker: "CSP1", yahooSymbol: "CSP1.L" },
        { exchange: "XETRA", ticker: "SXR8", yahooSymbol: "SXR8.DE" },
      ],
    },
  };

  if (sample[upper]) return sample[upper];

  // Fallback dummy structure using the provided ISIN
  return {
    isin: upper,
    type: "STOCK",
    distribution: undefined,
    listings: [
      {
        exchange: "TEST",
        ticker: upper.slice(0, 4),
        yahooSymbol: `${upper.slice(0, 4)}.TOY`,
      },
    ],
  };
}

