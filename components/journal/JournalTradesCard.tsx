import React, { useState } from "react";
import Card from "@/components/ui/Card";
import { Table, Th, Td } from "@/components/ui/Table";
import DropdownActions from "@/components/journals/DropdownActions";
import { calcPnl, calcRiskReward, formatDuration } from "@/lib/trade-helpers";
import type { JournalRow } from "@/app/(app)/journal/journal-client";

type SortOrder = "new" | "az" | "za" | "tag_az" | "tag_za";

type TagOption = {
  id: string;
  name: string;
  color?: string;
};

type JournalTradesCardProps = {
  loading: boolean;
  error: string | null;
  rows: JournalRow[];
  showMenu: boolean;
  availableTags: TagOption[];
  selectedTagName: string;
  expandedRowId: string | null;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onSortChange: (sort: SortOrder) => void;
  onSelectedTagChange: (tagName: string) => void;
  onRefresh: () => void;
  onResetRange: () => void;
  onToggleRow: (id: string) => void;
  onOpenCloseModal: (row: JournalRow) => void;
  onOpenEdit: (row: JournalRow) => void;
  onAskDelete: (id: string) => void;
  renderStatusButton: (row: JournalRow) => React.ReactNode;
  fmt4: (n: number | null | undefined) => string;
  money2: (n: number) => string;
};

// "Estimated PnL" describes the raw entry->exit price move, always using the row's actual
// exit_price — unlike the realized `pnl` column, which substitutes stop_loss_price for a
// "loss" status trade (see calcJournalPnl). They intentionally differ on loss trades.
function estimatedPnl(r: JournalRow): { amount: number; pct: number } | null {
  if (r.exit_price == null) return null;
  const amount = calcPnl({
    side: r.side,
    entry: r.entry_price,
    exit: r.exit_price,
    amountSpent: r.amount_spent,
    tradeType: r.trade_type,
    tradingFee: r.trading_fee,
  });
  if (amount == null) return null;
  const pct = r.amount_spent > 0 ? (amount / r.amount_spent) * 100 : 0;
  return { amount, pct };
}

function formatOpenedDate(date: string | Date) {
  const d = new Date(date);
  return {
    date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
  };
}

function isLongSide(side: JournalRow["side"]) {
  return side === "buy" || side === "long";
}

