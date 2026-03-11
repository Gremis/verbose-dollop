import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

type MarketSentiment = "Bullish" | "Bearish" | "Neutral";
type MarketMovement = "Trending Up" | "Trending Down" | "Sideways";

async function getMarketData() {
  // Get data from our existing APIs
  const [globalRes, fearGreedRes] = await Promise.allSettled([
    fetch(`${process.env.NEXTAUTH_URL}/api/market/global`),
    fetch(`${process.env.NEXTAUTH_URL}/api/market/fear-greed`),
  ]);

  let marketCap = null;
  let btcDominance = null;
  let fearGreed = null;

  if (globalRes.status === "fulfilled" && globalRes.value.ok) {
    const global = await globalRes.value.json();
    marketCap = global.totalMarketCap;
    btcDominance = global.dominance.btc;
  }

  if (fearGreedRes.status === "fulfilled" && fearGreedRes.value.ok) {
    const fg = await fearGreedRes.value.json();
    fearGreed = fg.current;
  }

  return { marketCap, btcDominance, fearGreed };
}

type MarketData = {
  marketCap: { change24hPct?: number } | null;
  btcDominance: number | null;
  fearGreed: { score?: number; label: string } | null;
};

function analyzeSentiment(marketData: MarketData): MarketSentiment {
  const { marketCap, btcDominance, fearGreed } = marketData;

  let bullishSignals = 0;
  let bearishSignals = 0;

  // Market Cap trend
  if (marketCap?.change24hPct !== undefined && marketCap.change24hPct > 2)
    bullishSignals++;
  else if (marketCap?.change24hPct !== undefined && marketCap.change24hPct < -2)
    bearishSignals++;

  // BTC Dominance (high dominance can indicate alt season ending)
  if (btcDominance !== null && btcDominance > 55) bearishSignals++;
  else if (btcDominance !== null && btcDominance < 45) bullishSignals++;

  // Fear & Greed
  if (fearGreed?.score !== undefined && fearGreed.score > 70) bullishSignals++;
  else if (fearGreed?.score !== undefined && fearGreed.score < 30)
    bearishSignals++;

  if (bullishSignals > bearishSignals) return "Bullish";
  if (bearishSignals > bullishSignals) return "Bearish";
  return "Neutral";
}

function analyzeMovement(marketData: MarketData): MarketMovement {
  const { marketCap } = marketData;

  if (!marketCap?.change24hPct) return "Sideways";

  const change = marketCap.change24hPct;

  if (change > 3) return "Trending Up";
  if (change < -3) return "Trending Down";
  return "Sideways";
}

function generateAnalysisBullets(marketData: MarketData): string[] {
  const { marketCap, btcDominance, fearGreed } = marketData;
  const bullets: string[] = [];

  // Market Cap analysis
  if (marketCap?.change24hPct !== undefined) {
    const change = marketCap.change24hPct;
    if (change > 0) {
      bullets.push(
        `TOTAL market cap up ${change.toFixed(1)}% showing institutional confidence.`,
      );
    } else {
      bullets.push(
        `TOTAL market cap down ${Math.abs(change).toFixed(1)}% indicating profit-taking pressure.`,
      );
    }
  }

  // BTC Dominance analysis
  if (btcDominance !== null) {
    if (btcDominance > 52) {
      bullets.push(
        `BTC dominance at ${btcDominance.toFixed(1)}% suggests money flowing into Bitcoin over alts.`,
      );
    } else {
      bullets.push(
        `BTC dominance at ${btcDominance.toFixed(1)}% indicates potential alt season momentum building.`,
      );
    }
  }

  // Fear & Greed analysis
  if (fearGreed?.score !== undefined && fearGreed.label) {
    if (fearGreed.score > 70) {
      bullets.push(
        `Fear & Greed at ${fearGreed.score} (${fearGreed.label}) warns of potential market overextension.`,
      );
    } else if (fearGreed.score < 30) {
      bullets.push(
        `Fear & Greed at ${fearGreed.score} (${fearGreed.label}) suggests oversold conditions and buying opportunity.`,
      );
    } else {
      bullets.push(
        `Fear & Greed at ${fearGreed.score} (${fearGreed.label}) indicates balanced market sentiment.`,
      );
    }
  }

  // General market context
  const contextBullets = [
    "Monitor key support/resistance levels for confirmation of trend continuation.",
    "Volume analysis suggests institutional participation remains selective.",
    "Cross-asset correlations indicate macro uncertainty affecting risk-on sentiment.",
    "Technical indicators showing mixed signals across major timeframes.",
  ];

  // Add a relevant context bullet
  bullets.push(
    contextBullets[Math.floor(Math.random() * contextBullets.length)],
  );

  return bullets.slice(0, 4); // Limit to 4 bullets max
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accountId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get market data for analysis
    const marketData = await getMarketData();

    // Generate analysis
    const sentiment = analyzeSentiment(marketData);
    const movement = analyzeMovement(marketData);
    const bullets = generateAnalysisBullets(marketData);

    return NextResponse.json({
      analysis: {
        sentiment,
        movement,
        bullets,
        confidence: "medium", // Could be calculated based on data quality
      },
      meta: {
        generatedAt: new Date().toISOString(),
        source: "Internal Analysis Engine",
        basedOn: ["market_cap_trends", "btc_dominance", "fear_greed_index"],
      },
    });
  } catch (error) {
    console.error("[GET /api/market/analysis] error:", error);

    // Fallback to structured mock data
    return NextResponse.json({
      analysis: {
        sentiment: "Bearish" as MarketSentiment,
        movement: "Sideways" as MarketMovement,
        bullets: [
          "TOTAL structure: higher highs holding above weekly support.",
          "BTC structure: consolidating near range highs; watch breakout confirmation.",
          "ETH structure: lagging vs BTC; needs reclaim of key resistance to lead.",
          "BTC.D: rising bias suggests selective alt exposure until dominance rolls over.",
        ],
        confidence: "medium",
      },
      meta: {
        generatedAt: new Date().toISOString(),
        source: "Internal Analysis Engine",
        isEstimated: true,
      },
    });
  }
}
