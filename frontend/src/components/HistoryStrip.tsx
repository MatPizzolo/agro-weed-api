import type { HistoryEntry } from "../App";

interface HistoryStripProps {
  entries: HistoryEntry[];
  onSelect: (entry: HistoryEntry) => void;
}

const BORDER_BY_KIND = {
  confident: "border-accent",
  uncertain: "border-warn",
  negative: "border-muted",
} as const;

/** Tira de miniaturas de los análisis de esta sesión (solo en memoria). */
export default function HistoryStrip({ entries, onSelect }: HistoryStripProps) {
  if (entries.length === 0) return null;

  return (
    <section className="mt-6">
      <h2 className="text-[11px] font-semibold tracking-widest text-muted">ESTA SESIÓN</h2>
      <ul className="mt-2 flex gap-2 overflow-x-auto">
        {entries.map((entry) => (
          <li key={entry.id} className="shrink-0">
            <button
              type="button"
              onClick={() => onSelect(entry)}
              className={`block h-11 w-11 overflow-hidden rounded-card border-2 ${BORDER_BY_KIND[entry.verdict.kind]}`}
              aria-label="Volver a ver este análisis"
            >
              <img src={entry.photoUrl} alt="" className="h-full w-full object-cover" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
