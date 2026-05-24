import "server-only";

import { revalidateTag, unstable_cache } from "next/cache";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import {
  generateMarketCapChartPng,
  type MarketCapChartPoint,
} from "@/lib/market-home-chart";

export type MarketTrend = "Bullish" | "Bearish" | "Range Bound";
export type ThermometerTone =
  | "undervalued"
  | "fair"
  | "overextended"
  | "euphoric";

type CoinGeckoGlobalResponse = {
  data?: {
    market_cap_percentage?: {
      btc?: number;
    };
  };
};

type CoinGeckoPriceResponse = {
  bitcoin?: {
    usd?: number;
    usd_24h_change?: number;
  };
};

type CoinGeckoMarketChartResponse = {
  prices?: Array<[number, number]>;
};

type FearGreedResponse = {
  data?: Array<{
    value?: string;
    value_classification?: string;
  }>;
};

type AiBitcoinAnalysis = {
  marketTrend: MarketTrend;
  bullishZone: {
    low: number;
    high: number;
  };
  bearishZone: {
    low: number;
    high: number;
  };
};

export type BitcoinContext = {
  btcPriceUsd: number;
  btcChange24hPct: number;
  btcDominance: number | null;
  twoHundredWeekMa: number;
  distanceFromMaPct: number;
  fearGreedScore: number | null;
  fearGreedLabel: string | null;
};

export type StructuredMarketAnalysis = AiBitcoinAnalysis & {
  thermometer: {
    label: string;
    tone: ThermometerTone;
    movingAverage: string;
    distance: string;
    marketTrendCopy: string;
    stakkInsight: string;
    signal: "Accumulate" | "Scale-Out";
  };
  dashboardSummary: {
    bullishConfirmation: string;
    neutralRange: string;
    bearishBreakdown: string;
  };
};

export type AnalysisResponse = {
  analysis: StructuredMarketAnalysis;
  meta: {
    generatedAt: string;
    refreshBucket: string;
    source: string;
    method: "ai";
    currentBtcPrice: string;
    chartPoints: number;
    basedOn: string[];
    isEstimated?: boolean;
  };
};

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const MARKET_HOME_ANALYSIS_TAG = "market-home-analysis";
const NEW_YORK_TZ = "America/New_York";
const REFRESH_HOURS = [1, 5, 9, 13, 17, 21] as const;
const TWO_HUNDRED_WEEKS_IN_DAYS = 200 * 7;

function coinGeckoHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "stakk-ai-local-dev",
  };

  if (process.env.COINGECKO_API_KEY) {
    headers["x-cg-pro-api-key"] = process.env.COINGECKO_API_KEY;
  }

  return headers;
}

function normalizeTrend(value: unknown): MarketTrend | unknown {
  if (typeof value !== "string") return value;

  const normalized = value.trim().toLowerCase();
  if (normalized === "bullish") return "Bullish";
  if (normalized === "bearish") return "Bearish";
  if (
    normalized === "range bound" ||
    normalized === "range-bound" ||
    normalized === "neutral"
  ) {
    return "Range Bound";
  }

  return value;
}

const priceZoneSchema = z.object({
  low: z.coerce.number().finite().nonnegative(),
  high: z.coerce.number().finite().nonnegative(),
});

const aiBitcoinAnalysisSchema = z.object({
  marketTrend: z.preprocess(
    normalizeTrend,
    z.enum(["Bullish", "Bearish", "Range Bound"]),
  ),
  bullishZone: priceZoneSchema,
  bearishZone: priceZoneSchema,
});

function formatUsd(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "$0";

  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function formatRange(zone: { low: number; high: number }): string {
  const low = Math.min(zone.low, zone.high);
  const high = Math.max(zone.low, zone.high);
  return `${formatUsd(low)} - ${formatUsd(high)}`;
}

function parseJsonIfValid<T>(response: Response): Promise<T | null> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return Promise.resolve(null);
  }

  return response.json().catch(() => null) as Promise<T | null>;
}

function getZonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const map = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
  };
}

function shiftDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(year, month - 1, day));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function getRefreshBucket(now = new Date()): string {
  const parts = getZonedParts(now, NEW_YORK_TZ);
  const currentDateKey = `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(
    parts.day,
  ).padStart(2, "0")}`;
  const previousDateKey = shiftDateKey(currentDateKey, -1);
  const currentTotalMinutes = parts.hour * 60 + parts.minute;

  const windows = [
    { dateKey: previousDateKey, hour: 21 },
    ...REFRESH_HOURS.map((hour) => ({ dateKey: currentDateKey, hour })),
  ];

  let activeWindow = windows[0];
  for (const window of windows) {
    if (window.dateKey !== currentDateKey) continue;
    if (currentTotalMinutes >= window.hour * 60) {
      activeWindow = window;
    }
  }

  return `${activeWindow.dateKey}-${String(activeWindow.hour).padStart(2, "0")}00`;
}

async function fetchCurrentBitcoinContext(): Promise<{
  context: BitcoinContext;
  series: MarketCapChartPoint[];
}> {
  const [priceRes, chartRes, fallbackChartRes, globalRes, fearGreedRes] =
    await Promise.allSettled([
    fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true",
      { headers: coinGeckoHeaders(), cache: "no-store" },
    ),
    fetch(
      "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=1500&interval=daily",
      { headers: coinGeckoHeaders(), cache: "no-store" },
    ),
    fetch(
      "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=max",
      { headers: coinGeckoHeaders(), cache: "no-store" },
    ),
    fetch("https://api.coingecko.com/api/v3/global", {
      headers: coinGeckoHeaders(),
      cache: "no-store",
    }),
    fetch("https://api.alternative.me/fng/?limit=1", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    }),
  ]);

  if (priceRes.status !== "fulfilled" || !priceRes.value.ok) {
    throw new Error("Bitcoin price unavailable");
  }

  const price = await parseJsonIfValid<CoinGeckoPriceResponse>(priceRes.value);
  const chartResponse =
    chartRes.status === "fulfilled" && chartRes.value.ok
      ? chartRes.value
      : fallbackChartRes.status === "fulfilled" && fallbackChartRes.value.ok
        ? fallbackChartRes.value
        : null;
  const chart = chartResponse
    ? await parseJsonIfValid<CoinGeckoMarketChartResponse>(chartResponse)
    : null;
  const btcPriceUsd = price?.bitcoin?.usd;

  if (!Number.isFinite(btcPriceUsd) || !btcPriceUsd || btcPriceUsd <= 0) {
    throw new Error("Bitcoin price missing from CoinGecko response");
  }

  const rawPrices =
    chart?.prices
      ?.filter(
        (point): point is [number, number] =>
          Array.isArray(point) &&
          Number.isFinite(point[0]) &&
          Number.isFinite(point[1]) &&
          point[1] > 0,
      )
      .map(([timestamp, value]) => ({ timestamp, value })) ?? [];

  const syntheticPrices =
    rawPrices.length >= 30
      ? rawPrices
      : Array.from({ length: 30 }, (_, index) => ({
          timestamp: Date.now() - (29 - index) * 86_400_000,
          value: btcPriceUsd * (0.985 + index * 0.001),
        }));
  const maSource = rawPrices.length >= TWO_HUNDRED_WEEKS_IN_DAYS
    ? rawPrices
    : syntheticPrices;
  const maWindow = maSource.slice(-TWO_HUNDRED_WEEKS_IN_DAYS);
  const twoHundredWeekMa =
    rawPrices.length >= TWO_HUNDRED_WEEKS_IN_DAYS
      ? maWindow.reduce((sum, point) => sum + point.value, 0) / maWindow.length
      : btcPriceUsd / 1.04;
  const distanceFromMaPct =
    ((btcPriceUsd - twoHundredWeekMa) / twoHundredWeekMa) * 100;

  let btcDominance: number | null = null;
  if (globalRes.status === "fulfilled" && globalRes.value.ok) {
    const global = await parseJsonIfValid<CoinGeckoGlobalResponse>(
      globalRes.value,
    );
    if (typeof global?.data?.market_cap_percentage?.btc === "number") {
      btcDominance = global.data.market_cap_percentage.btc;
    }
  }

  let fearGreedScore: number | null = null;
  let fearGreedLabel: string | null = null;
  if (fearGreedRes.status === "fulfilled" && fearGreedRes.value.ok) {
    const fearGreed = await parseJsonIfValid<FearGreedResponse>(
      fearGreedRes.value,
    );
    const latest = fearGreed?.data?.[0];
    const parsedScore = Number.parseInt(latest?.value ?? "", 10);
    if (Number.isFinite(parsedScore)) {
      fearGreedScore = parsedScore;
      fearGreedLabel = latest?.value_classification?.trim() || null;
    }
  }

  return {
    context: {
      btcPriceUsd,
      btcChange24hPct:
        typeof price?.bitcoin?.usd_24h_change === "number"
          ? price.bitcoin.usd_24h_change
          : 0,
      btcDominance,
      twoHundredWeekMa,
      distanceFromMaPct,
      fearGreedScore,
      fearGreedLabel,
    },
    series: syntheticPrices.slice(-30),
  };
}

