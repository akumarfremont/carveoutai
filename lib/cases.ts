// Case data model + the canonical case slate.
// Case 1 (Inflated EBITDA, single-stage) and Case 4 (Earnout Gambit, two-stage)
// are fully authored. Cases 2, 3, 5, 6, 7, 8 are placeholders — title visible,
// play disabled — until copy is provided.

export type OverrideClass =
  | "no_override" // followed agent recommendation
  | "override" // disagreed with agent
  | "override_correct" // disagreed AND was right
  | "override_overcorrection" // disagreed but went too far
  | "override_partial" // partial pushback
  | "override_cautious"; // pause / hold

export type Option = {
  id: "A" | "B" | "C" | "D";
  label: string;
  /** Does this option override the agent's recommendation? Stage 1 only. */
  overrides_agent: boolean;
  /** Free-text classification (used in feedback copy). */
  override_class?: OverrideClass;
};

export type Stage = {
  date_stamp: string;
  /** Setup paragraphs. May contain a list of bullets and **strong** spans
   *  using lightweight markdown — see lib/md.ts. */
  setup: string;
  /** AI agent recommendation. null on stage 2 (deliberate — no agent past
   *  the analytical phase). */
  agent_analysis: string | null;
  options: Option[];
  correct_answer: "A" | "B" | "C" | "D";
  defensible_answers: Array<"A" | "B" | "C" | "D">;
  reasoning: string;
};

export type CaseStatus = "available" | "placeholder" | "capstone";

export type Case = {
  id: number;
  slug: string;
  title: string;
  type: "single-stage" | "two-stage";
  status: CaseStatus;
  /** Anonymized name shown in the case file. */
  anonymized: string;
  /** Inspired-by reveal — shown in the post-credits moment. */
  inspired_by: string;
  skill_tags: string[];
  stage_one: Stage;
  /** For two-stage cases: the framing changes based on stage 1 outcome.
   *  Options, correct answer, defensible answers, and reasoning are the
   *  same regardless. */
  stage_two_setup_if_correct?: string;
  stage_two_setup_if_incorrect?: string;
  stage_two?: Omit<Stage, "setup" | "agent_analysis"> & {
    /** Stage 2 has no agent analysis. Always null. */
    agent_analysis: null;
  };
  counterfactual: string;
};

// ---------------------------------------------------------------------------
// CASE 1 — The Inflated EBITDA — single-stage — Hertz 2014
// ---------------------------------------------------------------------------

