import Link from "next/link";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-3xl pt-4 sm:pt-10">
      <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-muted sm:text-[12px]">
        Carve-out Financial Statements
      </p>
      <h1 className="mt-3 font-serif text-[30px] font-semibold leading-[1.15] tracking-tight text-ink sm:text-[42px] sm:leading-[1.1]">
        Research and debate, grounded in the Big&nbsp;4 guides.
      </h1>
      <p className="mt-4 max-w-[60ch] font-serif text-[16px] leading-[1.65] text-ink/85 sm:mt-5 sm:text-[18px] sm:leading-[1.7]">
        Ask a carve-out accounting question in plain English and get a sourced answer drawn from the EY, KPMG, PwC, and Deloitte carve-out guides. Verify it with a second model. Or stage a debate between an SEC reviewer, an external auditor, and a sell-side preparer.
      </p>

      <div className="mt-8 grid gap-px overflow-hidden rounded border hairline bg-hairline sm:mt-12 sm:grid-cols-2">
        <Link
          href="/research"
          className="group block bg-paper p-5 transition hover:bg-accent-soft sm:p-7"
        >
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-[20px] font-semibold text-ink sm:text-[22px]">
              Research
            </h2>
            <span className="font-sans text-[11.5px] uppercase tracking-wider text-muted group-hover:text-accent sm:text-[12px]">
              Ask →
            </span>
          </div>
          <p className="mt-2 font-serif text-[14.5px] leading-relaxed text-ink/75 sm:mt-3 sm:text-[15px]">
            Natural-language questions, answered by Claude with inline citations. A "Verify with ChatGPT" panel critiques the answer on demand.
          </p>
        </Link>

        <Link
          href="/debate"
          className="group block bg-paper p-5 transition hover:bg-accent-soft sm:p-7"
        >
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-[20px] font-semibold text-ink sm:text-[22px]">
              Debate
            </h2>
            <span className="font-sans text-[11.5px] uppercase tracking-wider text-muted group-hover:text-accent sm:text-[12px]">
              Stage →
            </span>
          </div>
          <p className="mt-2 font-serif text-[14.5px] leading-relaxed text-ink/75 sm:mt-3 sm:text-[15px]">
            Pick two voices — SEC reviewer, external auditor, carve-out preparer — and watch them argue a question through five turns of opening, rebuttal, and synthesis.
          </p>
        </Link>
      </div>

      <p className="mt-10 font-sans text-[12.5px] leading-relaxed text-muted sm:mt-14 sm:text-[13px]">
        No login. No saved data. Each question is answered in real time from a static knowledge base of the four Big 4 carve-out guides.
      </p>
    </div>
  );
}