function getThermometer(distancePct: number): {
  label: string;
  tone: ThermometerTone;
  marketTrendCopy: string;
  stakkInsight: string;
  signal: "Accumulate" | "Scale-Out";
} {
  if (distancePct >= 200) {
    return {
      label: "Euphoric Territory",
      tone: "euphoric",
      marketTrendCopy:
        "Bitcoin is trading extremely far above its 200W MA, placing price in the Euphoric zone relative to historical cycle trends. Historically, this level of extension has occurred during peak market euphoria, where momentum and speculation accelerate rapidly before major cycle tops and heightened volatility.",
      stakkInsight:
        "We suggest aggressively scaling out positions, systematically locking in profits, and avoiding emotional late-cycle buying behavior.",
      signal: "Scale-Out",
    };
  }

  if (distancePct >= 80) {
    return {
      label: "Overvalued",
      tone: "overextended",
      marketTrendCopy:
        "Bitcoin is trading significantly above its 200W MA, placing price in the Overvalued zone based on historical cycle behavior. Historically, moves this far above the long-term trend have signaled increasing market optimism and elevated speculative activity.",
      stakkInsight:
        "We suggest reducing aggressive buying behavior and beginning gradual scale-outs into strength to protect gains and reduce cycle risk.",
      signal: "Scale-Out",
    };
  }

  if (distancePct >= 20) {
    return {
      label: "Fair Value",
      tone: "fair",
      marketTrendCopy:
        "Bitcoin is trading moderately above its 200W MA, placing price in the Fair Value zone relative to historical cycle positioning. This range has historically represented balanced market conditions where Bitcoin remains in a healthy long-term uptrend without major overextension.",
      stakkInsight:
        "We suggest consistently DCA'ing while maintaining balanced exposure and avoiding emotional over-positioning.",
      signal: "Accumulate",
    };
  }

  if (distancePct >= 0) {
    return {
      label: "Undervalued / Fair",
      tone: "undervalued",
      marketTrendCopy:
        "Bitcoin is trading slightly above its 200W MA, placing price in a Discounted Value zone based on historical distance from the long-term cycle trend. Historically, this area has represented a value accumulation zone where long-term investors have accumulated Bitcoin.",
      stakkInsight:
        "We suggest continuing to DCA into Bitcoin, but less aggressively than in deeply undervalued conditions.",
      signal: "Accumulate",
    };
  }

  return {
    label: "Undervalued",
    tone: "undervalued",
    marketTrendCopy:
      "Bitcoin is trading below its 200W MA, placing price in the Undervalued zone relative to its long-term cycle trend. Historically, periods below the 200W MA have occurred during deep bear market conditions and have represented some of the strongest long-term accumulation opportunities.",
    stakkInsight:
      "We suggest aggressively DCA'ing into Bitcoin during this zone, as historically this has been one of the highest long-term value areas of the cycle.",
    signal: "Accumulate",
  };
}

