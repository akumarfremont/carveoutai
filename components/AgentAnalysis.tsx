// Bordered card showing the AI diligence agent's recommendation.
// Visually distinct from the case file body — bone-soft panel, tagged header,
// hairline border, monospace-tinged metadata.

import { renderProse } from "@/lib/md";

export default function AgentAnalysis({ text }: { text: string }) {
  return (
    <section
      aria-label="Agent analysis"
      className="relative my-8 border border-hairline bg-bone-soft px-5 py-5"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="tag text-graphite">Agent Analysis</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-graphite-dim">
          DiligenceAgent v3.2
        </span>
      </div>
      <div className="prose-file text-[16px] leading-[1.7]">
        {renderProse(text)}
      </div>
      <p className="mt-4 border-t border-hairline pt-3 font-mono text-[10.5px] uppercase tracking-[0.16em] text-graphite-dim">
        Recommendation generated from data room contents only.
      </p>
    </section>
  );
}
