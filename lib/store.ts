// Player state. v1 ships with no backend; localStorage is the source of truth.
// One attempt per case per player, ever — the case route enforces this by
// redirecting to the dashboard if an attempt already exists.

"use client";

import { useEffect, useState, useCallback, useSyncExternalStore } from "react";

const KEY = "sdu.player.v1";

export type StageDecision = {
  choice: "A" | "B" | "C" | "D";
  confidence: number; // 50..99
  correct: boolean; // matched correct_answer
  defensible: boolean; // in defensible_answers
};

export type Attempt = {
  case_id: number;
  stage_one: StageDecision;
  stage_two?: StageDecision;
  completed_at: string; // ISO
};

export type Player = {
  handle: string;
  signed_up_at: string; // ISO
  has_seen_cold_open: boolean;
  attempts: Attempt[];
};

const STATE: { player: Player | null } = { player: null };
const listeners = new Set<() => void>();

function notify() {
  for (const fn of listeners) fn();
}

function read(): Player | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Player;
  } catch {
    return null;
  }
}

function write(p: Player | null) {
  if (typeof window === "undefined") return;
  if (p) window.localStorage.setItem(KEY, JSON.stringify(p));
  else window.localStorage.removeItem(KEY);
  STATE.player = p;
  notify();
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function getSnapshot(): Player | null {
  return STATE.player;
}

function getServerSnapshot(): Player | null {
  return null;
}

let initialized = false;
function ensureInit() {
  if (initialized) return;
  initialized = true;
  STATE.player = read();
  // Cross-tab sync
  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (e.key === KEY) {
        STATE.player = read();
        notify();
      }
    });
  }
}

export function usePlayer() {
  ensureInit();
  // Avoid hydration flash: render null on the server, hydrate from storage on client.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const player = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return hydrated ? player : null;
}

export function getPlayer(): Player | null {
  ensureInit();
  return STATE.player;
}

export function enterAsNew(handle = "rookie"): Player {
  const player: Player = {
    handle: handle.trim().replace(/^@/, "") || "rookie",
    signed_up_at: new Date().toISOString(),
    has_seen_cold_open: false,
    attempts: [],
  };
  write(player);
  return player;
}

export function setHandle(handle: string) {
  const p = getPlayer();
  if (!p) return;
  const cleaned = handle.trim().replace(/^@/, "");
  if (!cleaned) return;
  write({ ...p, handle: cleaned });
}

export function markColdOpenSeen() {
  const p = getPlayer();
  if (!p) return;
  if (p.has_seen_cold_open) return;
  write({ ...p, has_seen_cold_open: true });
}

export function recordStageOne(
  caseId: number,
  decision: StageDecision,
): Attempt {
  const p = getPlayer();
  if (!p) throw new Error("No player");
  // First attempt only — once recorded, stage 1 is locked.
  const existing = p.attempts.find((a) => a.case_id === caseId);
  if (existing) return existing;
  const attempt: Attempt = {
    case_id: caseId,
    stage_one: decision,
    completed_at: new Date().toISOString(),
  };
  write({ ...p, attempts: [...p.attempts, attempt] });
  return attempt;
}

export function recordStageTwo(
  caseId: number,
  decision: StageDecision,
): Attempt {
  const p = getPlayer();
  if (!p) throw new Error("No player");
  const idx = p.attempts.findIndex((a) => a.case_id === caseId);
  if (idx === -1) throw new Error("Stage 1 attempt missing");
  const updated: Attempt = {
    ...p.attempts[idx],
    stage_two: decision,
    completed_at: new Date().toISOString(),
  };
  const attempts = [...p.attempts];
  attempts[idx] = updated;
  write({ ...p, attempts });
  return updated;
}

export function getAttempt(caseId: number): Attempt | undefined {
  const p = getPlayer();
  return p?.attempts.find((a) => a.case_id === caseId);
}

export function reset() {
  write(null);
}

// Test bypass: a demo player with two completed cases so the dashboard renders
// meaningfully. Triggered from the splash via a "Use demo account" link.
export function seedDemo(): Player {
  const player: Player = {
    handle: "vmehta",
    signed_up_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
    has_seen_cold_open: true,
    attempts: [
      {
        case_id: 1,
        stage_one: {
          choice: "C",
          confidence: 75,
          correct: true,
          defensible: true,
        },
        completed_at: new Date(
          Date.now() - 1000 * 60 * 60 * 24 * 3,
        ).toISOString(),
      },
      {
        case_id: 4,
        stage_one: {
          choice: "C",
          confidence: 65,
          correct: false,
          defensible: true,
        },
        stage_two: {
          choice: "D",
          confidence: 80,
          correct: true,
          defensible: true,
        },
        completed_at: new Date(
          Date.now() - 1000 * 60 * 60 * 24 * 1,
        ).toISOString(),
      },
    ],
  };
  write(player);
  return player;
}
