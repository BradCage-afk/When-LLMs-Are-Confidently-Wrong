"use client";

import { useEffect, useMemo, useState } from "react";
import { loadAllBenchmark } from "@/lib/data";
import { BenchmarkQuestion } from "@/lib/types";
import EmptyState from "@/components/EmptyState";
import { SegmentedControl } from "@/components/Filters";

type DomainOpt = "all" | "fide" | "fia";
type TierOpt = "all" | "1" | "2" | "3";

export default function BenchmarkPage() {
  const [questions, setQuestions] = useState<BenchmarkQuestion[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [search, setSearch] = useState("");
  const [domain, setDomain] = useState<DomainOpt>("all");
  const [tier, setTier] = useState<TierOpt>("all");
  const [subtopic, setSubtopic] = useState<string>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadAllBenchmark()
      .then(setQuestions)
      .finally(() => setLoaded(true));
  }, []);

  const subtopics = useMemo(() => {
    const set = new Set<string>();
    questions.forEach((q) => {
      if (domain === "all" || q.domain === domain) set.add(q.subtopic);
    });
    return Array.from(set).sort();
  }, [questions, domain]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return questions.filter((q) => {
      if (domain !== "all" && q.domain !== domain) return false;
      if (tier !== "all" && String(q.tier) !== tier) return false;
      if (subtopic !== "all" && q.subtopic !== subtopic) return false;
      if (s) {
        const hay = `${q.question} ${q.correct_answer} ${q.common_misconception} ${q.subtopic}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [questions, search, domain, tier, subtopic]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="py-12">
      <header className="mb-8">
        <p className="section-title mb-3">Dataset Explorer</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          The Benchmark
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          All 200 questions across FIDE chess and FIA Formula 1 rules. Search,
          filter, and expand any row for the full explanation and source.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <DownloadBtn href="/benchmark/fide_questions.json" label="Download FIDE JSON" />
          <DownloadBtn href="/benchmark/fia_questions.json" label="Download FIA JSON" />
          <DownloadBtn href="/data/master_results.csv" label="Download Full CSV" />
        </div>
      </header>

      {/* Controls */}
      <div className="card mb-6 flex flex-col gap-4 p-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex-1">
          <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted">
            Search
          </label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions, answers, misconceptions…"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted/60 focus:border-accent/50"
          />
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <p className="mb-1 text-[10px] uppercase tracking-wider text-muted">Domain</p>
            <SegmentedControl<DomainOpt>
              value={domain}
              onChange={(v) => {
                setDomain(v);
                setSubtopic("all");
              }}
              options={[
                { value: "all", label: "All" },
                { value: "fide", label: "FIDE" },
                { value: "fia", label: "FIA" },
              ]}
            />
          </div>
          <div>
            <p className="mb-1 text-[10px] uppercase tracking-wider text-muted">Tier</p>
            <SegmentedControl<TierOpt>
              value={tier}
              onChange={setTier}
              options={[
                { value: "all", label: "All" },
                { value: "1", label: "1" },
                { value: "2", label: "2" },
                { value: "3", label: "3" },
              ]}
            />
          </div>
          <div>
            <p className="mb-1 text-[10px] uppercase tracking-wider text-muted">Subtopic</p>
            <select
              value={subtopic}
              onChange={(e) => setSubtopic(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-[7px] text-sm outline-none focus:border-accent/50"
            >
              <option value="all">All</option>
              {subtopics.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/[-_]/g, " ")}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!loaded ? (
        <div className="py-20 text-center text-sm text-muted">Loading…</div>
      ) : questions.length === 0 ? (
        <EmptyState
          title="No data yet — run the pipeline"
          hint="Generate the benchmark JSON files, then reload."
        />
      ) : (
        <>
          <p className="mb-3 text-xs text-muted">
            Showing {filtered.length} of {questions.length} questions
          </p>
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-card text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="w-8 p-3" />
                    <th className="p-3">Domain</th>
                    <th className="p-3">Tier</th>
                    <th className="p-3">Subtopic</th>
                    <th className="p-3">Question</th>
                    <th className="p-3">Correct answer</th>
                    <th className="p-3">Common misconception</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((q) => {
                    const open = expanded.has(q.id);
                    return (
                      <FragmentRow
                        key={q.id}
                        q={q}
                        open={open}
                        onToggle={() => toggle(q.id)}
                      />
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted">
                        No questions match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function FragmentRow({
  q,
  open,
  onToggle,
}: {
  q: BenchmarkQuestion;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        className="cursor-pointer border-t border-border align-top transition-colors hover:bg-card/60"
      >
        <td className="p-3 text-muted">
          <span className={`inline-block transition-transform ${open ? "rotate-90" : ""}`}>
            ▸
          </span>
        </td>
        <td className="p-3">
          <span
            className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
              q.domain === "fide"
                ? "bg-[#4285f4]/15 text-[#7aa7f7]"
                : "bg-[#ff6b35]/15 text-[#ff9a6b]"
            }`}
          >
            {q.domain.toUpperCase()}
          </span>
        </td>
        <td className="p-3 text-muted">{String(q.tier)}</td>
        <td className="whitespace-nowrap p-3 text-muted">
          {q.subtopic.replace(/[-_]/g, " ")}
        </td>
        <td className="max-w-md p-3">{q.question}</td>
        <td className="max-w-xs p-3 text-muted">{q.correct_answer}</td>
        <td className="max-w-xs p-3 text-muted">{q.common_misconception}</td>
      </tr>
      {open && (
        <tr className="border-t border-border bg-background">
          <td />
          <td colSpan={6} className="p-4">
            <div className="space-y-3 text-sm">
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-wider text-accent">
                  Explanation
                </p>
                <p className="text-muted">{q.explanation}</p>
              </div>
              {q.source && (
                <div>
                  <p className="mb-1 text-[10px] uppercase tracking-wider text-accent">
                    Source
                  </p>
                  <p className="text-muted">{q.source}</p>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function DownloadBtn({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      download
      className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:border-accent/50"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5" />
        <path d="M5 21h14" />
      </svg>
      {label}
    </a>
  );
}
