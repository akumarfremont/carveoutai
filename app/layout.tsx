import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const serif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "CarveoutAI",
  description:
    "Carve-out financial statements research, grounded in the Big 4 guides.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body>
        <header className="border-b hairline">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link
              href="/"
              className="font-serif text-[20px] font-semibold tracking-tight text-ink"
            >
              CarveoutAI
            </Link>
            <nav className="flex gap-7 text-[13px] font-medium uppercase tracking-wider text-muted">
              <Link
                href="/research"
                className="transition hover:text-ink"
              >
                Research
              </Link>
              <Link
                href="/debate"
                className="transition hover:text-ink"
              >
                Debate
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
        <footer className="border-t hairline mt-24">
          <div className="mx-auto max-w-6xl px-6 py-6 text-[12px] text-muted">
            Grounded in the Big 4 carve-out guides — EY, KPMG, PwC, Deloitte. Answers reflect the source excerpts only.
          </div>
        </footer>
      </body>
    </html>
  );
}
