"use client";

import { useState, useEffect } from "react";

// Mock data from HTML mockup
const MOCK_DATA = {
  meta: {
    date: new Date(),
    updatedMinutesAgo: 6,
  },
  analysis: {
    sentiment: "Bearish",
    movement: "Sideways",
    bullets: [
      "TOTAL structure: higher highs holding above weekly support.",
      "BTC structure: consolidating near range highs; watch breakout confirmation.",
      "ETH structure: lagging vs BTC; needs reclaim of key resistance to lead.",
      "BTC.D: rising bias suggests selective alt exposure until dominance rolls over.",
    ],
  },
  snapshot: {
    btc: { price: 49235, delta: +1.2 },
    eth: { price: 2680, delta: +0.7 },
    total: { price: 2.17, unit: "T", delta: +0.9 },
    btcd: { value: 52.1, delta: +0.3 },
    fg: { score: 68, change7d: -4 },
  },
  portfolio: {
    value: 150000,
    change: { amount: 2140, percent: 1.45 },
  },
};

// Utility functions from HTML mockup
const fmtUSD = (n: number) =>
  n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
const fmtPct = (n: number) => `${n.toFixed(1)}%`;
const fmtDelta = (n: number, suffix = "%") =>
  `${n >= 0 ? "▲" : "▼"} ${Math.abs(n).toFixed(1)}${suffix}`;

function fgLabel(score: number) {
  if (score <= 24) return { label: "Extreme Fear" };
  if (score <= 44) return { label: "Fear" };
  if (score <= 55) return { label: "Neutral" };
  if (score <= 74) return { label: "Greed" };
  return { label: "Extreme Greed" };
}

