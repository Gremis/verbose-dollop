import { prisma } from "@/lib/prisma"

export async function getDefaultStrategyId(accountId: string): Promise<string> {
  const s = await prisma.strategy.findFirst({
    where: { account_id: accountId, name: { in: ["None", "none", "NONE"] } },
    select: { id: true },
  })
  if (s) return s.id

  const created = await prisma.strategy.create({
    data: {
      account_id: accountId,
      name: "None",
      description: "Default internal strategy for trades without a selected strategy.",
    },
    select: { id: true },
  })

  return created.id
}

export function qtyFrom(params: { amountSpent: number; entryPrice: number; tradeType: number; leverage?: number }): number {
  const { amountSpent, entryPrice, tradeType, leverage } = params
  if (entryPrice <= 0) return 0
  const notional = tradeType === 2 ? amountSpent * Math.max(1, leverage ?? 1) : amountSpent
  return notional / entryPrice
}

export function calcPnl(input: {
  side: "buy" | "sell" | "long" | "short"
  entry: number
  exit: number | null
  amountSpent: number
  leverage?: number | null
  tradeType: 1 | 2
  buyFee?: number
  sellFee?: number
  tradingFee?: number | null
}): number | null {
  if (input.exit == null) return null
  const dir = (input.side === "buy" || input.side === "long") ? 1 : -1
  const change = (input.exit - input.entry) / input.entry
  const notional = input.tradeType === 2
    ? input.amountSpent * Math.max(1, input.leverage ?? 1)
    : input.amountSpent
  const gross = dir * notional * change
  const fees = (input.tradingFee != null)
    ? Number(input.tradingFee)
    : (Number(input.buyFee ?? 0) + Number(input.sellFee ?? 0))
  const net = gross - fees
  return Number(net.toFixed(2))
}

export function calcProfitFactor(pnls: (number | null)[]): number | null {
  const grossProfit = pnls.reduce(
    (a: number, p) => a + (p != null && p > 0 ? p : 0),
    0,
  )
  const grossLoss = pnls.reduce(
    (a: number, p) => a + (p != null && p < 0 ? Math.abs(p) : 0),
    0,
  )
  if (grossProfit === 0 && grossLoss === 0) return null
  if (grossLoss === 0) return Infinity
  return grossProfit / grossLoss
}

export function profitFactorLabel(pf: number | null): "Dangerous" | "Acceptable" | "Optimal" | null {
  if (pf == null) return null
  if (pf === Infinity) return "Optimal"
  if (pf < 1.2) return "Dangerous"
  if (pf < 1.6) return "Acceptable"
  return "Optimal"
}

// endTime = closed_at if closed, else "now" — open trades show elapsed time so far.
export function formatDuration(openedAt: string | Date, closedAt: string | Date | null): string {
  const end = closedAt != null ? new Date(closedAt).getTime() : Date.now()
  const ms = end - new Date(openedAt).getTime()
  if (!(ms > 0)) return "—"
  const minutes = Math.floor(ms / 60000)
  if (minutes < 60) return `${minutes} min`
  if (minutes < 1440) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h} h ${m} min` : `${h} h`
  }
  const days = Math.floor(minutes / 1440)
  const remH = Math.floor((minutes % 1440) / 60)
  const dayLabel = `${days} day${days === 1 ? "" : "s"}`
  return remH > 0 ? `${dayLabel} ${remH} h` : dayLabel
}

// exitOrTarget is exit_price, which doubles as the take-profit target while a trade is
// open and becomes the actual exit once closed — there's no separately stored planned
// target after closing, so this is an approximation for closed trades.
export function calcRiskReward(
  entry: number,
  stopLoss: number | null,
  exitOrTarget: number | null,
): string {
  if (stopLoss == null || exitOrTarget == null) return "—"
  const risk = Math.abs(entry - stopLoss)
  if (risk === 0) return "—"
  const reward = Math.abs(exitOrTarget - entry)
  return `1:${(reward / risk).toFixed(2)}`
}

export function calcJournalPnl(input: {
  side: "buy" | "sell" | "long" | "short"
  status: "in_progress" | "win" | "loss" | "break_even"
  entry: number
  exit: number | null
  stopLoss: number | null
  amountSpent: number
  leverage?: number | null
  tradeType: 1 | 2
  buyFee?: number
  sellFee?: number
  tradingFee?: number | null
}): number | null {
  if (input.status === "in_progress") return null
  if (input.status === "break_even") return 0

  const realizedExit =
    input.status === "loss"
      ? input.stopLoss ?? input.exit
      : input.exit

  return calcPnl({
    side: input.side,
    entry: input.entry,
    exit: realizedExit,
    amountSpent: input.amountSpent,
    leverage: input.leverage,
    tradeType: input.tradeType,
    buyFee: input.buyFee,
    sellFee: input.sellFee,
    tradingFee: input.tradingFee,
  })
}
