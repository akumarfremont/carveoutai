"use client";

// Splash + signup. First-time players land here. After signing up the cold
// open plays once, then the user lands on /dashboard. Returning players are
// redirected straight through.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  usePlayer,
  signUp,
  markColdOpenSeen,
  seedDemo,
} from "@/lib/store";
import ColdOpen from "@/components/ColdOpen";

export default function SplashPage() {
  const router = useRouter();
  const player = usePlayer();
  const [phase, setPhase] = useState<"signup" | "coldOpen" | "redirect">(
    "signup",
  );
  const [email, setEmail] = useState("");
  const [handle, setHandle] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (player) {
      if (!player.has_seen_cold_open) {
        setPhase("coldOpen");
      } else {
        router.replace("/dashboard");
      }
    }
  }, [player, router]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmedEmail = email.trim();
    const trimmedHandle = handle.trim().replace(/^@/, "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Enter a valid email.");
      return;
    }
    if (!/^[a-zA-Z0-9_]{2,20}$/.test(trimmedHandle)) {
      setError("Handle: 2–20 characters, letters / numbers / underscore.");
      return;
    }
    signUp(trimmedEmail, trimmedHandle);
    setPhase("coldOpen");
  }

  function useDemo() {
    seedDemo();
    setPhase("redirect");
    router.replace("/dashboard");
  }

  if (phase === "coldOpen") {
    return (
      <ColdOpen
        onDone={() => {
          markColdOpenSeen();
          router.replace("/dashboard");
        }}
      />
    );
  }

  if (phase === "redirect") return null;

  return (
    <main className="min-h-screen bg-ink text-bone">
      <div className="mx-auto flex min-h-screen max-w-screen flex-col px-6 pb-10 pt-12">
        <header className="text-center">
          <p className="tag text-bone/50">A judgment training game</p>
          <h1 className="mt-5 font-proc text-[64px] font-bold leading-none tracking-proc">
            SDU
          </h1>
          <p className="mt-2 font-proc text-[13px] italic tracking-[0.22em] text-bone/80">
            Sharp Diligence Unit
          </p>
        </header>

        <div className="mt-12 border-t border-hairline-dim pt-8">
          <p className="font-serif text-[16px] leading-[1.6] text-bone/85">
            AI agents do most of the analytical work in M&amp;A diligence now —
            the models, the comps, the memos. They can't make the judgment
            calls.
          </p>
          <p className="mt-4 font-serif text-[16px] leading-[1.6] text-bone/85">
            That's the muscle SDU trains. Eight cases, every one inspired by a
            real failed transaction. The agent reads the room first. Your job
            is to decide whether to follow it or override it.
          </p>
        </div>

        <form onSubmit={submit} className="mt-10 flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="tag text-bone/60">Email</span>
            <input
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="you@firm.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 border border-hairline-dim bg-ink-soft px-3 font-sans text-[16px] text-bone placeholder:text-bone/30 focus:border-evidence focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="tag text-bone/60">Investigator handle</span>
            <div className="flex h-12 items-center border border-hairline-dim bg-ink-soft pl-3 focus-within:border-evidence">
              <span className="font-mono text-[16px] text-bone/40">@</span>
              <input
                type="text"
                autoCapitalize="none"
                autoComplete="off"
                placeholder="vmehta"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                className="ml-1 h-12 flex-1 bg-transparent font-mono text-[16px] text-bone placeholder:text-bone/30 focus:outline-none"
              />
            </div>
          </label>
          {error && (
            <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-evidence">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="mt-2 flex h-14 items-center justify-center bg-evidence font-mono text-[13px] font-semibold uppercase tracking-[0.22em] text-ink hover:bg-evidence/90 active:animate-tapPulse"
          >
            Begin first case
          </button>
        </form>

        <button
          type="button"
          onClick={useDemo}
          className="mt-6 self-center font-mono text-[11px] uppercase tracking-[0.22em] text-bone/40 underline-offset-4 hover:text-bone hover:underline"
        >
          Use demo account
        </button>

        <footer className="mt-auto pt-12 text-center font-proc text-[11px] italic tracking-[0.16em] text-bone/35">
          One attempt per case. No re-do.
        </footer>
      </div>
    </main>
  );
}
