"use client";

// 1.5-second reveal sequence. Three beats:
//   1. "Player verdict" / "Agent verdict" indicators slide in
//   2. Reasoning paragraph
//   3. Counterfactual + post-credits "Inspired by" line
//
// Wrong answers use #8B6914 (redaction gold), never red.

import { useEffect, useState } from "react";
import { renderProse } from "@/lib/md";
import { cn } from "@/lib/cn";

type Verdict = "correct" | "defensible" | "incorrect";

type Props = {
  playerVerdict: Verdict;
  agentVerdict?: Verdict; // omitted on stage 2 (no agent)
  reasoning: string;
  counterfactual?: string; // shown only on the final stage of the case
  inspiredBy?: string; // shown only on final stage
  /** Called when the player taps "Continue" (or "Return to dashboard"). */
  onContinue: () => void;
  continueLabel?: string;
};

export default function Reveal({
  playerVerdict,
  agentVerdict,
  reasoning,
  counterfactual,
  inspiredBy,
  onContinue,
  continueLabel = "Continue",
}: Props) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t1 = window.setTimeout(() => setStep(1), 800);
    const t2 = window.setTimeout(() => setStep(2), 1500);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  return (
    <div className="mx-auto max-w-screen px-5 pb-24 pt-8">
      <div className="animate-revealIn">
        <span className="tag text-graphite-dim">Verdict</span>
        <h1 className="mt-2 font-proc text-[28px] font-bold leading-[1.1] tracking-[0.04em] text-ink">
          {headline(playerVerdict)}
        </h1>
      </div>

      <div className="mt-7 grid grid-cols-2 gap-3">
        <VerdictTile label="You" verdict={playerVerdict} />
        {agentVerdict ? (
          <VerdictTile label="Agent" verdict={agentVerdict} />
        ) : (
          <div className="border border-dashed border-hairline bg-bone-soft/60 p-3">
            <p className="tag text-graphite-dim">Agent</p>
            <p className="mt-2 font-serif text-[13px] italic leading-[1.45] text-graphite">
              No agent on this stage.
            </p>
          </div>
        )}
      </div>

      {step >= 1 && (
        <section className="mt-8 animate-revealIn">
          <h2 className="tag mb-3 text-graphite">Reasoning</h2>
          <div className="prose-file">{renderProse(reasoning)}</div>
        </section>
      )}

      {step >= 2 && counterfactual && (
        <section className="mt-8 animate-revealIn">
          <h2 className="tag mb-3 text-graphite">What Actually Happened</h2>
          <div className="prose-file">{renderProse(counterfactual)}</div>
        </section>
      )}

      <button
        type="button"
        onClick={onContinue}
        className="mt-10 flex h-14 w-full items-center justify-center bg-ink font-mono text-[13px] font-semibold uppercase tracking-[0.22em] text-bone hover:bg-ink-soft active:animate-tapPulse"
      >
        {continueLabel}
      </button>

      {step >= 2 && inspiredBy && (
        <p className="mt-10 animate-revealIn text-center font-proc text-[11px] italic tracking-[0.16em] text-graphite-dim">
          Inspired by {inspiredBy}
        </p>
      )}
    </div>
  );
}

function VerdictTile({ label, verdict }: { label: string; verdict: Verdict }) {
  const tone =
    verdict === "correct"
      ? "border-evidence bg-evidence/10 text-ink"
      : verdict === "defensible"
        ? "border-evidence bg-bone text-ink"
        : "border-hairline bg-bone-soft text-redaction";
  return (
    <div className={cn("border p-3", tone)}>
      <p className="tag text-graphite">{label}</p>
      <p
        className={cn(
          "mt-2 font-proc text-[15px] font-bold uppercase tracking-[0.18em]",
          verdict === "incorrect" ? "text-redaction" : "text-ink",
        )}
      >
        {verdictLabel(verdict)}
      </p>
    </div>
  );
}

function verdictLabel(v: Verdict): string {
  if (v === "correct") return "On the line";
  if (v === "defensible") return "Defensible";
  return "Off the line";
}

function headline(v: Verdict): string {
  if (v === "correct") return "You held the line.";
  if (v === "defensible") return "Defensible call.";
  return "You missed the shape.";
}