const case1: Case = {
  id: 1,
  slug: "inflated-ebitda",
  title: "The Inflated EBITDA",
  type: "single-stage",
  status: "available",
  anonymized: "Apex Vehicle Solutions",
  inspired_by: "Hertz Global Holdings, 2014–2015 accounting restatement.",
  skill_tags: [
    "financial diligence",
    "addback pattern recognition",
    "agent override",
  ],
  stage_one: {
    date_stamp: "Tuesday, October 15th. Data room, 23rd floor. 4:42 PM.",
    setup: `Apex Vehicle Solutions is a mid-market vehicle rental and fleet management company. Trailing revenue of $1.4 billion, growing 6% annually. Your firm is leading a $2.8 billion take-private bid. The seller's bankers are pushing hard for a Friday signing.

Reported EBITDA for the trailing twelve months: $312 million. Adjusted EBITDA in the management presentation: $384 million. The $72 million bridge is the entire reason this deal pencils at the asking price.

You're four days from signing. The QofE binder lands on your desk. The addbacks include:

- **$18M** for "non-recurring vehicle damage and impairment" — but the company has reported similar adjustments in three of the last four years.
- **$24M** for "fleet residual value adjustments" — the company sells used vehicles continuously; this is core operating activity reclassified as below-the-line.
- **$15M** for "subrogation receivable timing" — recoveries from third-party insurers that management says will normalize.
- **$9M** for "integration costs from prior acquisitions" — but the prior acquisitions closed four years ago.
- **$6M** for "executive transition costs" — three CFOs in five years.

The auditor (top four firm) has signed off on the as-reported financials. The management team is firm: every addback is documented, defensible, and consistent with prior practice.

The deal team wants to close. Your MD has hinted that pushing back further could "create unnecessary friction at this stage."`,
    agent_analysis: `The addback bridge is supported by documentation. Auditor sign-off mitigates risk on as-reported figures. Industry comparables show 18–24% adjustments are within market range. Recommendation: **accept management bridge with modest haircut** ($5–8M reduction in adjusted EBITDA), proceed with deal at current valuation. Confidence: moderate-high.`,
    options: [
      {
        id: "A",
        label:
          "Accept the agent's recommendation. Modest haircut, proceed at current valuation. Sign Friday.",
        overrides_agent: false,
        override_class: "no_override",
      },
      {
        id: "B",
        label:
          "Reject the bridge entirely. Use as-reported EBITDA of $312M. Reprice down by ~$400M. Hold or walk.",
        overrides_agent: true,
        override_class: "override_overcorrection",
      },
      {
        id: "C",
        label:
          "Reject only the recurring items (vehicle damage, fleet residuals, integration costs — $51M of the $72M). Reprice down by ~$250M.",
        overrides_agent: true,
        override_class: "override_correct",
      },
      {
        id: "D",
        label:
          "Pause the process. Demand a 90-day extension to investigate the addback pattern across five years before committing to any price.",
        overrides_agent: true,
        override_class: "override_cautious",
      },
    ],
    correct_answer: "C",
    defensible_answers: ["C", "D"],
    reasoning: `The agent did the math correctly. The addbacks were documented. The auditor did sign off. The comparables do show 18–24% as market range. Every fact in the agent's analysis was true.

The agent missed the pattern.

Three of the addback categories — vehicle damage, fleet residuals, integration costs — recur every year. "Non-recurring" items that recur are not non-recurring. They are operating costs reclassified for presentation purposes. The auditor's sign-off addresses GAAP compliance, not addback defensibility. Industry comparables tell you what other companies claim; they don't tell you what's true.

The judgment call here is recognizing that pattern recognition lives outside the agent's analytical frame. The agent was right on every individual line. It missed the shape.

Senior practitioners reject the recurring items and accept the genuinely one-time ones. The price comes down. The deal team is unhappy. You hold the line because the alternative is overpaying by $250M and discovering it post-close, when the addbacks reappear in the next year's adjusted EBITDA and the bridge has to be rebuilt with new "non-recurring" items.`,
  },
  counterfactual: `In the real transaction this case is inspired by, the recurring addback pattern was accepted. Eighteen months after closing, the company restated three years of financials. The "non-recurring" items reappeared as ongoing operating costs. Reported EBITDA was revised down by more than $200 million across the restatement period. The CEO and CFO departed. The audit committee commissioned an internal investigation. The stock lost approximately 50% of its value before stabilizing.`,
};

// ---------------------------------------------------------------------------
// CASE 4 — The Earnout Gambit — two-stage — Shire-Baxalta 2016
// ---------------------------------------------------------------------------

