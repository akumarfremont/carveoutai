"use client";

// Orchestrates the full case flow:
//   open (date stamp + disclaimer) → stage 1 → stage 1 reveal
//   → (two-stage) time jump → stage 2 → final reveal
//
// Records to localStorage at each commit. Enforces "one attempt per case":
// if an attempt already exists, jumps straight to the closed-case reveal.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { Case } from "@/lib/cases";
import {
  recordStageOne,
  recordStageTwo,
  getAttempt,
  type Attempt,
  type StageDecision,
} from "@/lib/store";
import { verdict, type Verdict } from "@/lib/scoring";
import { renderProse } from "@/lib/md";

import CaseOpen from "./CaseOpen";
import CaseStage from "./CaseStage";
import Reveal from "./Reveal";
import TimeJump from "./TimeJump";

type Phase =
  | "open" // date stamp + disclaimer
  | "stage1"
  | "reveal1"
  | "timejump"
  | "stage2"
  | "reveal2"
  | "closed";

export default function CasePlayer({ caseData }: { caseData: Case }) {
  const router = useRouter();
  const existing = useMemo(() => getAttempt(caseData.id), [caseData.id]);

  // If the player already finished this case, skip straight to a closed view.
  const [phase, setPhase] = useState<Phase>(
    existing
      ? caseData.type === "two-stage" && !existing.stage_two
        ? "stage1" // shouldn't happen normally; safety fallback
        : "closed"
      : "open",
  );

  const [stageOneDecision, setStageOneDecision] = useState<
    StageDecision | null
  >(existing?.stage_one ?? null);
  const [stageTwoDecision, setStageTwoDecision] = useState<
    StageDecision | null
  >(existing?.stage_two ?? null);

  function buildDecision(
    stage: "one" | "two",
    choice: "A" | "B" | "C" | "D",
    confidence: number,
  ): StageDecision {
    const s =
      stage === "one"
        ? caseData.stage_one
        : caseData.stage_two!;
    return {
      choice,
      confidence,
      correct: choice === s.correct_answer,
      defensible: s.defensible_answers.includes(choice),
    };
  }

  function commitStageOne(
    choice: "A" | "B" | "C" | "D",
    confidence: number,
  ) {
    const decision = buildDecision("one", choice, confidence);
    setStageOneDecision(decision);
    recordStageOne(caseData.id, decision);
    setPhase("reveal1");
  }

  function commitStageTwo(
    choice: "A" | "B" | "C" | "D",
    confidence: number,
  ) {
    const decision = buildDecision("two", choice, confidence);
    setStageTwoDecision(decision);
    recordStageTwo(caseData.id, decision);
    setPhase("reveal2");
  }

  // ---- Render phases ----

  if (phase === "open") {
    return (
      <CaseOpen
        dateStamp={caseData.stage_one.date_stamp}
        onDone={() => setPhase("stage1")}
      />
    );
  }

  if (phase === "stage1") {
    return (
      <CaseStage
        caseTitle={caseData.title}
        caseNumber={caseData.id}
        stageLabel={
          caseData.type === "two-stage" ? "Stage 1 of 2" : "Single stage"
        }
        setup={caseData.stage_one.setup}
        agentAnalysis={caseData.stage_one.agent_analysis}
        options={caseData.stage_one.options}
        onCommit={commitStageOne}
      />
    );
  }

  if (phase === "reveal1") {
    const playerV = stageOneVerdict();
    const agentV = agentVerdictForStageOne();
    const isFinalReveal = caseData.type === "single-stage";
    return (
      <Reveal
        playerVerdict={playerV}
        agentVerdict={agentV}
        reasoning={caseData.stage_one.reasoning}
        counterfactual={isFinalReveal ? caseData.counterfactual : undefined}
        inspiredBy={isFinalReveal ? caseData.inspired_by : undefined}
        continueLabel={
          isFinalReveal ? "Return to case board" : "Continue to stage 2"
        }
        onContinue={() => {
          if (isFinalReveal) {
            router.push("/dashboard");
          } else {
            setPhase("timejump");
          }
        }}
      />
    );
  }

  if (phase === "timejump") {
    return <TimeJump onDone={() => setPhase("stage2")} />;
  }

  if (phase === "stage2" && caseData.stage_two) {
    const setupForStageTwo =
      stageOneDecision &&
      (stageOneDecision.correct || stageOneDecision.defensible)
        ? caseData.stage_two_setup_if_correct ?? ""
        : caseData.stage_two_setup_if_incorrect ?? "";
    return (
      <>
        {/* Stage 2 also opens with a date stamp / disclaimer beat. */}
        <CaseStageWithOpen
          caseData={caseData}
          setup={setupForStageTwo}
          onCommit={commitStageTwo}
        />
      </>
    );
  }

  if (phase === "reveal2") {
    const playerV = stageTwoVerdict();
    return (
      <Reveal
        playerVerdict={playerV}
        // No agent on stage 2.
        reasoning={caseData.stage_two!.reasoning}
        counterfactual={caseData.counterfactual}
        inspiredBy={caseData.inspired_by}
        continueLabel="Return to case board"
        onContinue={() => router.push("/dashboard")}
      />
    );
  }

  if (phase === "closed") {
    return (
      <ClosedCaseSummary
        caseData={caseData}
        attempt={existing!}
        onBack={() => router.push("/dashboard")}
      />
    );
  }

  return null;

  // ---- Helpers ----

  function stageOneVerdict(): Verdict {
    const d = stageOneDecision;
    if (!d) return "incorrect";
    return verdict(
      d.choice,
      caseData.stage_one.correct_answer,
      caseData.stage_one.defensible_answers,
    );
  }

  function agentVerdictForStageOne(): Verdict | undefined {
    if (!caseData.stage_one.agent_analysis) return undefined;
    // The agent always recommends option A in our data model.
    const agentChoice: "A" = "A";
    return verdict(
      agentChoice,
      caseData.stage_one.correct_answer,
      caseData.stage_one.defensible_answers,
    );
  }

  function stageTwoVerdict(): Verdict {
    const d = stageTwoDecision;
    if (!d || !caseData.stage_two) return "incorrect";
    return verdict(
      d.choice,
      caseData.stage_two.correct_answer,
      caseData.stage_two.defensible_answers,
    );
  }
}