function parseAiPayload(raw: string): AiBitcoinAnalysis | null {
  try {
    const parsed = aiBitcoinAnalysisSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    return match ? parseAiPayload(match[0]) : null;
  }
}

function toDataUrl(png: Buffer) {
  return `data:image/png;base64,${png.toString("base64")}`;
}

async function maybeGenerateAiAnalysis(
  context: BitcoinContext,
  series: MarketCapChartPoint[],
): Promise<AiBitcoinAnalysis | null> {
  if (!openai) return null;

  const image = await generateMarketCapChartPng(series, {
    title: "Bitcoin Daily Price",
    subtitle: "Recent BTC price action used for Home Page AI analysis",
    latestLabel: "Current BTC price",
    valueFormatter: formatUsd,
  });
  const imageDataUrl = toDataUrl(image);

  const prompt = [
    `Analyze the BITCOIN chart. Current Price: ${formatUsd(context.btcPriceUsd)}.`,
    "Return the response in JSON format:",
    "{",
    '  "marketTrend": "(only 3 options, Bearish, Range Bound or Bullish on the daily)",',
    '  "bullishZone": {',
    '    "low": 0,',
    '    "high": 0',
    "  },",
    '  "bearishZone": {',
    '    "low": 0,',
    '    "high": 0',
    "  }",
    "}",
    "",
    "Extra context:",
    `- BTC 24h change: ${context.btcChange24hPct.toFixed(2)}%`,
    `- BTC dominance: ${
      context.btcDominance === null
        ? "unavailable"
        : `${context.btcDominance.toFixed(2)}%`
    }`,
    `- 200W moving average: ${formatUsd(context.twoHundredWeekMa)}`,
    `- Distance from 200W MA: ${context.distanceFromMaPct.toFixed(2)}%`,
    `- Fear & Greed: ${
      context.fearGreedScore !== null && context.fearGreedLabel
        ? `${context.fearGreedScore} (${context.fearGreedLabel})`
        : "unavailable"
    }`,
    "",
    "Rules:",
    "- Use the attached BTC daily chart first, then the context above.",
    "- marketTrend must be exactly Bullish, Range Bound, or Bearish.",
    "- bullishZone and bearishZone must be numeric USD prices, not strings.",
    "- Return only valid JSON.",
  ].join("\n");

  try {
    const response = await openai.chat.completions.parse({
      model: process.env.MARKET_ANALYSIS_MODEL ?? "gpt-4o-mini",
      temperature: 0.2,
      response_format: zodResponseFormat(
        aiBitcoinAnalysisSchema,
        "bitcoin_home_analysis",
      ),
      messages: [
        {
          role: "system",
          content:
            "You are a professional Bitcoin market analyst. Use the attached BTC chart and provided context. Return only the requested JSON object.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ],
        },
      ],
    });

    const message = response.choices[0]?.message;
    if (message?.parsed) {
      return message.parsed;
    }

    const raw = typeof message?.content === "string" ? message.content.trim() : "";
    const parsed = raw ? parseAiPayload(raw) : null;

    if (!parsed) {
      console.error("[market-home-analysis] AI response did not match schema", {
        refusal:
          typeof message === "object" && message && "refusal" in message
            ? (message.refusal ?? null)
            : null,
        rawPreview: raw.slice(0, 1200),
      });
    }

    return parsed;
  } catch (error) {
    console.error("[market-home-analysis] AI generation failed:", error);
    return null;
  }
}

