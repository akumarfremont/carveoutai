"use client";

import { useState, useCallback } from "react";
import { RenderedAnswer } from "@/components/RenderedAnswer";
import type { Citation, PersonaId } from "@/lib/types";

interface PersonaMeta {
  id: PersonaId;
  name: string;
  role: string;
  byline: string;
  initials: string;
}

const PERSONAS: PersonaMeta[] = [
  {
    id: "sec_reviewer",
    name: "SEC Reviewer",
    role: "Division of Corporation Finance",
    byline: "Tests presentation, materiality, and disclosure against Reg S-X.",
    initials: "SR",
  },
  {
    id: "external_auditor",
    name: "External Auditor",
    role: "Audit partner — engagement",
    byline: "Applies PCAOB AS and US GAAP; demands documented judgment.",
    initials: "EA",
  },
  {
    id: "preparer",
    name: "Carve-out Preparer",
    role: "Sell-side finance lead",
    byline: "Pragmatic; balances rigor with data availability and timing.",
    initials: "CP",
  },
];

interface Turn {
  id: string;
  speaker: PersonaId;
  role: "opening" | "rebuttal" | "synthesis";
  text: string;
  streaming: boolean;
  citations: Citation[];
}

const TURN_PLAN: { speaker: 0 | 1; role: Turn["role"] }[] = [
  { speaker: 0, role: "opening" },
  { speaker: 1, role: "opening" },
  { speaker: 0, role: "rebuttal" },
  { speaker: 1, role: "rebuttal" },
  { speaker: 0, role: "synthesis" },
];

