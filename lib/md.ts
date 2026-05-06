// Tiny renderer for case copy. Supports:
//   - Paragraphs (blank-line separated)
//   - **bold** spans
//   - "- " bullet lists
// Nothing else — case copy is hand-authored, no need for a real markdown lib.

import React from "react";

type InlineNode = string | { type: "strong"; children: string };

function parseInline(text: string): InlineNode[] {
  const out: InlineNode[] = [];
  let i = 0;
  const re = /\*\*([^*]+)\*\*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > i) out.push(text.slice(i, m.index));
    out.push({ type: "strong", children: m[1] });
    i = m.index + m[0].length;
  }
  if (i < text.length) out.push(text.slice(i));
  return out;
}

function renderInline(text: string, keyBase: string): React.ReactNode[] {
  return parseInline(text).map((n, idx) => {
    if (typeof n === "string") {
      return React.createElement(React.Fragment, { key: `${keyBase}-${idx}` }, n);
    }
    return React.createElement(
      "strong",
      { key: `${keyBase}-${idx}` },
      n.children,
    );
  });
}

type Block =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] };

function parseBlocks(src: string): Block[] {
  const blocks: Block[] = [];
  const paragraphs = src.replace(/\r\n/g, "\n").split(/\n{2,}/);
  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;
    const lines = trimmed.split("\n");
    const isList = lines.every((l) => /^\s*-\s+/.test(l));
    if (isList) {
      blocks.push({
        type: "ul",
        items: lines.map((l) => l.replace(/^\s*-\s+/, "")),
      });
    } else {
      // Collapse hard wraps within a paragraph into spaces
      blocks.push({ type: "p", text: lines.join(" ") });
    }
  }
  return blocks;
}

export function renderProse(src: string): React.ReactNode {
  const blocks = parseBlocks(src);
  return blocks.map((b, i) => {
    if (b.type === "p") {
      return React.createElement(
        "p",
        { key: `b-${i}` },
        renderInline(b.text, `b-${i}`),
      );
    }
    return React.createElement(
      "ul",
      { key: `b-${i}` },
      b.items.map((it, j) =>
        React.createElement(
          "li",
          { key: `b-${i}-${j}` },
          renderInline(it, `b-${i}-${j}`),
        ),
      ),
    );
  });
}
