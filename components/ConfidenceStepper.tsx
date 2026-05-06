"use client";

// Mobile-first confidence selector. +/- in 5-point steps, tap-to-input
// shortcut for direct entry. Range 50–99.

import { useState } from "react";
import { cn } from "@/lib/cn";

const MIN = 50;
const MAX = 99;
const STEP = 5;

export default function ConfidenceStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  function clamp(n: number) {
    if (Number.isNaN(n)) return MIN;
    return Math.max(MIN, Math.min(MAX, Math.round(n)));
  }

  function dec() {
    onChange(clamp(value - STEP));
  }
  function inc() {
    onChange(clamp(value + STEP));
  }

  function commit() {
    const n = clamp(parseInt(draft, 10));
    onChange(n);
    setDraft(String(n));
    setEditing(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="tag text-graphite">Confidence</span>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-graphite-dim">
          50–99%
        </span>
      </div>

      <div className="flex items-stretch gap-3">
        <button
          type="button"
          onClick={dec}
          aria-label="Decrease confidence"
          className="flex h-16 w-16 shrink-0 items-center justify-center border border-hairline bg-bone text-[24px] text-ink transition active:animate-tapPulse active:bg-bone-soft disabled:opacity-30"
          disabled={value <= MIN}
        >
          −
        </button>

        <div
          className={cn(
            "flex flex-1 items-center justify-center border bg-bone-soft",
            editing ? "border-evidence" : "border-hairline",
          )}
          onClick={() => {
            if (!editing) {
              setDraft(String(value));
              setEditing(true);
            }
          }}
        >
          {editing ? (
            <input
              autoFocus
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              min={MIN}
              max={MAX}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commit();
                }
              }}
              className="h-16 w-full bg-transparent text-center font-mono text-[36px] font-semibold tabular-nums text-ink outline-none"
            />
          ) : (
            <span className="font-mono text-[36px] font-semibold tabular-nums text-ink">
              {value}
              <span className="text-[20px] font-medium text-graphite">%</span>
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={inc}
          aria-label="Increase confidence"
          className="flex h-16 w-16 shrink-0 items-center justify-center border border-hairline bg-bone text-[24px] text-ink transition active:animate-tapPulse active:bg-bone-soft disabled:opacity-30"
          disabled={value >= MAX}
        >
          +
        </button>
      </div>

      <p className="font-serif text-[13px] italic leading-[1.5] text-graphite">
        Right at 99% pays handsomely. Wrong at 99% is brutal. Right at 50% pays
        nothing.
      </p>
    </div>
  );
}
