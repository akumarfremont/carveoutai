// Calibration and override metrics.
//
// Calibration: per-decision log score, normalized to 0–100.
//   raw_i = log2(p) where p is probability assigned to the actual outcome
//           (p = confidence/100 if correct, p = 1 - confidence/100 if wrong)
//   raw is in [-inf, 0]. We map [-2, 0] -> [0, 100]; scores below -2 floor at 0.
//
//   • Always right at 99% → ~99
//   • Always right at 50% → 50
//   • Always wrong at 50% → 50  (the "I'm guessing" honest score)
//   • Wrong at 99% → 0
//
// Override rate: stage-1 only. Of all stage-1 decisions on cases with an
// agent recommendation, how often did the player pick a non-agent option?
// Override accuracy: when overriding, how often was the override correct?

import type { Attempt, StageDecision } from "./store";
import { getCase } from "./cases";

const RAW_FLOOR = -2;

function rawLogScore(confidencePct: number, correct: boolean): number {
  const c = Math.max(1, Math.min(99, confidencePct)) / 100;
  const p = correct ? c : 1 - c;
  return Math.log2(Math.max(p, 1e-6));
}

function normalize(raw: number): number {
  if (raw <= RAW_FLOOR) return 0;
  if (raw >= 0) return 100;
  // raw in (-2, 0) → 0..100
  return Math.round(((raw - RAW_FLOOR) / -RAW_FLOOR) * 100);
}

export type CalibrationStats = {
  score: number; // 0..100
  decisions: number;
};

export function computeCalibration(attempts: Attempt[]): CalibrationStats {
  const decisions: StageDecision[] = [];
  for (const a of attempts) {
    if (a.stage_one) decisions.push(a.stage_one);
    if (a.stage_two) decisions.push(a.stage_two);
  }
  if (decisions.length === 0) return { score: 0, decisions: 0 };
  const avg =
    decisions.reduce(
      (sum, d) => sum + rawLogScore(d.confidence, d.correct),
      0,
    ) / decisions.length;
  return { score: normalize(avg), decisions: decisions.length };
}

export type OverrideStats = {
  rate: number; // 0..100, % of stage-1 decisions where player overrode the agent
  accuracy: number; // 0..100, % of overrides that were correct (defensible counts as correct)
  total_with_agent: number; // denominator for rate
  total_overrides: number;
};

export function computeOverride(attempts: Attempt[]): OverrideStats {
  let totalWithAgent = 0;
  let overrides = 0;
  let correctOverrides = 0;

  for (const a of attempts) {
    const c = getCase(a.case_id);
    if (!c) continue;
    if (!c.stage_one.agent_analysis) continue; // no agent → not in denominator
    totalWithAgent += 1;

    const choice = a.stage_one.choice;
    const opt = c.stage_one.options.find((o) => o.id === choice);
    if (!opt) continue;
    if (opt.overrides_agent) {
      overrides += 1;
      // "Correct" override = a defensible answer (correct or near-correct)
      if (c.stage_one.defensible_answers.includes(choice)) {
        correctOverrides += 1;
      }
    }
  }

  const rate =
    totalWithAgent === 0 ? 0 : Math.round((overrides / totalWithAgent) * 100);
  const accuracy =
    overrides === 0 ? 0 : Math.round((correctOverrides / overrides) * 100);

  return {
    rate,
    accuracy,
    total_with_agent: totalWithAgent,
    total_overrides: overrides,
  };
}

/** Whether a player choice maps to "correct", "defensible", or "incorrect". */
export type Verdict = "correct" | "defensible" | "incorrect";

export function verdict(
  choice: "A" | "B" | "C" | "D",
  correct: "A" | "B" | "C" | "D",
  defensible: Array<"A" | "B" | "C" | "D">,
): Verdict {
  if (choice === correct) return "correct";
  if (defensible.includes(choice)) return "defensible";
  return "incorrect";
}