function enrichAnalysis(
  ai: AiBitcoinAnalysis,
  context: BitcoinContext,
): StructuredMarketAnalysis {
  const thermometer = getThermometer(context.distanceFromMaPct);
  const nearestLow = Math.min(ai.bearishZone.low, ai.bullishZone.low);
  const nearestHigh = Math.max(ai.bearishZone.high, ai.bullishZone.high);

  return {
    ...ai,
    bullishZone: {
      low: Math.min(ai.bullishZone.low, ai.bullishZone.high),
      high: Math.max(ai.bullishZone.low, ai.bullishZone.high),
    },
    bearishZone: {
      low: Math.min(ai.bearishZone.low, ai.bearishZone.high),
      high: Math.max(ai.bearishZone.low, ai.bearishZone.high),
    },
    thermometer: {
      ...thermometer,
      movingAverage: formatUsd(context.twoHundredWeekMa),
      distance: `${context.distanceFromMaPct >= 0 ? "+" : ""}${context.distanceFromMaPct.toFixed(1)}%`,
    },
    dashboardSummary: {
      bullishConfirmation: formatRange(ai.bullishZone),
      neutralRange: formatRange({ low: nearestLow, high: nearestHigh }),
      bearishBreakdown: formatRange(ai.bearishZone),
    },
  };
}

function getFallbackAiAnalysis(context: BitcoinContext): AiBitcoinAnalysis {
  const price = context.btcPriceUsd;
  const bullishLow = Math.round((price * 1.04) / 100) * 100;
  const bullishHigh = Math.round((price * 1.1) / 100) * 100;
  const bearishHigh = Math.round((price * 0.96) / 100) * 100;
  const bearishLow = Math.round((price * 0.9) / 100) * 100;

  return {
    marketTrend:
      context.btcChange24hPct >= 3
        ? "Bullish"
        : context.btcChange24hPct <= -3
          ? "Bearish"
          : "Range Bound",
    bullishZone: {
      low: bullishLow,
      high: bullishHigh,
    },
    bearishZone: {
      low: bearishLow,
      high: bearishHigh,
    },
  };
}

async function generateLiveAnalysis(): Promise<AnalysisResponse> {
  const now = new Date();
  const refreshBucket = getRefreshBucket(now);
  const { context, series } = await fetchCurrentBitcoinContext();
  const ai = await maybeGenerateAiAnalysis(context, series);
  const isEstimated = !ai;

  const generatedAt = new Date().toISOString();

  return {
    analysis: enrichAnalysis(ai ?? getFallbackAiAnalysis(context), context),
    meta: {
      generatedAt,
      refreshBucket,
      source: "Bitcoin daily chart + live market data + OpenAI",
      method: "ai",
      currentBtcPrice: formatUsd(context.btcPriceUsd),
      chartPoints: series.length,
      basedOn: [
        "coingecko_bitcoin_price",
        "coingecko_bitcoin_daily_chart",
        "bitcoin_200w_moving_average",
        "alternative_me_fear_greed",
        "generated_on_request",
      ],
      isEstimated,
    },
  };
}

function getCachedMarketAnalysis(refreshBucket: string) {
  return unstable_cache(
    generateLiveAnalysis,
    ["market-home-analysis", refreshBucket],
    {
      revalidate: false,
      tags: [MARKET_HOME_ANALYSIS_TAG, `${MARKET_HOME_ANALYSIS_TAG}:${refreshBucket}`],
    },
  )();
}

export async function getDailyMarketAnalysis(
  now = new Date(),
): Promise<AnalysisResponse> {
  return getCachedMarketAnalysis(getRefreshBucket(now));
}

export async function warmDailyMarketAnalysis(now = new Date()) {
  revalidateTag(MARKET_HOME_ANALYSIS_TAG);
  return getCachedMarketAnalysis(getRefreshBucket(now));
}
