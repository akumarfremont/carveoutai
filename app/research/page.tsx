"use client";

import { useState, useRef, useCallback } from "react";
import { CitationList } from "@/components/Citations";
import { RenderedAnswer } from "@/components/RenderedAnswer";
import { VerificationPanel } from "@/components/VerificationPanel";
import type { Citation } from "@/lib/types";

const SUGGESTED = [
  "How should corporate overhead be allocated to a carve-out entity when no direct cost driver exists?",
  "What are the differences between EY and KPMG on income tax allocation in carve-out financial statements?",
  "When is a carve-out entity required to present three years of audited financials versus two?",
];

const FIRMS = ["All", "EY", "KPMG", "PwC", "Deloitte"] as const;
type FirmChoice = (typeof FIRMS)[number];

export default function ResearchPage() {
  const [question, setQuestion] = useState("");
  const [firm, setFirm] = useState<FirmChoice>("All");
  const [submittedQuestion, setSubmittedQuestion] = useState<string | null>(
    null
  );
  const [summary, setSummary] = useState("");
  const [fullAnswer, setFullAnswer] = useState("");
  const [citations, setCitations] = useState<Citation[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [expanding, setExpanding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyText, setVerifyText] = useState("");
  const [verifyStreaming, setVerifyStreaming] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const submit = useCallback(async (q: string) => {
    if (!q.trim() || streaming) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setError(null);
    setSummary("");
    setFullAnswer("");
    setCitations([]);
    setVerifyText("");
    setVerifyError(null);
    setStreaming(true);
    setSubmittedQuestion(q);

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, firm, mode: "summary" }),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || `Request failed (${res.status})`);
      }
      const cHeader = res.headers.get("X-Citations");
      if (cHeader) {
        try {
          const decoded = JSON.parse(atob(cHeader)) as Citation[];
          setCitations(decoded);
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
        setSummary(buf);
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError((e as Error).message);
      }
    } finally {
      setStreaming(false);
    }
  }, [firm, streaming]);

  const expand = useCallback(async () => {
    if (!submittedQuestion || expanding || streaming) return;
    setError(null);
    setFullAnswer("");
    setExpanding(true);
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: submittedQuestion,
          firm,
          mode: "full",
        }),
      });
      if (!res.ok || !res.body) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || `Request failed (${res.status})`);
      }
      const cHeader = res.headers.get("X-Citations");
      if (cHeader) {
        try {
          const decoded = JSON.parse(atob(cHeader)) as Citation[];
          setCitations(decoded);
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
        setFullAnswer(buf);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setExpanding(false);
    }
  }, [expanding, firm, streaming, submittedQuestion]);

  const verify = useCallback(async () => {
    const textToVerify = fullAnswer || summary;
    if (!submittedQuestion || !textToVerify || verifyStreaming) return;
    setVerifyOpen(true);
    setVerifyText("");
    setVerifyError(null);
    setVerifyStreaming(true);
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: submittedQuestion,
          answer: textToVerify,
          citations,
        }),
      });
      if (!res.ok || !res.body) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || `Verification failed (${res.status})`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        setVerifyText(buf);
      }
    } catch (e) {
      setVerifyError((e as Error).message);
    } finally {
      setVerifyStreaming(false);
    }
  }, [citations, fullAnswer, submittedQuestion, summary, verifyStreaming]);

  const idle = !submittedQuestion;

  return (
    <div className="mx-auto max-w-3xl">
      {idle ? (
        <header className="pt-2 sm:pt-6">
          <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-muted sm:text-[12px]">
            Research
          </p>
          <h1 className="mt-2 font-serif text-[26px] font-semibold leading-tight text-ink sm:mt-3 sm:text-[34px]">
            Ask a carve-out question.
          </h1>
          <p className="mt-2.5 font-serif text-[15px] leading-relaxed text-ink/75 sm:mt-3 sm:text-[16.5px]">
            The answer is drawn from EY, KPMG, PwC, and Deloitte carve-out guides. Citations link to the firm and page.
          </p>
        </header>
      ) : (
        <header className="pt-2 sm:pt-6">
          <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-muted">
            Question
          </p>
          <h1 className="mt-2 font-serif text-[19px] font-semibold leading-snug text-ink sm:text-[24px] sm:leading-tight">
            {submittedQuestion}
          </h1>
        </header>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(question);
        }}
        className="mt-5 sm:mt-7"
      >
        <div className="rounded border hairline bg-paper p-1.5 focus-within:border-ink/50">
          <textarea
            rows={2}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(question);
              }
            }}
            placeholder="e.g. How should goodwill be allocated to a carve-out entity?"
            className="w-full resize-none bg-transparent px-3 py-2.5 font-sans text-[15px] text-ink placeholder:text-muted/80 focus:outline-none sm:py-3"
          />
          <div className="mt-1.5 flex items-stretch gap-2 border-t hairline pt-1.5">
            <div className="relative flex-1 sm:flex-initial">
              <select
                value={firm}
                onChange={(e) => setFirm(e.target.value as FirmChoice)}
                disabled={streaming}
                aria-label="Filter sources by firm"
                className="h-full w-full appearance-none rounded border hairline bg-paper px-3 pr-7 py-2 font-sans text-[13px] text-ink transition hover:border-ink/40 focus:border-ink/50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              >
                {FIRMS.map((f) => (
                  <option key={f} value={f}>
                    {f === "All" ? "All firms" : f}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted">
                ▾
              </span>
            </div>
            <button
              type="submit"
              disabled={!question.trim() || streaming}
              className="flex-1 rounded bg-ink px-5 py-2 font-sans text-[13px] font-semibold uppercase tracking-wider text-paper transition hover:bg-accent disabled:cursor-not-allowed disabled:bg-muted/40 sm:flex-initial"
            >
              {streaming ? "Researching…" : "Ask"}
            </button>
          </div>
        </div>
        <p className="mt-2 font-sans text-[11.5px] text-muted">
          {firm === "All"
            ? "Searching all four Big 4 guides."
            : `Searching ${firm} only.`}
        </p>
        {idle && (
          <div className="mt-4 flex flex-wrap gap-2">
            {SUGGESTED.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setQuestion(s);
                  submit(s);
                }}
                className="rounded-full border hairline bg-paper px-3 py-1.5 text-left font-sans text-[12.5px] text-muted transition hover:border-ink/40 hover:text-ink"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </form>

      {error && (
        <p className="mt-8 rounded border hairline bg-paper px-4 py-3 font-sans text-[14px] text-red-700">
          {error}
        </p>
      )}

      {(summary || streaming) && (
        <article className="relative mt-8 rounded border hairline bg-white px-5 py-6 shadow-[0_1px_2px_rgba(15,15,14,0.04)] sm:mt-12 sm:px-8 sm:py-8">
          <div className="mb-4 flex items-baseline justify-between gap-3 sm:mb-0 sm:absolute sm:right-5 sm:top-5">
            <p className="font-sans text-[10.5px] uppercase tracking-[0.18em] text-muted sm:hidden">
              Summary · Claude
            </p>
            <button
              type="button"
              onClick={verify}
              disabled={
                (!summary && !fullAnswer) ||
                streaming ||
                expanding ||
                verifyStreaming
              }
              className="rounded border hairline bg-paper px-3 py-1.5 font-sans text-[11px] font-semibold uppercase tracking-wider text-accent transition hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-40 sm:text-[11.5px]"
              title="Have GPT-4o independently critique this answer"
            >
              {verifyStreaming ? "Verifying…" : "Verify with ChatGPT"}
            </button>
          </div>
          <p className="hidden font-sans text-[10.5px] uppercase tracking-[0.18em] text-muted sm:block">
            Summary · Claude
          </p>
          <div className="mt-3 sm:mt-4">
            <RenderedAnswer text={summary} streaming={streaming} />
          </div>

          {!streaming && summary && !fullAnswer && !expanding && (
            <div className="mt-6 border-t hairline pt-5">
              <button
                type="button"
                onClick={expand}
                className="rounded border hairline bg-paper px-4 py-2 font-sans text-[12px] font-semibold uppercase tracking-wider text-accent transition hover:bg-accent-soft"
              >
                Expand for detailed analysis →
              </button>
              <p className="mt-2 font-sans text-[11.5px] text-muted">
                Generates a longer, fully-cited response. Uses more tokens.
              </p>
            </div>
          )}

          {(expanding || fullAnswer) && (
            <div className="mt-8 border-t hairline pt-6">
              <p className="font-sans text-[10.5px] uppercase tracking-[0.18em] text-muted">
                Detailed analysis
              </p>
              <div className="mt-4">
                <RenderedAnswer text={fullAnswer} streaming={expanding} />
              </div>
            </div>
          )}

          <CitationList citations={citations} />
        </article>
      )}

      <VerificationPanel
        open={verifyOpen}
        onClose={() => setVerifyOpen(false)}
        text={verifyText}
        streaming={verifyStreaming}
        error={verifyError}
      />
    </div>
  );
}
