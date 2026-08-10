import { PLACEHOLDER_IMAGE, SPECIES } from "../data/species";

/** Grilla de las 8 especies que el modelo sí reconoce (estado negative). */
export default function SpeciesGrid() {
  return (
    <ul className="grid grid-cols-2 gap-3">
      {SPECIES.map((s) => (
        <li key={s.id} className="rounded-card bg-surface p-2">
          <img
            src={s.image}
            alt={s.es}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = PLACEHOLDER_IMAGE;
            }}
            className="aspect-square w-full rounded object-cover"
          />
          <p className="mt-1.5 text-sm font-medium">{s.es}</p>
          {s.es !== s.scientific && <p className="text-xs italic text-muted">{s.scientific}</p>}
        </li>
      ))}
    </ul>
  );
}
