import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PortfolioRepoV2 } from "@/data/repositories/portfolio.repo.v2";
import { prisma } from "@/lib/prisma";
import {
  cgNormalizeOrResolveCoinId,
  cgPriceUsdById,
  cgCoinMetaByIdSafe,
} from "@/lib/markets/coingecko";
import { POST as journalPOST } from "../../journal/route";

export const dynamic = "force-dynamic";

const Body = z.object({
  asset: z.object({
    id: z.string().min(1),
    symbol: z.string().min(1),
    name: z.string().optional().nullable(),
  }),
  side: z.enum(["buy", "sell"]).default("buy"),
  priceMode: z.enum(["market", "custom"]).default("market"),
  priceUsd: z.number().positive().optional(),
  qty: z.number().positive().optional(),
  totalUsd: z.number().positive().optional(),
  feeUsd: z.number().min(0).optional(),
  executedAt: z.string().datetime().optional(),
});

// Função auxiliar para buscar preço médio de compra do portfolio
async function getAvgBuyPrice(
  accountId: string,
  symbol: string,
): Promise<number | null> {
  try {
    // Busca todas as transações de compra para o asset
    const buyTransactions = await prisma.portfolio_trade.findMany({
      where: {
        account_id: accountId,
        asset_name: symbol.toUpperCase(),
        kind: "buy",
      },
      select: {
        qty: true,
        price_usd: true,
      },
    });

    if (buyTransactions.length === 0) return null;

    // Calcula preço médio ponderado
    let totalQty = 0;
    let totalSpent = 0;

    for (const tx of buyTransactions) {
      totalQty += Number(tx.qty);
      totalSpent += Number(tx.qty) * Number(tx.price_usd);
    }

    return totalQty > 0 ? totalSpent / totalQty : null;
  } catch (error) {
    console.error("Error calculating avg buy price:", error);
    return null;
  }
}

