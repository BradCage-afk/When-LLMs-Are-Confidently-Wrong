"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SITE } from "@/lib/site";

const links = [
  { href: "/", label: "Home" },
  { href: "/results", label: "Results" },
  { href: "/benchmark", label: "Benchmark" },
  { href: "/methodology", label: "Methodology" },
];

export default function Nav() {
  const pathname = usePathname();
  const norm = (p: string) => (p !== "/" && p.endsWith("/") ? p.slice(0, -1) : p);
  const current = norm(pathname);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-accent transition-transform group-hover:scale-125" />
          <span className="text-sm font-semibold tracking-tight">
            LLM Calibration<span className="text-muted"> / Chess vs F1</span>
          </span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          {links.map((l) => {
            const active = current === norm(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`relative rounded-md px-3 py-2 text-sm transition-colors ${
                  active ? "text-accent" : "text-muted hover:text-white"
                }`}
              >
                {l.label}
                {active && (
                  <span className="absolute inset-x-3 -bottom-px h-px bg-accent" />
                )}
              </Link>
            );
          })}
          {SITE.githubUrl && (
            <a
              href={SITE.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub repository"
              className="ml-1 rounded-md p-2 text-muted transition-colors hover:text-white"
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 .5C5.73.5.5 5.74.5 12.02c0 5.1 3.29 9.42 7.86 10.96.58.11.79-.25.79-.56 0-.27-.01-1.16-.02-2.1-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 2.9-.39c.98 0 1.97.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.41-5.26 5.69.41.36.78 1.06.78 2.14 0 1.55-.01 2.8-.01 3.18 0 .31.21.68.8.56A11.52 11.52 0 0 0 23.5 12.02C23.5 5.74 18.27.5 12 .5Z" />
              </svg>
            </a>
          )}
        </div>
      </nav>
    </header>
  );
}
