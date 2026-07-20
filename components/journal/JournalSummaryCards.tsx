import React from "react";
import Card from "@/components/ui/Card";

type JournalSummaryCardsProps = {
  totalTrades: number;
  winRate: number;
  winCount: number;
  lossCount: number;
  openCount: number;
  netPnl: number;
  profitFactor: number | null;
  profitFactorLabel: "Dangerous" | "Acceptable" | "Optimal" | null;
  avgPositionSize: number;
};

function TrendUpIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M4 17 10 11l4 4 6-8" />
      <path d="M15 7h5v5" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="8" />
      <path d="m8.5 12 2.3 2.3L16 9" />
    </svg>
  );
}

function BarsIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M4 18V9M10 18V5M16 18v-7M22 18H2" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M4 7h16M7 4v6M17 4v6M5 12h14v8H5z" />
    </svg>
  );
}

function MetricCard({
  label,
  icon,
  iconClassName,
  value,
  valueClassName = "",
  helper,
  change,
}: {
  label: string;
  icon: React.ReactNode;
  iconClassName: string;
  value: React.ReactNode;
  valueClassName?: string;
  helper: React.ReactNode;
  change?: React.ReactNode;
}) {
  return (
    <Card className="relative min-h-[146px] overflow-hidden">
      <div className="pointer-events-none absolute -right-[18px] -top-[22px] h-[92px] w-[92px] rounded-full border border-gray-100 bg-gray-50" />

      <div className="relative flex items-center justify-between">
        <div className="text-[13px] font-semibold text-gray-500">{label}</div>
        <div
          className={`relative z-[2] flex h-[38px] w-[38px] items-center justify-center rounded-[11px] ${iconClassName}`}
        >
          {icon}
        </div>
      </div>

      <div className={`relative mt-3 text-[28px] font-bold tracking-tight ${valueClassName}`}>
        {value}
      </div>

      <div className="relative mt-2 flex items-center justify-between gap-2.5">
        <span className="text-xs text-gray-400">{helper}</span>
        {change}
      </div>
    </Card>
  );
}

export default function JournalSummaryCards({
  totalTrades,
  winRate,
  winCount,
  lossCount,
  openCount,
  netPnl,
  profitFactor,
  profitFactorLabel,
  avgPositionSize,
}: JournalSummaryCardsProps) {
  const pfValue =
    profitFactor == null
      ? "—"
      : profitFactor === Infinity
        ? "∞"
        : profitFactor.toFixed(2);

  const pfChangeClass =
    profitFactorLabel === "Dangerous"
      ? "text-red-600"
      : profitFactorLabel === "Acceptable"
        ? "text-amber-600"
        : "text-emerald-600";

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard
        label="Net P&L"
        icon={<TrendUpIcon />}
        iconClassName="bg-emerald-50 text-emerald-600"
        value={`${netPnl >= 0 ? "+" : "-"}$${Math.abs(netPnl).toFixed(2)}`}
        valueClassName={netPnl > 0 ? "text-emerald-600" : netPnl < 0 ? "text-red-600" : ""}
        helper="Total PnL of this journal"
      />

      <MetricCard
        label="Win rate"
        icon={<CheckCircleIcon />}
        iconClassName="bg-indigo-50 text-indigo-600"
        value={`${winRate}%`}
        helper={`${winCount} wins · ${lossCount} losses · ${openCount} open`}
      />

      <MetricCard
        label="Profit factor"
        icon={<BarsIcon />}
        iconClassName="bg-blue-50 text-blue-600"
        value={pfValue}
        helper="Gross profit ÷ gross loss"
        change={
          profitFactorLabel && (
            <span className={`text-xs font-bold ${pfChangeClass}`}>{profitFactorLabel}</span>
          )
        }
      />

      <MetricCard
        label="Total trades"
        icon={<BriefcaseIcon />}
        iconClassName="bg-amber-50 text-amber-600"
        value={totalTrades}
        helper={`Average size $${avgPositionSize.toFixed(0)}`}
        change={
          openCount > 0 && (
            <span className="text-xs font-bold text-emerald-600">{openCount} open</span>
          )
        }
      />
    </div>
  );
}