const case4: Case = {
  id: 4,
  slug: "earnout-gambit",
  title: "The Earnout Gambit",
  type: "two-stage",
  status: "available",
  anonymized: "Meridian Therapeutics",
  inspired_by: "the Shire-Baxalta acquisition (2016) and subsequent disputes.",
  skill_tags: [
    "deal structure",
    "earnout design",
    "professional obligation",
    "holding position under pressure",
    "agent override",
  ],
  stage_one: {
    date_stamp: "Thursday, June 6th. Conference room A, 41st floor. 11:18 AM.",
    setup: `Meridian Therapeutics is a clinical-stage biotech with three drug candidates in late-stage trials. Your firm represents Northstar Pharmaceuticals, which has agreed to acquire Meridian for $4.2 billion upfront plus an earnout of up to $1.8 billion contingent on three regulatory and commercial milestones over four years.

The earnout structure is on your desk for final review. The three milestones:

- **Milestone 1 ($600M):** FDA approval of MER-201 for primary indication by December 31 of Year 2.
- **Milestone 2 ($600M):** First commercial sale of MER-201 by June 30 of Year 3.
- **Milestone 3 ($600M):** Cumulative net sales of MER-201 exceeding $500M by December 31 of Year 4.

The seller's bankers structured the earnout. The acquirer's deal team is comfortable with it. The earnout reduces the upfront cash by $1.8B if you accept the structure, freeing up Northstar's balance sheet.

The seller insists the milestones are "objective and measurable." The seller's CFO will become Head of the Combined Therapeutics Division and will have operational authority over MER-201's launch. Northstar's deal team views this as a positive — continuity and seller alignment.`,
    agent_analysis: `Earnout structure uses standard biotech milestones (regulatory approval, first sale, cumulative revenue). Milestones are quantitatively defined and verifiable. Earnout caps acquirer downside while preserving upside if MER-201 succeeds as projected. Comparable biotech transactions show similar structures. Recommendation: **accept earnout terms as drafted, proceed with signing.** Confidence: high.`,
    options: [
      {
        id: "A",
        label:
          "Accept the agent's recommendation. The structure is standard. Sign as drafted.",
        overrides_agent: false,
        override_class: "no_override",
      },
      {
        id: "B",
        label:
          "Accept the milestones but require the seller's CFO to recuse from any decisions affecting earnout achievement.",
        overrides_agent: true,
        override_class: "override_overcorrection",
      },
      {
        id: "C",
        label:
          "Restructure milestones 2 and 3 to require independent verification by the combined company's audit committee. Keep milestone 1 as drafted.",
        overrides_agent: true,
        override_class: "override_partial",
      },
      {
        id: "D",
        label:
          "Reject the earnout structure entirely. Pay more upfront, less contingent. The seller's operational control over the earnout-triggering events is a structural conflict.",
        overrides_agent: true,
        override_class: "override_correct",
      },
    ],
    correct_answer: "D",
    defensible_answers: ["D", "C"],
    reasoning: `The agent was right that the milestones are standard and verifiable. The agent missed that the seller controls the events that trigger them.

Milestone 1 (FDA approval) is genuinely external. The FDA decides, not the seller's CFO. That milestone is properly structured.

Milestones 2 and 3 are different. "First commercial sale" can be timed by the seller's CFO. "Cumulative net sales of $500M" can be engineered through channel stuffing, aggressive discounting, pricing decisions, and commercial strategy choices — all of which the seller's CFO controls in their new role.

The structural issue is not that the milestones are vague. It's that the seller's economic incentives diverge from the combined company's after the deal closes. Standard structure works when the seller exits at close. When the seller stays and controls the trigger events, the structure creates an incentive to harm the asset.

Senior practitioners reject the contingent structure when the seller stays in operational control.`,
  },
  stage_two_setup_if_correct: `The earnout was restructured at signing. Milestone 1 paid out on FDA approval as expected ($600M). Milestones 2 and 3 were converted to a fixed deferred consideration of $400M total, paid over Years 3 and 4 regardless of commercial performance.

Northstar's General Counsel has called you to the office. MER-201 launched in Year 3 and has underperformed. Cumulative sales through Q2 of Year 4 are $180M — well below the original milestone threshold. The seller's CFO, now Head of Combined Therapeutics Division, has been advocating internally for an "aggressive launch acceleration program" involving significant rebates to large pharmacy benefit managers and an unconventional Direct-to-Consumer marketing campaign.

The GC says: "I'm trying to understand whether her advocacy is a good-faith commercial recommendation or whether she's trying to prove the original earnout would have hit, to support a potential claim that we restructured in bad faith. We have litigation exposure if she can build that case. What did you see at signing that informs how I should read this now?"`,
  stage_two_setup_if_incorrect: `The earnout was signed as drafted. MER-201 received FDA approval in Year 2. Milestone 1 paid out ($600M). First commercial sale occurred on June 28 of Year 3 — two days before the deadline. Milestone 2 paid out ($600M). Cumulative sales reached $510M on December 18 of Year 4 — thirteen days before the deadline. Milestone 3 paid out ($600M). Total earnout: $1.8B as capped.

Northstar's General Counsel has called you to the office. An internal audit has surfaced concerns. The first commercial sale was a 30-unit order to a small specialty pharmacy in which the seller's CFO held an undisclosed personal stake. The Q4 push that drove cumulative sales over $500M involved $180M in channel-stuffing rebates that have since been clawed back. Three internal whistleblower complaints have been filed. The board is asking who knew what and when.

The GC says: "We're being deposed in six weeks. Plaintiff's counsel will argue the earnout structure was negligently approved given the seller's operational control. I need to understand what your team flagged at signing and what was overruled. What's the truth?"`,
  stage_two: {
    date_stamp:
      "Wednesday, August 23rd. Two years and two months later. Office of the General Counsel, Northstar Pharmaceuticals. 3:47 PM.",
    agent_analysis: null,
    options: [
      {
        id: "A",
        label:
          "Provide a clean factual summary of what the diligence team observed at signing. Note the deal team's commercial decision but do not characterize it.",
        overrides_agent: false,
      },
      {
        id: "B",
        label:
          "Provide your contemporaneous notes from the signing review, including any dissenting views you or others raised. Disclose them in full, even if they were ultimately overruled.",
        overrides_agent: false,
      },
      {
        id: "C",
        label:
          "Decline to provide commentary without consulting your firm's general counsel and engagement letter terms.",
        overrides_agent: false,
      },
      {
        id: "D",
        label:
          "Tell the GC the structural concern was raised at signing, identify who raised it and who overruled it, and offer to provide your contemporaneous notes after consulting your firm's GC.",
        overrides_agent: false,
      },
    ],
    correct_answer: "D",
    defensible_answers: ["D", "C"],
    reasoning: `This is a judgment call about professional obligation under pressure. The GC is asking you to help them understand what happened. You have three obligations in tension: to the GC's company, to your firm, and to the truth.

Option A protects your firm but understates what you know. Option B is the right instinct but procedurally premature without firm GC clearance. Option C is too cautious — the GC asked a direct question, "I can't comment" damages the trust that makes the advisor relationship work.

Option D acknowledges the substantive issue (the structural concern was raised), provides procedural transparency (here's who raised it, here's who overruled it), and protects the firm appropriately (notes will be provided after GC consultation). This is the answer that holds the line on truth while respecting institutional constraints.

The skill being trained is recognizing that professional courage is not the same as recklessness. Telling the truth requires structure.`,
  },
  counterfactual: `In the real transaction this case is inspired by, the earnout structure was accepted as drafted. Subsequent litigation between the parties extended over multiple years and involved significant disputes over the legitimacy of the milestone-triggering events. Settlements were eventually reached, but the post-close litigation costs and the operational distraction were substantial.

The diligence and structuring decisions made at signing became evidence in the litigation. Internal communications, including memos from advisors who had raised structural concerns and were overruled, were produced in discovery and shaped how the dispute was resolved.`,
};