function DirectionPill({ side }: { side: JournalRow["side"] }) {
  const isLong = isLongSide(side);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold ${
        isLong
          ? "border-emerald-600/15 bg-emerald-50 text-emerald-700"
          : "border-red-600/15 bg-red-50 text-red-700"
      }`}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        {isLong ? (
          <>
            <path d="M5 17h10V7" />
            <path d="m5 7 10 10" />
          </>
        ) : (
          <>
            <path d="M5 7h10v10" />
            <path d="m5 17 10-10" />
          </>
        )}
      </svg>
      {isLong ? "Long" : "Short"}
    </span>
  );
}

const ASSET_BADGE_PALETTE = [
  "bg-amber-50 text-amber-700",
  "bg-indigo-50 text-indigo-700",
  "bg-emerald-50 text-emerald-700",
  "bg-purple-50 text-purple-700",
  "bg-blue-50 text-blue-700",
  "bg-red-50 text-red-700",
];

function assetBadgeClass(symbol: string) {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) hash = (hash * 31 + symbol.charCodeAt(i)) | 0;
  return ASSET_BADGE_PALETTE[Math.abs(hash) % ASSET_BADGE_PALETTE.length];
}

function AssetBadge({ symbol }: { symbol: string }) {
  return (
    <div
      className={`grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[10px] text-xs font-extrabold ${assetBadgeClass(symbol)}`}
    >
      {symbol.slice(0, 1)}
    </div>
  );
}

function ChevronButton({ open }: { open: boolean }) {
  return (
    <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[7px] text-gray-400 hover:bg-gray-100">
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        className="transition-transform duration-150"
        style={{ transform: open ? "rotate(90deg)" : "none" }}
      >
        <path d="m9 6 6 6-6 6" />
      </svg>
    </span>
  );
}

const TH_CLASS =
  "whitespace-nowrap py-3 px-3.5 text-[11px] font-bold uppercase tracking-[0.04em] text-gray-400 bg-gray-50/60";

export default function JournalTradesCard({
  loading,
  error,
  rows,
  showMenu,
  availableTags,
  selectedTagName,
  expandedRowId,
  onToggleMenu,
  onCloseMenu,
  onSortChange,
  onSelectedTagChange,
  onRefresh,
  onResetRange,
  onToggleRow,
  onOpenCloseModal,
  onOpenEdit,
  onAskDelete,
  renderStatusButton,
  fmt4,
  money2,
}: JournalTradesCardProps) {
  function tagColor(name: string) {
    return availableTags.find((tag) => tag.name === name)?.color ?? "#9CA3AF";
  }

  function TagCell({ tags }: { tags?: string[] }) {
    const [expanded, setExpanded] = useState(false);
    const clean = (tags ?? []).filter(Boolean);
    if (!clean.length) return <span className="text-gray-400">-</span>;

    const visible = expanded ? clean : clean.slice(0, 3);
    const hiddenCount = clean.length - visible.length;

    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {visible.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: tagColor(tag) }}
            />
            {tag}
          </span>
        ))}
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(true);
            }}
            className="inline-flex items-center rounded-full border border-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-600 hover:bg-gray-50"
          >
            +{hiddenCount} more
          </button>
        )}
      </div>
    );
  }

  function EntryExitCell({ r }: { r: JournalRow }) {
    const est = estimatedPnl(r);
    return (
      <div className="font-mono">
        <div className="font-bold text-gray-800">
          ${fmt4(r.entry_price)} → {r.exit_price != null ? `$${fmt4(r.exit_price)}` : "-"}
        </div>
        {est && (
          <div
            className={`text-[11px] font-bold ${
              est.amount > 0 ? "text-emerald-600" : est.amount < 0 ? "text-red-600" : "text-gray-500"
            }`}
          >
            Estimated PnL: {est.amount >= 0 ? "+" : "-"}${Math.abs(est.amount).toFixed(2)} (
            {est.pct >= 0 ? "+" : "-"}
            {Math.abs(est.pct).toFixed(2)}%)
          </div>
        )}
      </div>
    );
  }

  function PositionSizeCell({ r }: { r: JournalRow }) {
    const qty = r.entry_price > 0 ? fmt4(r.amount_spent / r.entry_price) : "—";
    return (
      <div className="font-mono">
        <div className="text-[14px] font-extrabold tracking-tight text-gray-900">
          {money2(r.amount_spent)}
        </div>
        <div className="text-[11px] font-semibold text-gray-500">
          {qty} {r.asset_name}
        </div>
      </div>
    );
  }

  function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
    return (
      <div>
        <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.04em] text-gray-400">
          {label}
        </span>
        <strong className="text-[12px] font-bold text-gray-700">{value}</strong>
      </div>
    );
  }

  function DetailCard({ r }: { r: JournalRow }) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <DetailItem
            label="Stop loss"
            value={
              <span className="font-mono">
                {r.stop_loss_price != null ? fmt4(r.stop_loss_price) : "—"}
              </span>
            }
          />
          <DetailItem
            label="Risk / reward"
            value={calcRiskReward(r.entry_price, r.stop_loss_price, r.exit_price)}
          />
          <DetailItem label="Duration" value={formatDuration(r.date, r.closed_at)} />
          <DetailItem label="Note" value={r.notes_entry || r.notes_review || "—"} />
        </div>
      </div>
    );
  }

  return (
    <Card className="p-0 overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-[22px] py-4">
        <div className="flex items-baseline gap-2.5">
          <h3 className="text-[17px] font-extrabold text-gray-900">Trade history</h3>
          <span className="text-xs text-gray-500">
            {rows.length} {rows.length === 1 ? "trade" : "trades"}
          </span>
        </div>
        <div className="relative">
          <button
            onClick={onToggleMenu}
            aria-label="More options"
            className="grid h-[42px] w-[42px] place-items-center rounded-[11px] border border-gray-200 bg-white text-gray-600 shadow-sm hover:border-gray-300"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9}>
              <circle cx="5" cy="12" r="1" fill="currentColor" />
              <circle cx="12" cy="12" r="1" fill="currentColor" />
              <circle cx="19" cy="12" r="1" fill="currentColor" />
            </svg>
          </button>
          {showMenu && (
            <div
              className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg ring-1 ring-black/5 z-20"
              onMouseLeave={onCloseMenu}
            >
              <MenuItem
                label="Newest"
                onClick={() => {
                  onSortChange("new");
                  onCloseMenu();
                }}
                icon="🧾"
              />
              <MenuItem
                label="From A-Z"
                onClick={() => {
                  onSortChange("az");
                  onCloseMenu();
                }}
                icon="🔤"
              />
              <MenuItem
                label="From Z-A"
                onClick={() => {
                  onSortChange("za");
                  onCloseMenu();
                }}
                icon="🔠"
              />
              <MenuItem
                label="Tag A-Z"
                onClick={() => {
                  onSortChange("tag_az");
                  onCloseMenu();
                }}
              />
              <MenuItem
                label="Tag Z-A"
                onClick={() => {
                  onSortChange("tag_za");
                  onCloseMenu();
                }}
              />
              <div className="my-1 border-t border-gray-100" />
              <button
                onClick={() => onSelectedTagChange("")}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                  selectedTagName ? "text-gray-600" : "font-semibold text-gray-900"
                }`}
              >
                All tags
              </button>
              {availableTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => onSelectedTagChange(tag.name)}
                  className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                    selectedTagName === tag.name
                      ? "font-semibold text-gray-900"
                      : "text-gray-700"
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: tag.color ?? "#9CA3AF" }}
                  />
                  {tag.name}
                </button>
              ))}
              <div className="my-1 border-t border-gray-100" />
              <MenuItem
                label="Refresh"
                onClick={() => {
                  onRefresh();
                  onCloseMenu();
                }}
              />
              <MenuItem
                label="Reset date range"
                onClick={() => {
                  onResetRange();
                  onCloseMenu();
                }}
              />
              <MenuItem label="Manage Widgets" onClick={onCloseMenu} />
            </div>
          )}
        </div>
      </div>

      {selectedTagName && (
        <div className="px-6 pb-3">
          <button
            type="button"
            onClick={() => onSelectedTagChange("")}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-700 hover:bg-gray-100"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: tagColor(selectedTagName) }}
            />
            {selectedTagName}
            <span className="text-gray-500">x</span>
          </button>
        </div>
      )}

      <div className="overflow-x-auto hidden md:block">
        {loading ? (
          <div className="px-6 py-10 text-center text-sm text-gray-500">
            Loading…
          </div>
        ) : error ? (
          <div className="px-6 py-10 text-center text-sm text-red-600">{error}</div>
        ) : (
          <Table className="min-w-[1080px] md:min-w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <Th className={`${TH_CLASS} w-40`}>Asset</Th>
                <Th className={`${TH_CLASS} w-24`}>Direction</Th>
                <Th className={`${TH_CLASS} w-64`}>Entry → Exit</Th>
                <Th className={`${TH_CLASS} w-32`}>Position size</Th>
                <Th className={`${TH_CLASS} w-24`}>P&L</Th>
                <Th className={`${TH_CLASS} hidden md:table-cell w-32`}>Opened</Th>
                <Th className={`${TH_CLASS} w-56`}>Setups / Tags</Th>
                <Th className={`${TH_CLASS} w-36 text-right pr-4`}>Status / Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isOpenRow = expandedRowId === r.id;
                return (
                  <React.Fragment key={r.id}>
                    <tr
                      className={`cursor-pointer hover:bg-[#fafbff] ${isOpenRow ? "bg-[#fbfcff]" : ""}`}
                      onClick={() => onToggleRow(r.id)}
                    >
                      <Td className="whitespace-nowrap w-40 py-3.5 px-3.5">
                        <div className="flex items-center gap-2.5">
                          <ChevronButton open={isOpenRow} />
                          <AssetBadge symbol={r.asset_name} />
                          <div>
                            <div className="font-extrabold text-gray-900">{r.asset_name}</div>
                            <div className="text-[11px] text-gray-500">
                              {r.trade_type === 2 ? "Futures" : "Spot"}
                            </div>
                          </div>
                        </div>
                      </Td>

                      <Td className="whitespace-nowrap w-24 px-3.5">
                        <DirectionPill side={r.side} />
                      </Td>

                      <Td className="w-64 px-3.5">
                        <EntryExitCell r={r} />
                      </Td>

                      <Td className="w-32 px-3.5">
                        <PositionSizeCell r={r} />
                      </Td>

                      <Td className="font-mono w-24 px-3.5">
                        <span
                          className={
                            r.pnl != null && r.pnl > 0
                              ? "text-emerald-600 font-bold"
                              : r.pnl != null && r.pnl < 0
                                ? "text-red-600 font-bold"
                                : "text-gray-400 font-semibold"
                          }
                        >
                          {r.pnl != null ? money2(r.pnl) : "—"}
                        </span>
                      </Td>

                      <Td className="hidden md:table-cell w-32 px-3.5">
                        <div className="font-bold text-gray-800">
                          {formatOpenedDate(r.date).date}
                        </div>
                        <div className="text-[11px] text-gray-400">
                          {formatOpenedDate(r.date).time}
                        </div>
                      </Td>

                      <Td className="w-56 px-3.5">
                        <TagCell tags={r.tags} />
                      </Td>

                      <Td className="w-36 px-3.5 relative">
                        <div className="flex items-center justify-end gap-2.5">
                          {renderStatusButton(r)}
                          <DropdownActions
                            r={r}
                            openEdit={onOpenEdit}
                            askDelete={onAskDelete}
                            onQuickClose={
                              r.status === "in_progress" ? onOpenCloseModal : undefined
                            }
                          />
                        </div>
                      </Td>
                    </tr>

                    {isOpenRow && (
                      <tr className="bg-[#fbfcff]">
                        <Td colSpan={8} className="!pt-0 !pb-3.5 pl-[76px] pr-3.5 text-xs text-gray-700">
                          <DetailCard r={r} />
                        </Td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </Table>
        )}
      </div>

      <div className="px-3 pb-3 md:hidden">
        {loading ? (
          <div className="py-8 text-center text-sm text-gray-500">Loading…</div>
        ) : error ? (
          <div className="py-8 text-center text-sm text-red-600">{error}</div>
        ) : (
          <div className="grid gap-3">
            {rows.map((r) => {
              const isOpenRow = expandedRowId === r.id;
              return (
                <div
                  key={r.id}
                  className="rounded-xl border bg-white p-4 shadow-sm cursor-pointer"
                  onClick={() => onToggleRow(r.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ChevronButton open={isOpenRow} />
                      <AssetBadge symbol={r.asset_name} />
                      <div className="font-extrabold text-gray-900">
                        {r.asset_name}{" "}
                        <span className="text-xs font-normal text-gray-500">
                          ({r.trade_type === 2 ? "Futures" : "Spot"})
                        </span>
                      </div>
                    </div>
                    <DirectionPill side={r.side} />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div className="col-span-2">
                      <div className="text-gray-500 text-xs">Entry → Exit</div>
                      <EntryExitCell r={r} />
                    </div>

                    <div>
                      <div className="text-gray-500 text-xs">Position size</div>
                      <PositionSizeCell r={r} />
                    </div>

                    <div className="text-right">
                      <div className="text-gray-500 text-xs">P&L</div>
                      <div className="font-mono">
                        {r.pnl != null ? money2(r.pnl) : "—"}
                      </div>
                    </div>

                    <div>
                      <div className="text-gray-500 text-xs">Opened</div>
                      <div className="font-bold text-gray-800">
                        {formatOpenedDate(r.date).date}
                      </div>
                      <div className="text-[11px] text-gray-400">
                        {formatOpenedDate(r.date).time}
                      </div>
                    </div>

                    <div className="col-span-2">
                      <div className="text-gray-500 text-xs">Setups / Tags</div>
                      <div className="mt-1">
                        <TagCell tags={r.tags} />
                      </div>
                    </div>
                  </div>

                  {isOpenRow && (
                    <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                      <DetailCard r={r} />
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between">
                    {renderStatusButton(r)}
                    <DropdownActions
                      r={r}
                      openEdit={onOpenEdit}
                      askDelete={onAskDelete}
                      onQuickClose={
                        r.status === "in_progress" ? onOpenCloseModal : undefined
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}

function MenuItem({
  label,
  onClick,
  icon,
}: {
  label: string;
  onClick: () => void;
  icon?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-2 hover:bg-gray-50 rounded-xl flex items-center gap-3"
    >
      {icon && <span>{icon}</span>}
      <span className="text-sm">{label}</span>
    </button>
  );
}
