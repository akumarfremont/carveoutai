"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getCase } from "@/lib/cases";
import { usePlayer } from "@/lib/store";
import CasePlayer from "@/components/CasePlayer";

type Params = Promise<{ id: string }>;

export default function CaseRoute({ params }: { params: Params }) {
  const { id } = use(params);
  const numericId = Number.parseInt(id, 10);
  const caseData = Number.isFinite(numericId) ? getCase(numericId) : undefined;
  const router = useRouter();
  const player = usePlayer();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Bounce to splash if not signed in.
  useEffect(() => {
    if (!hydrated) return;
    if (!player) router.replace("/");
  }, [hydrated, player, router]);

  if (!caseData) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bone px-6 text-center">
        <div>
          <p className="tag text-graphite-dim">No File</p>
          <p className="mt-3 font-proc text-[18px] tracking-[0.06em] text-ink">
            That case isn't in the system.
          </p>
        </div>
      </main>
    );
  }

  if (caseData.status === "placeholder") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-bone px-6 text-center">
        <p className="tag text-graphite-dim">Case File Pending</p>
        <h1 className="mt-3 font-proc text-[22px] font-bold uppercase tracking-[0.04em] text-ink">
          {caseData.title}
        </h1>
        <p className="mt-3 font-serif text-[14px] italic leading-[1.55] text-graphite">
          Inspired by {caseData.inspired_by}
        </p>
        <p className="mt-6 max-w-[300px] font-serif text-[14.5px] leading-[1.55] text-graphite">
          Investigators are still preparing this file. Check back soon.
        </p>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="mt-8 flex h-12 items-center justify-center bg-ink px-6 font-mono text-[12px] font-semibold uppercase tracking-[0.22em] text-bone hover:bg-ink-soft"
        >
          Back to case board
        </button>
      </main>
    );
  }

  if (!hydrated || !player) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bone">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-graphite-dim">
          Pulling file…
        </p>
      </main>
    );
  }

  return <CasePlayer caseData={caseData} />;
}
