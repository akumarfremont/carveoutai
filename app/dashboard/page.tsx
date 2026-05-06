"use client";

// The investigator's case board. Header (handle + metrics), active case,
// closed cases, locked cases, "Coming Soon" section. Mobile-first vertical
// layout.

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { usePlayer, reset } from "@/lib/store";
import { computeCalibration, computeOverride, verdict } from "@/lib/scoring";
import {
  cases,
  comingSoon,
  isCapstoneUnlocked,
  type Case,
} from "@/lib/cases";
import { cn } from "@/lib/cn";

export default function DashboardPage() {
  const player = usePlayer();
  const router = useRouter();

  // Hydration guard: useSyncExternalStore returns null on the server pass.
  // We only redirect-on-empty on the client tick after hydration.
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Allow a tick for hydration; if there's still no player, send to splash.
    const t = window.setTimeout(() => {
      const raw = window.localStorage.getItem("sdu.player.v1");
      if (!raw) router.replace("/");
    }, 50);
    return () => window.clearTimeout(t);
  }, [router]);

  if (!player) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bone">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-graphite-dim">
          Loading file…
        </p>
      </main>
    );
  }

  const cal = computeCalibration(player.attempts);
  const ovr = computeOverride(player.attempts);
  const completedIds = player.attempts.map((a) => a.case_id);
  const capstoneUnlocked = isCapstoneUnlocked(completedIds);

  const activeCases: Case[] = []; // v1: no in-flight tracking; one-shot per case
  const closedCases = cases.filter((c) => completedIds.includes(c.id));
  const availableCases = cases.filter(
    (c) => !completedIds.includes(c.id) && c.status === "available",
  );
  const lockedCases = cases.filter(
    (c) =>
      !completedIds.includes(c.id) &&
      c.status !== "available" &&
      !(c.status === "capstone" && capstoneUnlocked),
  );
  const unlockedCapstone = cases.find(
    (c) =>
      c.status === "capstone" &&
      capstoneUnlocked &&
      !completedIds.includes(c.id),
  );

  return (
    <main className="min-h-screen bg-bone">
      <div className="mx-auto max-w-screen px-5 pb-24 pt-7">
        {/* Header */}
        <div className="flex items-baseline justify-between">
          <div>
            <p className="tag text-graphite">Investigator</p>
            <p className="mt-1 font-mono text-[18px] text-ink">
              @{player.handle}
            </p>
          </div>
          <Link
            href="/intro"
            className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-graphite-dim hover:text-ink"
          >
            Replay cold open
          </Link>
        </div>

        {/* Metrics */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Metric
            label="Calibration"
            value={`${cal.score}`}
            unit=""
            footnote={
              cal.decisions === 0
                ? "No decisions yet"
                : `${cal.decisions} decision${cal.decisions === 1 ? "" : "s"} scored`
            }
          />
          <Metric
            label="Override rate"
            value={`${ovr.rate}%`}
            unit=""
            footnote={
              ovr.total_overrides === 0
                ? "No overrides yet"
                : `${ovr.accuracy}% accurate`
            }
            highlight
          />
        </div>

        {/* Case list — pick up where you left off */}
        {availableCases.length > 0 && (
          <Section title="Active File">
            {/* Show the next available case as the prominent active card */}
            <CaseCard
              caseData={availableCases[0]}
              variant="active"
            />
          </Section>
        )}

        {unlockedCapstone && (
          <Section title="Capstone Unlocked">
            <CaseCard caseData={unlockedCapstone} variant="capstone" />
          </Section>
        )}

        {availableCases.length > 1 && (
          <Section title="Up Next">
            <div className="flex flex-col gap-2">
              {availableCases.slice(1).map((c) => (
                <CaseCard
                  key={c.id}
                  caseData={c}
                  variant="upnext"
                />
              ))}
            </div>
          </Section>
        )}

        {closedCases.length > 0 && (
          <Section title="Closed Cases">
            <div className="flex flex-col gap-2">
              {closedCases.map((c) => {
                const a = player.attempts.find((x) => x.case_id === c.id)!;
                const v = verdict(
                  a.stage_one.choice,
                  c.stage_one.correct_answer,
                  c.stage_one.defensible_answers,
                );
                return (
                  <CaseCard
                    key={c.id}
                    caseData={c}
                    variant="closed"
                    closedVerdict={v}
                    confidence={a.stage_one.confidence}
                  />
                );
              })}
            </div>
          </Section>
        )}

        {lockedCases.length > 0 && (
          <Section title="Pending Files">
            <div className="flex flex-col gap-2">
              {lockedCases.map((c) => (
                <CaseCard key={c.id} caseData={c} variant="locked" />
              ))}
            </div>
          </Section>
        )}

        <ComingSoon />

        {activeCases.length === 0 && availableCases.length === 0 && (
          <p className="mt-10 text-center font-serif text-[14px] italic text-graphite">
            All available cases closed. New files arriving shortly.
          </p>
        )}

        {/* Footer: small reset button for testing */}
        <div className="mt-16 flex flex-col items-center gap-3 border-t border-hairline pt-6">
          <p className="font-proc text-[11px] italic tracking-[0.16em] text-graphite-dim">
            Sharp Diligence Unit · Season 1
          </p>
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  "Reset your investigator file? All attempts will be lost.",
                )
              ) {
                reset();
                router.replace("/");
              }
            }}
            className="font-mono text-[10px] uppercase tracking-[0.22em] text-graphite-dim hover:text-redaction"
          >
            Reset file
          </button>
        </div>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-9">
      <h2 className="tag mb-3 text-graphite">{title}</h2>
      {children}
    </section>
  );
}

