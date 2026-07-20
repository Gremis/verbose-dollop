import React from "react";
import Card from "@/components/ui/Card";

function formatRangeDate(value: string) {
  if (!value) return "";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function DateField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <span className="relative inline-flex">
      <span className="whitespace-nowrap">{formatRangeDate(value)}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </span>
  );
}

type StatusSegment = "all" | "open" | "wins" | "losses";
type DirectionFilter = "all" | "long" | "short";

type JournalFilterBarProps = {
  query: string;
  onQueryChange: (value: string) => void;
  start: string;
  end: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  assetOptions: string[];
  assetFilter: string;
  onAssetFilterChange: (value: string) => void;
  directionFilter: DirectionFilter;
  onDirectionFilterChange: (value: DirectionFilter) => void;
  statusSegment: StatusSegment;
  onStatusSegmentChange: (value: StatusSegment) => void;
};

const SEGMENTS: { value: StatusSegment; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "wins", label: "Wins" },
  { value: "losses", label: "Losses" },
];

export default function JournalFilterBar({
  query,
  onQueryChange,
  start,
  end,
  onStartChange,
  onEndChange,
  assetOptions,
  assetFilter,
  onAssetFilterChange,
  directionFilter,
  onDirectionFilterChange,
  statusSegment,
  onStatusSegmentChange,
}: JournalFilterBarProps) {
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" />
          </svg>
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search asset, setup, tag, or note..."
            className="h-[42px] w-full rounded-[10px] border border-gray-300 bg-white pl-10 pr-3.5 text-sm text-gray-700 outline-none placeholder:text-gray-400 focus:border-gray-400"
          />
        </div>

        <div className="flex h-[42px] items-center gap-2 whitespace-nowrap rounded-[10px] border border-gray-300 bg-white px-3 text-sm text-gray-700">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="shrink-0 text-gray-400">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M16 3v4M8 3v4M3 10h18" />
          </svg>
          <DateField value={start} onChange={onStartChange} />
          <span className="text-gray-400">–</span>
          <DateField value={end} onChange={onEndChange} />
        </div>

        <select
          aria-label="Asset filter"
          value={assetFilter}
          onChange={(e) => onAssetFilterChange(e.target.value)}
          className="h-[42px] rounded-[10px] border border-gray-300 bg-white px-3 text-sm text-gray-700"
        >
          <option value="">All assets</option>
          {assetOptions.map((symbol) => (
            <option key={symbol} value={symbol}>
              {symbol}
            </option>
          ))}
        </select>

        <select
          aria-label="Direction filter"
          value={directionFilter}
          onChange={(e) => onDirectionFilterChange(e.target.value as DirectionFilter)}
          className="h-[42px] rounded-[10px] border border-gray-300 bg-white px-3 text-sm text-gray-700"
        >
          <option value="all">Long & short</option>
          <option value="long">Long only</option>
          <option value="short">Short only</option>
        </select>

        <div className="ml-auto inline-flex items-center gap-[3px] rounded-[10px] border border-gray-200 bg-gray-50 p-1">
          {SEGMENTS.map((segment) => (
            <button
              key={segment.value}
              type="button"
              onClick={() => onStatusSegmentChange(segment.value)}
              className={`h-8 rounded-[7px] px-2.5 text-xs font-semibold ${
                statusSegment === segment.value
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {segment.label}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}
