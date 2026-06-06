"use client";

import { MODELS, ModelKey, modelColor } from "@/lib/theme";

export type DomainFilter = "fide" | "fia" | "both";
export type TierFilter = "all" | "1" | "2" | "3";

export function ModelChips({
  selected,
  onToggle,
}: {
  selected: ModelKey[];
  onToggle: (m: ModelKey) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {MODELS.map((m) => {
        const active = selected.includes(m.key);
        return (
          <button
            key={m.key}
            onClick={() => onToggle(m.key)}
            className={`chip ${
              active ? "border-transparent" : "text-muted hover:text-white"
            }`}
            style={
              active
                ? { background: `${m.color}22`, borderColor: m.color, color: "#fff" }
                : undefined
            }
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: m.color, opacity: active ? 1 : 0.4 }}
            />
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-card p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
            value === o.value
              ? "bg-accent text-black font-medium"
              : "text-muted hover:text-white"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export { modelColor };
