"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type PortfolioSymbol = { symbol: string; name: string | null };

export type CoinSelection = string[] | "all";

// ─── Component ────────────────────────────────────────────────────────────────

export default function AssetMultiSelect({
  value,
  onChange,
  placeholder = "Search assets…",
}: {
  value: CoinSelection;
  onChange: (v: CoinSelection) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const [allSymbols, setAllSymbols] = useState<PortfolioSymbol[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isAll = value === "all";
  const selected = useMemo<string[]>(
    () => (value === "all" ? [] : value),
    [value],
  );

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setQ("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load portfolio symbols once on mount
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    void fetch("/api/portfolio/symbols", { cache: "no-store" })
      .then((res) => res.json())
      .then((json: unknown) => {
        if (cancelled) return;
        if (
          typeof json === "object" &&
          json !== null &&
          "items" in json &&
          Array.isArray((json as { items: unknown }).items)
        ) {
          setAllSymbols((json as { items: PortfolioSymbol[] }).items);
        }
      })
      .catch(() => {
        if (!cancelled) setAllSymbols([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Filter by search query and exclude already selected
  const filteredSymbols = allSymbols.filter(
    (it) =>
      !selected.includes(it.symbol) &&
      (q.trim() === "" ||
        it.symbol.toLowerCase().includes(q.trim().toLowerCase())),
  );

  function toggleCoin(symbol: string) {
    if (isAll) return;
    if (selected.includes(symbol)) {
      onChange(selected.filter((s) => s !== symbol));
    } else {
      onChange([...selected, symbol]);
    }
    inputRef.current?.focus();
  }

  function removeCoin(symbol: string) {
    if (isAll) return;
    onChange(selected.filter((s) => s !== symbol));
  }

  function toggleAll() {
    onChange(isAll ? [] : "all");
    setQ("");
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !q && selected.length > 0) {
      removeCoin(selected[selected.length - 1]!);
    }
    if (e.key === "Escape") {
      setOpen(false);
      setQ("");
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className="min-h-[42px] w-full rounded-xl border border-gray-200 bg-white px-2 py-1.5 flex flex-wrap gap-1.5 items-center cursor-text focus-within:ring-2 focus-within:ring-purple-400 focus-within:border-purple-400 transition-all"
        onClick={() => {
          if (!isAll) {
            setOpen(true);
            inputRef.current?.focus();
          }
        }}
      >
        {/* All Assets chip */}
        {isAll && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-purple-100 text-purple-700 text-sm px-2 py-0.5 font-medium">
            All Assets
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleAll();
              }}
              className="hover:text-purple-900 leading-none"
              aria-label="Remove All Assets"
            >
              ×
            </button>
          </span>
        )}

        {/* Selected asset chips */}
        {!isAll &&
          selected.map((sym) => (
            <span
              key={sym}
              className="inline-flex items-center gap-1 rounded-lg bg-purple-100 text-purple-700 text-sm px-2 py-0.5 font-medium"
            >
              {sym}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeCoin(sym);
                }}
                className="hover:text-purple-900 leading-none"
                aria-label={`Remove ${sym}`}
              >
                ×
              </button>
            </span>
          ))}

        {!isAll && (
          <input
            ref={inputRef}
            className="flex-1 min-w-[100px] outline-none bg-transparent text-sm placeholder-gray-400 py-0.5"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={selected.length === 0 ? placeholder : ""}
          />
        )}

        <button
          type="button"
          className="ml-auto text-gray-400 hover:text-gray-600 px-1"
          onClick={(e) => {
            e.stopPropagation();
            if (!isAll) setOpen((o) => !o);
          }}
          tabIndex={-1}
        >
          <svg
            className={`w-4 h-4 transition-transform ${open && !isAll ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      {open && !isAll && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border bg-white shadow-lg overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            {/* All Assets option */}
            <button
              type="button"
              className="flex items-center gap-3 w-full text-left px-3 py-2.5 hover:bg-gray-50 border-b"
              onClick={toggleAll}
              onMouseDown={(e) => e.preventDefault()}
            >
              <div className="w-4 h-4 rounded border-2 border-gray-300 flex-shrink-0" />
              <div>
                <div className="font-medium text-sm">All Assets</div>
                <div className="text-xs text-gray-500">
                  Apply strategy to all portfolio assets
                </div>
              </div>
            </button>

            {loading && (
              <div className="px-3 py-2 text-sm text-gray-500">Loading…</div>
            )}

            {/* No results */}
            {!loading && filteredSymbols.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-500">
                {allSymbols.length === 0
                  ? "No assets in portfolio"
                  : "No results"}
              </div>
            )}

            {/* Asset options */}
            {filteredSymbols.map((it) => {
              const isChecked = selected.includes(it.symbol);
              return (
                <button
                  key={it.symbol}
                  type="button"
                  className={`flex items-center gap-3 w-full text-left px-3 py-2.5 hover:bg-gray-50 ${isChecked ? "bg-purple-50" : ""}`}
                  onClick={() => toggleCoin(it.symbol)}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <div
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      isChecked
                        ? "bg-purple-600 border-purple-600"
                        : "border-gray-300"
                    }`}
                  >
                    {isChecked && (
                      <svg
                        className="w-2.5 h-2.5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{it.symbol}</div>
                    {it.name && (
                      <div className="text-xs text-gray-500">{it.name}</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
