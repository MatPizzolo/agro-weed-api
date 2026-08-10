interface ConfidenceBarProps {
  /** Probabilidad [0, 1]. */
  value: number;
  tone: "accent" | "warn";
}

export default function ConfidenceBar({ value, tone }: ConfidenceBarProps) {
  const pct = Math.round(value * 100);
  return (
    <div className="h-1.5 w-full overflow-hidden rounded bg-surface">
      <div
        className={`h-full rounded ${tone === "accent" ? "bg-accent" : "bg-warn"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