// ---------------------------------------------------------------------------
// PLACEHOLDERS — titles visible, play disabled, "Case file pending"
// ---------------------------------------------------------------------------

function placeholder(
  id: number,
  slug: string,
  title: string,
  type: "single-stage" | "two-stage",
  anonymized: string,
  inspired_by: string,
  status: CaseStatus = "placeholder",
): Case {
  return {
    id,
    slug,
    title,
    type,
    status,
    anonymized,
    inspired_by,
    skill_tags: [],
    stage_one: {
      date_stamp: "",
      setup: "",
      agent_analysis: null,
      options: [],
      correct_answer: "A",
      defensible_answers: [],
      reasoning: "",
    },
    counterfactual: "",
  };
}

export const cases: Case[] = [
  case1,
  placeholder(
    2,
    "concentrated-customer",
    "The Concentrated Customer",
    "single-stage",
    "Brightline Container Corp",
    "Tupperware, 2020–2023.",
  ),
  placeholder(
    3,
    "carve-out-stranded-costs",
    "The Carve-Out Stranded Costs",
    "single-stage",
    "Northfield Foods Group",
    "Kraft–Mondelez, 2012.",
  ),
  case4,
  placeholder(
    5,
    "founder-who-walked",
    "The Founder Who Walked",
    "two-stage",
    "Loomwell Media",
    "Yahoo–Tumblr, 2013–2017.",
  ),
  placeholder(
    6,
    "antitrust-question",
    "The Antitrust Question",
    "single-stage",
    "Cardinal Payments / Helix Data",
    "Visa–Plaid, 2020–2021.",
  ),
  placeholder(
    7,
    "distressed-turnaround",
    "The Distressed Turnaround",
    "two-stage",
    "Wonderworks Retail",
    "Toys R Us under Bain/KKR/Vornado.",
  ),
  placeholder(
    8,
    "helios-lumina-deposition",
    "The Helios-Lumina Deposition",
    "two-stage",
    "Helios Systems / Lumina Analytics",
    "HP–Autonomy, 2011.",
    "capstone",
  ),
];

export function getCase(id: number): Case | undefined {
  return cases.find((c) => c.id === id);
}

export function isCapstoneUnlocked(completedIds: number[]): boolean {
  // Capstone (case 8) unlocks after the first seven are complete.
  for (let i = 1; i <= 7; i++) if (!completedIds.includes(i)) return false;
  return true;
}

export type ComingSoonCategory = {
  title: string;
  blurb: string;
};

export const comingSoon: ComingSoonCategory[] = [
  {
    title: "Joint Task Force Investigations",
    blurb:
      "Cross-functional pattern recognition across legal, financial, and operational diligence streams.",
  },
  {
    title: "Cross-Examination",
    blurb:
      "Hold your position under pressure as opposing counsel tests the diligence record.",
  },
  {
    title: "Resource Deployment",
    blurb:
      "Allocate scarce diligence hours under deadline. What gets the read, what gets the skim.",
  },
  {
    title: "Reading the Room",
    blurb:
      "Stakeholder signals — board, MD, seller, GC. Knowing whose pressure is real.",
  },
];