function Metric({
  label,
  value,
  unit,
  footnote,
  highlight = false,
}: {
  label: string;
  value: string;
  unit?: string;
  footnote: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "border p-4",
        highlight
          ? "border-evidence bg-evidence/10"
          : "border-hairline bg-bone-soft",
      )}
    >
      <p className="tag text-graphite">{label}</p>
      <p className="mt-2 font-mono text-[28px] font-semibold tabular-nums leading-none text-ink">
        {value}
        {unit && (
          <span className="text-[16px] text-graphite-dim"> {unit}</span>
        )}
      </p>
      <p className="mt-2 font-serif text-[12px] italic leading-[1.4] text-graphite">
        {footnote}
      </p>
    </div>
  );
}

function CaseCard({
  caseData,
  variant,
  closedVerdict,
  confidence,
}: {
  caseData: Case;
  variant: "active" | "upnext" | "closed" | "locked" | "capstone";
  closedVerdict?: "correct" | "defensible" | "incorrect";
  confidence?: number;
}) {
  const isPlaceholder = caseData.status === "placeholder";
  const isLocked = variant === "locked";
  const disabled = isPlaceholder || (isLocked && variant === "locked");

  const body = (
    <div
      className={cn(
        "flex flex-col gap-1 border p-4 transition",
        variant === "active" &&
          "border-ink bg-ink text-bone hover:bg-ink-soft active:animate-tapPulse",
        variant === "capstone" &&
          "border-evidence bg-ink text-bone hover:bg-ink-soft active:animate-tapPulse",
        variant === "upnext" &&
          "border-hairline bg-bone hover:border-ink active:animate-tapPulse",
        variant === "closed" && "border-hairline bg-bone-soft",
        variant === "locked" && "cursor-not-allowed border-dashed border-hairline bg-bone-soft/50 text-graphite",
      )}
    >
      <div className="flex items-baseline justify-between">
        <span
          className={cn(
            "tag",
            variant === "active" || variant === "capstone"
              ? "text-bone/60"
              : "text-graphite",
          )}
        >
          Case No.&nbsp;{String(caseData.id).padStart(2, "0")}
        </span>
        <span
          className={cn(
            "font-mono text-[10px] uppercase tracking-[0.18em]",
            variant === "active" || variant === "capstone"
              ? "text-bone/50"
              : "text-graphite-dim",
          )}
        >
          {caseData.type === "two-stage" ? "Two-stage" : "Single-stage"}
          {variant === "capstone" ? " · Capstone" : ""}
        </span>
      </div>
      <h3
        className={cn(
          "mt-1 font-proc text-[19px] font-bold uppercase leading-[1.15] tracking-[0.04em]",
          variant === "active" || variant === "capstone"
            ? "text-bone"
            : variant === "locked"
              ? "text-graphite"
              : "text-ink",
        )}
      >
        {caseData.title}
      </h3>
      {variant === "closed" && closedVerdict && (
        <p
          className={cn(
            "mt-2 font-mono text-[11px] uppercase tracking-[0.18em]",
            closedVerdict === "incorrect"
              ? "text-redaction"
              : "text-ink",
          )}
        >
          {closedVerdict === "correct"
            ? "On the line"
            : closedVerdict === "defensible"
              ? "Defensible"
              : "Off the line"}{" "}
          · <span className="text-graphite-dim">at {confidence}%</span>
        </p>
      )}
      {variant === "locked" && (
        <p className="mt-2 font-serif text-[13px] italic leading-[1.45] text-graphite">
          Case file pending. Check back soon.
        </p>
      )}
      {(variant === "active" || variant === "upnext") && (
        <p
          className={cn(
            "mt-2 font-serif text-[13.5px] italic leading-[1.5]",
            variant === "active" ? "text-bone/75" : "text-graphite",
          )}
        >
          Inspired by {caseData.inspired_by}
        </p>
      )}
      {variant === "capstone" && (
        <p className="mt-2 font-serif text-[13.5px] italic leading-[1.5] text-evidence">
          The deposition awaits. Inspired by {caseData.inspired_by}
        </p>
      )}
    </div>
  );

  if (disabled) return body;
  return (
    <Link
      href={`/case/${caseData.id}`}
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-evidence"
    >
      {body}
    </Link>
  );
}

function ComingSoon() {
  return (
    <section className="mt-12 border-t border-hairline pt-7">
      <p className="tag text-graphite">Coming Soon to the Diligence Unit</p>
      <p className="mt-2 font-serif text-[14px] italic leading-[1.5] text-graphite">
        Future seasons of the show.
      </p>
      <div className="mt-5 grid grid-cols-1 gap-2">
        {comingSoon.map((c) => (
          <div
            key={c.title}
            className="border border-dashed border-hairline bg-bone-soft/40 p-4 opacity-70"
          >
            <p className="font-proc text-[14px] font-bold uppercase tracking-[0.06em] text-graphite">
              {c.title}
            </p>
            <p className="mt-1 font-serif text-[13.5px] leading-[1.5] text-graphite">
              {c.blurb}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
