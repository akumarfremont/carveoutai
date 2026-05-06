"use client";

// The two pre-case cards — date stamp + disclaimer — that play before the
// case file loads. Each card holds for ~2 seconds. Black ground, white serif.

import { useEffect, useState } from "react";

type Phase = "stamp" | "disclaimer" | "done";

const DISCLAIMER =
  "The following case is inspired by a real transaction. Names, identifying details, and certain particulars have been changed for the protection of innocent parties.";

export default function CaseOpen({
  dateStamp,
  onDone,
}: {
  dateStamp: string;
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("stamp");

  useEffect(() => {
    const timers: number[] = [];
    timers.push(window.setTimeout(() => setPhase("disclaimer"), 2200));
    timers.push(window.setTimeout(() => setPhase("done"), 4400));
    timers.push(window.setTimeout(() => onDone(), 4900));
    return () => {
      for (const t of timers) window.clearTimeout(t);
    };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-40 flex items-center justify-center bg-ink text-bone transition-opacity duration-500 ${
        phase === "done" ? "opacity-0" : "opacity-100"
      }`}
    >
      {phase === "stamp" && (
        <div className="px-7 text-center animate-coldFadeIn">
          <p className="stamp text-[18px] leading-[1.6] text-bone">
            {dateStamp}
          </p>
        </div>
      )}
      {phase === "disclaimer" && (
        <div className="max-w-[340px] px-7 text-center animate-coldFadeIn">
          <p className="font-proc text-[15px] italic leading-[1.65] tracking-[0.02em] text-bone/85">
            {DISCLAIMER}
          </p>
        </div>
      )}
    </div>
  );
}
