"use client";

// One stage of a case: setup, optional agent analysis, decision cards,
// confidence stepper, commit button.

import { useState } from "react";
import type { Stage, Option } from "@/lib/cases";
import { renderProse } from "@/lib/md";
import AgentAnalysis from "./AgentAnalysis";
import DecisionCards from "./DecisionCards";
import ConfidenceStepper from "./ConfidenceStepper";
import { cn } from "@/lib/cn";

type Props = {
  caseTitle: string;
  caseNumber: number;
  stageLabel: string; // e.g. "Stage 1" | "Stage 2"
  setup: string;
  agentAnalysis: string | null;
  options: Option[];
  onCommit: (choice: "A" | "B" | "C" | "D", confidence: number) => void;
  /** When true, the commit button reads "Lock in decision" with a brief feel
   *  of finality. Default true. */
  finalLanguage?: boolean;
};

export default function CaseStage({
  caseTitle,
  caseNumber,
  stageLabel,
  setup,
  agentAnalysis,
  options,
  onCommit,
  finalLanguage = true,
}: Props) {
  const [choice, setChoice] = useState<"A" | "B" | "C" | "D" | null>(null);
  const [confidence, setConfidence] = useState(70);
  const [committing, setCommitting] = useState(false);

  function commit() {
    if (!choice || committing) return;
    setCommitting(true);
    // Small visual beat before the reveal
    window.setTimeout(() => onCommit(choice, confidence), 220);
  }

  return (
    <div className="mx-auto max-w-screen px-5 pb-24 pt-6">
      {/* Case header */}
      <div className="mb-7 flex items-baseline justify-between">
        <span className="tag text-graphite">
          Case File · No.&nbsp;{String(caseNumber).padStart(2, "0")}
        </span>
        <span className="tag text-graphite-dim">{stageLabel}</span>
      </div>

      <h1 className="font-proc text-[26px] font-bold leading-[1.1] tracking-[0.04em] text-ink">
        {caseTitle.toUpperCase()}
      </h1>

      <div className="mt-5 h-px bg-hairline" />

      {/* The situation */}
      <section className="mt-7">
        <h2 className="tag mb-3 text-graphite">The Situation</h2>
        <div className="prose-file">{renderProse(setup)}</div>
      </section>

      {/* The agent's analysis (stage 1 only) */}
      {agentAnalysis && <AgentAnalysis text={agentAnalysis} />}
      {!agentAnalysis && (
        <div className="my-8 border border-dashed border-hairline bg-bone-soft/60 px-5 py-4">
          <p className="tag mb-1 text-graphite">No Agent</p>
          <p className="font-serif text-[14px] italic leading-[1.55] text-graphite">
            The analytical phase is over. From here it's judgment — the part the
            agent can't help you with.
          </p>
        </div>
      )}

      {/* The decision */}
      <section className="mt-8">
        <h2 className="tag mb-3 text-graphite">The Decision</h2>
        <DecisionCards
          options={options}
          selected={choice}
          onSelect={setChoice}
        />
      </section>

      <div className="mt-8">
        <ConfidenceStepper value={confidence} onChange={setConfidence} />
      </div>

      <button
        type="button"
        onClick={commit}
        disabled={!choice || committing}
        className={cn(
          "mt-8 flex h-14 w-full items-center justify-center font-mono text-[13px] font-semibold uppercase tracking-[0.22em] transition",
          choice
            ? "bg-ink text-bone hover:bg-ink-soft active:animate-tapPulse"
            : "cursor-not-allowed bg-bone-soft text-graphite-dim",
        )}
      >
        {committing
          ? "Locking…"
          : finalLanguage
            ? "Lock in decision"
            : "Commit"}
      </button>

      <p className="mt-3 text-center font-serif text-[12.5px] italic text-graphite-dim">
        One attempt per case. No re-do.
      </p>
    </div>
  );
}
