"use client";

// 12-second cold open. Black ground, white serif text, deep voiceover, dun-dun,
// title card. Audio comes from /audio/voiceover.mp3 and /audio/dun-dun.mp3.
// If those files aren't present (or autoplay is blocked) the visual timing
// runs anyway — the show goes on.

import { useEffect, useRef, useState } from "react";

type Phase =
  | "primer" // initial fade-in, "press to begin" (only if user gesture not given)
  | "v1" // line 1
  | "v2" // line 2
  | "v3" // line 3
  | "dunDun" // dun-dun white flash
  | "title" // SDU title card
  | "fadeOut";

type Props = {
  /** Called once the cold open completes. */
  onDone: () => void;
  /** If true, skips the press-to-start gate and plays straight through (replay mode). */
  autoPlay?: boolean;
};

const LINE_1 =
  "In the M&A justice system, the analysis is done by machines.";
const LINE_2 =
  "But the judgment calls — the ones that close deals or sink them — are made by humans.";
const LINE_3 = "These are their cases.";

export default function ColdOpen({ onDone, autoPlay = false }: Props) {
  const [phase, setPhase] = useState<Phase>(autoPlay ? "v1" : "primer");
  const voiceRef = useRef<HTMLAudioElement | null>(null);
  const dunRef = useRef<HTMLAudioElement | null>(null);
  const startedRef = useRef(false);

  // Sequence timing (ms from the moment the user starts the open):
  //   0      -> v1 ("In the M&A justice system...")
  //   3500   -> v2 ("But the judgment calls...")
  //   8000   -> v3 ("These are their cases.")
  //   9500   -> dunDun
  //   10100  -> title
  //   11700  -> fadeOut
  //   12200  -> done
  useEffect(() => {
    if (phase === "primer") return;
    if (startedRef.current) return;
    startedRef.current = true;

    // Try to play the voiceover. If it fails (no file / autoplay block),
    // the visual sequence still runs — we just stay silent.
    const v = voiceRef.current;
    if (v) {
      v.currentTime = 0;
      v.play().catch(() => {
        /* swallow */
      });
    }

    const timers: number[] = [];
    timers.push(window.setTimeout(() => setPhase("v2"), 3500));
    timers.push(window.setTimeout(() => setPhase("v3"), 8000));
    timers.push(
      window.setTimeout(() => {
        setPhase("dunDun");
        const d = dunRef.current;
        if (d) {
          d.currentTime = 0;
          d.play().catch(() => {});
        }
      }, 9500),
    );
    timers.push(window.setTimeout(() => setPhase("title"), 10100));
    timers.push(window.setTimeout(() => setPhase("fadeOut"), 11700));
    timers.push(window.setTimeout(() => onDone(), 12200));

    return () => {
      for (const t of timers) window.clearTimeout(t);
      if (v) {
        v.pause();
      }
    };
  }, [phase, onDone]);

  function startSequence() {
    setPhase("v1");
  }

  // Visual: dun-dun is a quick brightening of the screen — no red flash, just
  // a brief warm white pulse.
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-ink text-bone transition-opacity duration-500 ${
        phase === "fadeOut" ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Audio elements (sources may 404; we handle that gracefully) */}
      <audio
        ref={voiceRef}
        src="/audio/voiceover.mp3"
        preload="auto"
        playsInline
      />
      <audio ref={dunRef} src="/audio/dun-dun.mp3" preload="auto" playsInline />

      {phase === "primer" ? (
        <button
          type="button"
          onClick={startSequence}
          className="group flex flex-col items-center gap-6 px-6 text-center"
        >
          <span className="font-proc text-[15px] tracking-proc text-bone/60">
            Press to begin
          </span>
          <span className="font-proc text-[28px] tracking-proc text-bone">
            COLD OPEN
          </span>
          <span className="mt-2 h-px w-12 bg-bone/30 transition-all group-active:w-20" />
        </button>
      ) : (
        <>
          <VOLine
            visible={phase === "v1"}
            text={LINE_1}
          />
          <VOLine
            visible={phase === "v2"}
            text={LINE_2}
          />
          <VOLine visible={phase === "v3"} text={LINE_3} />
          {/* dun-dun white pulse */}
          <div
            className={`pointer-events-none absolute inset-0 bg-bone transition-opacity duration-150 ${
              phase === "dunDun" ? "opacity-100" : "opacity-0"
            }`}
            aria-hidden="true"
          />
          {(phase === "title" || phase === "fadeOut") && (
            <div className="flex flex-col items-center gap-3 px-6 text-center animate-titleZoom">
              <div className="font-proc text-[64px] font-bold tracking-proc leading-none text-bone">
                SDU
              </div>
              <div className="font-proc text-[14px] italic tracking-[0.22em] text-bone/80">
                Sharp Diligence Unit
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function VOLine({ visible, text }: { visible: boolean; text: string }) {
  return (
    <p
      className={`absolute max-w-[320px] px-6 text-center font-proc text-[19px] leading-[1.55] tracking-[0.04em] text-bone transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {text}
    </p>
  );
}