export default function DashboardPage() {
  const [data, setData] = useState(MOCK_DATA);

  const getSentimentBadgeClass = (sentiment: string) => {
    const base =
      "inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs font-extrabold border";
    if (sentiment === "Bullish")
      return `${base} bg-green-100 border-green-300 text-green-700`;
    if (sentiment === "Bearish")
      return `${base} bg-red-100 border-red-300 text-red-700`;
    return `${base} bg-gray-100 border-gray-300 text-gray-700`;
  };

  const niceDate = data.meta.date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

  const fg = fgLabel(data.snapshot.fg.score);

  return (
    <main className="flex flex-col gap-4">
      {/* PORTFOLIO VALUE - Single column grid */}
      <div className="grid" style={{ gridTemplateColumns: "1fr" }}>
        <article
          className="bg-white border border-gray-200 rounded-2xl shadow-lg flex flex-col gap-3"
          style={{ padding: "14px 18px" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <div className="text-xs font-extrabold tracking-wider uppercase text-gray-500">
                Total Portfolio Value
              </div>
              <div className="text-3xl font-black text-gray-900">$150,000</div>
            </div>

            <div className="flex flex-col items-end gap-1">
              <div className="text-xs font-extrabold uppercase text-gray-500">
                24H Change
              </div>
              <div className="text-sm font-extrabold text-green-600">
                ▲ $2,140 (1.45%)
              </div>
            </div>
          </div>

          {/* Allocation Bar */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-xs font-bold text-gray-500">
              <span>BTC 60%</span>
              <span>ETH 25%</span>
              <span>Alts 10%</span>
              <span>Stables 5%</span>
            </div>
            <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
              <div className="bg-orange-500" style={{ width: "60%" }}></div>
              <div className="bg-blue-500" style={{ width: "25%" }}></div>
              <div className="bg-purple-600" style={{ width: "10%" }}></div>
              <div className="bg-slate-400" style={{ width: "5%" }}></div>
            </div>
          </div>
        </article>
      </div>

      {/* HERO GRID - 1.6fr 1fr columns */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "1.6fr 1fr" }}>
        {/* Daily Market Analysis */}
        <article className="bg-white border border-gray-200 rounded-2xl shadow-lg p-4 flex flex-col">
          {/* analysis-header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex gap-3 items-start">
              {/* brain */}
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 font-black">
                AI
              </div>
              <div>
                <div className="flex gap-3 items-center flex-wrap">
                  <h2 className="text-lg font-semibold tracking-wide text-gray-900 m-0">
                    AI Daily Market Analysis
                  </h2>
                  <span className="text-sm text-gray-500">
                    — {niceDate}, 9:00 AM EST
                  </span>
                </div>
                <div className="flex gap-2 items-center flex-wrap mt-2">
                  <span
                    className={getSentimentBadgeClass(data.analysis.sentiment)}
                  >
                    Market Sentiment: {data.analysis.sentiment}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* analysis-list */}
          <ul className="flex-grow my-3 pl-5 text-gray-900 text-sm leading-relaxed list-disc">
            {data.analysis.bullets.map((bullet, index) => (
              <li key={index} className="my-2">
                {bullet}
              </li>
            ))}
          </ul>

          {/* analysis-footer - com linha divisória */}
          <div className="flex items-center justify-between gap-3 mt-auto pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              Updated <strong>{data.meta.updatedMinutesAgo}m ago</strong>
            </div>
          </div>
        </article>

        {/* Today's Snapshot */}
        <article className="bg-white border border-gray-200 rounded-2xl shadow-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold tracking-wide text-gray-900">
              Today&apos;s Snapshot
            </h3>
            <span className="text-sm text-gray-500">
              Auto-updated mock data
            </span>
          </div>

          {/* metrics - grid 2x2 com small cards */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* BTC Price - metric card */}
            <div className="border border-gray-200 rounded-xl p-3 bg-gradient-to-b from-white to-purple-50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 text-xs font-black">
                  ₿
                </div>
                <span className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">
                  BTC Price
                </span>
              </div>
              <div className="text-xl font-black text-gray-900 mt-2">
                {fmtUSD(data.snapshot.btc.price)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                24H:{" "}
                <span
                  className={
                    data.snapshot.btc.delta >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  {fmtDelta(data.snapshot.btc.delta)}
                </span>
              </div>
            </div>

            {/* ETH Price - metric card */}
            <div className="border border-gray-200 rounded-xl p-3 bg-gradient-to-b from-white to-purple-50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 text-xs font-black">
                  ◎
                </div>
                <span className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">
                  ETH Price
                </span>
              </div>
              <div className="text-xl font-black text-gray-900 mt-2">
                {fmtUSD(data.snapshot.eth.price)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                24H:{" "}
                <span
                  className={
                    data.snapshot.eth.delta >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  {fmtDelta(data.snapshot.eth.delta)}
                </span>
              </div>
            </div>

            {/* TOTAL Market Cap - metric card */}
            <div className="border border-gray-200 rounded-xl p-3 bg-gradient-to-b from-white to-purple-50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 text-xs font-black">
                  Σ
                </div>
                <span className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">
                  TOTAL Market Cap
                </span>
              </div>
              <div className="text-xl font-black text-gray-900 mt-2">
                ${data.snapshot.total.price.toFixed(2)}
                {data.snapshot.total.unit}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                24H:{" "}
                <span
                  className={
                    data.snapshot.total.delta >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  {fmtDelta(data.snapshot.total.delta)}
                </span>
              </div>
            </div>

            {/* BTC Dominance - metric card */}
            <div className="border border-gray-200 rounded-xl p-3 bg-gradient-to-b from-white to-purple-50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 text-xs font-black">
                  %
                </div>
                <span className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">
                  BTC Dominance
                </span>
              </div>
              <div className="text-xl font-black text-gray-900 mt-2">
                {fmtPct(data.snapshot.btcd.value)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                24H:{" "}
                <span
                  className={
                    data.snapshot.btcd.delta >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  {fmtDelta(data.snapshot.btcd.delta)}
                </span>
              </div>
            </div>
          </div>

          {/* Fear & Greed Footer */}
          <div className="mt-3 pt-3 border-t border-gray-200 flex gap-3 items-center justify-between">
            <div className="text-sm text-gray-500">
              <strong>Fear &amp; Greed:</strong>{" "}
              <span className="font-black text-gray-900">
                {data.snapshot.fg.score} — {fg.label}
              </span>
            </div>
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-extrabold bg-purple-100 border border-purple-300 text-purple-700">
              {fg.label}
            </span>
          </div>
        </article>
      </div>

      {/* BTC KEY LEVELS - Single column */}
      <div className="grid" style={{ gridTemplateColumns: "1fr" }}>
        <article className="bg-white border border-gray-200 rounded-2xl shadow-lg p-4 overflow-hidden bg-gradient-to-b from-white to-purple-50">
          {/* levels-top */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-start gap-3">
              {/* levels-icon - roxo padronizado */}
              <div className="w-11 h-11 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 font-black text-lg flex-shrink-0 shadow-inner">
                ₿
              </div>
              <div>
                <h3 className="text-lg font-semibold tracking-wide text-gray-900 m-0">
                  BTC Key Levels
                </h3>
                <div className="text-sm text-gray-500 mt-1">
                  Major support and resistance zones to watch next
                </div>
              </div>
            </div>
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-extrabold bg-purple-100 border border-purple-300 text-purple-700">
              Updated Daily
            </span>
          </div>

          {/* levels-shell */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Next Resistance - level-panel */}
            <section className="border border-gray-200 rounded-2xl p-4 bg-white shadow-sm bg-gradient-to-b from-white to-red-50">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-extrabold tracking-wider uppercase text-gray-500">
                  Next Resistance
                </div>
                <span className="w-3 h-3 bg-red-600 rounded-full"></span>
              </div>
              {/* level-row */}
              <div className="flex items-center justify-between gap-3 py-3 px-3 rounded-xl border border-gray-200 bg-white">
                <strong className="text-lg font-black text-gray-900 tracking-wide">
                  $72,400
                </strong>
                <span className="text-xs font-extrabold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  R1
                </span>
              </div>
            </section>

            {/* Next Support - level-panel */}
            <section className="border border-gray-200 rounded-2xl p-4 bg-white shadow-sm bg-gradient-to-b from-white to-green-50">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-extrabold tracking-wider uppercase text-gray-500">
                  Next Support
                </div>
                <span className="w-3 h-3 bg-green-600 rounded-full"></span>
              </div>
              {/* level-row */}
              <div className="flex items-center justify-between gap-3 py-3 px-3 rounded-xl border border-gray-200 bg-white">
                <strong className="text-lg font-black text-gray-900 tracking-wide">
                  $69,200
                </strong>
                <span className="text-xs font-extrabold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  S1
                </span>
              </div>
            </section>
          </div>

          {/* levels-footer */}
          <div className="flex justify-between items-center gap-3 mt-4 pt-4 border-t border-gray-200 flex-wrap">
            <div className="flex gap-3 flex-wrap">
              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-extrabold bg-purple-100 border border-purple-300 text-purple-700">
                Breakout Level: $72,400
              </span>
              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-extrabold bg-gray-100 border border-gray-300 text-gray-700">
                Breakdown Level: $69,200
              </span>
            </div>
            <div className="text-xs text-gray-500 font-bold">
              Use with structure confirmation, not as standalone entries.
            </div>
          </div>
        </article>
      </div>
    </main>
  );
}
