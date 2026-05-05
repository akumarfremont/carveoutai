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

export default function ResearchPage() {
  const [question, setQuestion] = useState("");
  const [submittedQuestion, setSubmittedQuestion] = useState<string | null>(
    null
  );
  const [answer, setAnswer] = useState("");
  const [citations, setCitations] = useState<Citation[]>([]);
  const [streaming, setStreaming] = useState(false);
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
    setAnswer("");
    setCitations([]);
    setVerifyText("");
    setVerifyError(null);
    setStreaming(true);
    setSubmittedQuestion(q);

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
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
        setAnswer(buf);
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError((e as Error).message);
      }
    } finally {
      setStreaming(false);
    }
  }, [streaming]);

  const verify = useCallback(async () => {
    if (!submittedQuestion || !answer || verifyStreaming) return;
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
          answer,
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
  }, [answer, citations, submittedQuestion, verifyStreaming]);

  const idle = !submittedQuestion;

  return (
    <div className="mx-auto max-w-3xl">
      {idle ? (
        <header className="pt-6">
          <p className="font-sans text-[12px] uppercase tracking-[0.18em] text-muted">
            Research
          </p>
          <h1 className="mt-3 font-serif text-[34px] font-semibold leading-tight text-ink">
            Ask a carve-out question.
          </h1>
          <p className="mt-3 font-serif text-[16.5px] leading-relaxed text-ink/75">
            The answer is drawn from EY, KPMG, PwC, and Deloitte carve-out guides. Citations link to the firm and page.
          </p>
        </header>
      ) : (
        <header className="pt-6">
          <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-muted">
            Question
          </p>
          <h1 className="mt-2 font-serif text-[24px] font-semibold leading-tight text-ink">
            {submittedQuestion}
          </h1>
        </header>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(question);
        }}
        className="mt-7"
      >
        <div className="flex items-stretch gap-2 rounded border hairline bg-paper p-1.5 focus-within:border-ink/50">
          <textarea
            rows={1}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(question);
              }
            }}
            placeholder="e.g. How should goodwill be allocated to a carve-out entity?"
            className="flex-1 resize-none bg-transparent px-3 py-3 font-sans text-[15px] text-ink placeholder:text-muted/80 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!question.trim() || streaming}
            className="self-stretch rounded bg-ink px-5 font-sans text-[13px] font-semibold uppercase tracking-wider text-paper transition hover:bg-accent disabled:cursor-not-allowed disabled:bg-muted/40"
          >
            {streaming ? "Researching…" : "Ask"}
          </button>
        </div>
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

      {(answer || streaming) && (
        <article className="relative mt-12 rounded border hairline bg-white px-8 py-8 shadow-[0_1px_2px_rgba(15,15,14,0.04)]">
          <div className="absolute right-5 top-5">
            <button
              type="button"
              onClick={verify}
              disabled={!answer || streaming || verifyStreaming}
              className="rounded border hairline bg-paper px-3 py-1.5 font-sans text-[11.5px] font-semibold uppercase tracking-wider text-accent transition hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-40"
              title="Have GPT-4o independently critique this answer"
            >
              {verifyStreaming ? "Verifying…" : "Verify with ChatGPT"}
            </button>
          </div>
          <p className="font-sans text-[10.5px] uppercase tracking-[0.18em] text-muted">
            Answer · Claude
          </p>
          <div className="mt-4">
            <RenderedAnswer text={answer} streaming={streaming} />
          </div>
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
