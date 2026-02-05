import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cgPriceUsdByIdSafe } from "@/lib/markets/coingecko";

export const dynamic = "force-dynamic";

type DbRow = {
  id: string;
  asset_name: string;
  side: "buy" | "sell";
  amount: unknown;
  entry_price: unknown;
  trade_datetime: Date;
  buy_fee: unknown;
  sell_fee: unknown;
};

export async function GET(
  request: Request,
  { params }: { params: { symbol: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accountId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accountId = session.accountId;
    const symbol = params.symbol.toUpperCase();

    // Buscar metadata do asset
    const assetMeta = await prisma.verified_asset.findUnique({
      where: { symbol },
      select: {
        symbol: true,
        name: true,
        coingecko_id: true,
        image_url: true,
      },
    });

    if (!assetMeta) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Buscar todas as transações desse asset
    const rows = (await prisma.journal_entry.findMany({
      where: {
        account_id: accountId,
        asset_name: symbol,
        side: { in: ["buy", "sell"] },
        spot_trade: { some: {} },
      },
      orderBy: { trade_datetime: "asc" },
      select: {
        id: true,
        asset_name: true,
        side: true,
        amount: true,
        entry_price: true,
        trade_datetime: true,
        buy_fee: true,
        sell_fee: true,
      },
    })) as DbRow[];

    // Calcular holdings e profit
    let qtyHeld = 0;
    let costBasisUsd = 0;
    let totalInvestedUsd = 0;
    let realizedProfitUsd = 0;

    const transactions: Array<{
      id: string;
      side: "buy" | "sell";
      executedAt: string;
      qty: number;
      priceUsd: number;
      totalUsd: number;
      gainLossUsd: number | null;
      gainLossPct: number | null;
    }> = [];

    for (const r of rows) {
      const qty = Number(r.amount ?? 0);
      const price = Number(r.entry_price ?? 0);
      const fee = Number(r.side === "buy" ? r.buy_fee : r.sell_fee) || 0;

      if (!Number.isFinite(qty) || qty <= 0) continue;
      if (!Number.isFinite(price) || price <= 0) continue;

      const totalUsd = qty * price;

      if (r.side === "buy") {
        qtyHeld += qty;
        costBasisUsd += totalUsd + fee;
        totalInvestedUsd += totalUsd + fee;

        transactions.push({
          id: r.id,
          side: "buy",
          executedAt: r.trade_datetime.toISOString(),
          qty,
          priceUsd: price,
          totalUsd: totalUsd + fee,
          gainLossUsd: null,
          gainLossPct: null,
        });
      } else {
        const avg = qtyHeld > 0 ? costBasisUsd / qtyHeld : 0;
        const gainLossUsd = (price - avg) * qty - fee;
        const gainLossPct = avg > 0 ? ((price - avg) / avg) * 100 : null;

        realizedProfitUsd += gainLossUsd;

        const reduceQty = Math.min(qty, qtyHeld);
        qtyHeld -= reduceQty;
        costBasisUsd -= reduceQty * avg;
        if (qtyHeld < 1e-10) {
          qtyHeld = 0;
          costBasisUsd = 0;
        }

        transactions.push({
          id: r.id,
          side: "sell",
          executedAt: r.trade_datetime.toISOString(),
          qty,
          priceUsd: price,
          totalUsd: totalUsd - fee,
          gainLossUsd: Number.isFinite(gainLossUsd) ? gainLossUsd : null,
          gainLossPct:
            gainLossPct != null && Number.isFinite(gainLossPct)
              ? gainLossPct
              : null,
        });
      }
    }

    // Buscar preço atual
    let currentPrice = 0;
    let change24hPct: number | null = null;

    if (assetMeta.coingecko_id) {
      const cg = await cgPriceUsdByIdSafe(assetMeta.coingecko_id);
      if (cg.ok) {
        currentPrice = cg.priceUsd;
        change24hPct = cg.change24hPct ?? null;
      }
    }

    // Se não conseguiu preço, usa avg buy price
    if (currentPrice === 0 && qtyHeld > 0 && costBasisUsd > 0) {
      currentPrice = costBasisUsd / qtyHeld;
    }

    const holdingsValueUsd = qtyHeld * currentPrice;
    const unrealizedProfitUsd = holdingsValueUsd - costBasisUsd;
    const totalProfitUsd = realizedProfitUsd + unrealizedProfitUsd;
    const totalProfitPct =
      totalInvestedUsd > 0 ? (totalProfitUsd / totalInvestedUsd) * 100 : 0;

    const avgBuyPrice = qtyHeld > 0 ? costBasisUsd / qtyHeld : 0;

    // Mock Key Levels por enquanto
    const mockKeyLevels = {
      supports: [
        { price: currentPrice * 0.96, distance: "4.0%", timeframe: "Daily" },
        { price: currentPrice * 0.93, distance: "7.0%", timeframe: "Weekly" },
        { price: currentPrice * 0.9, distance: "10.0%", timeframe: "HTF" },
      ],
      resistances: [
        { price: currentPrice * 1.04, distance: "4.0%", timeframe: "Daily" },
        { price: currentPrice * 1.07, distance: "7.0%", timeframe: "Weekly" },
        { price: currentPrice * 1.1, distance: "10.0%", timeframe: "HTF" },
      ],
    };

    return NextResponse.json({
      symbol,
      name: assetMeta.name,
      iconUrl: assetMeta.image_url,

      balance: {
        quantity: qtyHeld,
        valueUsd: holdingsValueUsd,
      },

      metrics: {
        currentPrice,
        change24h: {
          usd: change24hPct ? (currentPrice * change24hPct) / 100 : 0,
          pct: change24hPct,
        },
        totalProfit: {
          usd: totalProfitUsd,
          pct: totalProfitPct,
        },
        realizedProfit: realizedProfitUsd,
        unrealizedProfit: unrealizedProfitUsd,
        avgBuyPrice,
        totalInvested: totalInvestedUsd,
      },

      keyLevels: mockKeyLevels,

      transactions: transactions.reverse(), // Mais recentes primeiro
    });
  } catch (e) {
    console.error(`[GET /api/portfolio/${params.symbol}] error:`, e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
