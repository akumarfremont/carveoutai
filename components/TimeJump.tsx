"use client";

// 2-second time-jump transition between stage 1 and stage 2.
// Calendar months flickering past + blurred news headlines drifting,
// then the second stage loads.

import { useEffect } from "react";

const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

const HEADLINES = [
  "MER-201 SHOWS PROMISE IN PHASE III",
  "FDA GRANTS PRIORITY REVIEW",
  "NORTHSTAR CFO DEPARTS FOR THERAPEUTICS DIVISION",
  "ANALYSTS RAISE Q3 GUIDANCE",
  "BIOTECH SECTOR ROTATION CONTINUES",
  "EARNOUT DISPUTES WATCHED CLOSELY",
];

export default function TimeJump({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(() => onDone(), 2200);
    return () => window.clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center overflow-hidden bg-ink text-bone">
      {/* Months flickering, stacked */}
      <div className="pointer-events-none absolute inset-0 flex flex-wrap items-center justify-center gap-x-7 gap-y-4 px-10 opacity-80">
        {MONTHS.map((m, i) => (
          <span
            key={`${m}-${i}`}
            className="font-proc text-[16px] tracking-[0.2em] text-bone animate-monthFlicker"
            style={{ animationDelay: `${(i % 6) * 80}ms` }}
          >
            {m}
          </span>
        ))}
      </div>

      {/* Blurred drifting headlines */}
      <div className="pointer-events-none absolute inset-0">
        {HEADLINES.map((h, i) => (
          <div
            key={i}
            className="absolute left-0 right-0 whitespace-nowrap font-proc text-[14px] tracking-[0.16em] text-bone/70 animate-headlineDrift"
            style={{
              top: `${15 + i * 12}%`,
              filter: "blur(1.2px)",
              animationDelay: `${i * 220}ms`,
            }}
          >
            {h}&nbsp;&nbsp;&nbsp;{h}&nbsp;&nbsp;&nbsp;{h}
          </div>
        ))}
      </div>

      {/* Foreground label */}
      <div className="relative z-10 flex flex-col items-center gap-2">
        <span className="tag text-bone/60">Time elapsed</span>
        <span className="font-proc text-[22px] tracking-[0.22em] text-bone">
          TWO YEARS LATER
        </span>
      </div>
    </div>
  );
}
