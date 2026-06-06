export default function EmptyState({
  title = "No data yet",
  hint = "Run the pipeline to generate results.",
  compact = false,
}: {
  title?: string;
  hint?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 text-center ${
        compact ? "p-8" : "p-14"
      }`}
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-border text-accent">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 3v18h18" />
          <path d="M7 14l4-4 3 3 5-6" />
        </svg>
      </div>
      <p className="text-sm font-medium text-white">{title}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  );
}
