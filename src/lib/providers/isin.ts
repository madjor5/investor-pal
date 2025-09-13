export type ProviderListing = {
  exchange: string; // prefer MIC code when available
  ticker: string;
  yahooSymbol: string;
  isPreferred?: boolean;
};

export type ProviderAsset = {
  isin: string;
  type: "STOCK" | "ETF" | "FUND";
  distribution?: "ACC" | "DIST" | null;
  listings: ProviderListing[];
  preferredYahooSymbol?: string | null;
};

// Mapping for Yahoo suffixes by MIC, provided by the user context
const YAHOO_SUFFIX_BY_MIC: Record<string, string> = {
  XCSE: ".CO",
  XSTO: ".ST",
  XOSL: ".OL",
  XHEL: ".HE",
  XETR: ".DE",
  XLON: ".L",
  XSWX: ".SW",
  XAMS: ".AS",
  XMIL: ".MI",
  XPAR: ".PA",
  XNYS: "",
  XNAS: "",
};

const PREFERRED_MIC_ORDER = [
  "XCSE",
  "XSTO",
  "XOSL",
  "XHEL",
  "XETR",
  "XLON",
  "XSWX",
  "XAMS",
  "XMIL",
  "XPAR",
  "XNYS",
  "XNAS",
];

type AiListing = {
  exchange: string; // name
  ticker: string;
  mic: string | null;
  currency: string | null;
  yahooSymbol: string | null;
  isPreferred: boolean;
};

type AiResponse = {
  query: string;
  asset: {
    isin: string;
    name: string;
    type: "STOCK" | "ETF" | "FUND" | "UNKNOWN";
    domicile: string | null;
    baseCurrency: string | null;
    distribution: "ACC" | "DIST" | "NA" | null;
  };
  listings: AiListing[];
  preferredYahooSymbol: string | null;
  source: string;
  notes: string;
};

function coerceYahooSymbol(ticker?: string | null, mic?: string | null): string | "" {
  const t = (ticker || "").trim();
  if (!t) return "";
  const suffix = mic ? YAHOO_SUFFIX_BY_MIC[mic] ?? "" : "";
  return `${t}${suffix}`;
}

function postProcessAi(ai: AiResponse): ProviderAsset {
  // Ensure exactly one preferred listing and compute yahoo symbols if missing
  let listings = (ai.listings || []).filter((l) => l && l.ticker);

  // If AI did not enforce preferred, apply our order
  if (!listings.some((l) => l.isPreferred)) {
    listings.sort((a, b) =>
      (PREFERRED_MIC_ORDER.indexOf(a.mic || "zzz") + 999) -
      (PREFERRED_MIC_ORDER.indexOf(b.mic || "zzz") + 999)
    );
    if (listings[0]) listings[0].isPreferred = true;
  } else {
    // Normalize to exactly one preferred
    let picked = false;
    listings = listings.map((l) => {
      if (l.isPreferred && !picked) {
        picked = true;
        return l;
      }
      return { ...l, isPreferred: false };
    });
    if (!picked && listings[0]) listings[0].isPreferred = true;
  }

  const providerListings: ProviderListing[] = listings.map((l) => {
    const mic = l.mic || undefined;
    const ys = l.yahooSymbol?.trim() || coerceYahooSymbol(l.ticker, mic || null);
    return {
      exchange: mic || l.exchange || "UNKNOWN",
      ticker: l.ticker,
      yahooSymbol: ys,
      isPreferred: !!l.isPreferred,
    };
  });

  const preferred =
    ai.preferredYahooSymbol || providerListings.find((l) => l.isPreferred)?.yahooSymbol || null;

  let type: ProviderAsset["type"];
  switch (ai.asset.type) {
    case "ETF":
    case "FUND":
    case "STOCK":
      type = ai.asset.type;
      break;
    default:
      type = "STOCK"; // fallback since DB schema does not support UNKNOWN
  }

  const distribution = ai.asset.distribution === "ACC" || ai.asset.distribution === "DIST" ? ai.asset.distribution : null;

  return {
    isin: ai.asset.isin || ai.query,
    type,
    distribution,
    listings: providerListings,
    preferredYahooSymbol: preferred,
  };
}

export async function fetchIsinData(isin: string): Promise<ProviderAsset> {
  const upper = isin.toUpperCase();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable");
  }

  const system =
    "You are a resolver. Given an ISIN, you must return ONLY one JSON object in the following structure. Do not output text, comments, markdown, or code fences — only valid JSON.";

  const suffixMapJson = JSON.stringify(YAHOO_SUFFIX_BY_MIC);
  const prefOrderJson = JSON.stringify(PREFERRED_MIC_ORDER);

  const rules = `Rules: - asset.type must be one of: STOCK, ETF, FUND, UNKNOWN. - Build yahooSymbol = ticker + suffix, using this mapping: ${suffixMapJson} - Exactly one listing must have "isPreferred": true, based on this priority order: ${prefOrderJson}. All others must be false. Also set preferredYahooSymbol = that listing’s yahooSymbol. - If no listings are found, return asset.type="UNKNOWN", listings=[], preferredYahooSymbol=null. - source must name the real or assumed upstream source(s) (e.g., "OpenFIGI", "EODHD", "Yahoo"). - notes must be a short factual string (not empty).`;

  const shape = `The JSON object must match this shape: { "query": "string", "asset": { "isin": "string", "name": "string", "type": "STOCK|ETF|FUND|UNKNOWN", "domicile": "string|null", "baseCurrency": "string|null", "distribution": "ACC|DIST|NA|null" }, "listings": [ { "exchange": "string", "ticker": "string", "mic": "string|null", "currency": "string|null", "yahooSymbol": "string|null", "isPreferred": true|false } ], "preferredYahooSymbol": "string|null", "source": "string", "notes": "string" }`;

  const user = `Now resolve this ISIN and return the JSON object only: ${upper}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: `${rules}\n\n${shape}\n\n${user}` },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI request failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned no content");

  // Some models occasionally include code fences; strip if present
  const cleaned = content.trim().replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "");

  let ai: AiResponse;
  try {
    ai = JSON.parse(cleaned);
  } catch (e) {
    throw new Error("Failed to parse JSON from OpenAI");
  }

  return postProcessAi(ai);
}
