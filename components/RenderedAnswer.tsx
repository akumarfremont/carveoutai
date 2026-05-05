import React from "react";

// Renders an answer string and turns inline [1], [2,3] into superscript citation marks.
// Also handles **bold** and basic paragraph breaks. Intentionally minimal — we want
// editorial body text, not a markdown engine.
export function RenderedAnswer({
  text,
  streaming,
  variant = "editorial",
}: {
  text: string;
  streaming?: boolean;
  variant?: "editorial" | "compact";
}) {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const cls = variant === "compact" ? "prose-compact" : "prose-editorial";
  return (
    <div className={`${cls} ${streaming ? "streaming" : ""}`}>
      {paragraphs.map((p, i) => (
        <p key={i}>{renderInline(p)}</p>
      ))}
    </div>
  );
}

function renderInline(text: string): React.ReactNode[] {
  // First handle bold, then citations.
  const out: React.ReactNode[] = [];
  const boldSplit = text.split(/(\*\*[^*]+\*\*)/g);
  boldSplit.forEach((seg, i) => {
    if (seg.startsWith("**") && seg.endsWith("**")) {
      out.push(<strong key={`b${i}`}>{seg.slice(2, -2)}</strong>);
    } else {
      const citationSplit = seg.split(/(\[(?:\d+(?:\s*,\s*\d+)*)\])/g);
      citationSplit.forEach((sub, j) => {
        const m = sub.match(/^\[((?:\d+(?:\s*,\s*\d+)*))\]$/);
        if (m) {
          const nums = m[1].split(",").map((s) => s.trim());
          out.push(
            <sup key={`c${i}-${j}`} className="citation-mark">
              [{nums.join(",")}]
            </sup>
          );
        } else if (sub) {
          out.push(<React.Fragment key={`t${i}-${j}`}>{sub}</React.Fragment>);
        }
      });
    }
  });
  return out;
}
