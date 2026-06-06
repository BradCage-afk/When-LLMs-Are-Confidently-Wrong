"use client";

import { Metrics } from "@/lib/types";
import { modelLabel } from "@/lib/theme";
import EmptyState from "@/components/EmptyState";

// One heatmap per domain: rows = models, columns = subtopics. Cell = accuracy.
export default function SubtopicHeatmap({
  metrics,
  models,
  domains,
}: {
  metrics: Metrics;
  models: string[];
  domains: string[];
}) {
  const panels = domains.filter((d) =>
    models.some((m) => {
      const pmd = metrics.per_model_domain[`${m}_${d}`];
      return pmd && Object.keys(pmd.per_subtopic ?? {}).length > 0;
    })
  );

  if (!panels.length) {
    return <EmptyState compact title="No subtopic data yet" />;
  }

  return (
    <div className="space-y-8">
      {panels.map((domain) => {
        // Collect union of subtopics for this domain.
        const subtopicSet = new Set<string>();
        for (const m of models) {
          const pmd = metrics.per_model_domain[`${m}_${domain}`];
          if (pmd) Object.keys(pmd.per_subtopic ?? {}).forEach((s) => subtopicSet.add(s));
        }
        const subtopics = Array.from(subtopicSet).sort();

        return (
          <div key={domain}>
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
              {domain.toUpperCase()} — accuracy by subtopic
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="p-2 text-left text-xs font-medium text-muted" />
                    {subtopics.map((s) => (
                      <th
                        key={s}
                        className="max-w-[90px] p-2 text-center text-[10px] font-medium text-muted"
                      >
                        {prettySubtopic(s)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {models.map((m) => {
                    const pmd = metrics.per_model_domain[`${m}_${domain}`];
                    return (
                      <tr key={m}>
                        <td className="whitespace-nowrap p-2 text-xs font-medium text-white">
                          {modelLabel(m)}
                        </td>
                        {subtopics.map((s) => {
                          const cell = pmd?.per_subtopic?.[s];
                          const acc = cell?.accuracy;
                          return (
                            <td key={s} className="p-1">
                              <div
                                className="flex h-9 items-center justify-center rounded text-[11px] font-semibold"
                                style={cellStyle(acc)}
                                title={
                                  acc === undefined
                                    ? "no data"
                                    : `${prettySubtopic(s)}: ${(acc * 100).toFixed(0)}% (${cell?.count ?? 0})`
                                }
                              >
                                {acc === undefined ? "—" : `${Math.round(acc * 100)}`}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
      <p className="text-[11px] text-muted">
        Cell = accuracy %. Greener = stronger, redder = weaker.
      </p>
    </div>
  );
}

function prettySubtopic(slug: string): string {
  return slug.replace(/[-_]/g, " ");
}

function cellStyle(acc: number | undefined): React.CSSProperties {
  if (acc === undefined) return { background: "#161616", color: "#555" };
  const t = Math.max(0, Math.min(1, acc));
  // red (0) -> yellow (.5) -> green (1)
  const r = t < 0.5 ? 230 : Math.round(230 - (t - 0.5) * 2 * 180);
  const g = t < 0.5 ? Math.round(70 + t * 2 * 160) : 200;
  const b = 70;
  return { background: `rgba(${r}, ${g}, ${b}, ${0.25 + 0.5 * Math.abs(t - 0.5) * 2})`, color: "#fff" };
}
