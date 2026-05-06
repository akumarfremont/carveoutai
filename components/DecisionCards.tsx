"use client";

import { cn } from "@/lib/cn";
import type { Option } from "@/lib/cases";

export default function DecisionCards({
  options,
  selected,
  onSelect,
}: {
  options: Option[];
  selected: string | null;
  onSelect: (id: "A" | "B" | "C" | "D") => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {options.map((opt) => {
        const isSelected = selected === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelect(opt.id)}
            className={cn(
              "flex w-full gap-3 border bg-bone px-4 py-4 text-left transition active:animate-tapPulse",
              isSelected
                ? "border-evidence ring-1 ring-evidence"
                : "border-hairline hover:border-graphite",
            )}
          >
            <span
              className={cn(
                "mt-[2px] flex h-6 w-6 shrink-0 items-center justify-center border font-mono text-[12px] font-semibold",
                isSelected
                  ? "border-evidence bg-evidence text-ink"
                  : "border-hairline text-graphite",
              )}
            >
              {opt.id}
            </span>
            <span className="prose-file text-[15.5px] leading-[1.55]">
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
