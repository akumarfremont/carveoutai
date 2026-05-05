import Link from "next/link";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-3xl pt-10">
      <p className="font-sans text-[12px] uppercase tracking-[0.18em] text-muted">
        Carve-out Financial Statements
      </p>
      <h1 className="mt-3 font-serif text-[42px] font-semibold leading-[1.1] tracking-tight text-ink">
        Research and debate, grounded in the Big&nbsp;4 guides.
      </h1>
      <p className="mt-5 max-w-[60ch] font-serif text-[18px] leading-[1.7] text-ink/85">
        Ask a carve-out accounting question in plain English and get a sourced answer drawn from the EY, KPMG, PwC, and Deloitte carve-out guides. Verify it with a second model. Or stage a debate between an SEC reviewer, an external auditor, and a sell-side preparer.
      </p>

      <div className="mt-12 grid gap-px overflow-hidden rounded border hairline bg-hairline sm:grid-cols-2">
        <Link
          href="/research"
          className="group block bg-paper p-7 transition hover:bg-accent-soft"
        >
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-[22px] font-semibold text-ink">
              Research
            </h2>
            <span className="font-sans text-[12px] uppercase tracking-wider text-muted group-hover:text-accent">
              Ask →
            </span>
          </div>
          <p className="mt-3 font-serif text-[15px] leading-relaxed text-ink/75">
            Natural-language questions, answered by Claude with inline citations. A "Verify with ChatGPT" panel critiques the answer on demand.
          </p>
        </Link>

        <Link
          href="/debate"
          className="group block bg-paper p-7 transition hover:bg-accent-soft"
        >
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-[22px] font-semibold text-ink">
              Debate
            </h2>
            <span className="font-sans text-[12px] uppercase tracking-wider text-muted group-hover:text-accent">
              Stage →
            </span>
          </div>
          <p className="mt-3 font-serif text-[15px] leading-relaxed text-ink/75">
            Pick two voices — SEC reviewer, external auditor, carve-out preparer — and watch them argue a question through five turns of opening, rebuttal, and synthesis.
          </p>
        </Link>
      </div>

      <p className="mt-14 font-sans text-[13px] leading-relaxed text-muted">
        No login. No saved data. Each question is answered in real time from a static knowledge base of the four Big 4 carve-out guides.
      </p>
    </div>
  );
}
