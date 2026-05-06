"use client";

// Replay the cold open from the dashboard menu.

import { useRouter } from "next/navigation";
import ColdOpen from "@/components/ColdOpen";

export default function IntroReplayPage() {
  const router = useRouter();
  return <ColdOpen autoPlay={false} onDone={() => router.replace("/dashboard")} />;
}