// ---------------------------------------------------------------------------
// Stage 2 wrapper that plays the date-stamp open before the stage UI
// ---------------------------------------------------------------------------

function CaseStageWithOpen({
  caseData,
  setup,
  onCommit,
}: {
  caseData: Case;
  setup: string;
  onCommit: (choice: "A" | "B" | "C" | "D", confidence: number) => void;
}) {
  const [showOpen, setShowOpen] = useState(true);
  if (showOpen && caseData.stage_two) {
    return (
      <CaseOpen
        dateStamp={caseData.stage_two.date_stamp}
        onDone={() => setShowOpen(false)}
      />
    );
  }
  if (!caseData.stage_two) return null;
  return (
    <CaseStage
      caseTitle={caseData.title}
      caseNumber={caseData.id}
      stageLabel="Stage 2 of 2"
      setup={setup}
      agentAnalysis={null}
      options={caseData.stage_two.options}
      onCommit={onCommit}
    />
  );
}

// ---------------------------------------------------------------------------
// Closed-case summary — shown if the player tries to replay
// ---------------------------------------------------------------------------

function ClosedCaseSummary({
  caseData,
  attempt,
  onBack,
}: {
  caseData: Case;
  attempt: Attempt;
  onBack: () => void;
}) {
  const s1 = verdict(
    attempt.stage_one.choice,
    caseData.stage_one.correct_answer,
    caseData.stage_one.defensible_answers,
  );
  const s2 =
    attempt.stage_two && caseData.stage_two
      ? verdict(
          attempt.stage_two.choice,
          caseData.stage_two.correct_answer,
          caseData.stage_two.defensible_answers,
        )
      : null;
  return (
    <div className="mx-auto max-w-screen px-5 pb-20 pt-8">
      <span className="tag text-graphite-dim">Case Closed</span>
      <h1 className="mt-2 font-proc text-[26px] font-bold leading-[1.1] tracking-[0.04em] text-ink">
        {caseData.title.toUpperCase()}
      </h1>
      <p className="mt-3 font-serif text-[14px] italic text-graphite">
        One attempt per case. Filed and locked.
      </p>

      <div className="mt-6 space-y-3">
        <SummaryRow
          label="Stage 1"
          choice={attempt.stage_one.choice}
          confidence={attempt.stage_one.confidence}
          v={s1}
        />
        {s2 && attempt.stage_two && (
          <SummaryRow
            label="Stage 2"
            choice={attempt.stage_two.choice}
            confidence={attempt.stage_two.confidence}
            v={s2}
          />
        )}
      </div>

      <section className="mt-8">
        <h2 className="tag mb-3 text-graphite">Reasoning</h2>
        <div className="prose-file">
          {renderReasoning(caseData)}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="tag mb-3 text-graphite">What Actually Happened</h2>
        <div className="prose-file">
          {renderCounterfactual(caseData)}
        </div>
      </section>

      <button
        type="button"
        onClick={onBack}
        className="mt-10 flex h-14 w-full items-center justify-center bg-ink font-mono text-[13px] font-semibold uppercase tracking-[0.22em] text-bone hover:bg-ink-soft active:animate-tapPulse"
      >
        Return to case board
      </button>

      <p className="mt-8 text-center font-proc text-[11px] italic tracking-[0.16em] text-graphite-dim">
        Inspired by {caseData.inspired_by}
      </p>
    </div>
  );
}

function SummaryRow({
  label,
  choice,
  confidence,
  v,
}: {
  label: string;
  choice: string;
  confidence: number;
  v: Verdict;
}) {
  const tone =
    v === "correct"
      ? "border-evidence bg-evidence/10"
      : v === "defensible"
        ? "border-evidence bg-bone"
        : "border-hairline bg-bone-soft";
  const text =
    v === "incorrect" ? "text-redaction" : "text-ink";
  return (
    <div className={`flex items-center justify-between border ${tone} p-3`}>
      <div>
        <p className="tag text-graphite">{label}</p>
        <p className="mt-1 font-serif text-[15px] text-ink">
          You chose <strong>{choice}</strong> at{" "}
          <span className="font-mono">{confidence}%</span>
        </p>
      </div>
      <p
        className={`font-proc text-[12px] font-bold uppercase tracking-[0.18em] ${text}`}
      >
        {v === "correct"
          ? "On the line"
          : v === "defensible"
            ? "Defensible"
            : "Off the line"}
      </p>
    </div>
  );
}

function renderReasoning(caseData: Case) {
  const blocks: React.ReactNode[] = [];
  blocks.push(<div key="r1">{renderProse(caseData.stage_one.reasoning)}</div>);
  if (caseData.stage_two) {
    blocks.push(
      <div key="r2" className="mt-6 border-t border-hairline pt-6">
        <p className="tag mb-2 text-graphite-dim">Stage 2</p>
        {renderProse(caseData.stage_two.reasoning)}
      </div>,
    );
  }
  return blocks;
}

function renderCounterfactual(caseData: Case) {
  return renderProse(caseData.counterfactual);
}
