import Link from "next/link";
import { SITE } from "@/lib/site";

const footerLinks = [
  { href: "/results", label: "Results" },
  { href: "/benchmark", label: "Benchmark" },
  { href: "/methodology", label: "Methodology" },
];

export default function Footer() {
  return (
    <footer className="relative mt-24 overflow-hidden border-t border-border">
      {/* Amber→blue horizon glow bleeding up from the bottom edge. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-0 h-72"
        style={{
          background:
            "linear-gradient(to top, rgba(255,99,8,0.10), rgba(189,201,230,0.08) 45%, rgba(151,196,255,0.06) 70%, transparent)",
        }}
      />
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-md">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-accent" />
              <span className="text-sm font-semibold tracking-tight">
                LLM Calibration<span className="text-muted"> / Chess vs F1</span>
              </span>
            </div>
            <p className="mt-3 text-sm text-muted">
              An open research project measuring the gap between how confident
              language models sound and how often they&apos;re actually right.
            </p>
            <p className="mt-2 text-xs text-muted/60">
              FIDE Chess vs FIA Formula 1 · dataset and methodology fully
              documented.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-mono text-xs uppercase tracking-[0.15em] text-muted/60">
              Explore
            </span>
            {footerLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm text-muted transition-colors hover:text-accent"
              >
                {l.label}
              </Link>
            ))}
            {SITE.githubUrl && (
              <a
                href={SITE.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted transition-colors hover:text-accent"
              >
                Source code ↗
              </a>
            )}
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6 text-xs text-muted/50">
          Built with Next.js · Inter · Recharts. Scored by an LLM judge against
          ground-truth answers.
        </div>
      </div>
    </footer>
  );
}