// Função auxiliar para criar entrada no journal
async function createJournalEntryForSell(params: {
  accountId: string;
  symbol: string;
  sellPrice: number;
  avgBuyPrice: number;
  qty: number;
  totalUsd: number;
  feeUsd: number;
  executedAt: Date;
}) {
  const {
    accountId,
    symbol,
    sellPrice,
    avgBuyPrice,
    qty,
    totalUsd,
    feeUsd,
    executedAt,
  } = params;

  try {
    // ✅ Verificar se já existe entrada para evitar duplicatas
    const existingEntry = await prisma.journal_entry.findFirst({
      where: {
        account_id: accountId,
        asset_name: symbol.toUpperCase(),
        side: "sell",
        exit_price: sellPrice,
        amount_spent: totalUsd,
        trade_datetime: {
          gte: new Date(executedAt.getTime() - 60000), // 1 minuto antes
          lte: new Date(executedAt.getTime() + 60000), // 1 minuto depois
        },
      },
      select: { id: true },
    });

    if (existingEntry) {
      console.log(
        `⚠️ Journal entry already exists for this sell: ${symbol} at ${sellPrice}`,
      );
      return { id: existingEntry.id, duplicate: true };
    }

    // Calcula PnL: (preço_venda - preço_compra_medio) * quantidade - taxa
    const grossPnl = (sellPrice - avgBuyPrice) * qty;
    const netPnl = grossPnl - feeUsd;

    // Determina status baseado no PnL
    const status =
      Math.abs(netPnl) < 0.01 ? "break_even" : netPnl > 0 ? "win" : "loss";

    // Payload para criar entrada no journal (aproveitando TODAS as regras complexas)
    const journalPayload = {
      asset_name: symbol.toUpperCase(),
      trade_type: 1, // spot
      trade_datetime: executedAt.toISOString(),
      side: "sell" as const,
      status: status as "win" | "loss" | "break_even",
      entry_price: avgBuyPrice,
      exit_price: sellPrice,
      amount_spent: totalUsd,
      timeframe_code: "1D", // padrão
      buy_fee: 0, // taxa já foi paga na compra
      sell_fee: feeUsd,
      trading_fee: 0,
      notes_entry: `[AUTO_CREATED_FROM_PORTFOLIO] Venda gerada automaticamente do portfolio`,
      source: "portfolio" as const,
      tags: ["portfolio-auto"] as string[],
    };

    // ✅ Chama POST interno do journal (usa mesma sessão, todas as validações, etc)
    const mockRequest = new Request("http://localhost/api/journal", {
      method: "POST",
      body: JSON.stringify(journalPayload),
      headers: { "content-type": "application/json" },
    });

    const response = await journalPOST(mockRequest);
    const result = await response.json();

    if (!response.ok) {
      console.error("Error creating journal entry:", result);
      throw new Error(`Failed to create journal entry: ${response.status}`);
    }

    console.log(`✅ Journal entry created for sell transaction: ${result.id}`);
    return { id: result.id, duplicate: false };
  } catch (error) {
    console.error("❌ Error creating journal entry for sell:", error);
    // Não falha a transação do portfolio se o journal falhar
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accountId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const input = Body.parse(await req.json());

    const symbol = input.asset.symbol.trim().toUpperCase();
    const executedAt = input.executedAt
      ? new Date(input.executedAt)
      : new Date();

    const coingeckoId = await cgNormalizeOrResolveCoinId({
      assetId: input.asset.id,
      assetSymbol: symbol,
    });

    let priceUsd: number;
    let change24hPct: number | null = null;

    if (input.priceMode === "market") {
      if (!coingeckoId) {
        return NextResponse.json(
          { error: `Could not resolve CoinGecko id for ${symbol}.` },
          { status: 400 },
        );
      }
      const m = await cgPriceUsdById(coingeckoId);
      priceUsd = m.priceUsd;
      change24hPct = m.change24hPct;
    } else {
      if (input.priceUsd == null) {
        return NextResponse.json(
          { error: "Missing custom priceUsd" },
          { status: 400 },
        );
      }
      priceUsd = input.priceUsd;
    }

    let qty = input.qty ?? null;
    let totalUsd = input.totalUsd ?? null;

    if (qty == null && totalUsd == null) {
      return NextResponse.json(
        { error: "Provide qty or totalUsd" },
        { status: 400 },
      );
    }
    if (qty == null && totalUsd != null) qty = totalUsd / priceUsd;
    if (totalUsd == null && qty != null) totalUsd = qty * priceUsd;

    // Garantir que qty não é null neste ponto
    if (!qty || !Number.isFinite(qty) || qty <= 0) {
      return NextResponse.json({ error: "Invalid qty" }, { status: 400 });
    }

    // Type assertion para TypeScript - sabemos que qty não é null aqui
    const validQty: number = qty;
    const validTotalUsd: number = totalUsd!;

    let imageUrl: string | null = null;
    let name: string | null =
      (input.asset.name ?? null) && String(input.asset.name).trim()
        ? String(input.asset.name).trim()
        : null;

    if (coingeckoId) {
      const meta = await cgCoinMetaByIdSafe(coingeckoId);
      if (meta.ok) {
        imageUrl = meta.imageUrl;
        if (!name) name = meta.name || null;
      }
    }

    await prisma.verified_asset.upsert({
      where: { symbol },
      update: {
        name,
        coingecko_id: coingeckoId,
        image_url: imageUrl,
      },
      create: {
        symbol,
        name,
        exchange: "Binance",
        coingecko_id: coingeckoId,
        image_url: imageUrl,
      },
      select: { id: true },
    });

    // ✅ CRIA TRANSAÇÃO NO PORTFOLIO (como antes)
    await PortfolioRepoV2.createSpotTransaction({
      accountId: session.accountId,
      symbol,
      side: input.side,
      qty: validQty,
      priceUsd,
      feeUsd: input.feeUsd ?? 0,
      executedAt,
      notes: `[PORTFOLIO_SPOT_TX] cg:${coingeckoId ?? "unresolved"} chg24h:${change24hPct ?? "n/a"}`,
    });

    // 🆕 SE FOR VENDA, CRIA ENTRADA NO JOURNAL
    if (input.side === "sell") {
      const avgBuyPrice = await getAvgBuyPrice(session.accountId, symbol);

      if (avgBuyPrice && avgBuyPrice > 0) {
        await createJournalEntryForSell({
          accountId: session.accountId,
          symbol,
          sellPrice: priceUsd,
          avgBuyPrice,
          qty: validQty,
          totalUsd: validTotalUsd,
          feeUsd: input.feeUsd ?? 0,
          executedAt,
        });

        console.log(
          `✅ Sell transaction created with journal entry: ${symbol} at $${priceUsd}`,
        );
      } else {
        console.warn(
          `⚠️ Could not find avg buy price for ${symbol}, journal entry not created`,
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    console.error("[POST /api/portfolio/add-transaction] error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