export default function DebatePage() {
  const [topic, setTopic] = useState("");
  const [picked, setPicked] = useState<PersonaId[]>([]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allCitations, setAllCitations] = useState<Citation[]>([]);

  const togglePersona = (id: PersonaId) => {
    setPicked((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const start = useCallback(async () => {
    if (running || picked.length !== 2 || !topic.trim()) return;
    setRunning(true);
    setError(null);
    setTurns([]);
    setAllCitations([]);
    const speakers = picked;
    const completed: Turn[] = [];

    try {
      for (const step of TURN_PLAN) {
        const speaker = speakers[step.speaker];
        const opponent = speakers[1 - step.speaker];
        const turn: Turn = {
          id: `${speaker}-${step.role}-${completed.length}`,
          speaker,
          role: step.role,
          text: "",
          streaming: true,
          citations: [],
        };
        setTurns([...completed, turn]);

        const res = await fetch("/api/debate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic,
            speaker,
            opponent,
            role: step.role,
            prior: completed.map((t) => ({
              speaker: PERSONAS.find((p) => p.id === t.speaker)!.name,
              text: t.text,
            })),
          }),
        });
        if (!res.ok || !res.body) {
          const msg = await res.text().catch(() => "");
          throw new Error(msg || `Turn failed (${res.status})`);
        }
        const cHeader = res.headers.get("X-Citations");
        if (cHeader) {
          try {
            turn.citations = JSON.parse(atob(cHeader)) as Citation[];
          } catch {
            // ignore
          }
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          turn.text = buf;
          setTurns([...completed, { ...turn }]);
        }
        turn.streaming = false;
        completed.push({ ...turn });
        setTurns([...completed]);
      }

      // Merge all citations from the rounds (dedup by firm+title+page)
      const seen = new Set<string>();
      const merged: Citation[] = [];
      let idx = 1;
      for (const t of completed) {
        for (const c of t.citations) {
          const key = `${c.firm}|${c.title}|${c.page}`;
          if (seen.has(key)) continue;
          seen.add(key);
          merged.push({ ...c, index: idx++ });
        }
      }
      setAllCitations(merged);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  }, [picked, running, topic]);

  const reset = () => {
    setTurns([]);
    setAllCitations([]);
    setError(null);
  };

  const inSetup = turns.length === 0;

  const speakerA = picked[0];
  const speakerB = picked[1];
  const findTurn = (
    sp: PersonaId | undefined,
    role: Turn["role"]
  ): Turn | undefined =>
    sp ? turns.find((t) => t.speaker === sp && t.role === role) : undefined;

  return (
    <div className="mx-auto max-w-5xl">
      <header className="pt-6">
        <p className="font-sans text-[12px] uppercase tracking-[0.18em] text-muted">
          Debate
        </p>
        <h1 className="mt-3 font-serif text-[34px] font-semibold leading-tight text-ink">
          Two voices, one carve-out question.
        </h1>
        <p className="mt-3 max-w-2xl font-serif text-[16.5px] leading-relaxed text-ink/75">
          Choose two participants and a topic. Each opens, rebuts the other, and the first speaker closes with a synthesis — five short turns, every claim grounded in the Big 4 guides.
        </p>
      </header>

      {inSetup ? (
        <Setup
          topic={topic}
          setTopic={setTopic}
          picked={picked}
          togglePersona={togglePersona}
          start={start}
          running={running}
        />
      ) : (
        <div className="mt-10">
          <div className="mb-6 flex items-baseline justify-between border-b hairline pb-4">
            <div>
              <p className="font-sans text-[10.5px] uppercase tracking-[0.18em] text-muted">
                Topic
              </p>
              <p className="mt-1 font-serif text-[18px] text-ink">{topic}</p>
            </div>
            <button
              type="button"
              onClick={reset}
              disabled={running}
              className="font-sans text-[12px] uppercase tracking-wider text-muted transition hover:text-ink disabled:opacity-40"
            >
              ← New debate
            </button>
          </div>
          <div className="grid gap-px overflow-hidden rounded border hairline bg-hairline md:grid-cols-2">
            <PersonaHeaderCard personaId={speakerA} side="left" />
            <PersonaHeaderCard personaId={speakerB} side="right" />

            <PhaseCell turn={findTurn(speakerA, "opening")} label="Opening" />
            <PhaseCell turn={findTurn(speakerB, "opening")} label="Opening" />

            <PhaseCell turn={findTurn(speakerA, "rebuttal")} label="Rebuttal" />
            <PhaseCell turn={findTurn(speakerB, "rebuttal")} label="Rebuttal" />
          </div>

          {findTurn(speakerA, "synthesis") && (
            <div className="mt-6 rounded border hairline bg-white px-7 py-6">
              <div className="flex items-baseline gap-3 border-b hairline pb-3">
                <span className="font-sans text-[10.5px] uppercase tracking-[0.18em] text-accent">
                  Joint synthesis
                </span>
                <span className="font-sans text-[11.5px] text-muted">
                  by {speakerA && PERSONAS.find((p) => p.id === speakerA)?.name}
                </span>
              </div>
              <div className="mt-4">
                <RenderedAnswer
                  text={findTurn(speakerA, "synthesis")!.text}
                  streaming={findTurn(speakerA, "synthesis")!.streaming}
                  variant="compact"
                />
              </div>
            </div>
          )}
          {!running && allCitations.length > 0 && (
            <section className="mt-14 border-t hairline pt-7">
              <h3 className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                Sources cited across the debate
              </h3>
              <ol className="mt-4 space-y-2 font-sans text-[13.5px]">
                {allCitations.map((c) => (
                  <li key={`${c.firm}-${c.page}-${c.index}`} className="flex gap-3">
                    <span className="text-muted">[{c.index}]</span>
                    <span>
                      <span className="font-semibold text-ink">{c.firm}</span>{" "}
                      — {c.title}, p. {c.page}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          )}
          {error && (
            <p className="mt-6 rounded border hairline bg-paper px-4 py-3 font-sans text-[14px] text-red-700">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Setup({
  topic,
  setTopic,
  picked,
  togglePersona,
  start,
  running,
}: {
  topic: string;
  setTopic: (s: string) => void;
  picked: PersonaId[];
  togglePersona: (id: PersonaId) => void;
  start: () => void;
  running: boolean;
}) {
  return (
    <div className="mt-10">
      <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
        1 · Topic
      </p>
      <textarea
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="e.g. Should shared corporate technology costs be allocated to the carve-out by headcount or by usage?"
        rows={2}
        className="mt-2 w-full resize-none rounded border hairline bg-paper p-3 font-serif text-[16px] leading-relaxed text-ink placeholder:text-muted/80 focus:border-ink/50 focus:outline-none"
      />

      <p className="mt-9 font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
        2 · Pick two voices ({picked.length}/2)
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {PERSONAS.map((p) => {
          const selected = picked.includes(p.id);
          const order = picked.indexOf(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => togglePersona(p.id)}
              className={`group rounded border bg-paper p-5 text-left transition ${
                selected
                  ? "border-accent shadow-[0_0_0_1px_#1F3A5F]"
                  : "hairline hover:border-ink/40"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full font-sans text-[12px] font-semibold ${
                    selected
                      ? "bg-accent text-paper"
                      : "bg-accent-soft text-accent"
                  }`}
                >
                  {p.initials}
                </span>
                <div>
                  <p className="font-serif text-[15.5px] font-semibold text-ink">
                    {p.name}
                  </p>
                  <p className="font-sans text-[11.5px] uppercase tracking-wider text-muted">
                    {p.role}
                  </p>
                </div>
                {selected && (
                  <span className="ml-auto font-sans text-[11px] font-semibold text-accent">
                    {order === 0 ? "OPENS" : "RESPONDS"}
                  </span>
                )}
              </div>
              <p className="mt-3 font-serif text-[13.5px] leading-relaxed text-ink/70">
                {p.byline}
              </p>
            </button>
          );
        })}
      </div>

      <div className="mt-9 flex justify-end">
        <button
          type="button"
          onClick={start}
          disabled={running || picked.length !== 2 || !topic.trim()}
          className="rounded bg-ink px-6 py-3 font-sans text-[13px] font-semibold uppercase tracking-wider text-paper transition hover:bg-accent disabled:cursor-not-allowed disabled:bg-muted/40"
        >
          {running ? "Debating…" : "Start debate"}
        </button>
      </div>
    </div>
  );
}

function PersonaHeaderCard({
  personaId,
  side,
}: {
  personaId: PersonaId | undefined;
  side: "left" | "right";
}) {
  const persona = personaId
    ? PERSONAS.find((p) => p.id === personaId)
    : undefined;
  return (
    <div
      className={`bg-white p-4 ${side === "left" ? "" : ""}`}
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent text-paper font-sans text-[12px] font-semibold">
          {persona?.initials ?? "?"}
        </span>
        <div>
          <p className="font-serif text-[15.5px] font-semibold text-ink">
            {persona?.name ?? "—"}
          </p>
          <p className="font-sans text-[10.5px] uppercase tracking-wider text-muted">
            {persona?.role ?? ""}
          </p>
        </div>
      </div>
    </div>
  );
}

function PhaseCell({
  turn,
  label,
}: {
  turn: Turn | undefined;
  label: string;
}) {
  return (
    <div className="bg-white p-5 min-h-[160px]">
      <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
        {label}
      </p>
      <div className="mt-2.5">
        {turn ? (
          <RenderedAnswer
            text={turn.text}
            streaming={turn.streaming}
            variant="compact"
          />
        ) : (
          <p className="font-sans text-[13px] italic text-muted">
            Waiting…
          </p>
        )}
      </div>
    </div>
  );
}
