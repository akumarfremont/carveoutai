"use client";

import { useEffect } from "react";

export function VerificationPanel({
  open,
  onClose,
  text,
  streaming,
  error,
}: {
  open: boolean;
  onClose: () => void;
  text: string;
  streaming: boolean;
  error: string | null;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-ink/15 transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        aria-label="Verification by GPT-4o"
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-[480px] border-l hairline bg-paper transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-baseline justify-between border-b hairline px-6 py-5">
          <div>
            <p className="font-sans text-[10.5px] font-semibold uppercase tracking-[0.18em] text-muted">
              Independent verification
            </p>
            <h3 className="font-serif text-[20px] font-semibold text-ink">
              GPT-4o critique
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="font-sans text-[13px] text-muted transition hover:text-ink"
          >
            Close
          </button>
        </div>
        <div className="h-[calc(100%-4.5rem)] overflow-y-auto px-6 py-6">
          {error ? (
            <p className="font-sans text-[14px] text-red-700">{error}</p>
          ) : text || streaming ? (
            <VerificationBody text={text} streaming={streaming} />
          ) : (
            <p className="font-sans text-[14px] text-muted">
              Click the verify button to start.
            </p>
          )}
        </div>
      </aside>
    </>
  );
}

function VerificationBody({
  text,
  streaming,
}: {
  text: string;
  streaming: boolean;
}) {
  const sections = parseSections(text);
  if (sections.length === 0) {
    return (
      <pre
        className={`whitespace-pre-wrap font-serif text-[15px] leading-relaxed text-ink ${
          streaming ? "streaming" : ""
        }`}
      >
        {text}
      </pre>
    );
  }
  return (
    <div className="space-y-7">
      {sections.map((s, i) => (
        <section key={i}>
          <h4 className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
            {s.heading}
          </h4>
          <div
            className={`mt-2 font-serif text-[15px] leading-relaxed text-ink/90 ${
              streaming && i === sections.length - 1 ? "streaming" : ""
            }`}
          >
            {s.body.split(/\n+/).map((line, j) => (
              <p key={j} className="mb-2 last:mb-0">
                {line.replace(/^\s*-\s*/, "• ")}
              </p>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

const SECTION_HEADINGS = ["AGREES WITH", "DISAGREES WITH", "ADDS", "CAVEATS"];
function parseSections(text: string) {
  const out: { heading: string; body: string }[] = [];
  const re = new RegExp(`(^|\\n)(${SECTION_HEADINGS.join("|")}):?`, "g");
  const matches = [...text.matchAll(re)];
  if (matches.length === 0) return out;
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const start = (m.index ?? 0) + m[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    out.push({
      heading: m[2],
      body: text.slice(start, end).trim(),
    });
  }
  return out;
}
