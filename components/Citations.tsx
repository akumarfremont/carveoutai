import type { Citation } from "@/lib/types";

const FIRM_TINT: Record<string, string> = {
  EY: "text-[#FFD400] bg-ink",
  KPMG: "text-[#00338D] bg-[#E8EEF7]",
  PwC: "text-[#DC6900] bg-[#FCEFE3]",
  Deloitte: "text-[#86BC25] bg-[#F0F7E5]",
};

export function CitationList({ citations }: { citations: Citation[] }) {
  if (!citations || citations.length === 0) return null;
  return (
    <section className="mt-12 border-t hairline pt-7">
      <h3 className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
        Sources
      </h3>
      <ol className="mt-4 space-y-3">
        {citations.map((c) => (
          <li key={c.index} className="flex gap-3 font-sans text-[13.5px]">
            <span className="mt-[2px] inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent">
              {c.index}
            </span>
            <div className="flex-1">
              <div className="flex flex-wrap items-baseline gap-2">
                <span
                  className={`rounded px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider ${
                    FIRM_TINT[c.firm] ?? "bg-hairline text-ink"
                  }`}
                >
                  {c.firm}
                </span>
                <span className="font-medium text-ink">{c.title}</span>
                <span className="text-muted">p. {c.page}</span>
              </div>
              <p className="mt-1.5 font-serif text-[14px] leading-relaxed text-ink/70">
                {c.excerpt}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
