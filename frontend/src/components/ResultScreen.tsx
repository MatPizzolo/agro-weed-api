import type { Prediction } from "../api/client";
import { PLACEHOLDER_IMAGE, speciesByLabel, type Species } from "../data/species";
import type { Verdict } from "../lib/verdict";
import ConfidenceBar from "./ConfidenceBar";
import SpeciesGrid from "./SpeciesGrid";

interface ResultScreenProps {
  photoUrl: string;
  verdict: Verdict;
  inferenceMs?: number;
  modelVersion?: string;
  onRetake: () => void;
}

function displayName(prediction: Prediction): string {
  return speciesByLabel(prediction.label)?.es ?? prediction.label;
}

function formatPct(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

function share(species: Species, confidence: number) {
  const text = `weedApi: ${species.es} (${species.scientific}) — ${formatPct(confidence)} de confianza`;
  void navigator.share({ text }).catch(() => {
    // Compartir cancelado por el usuario: no es un error.
  });
}

export default function ResultScreen({
  photoUrl,
  verdict,
  inferenceMs,
  modelVersion,
  onRetake,
}: ResultScreenProps) {
  const cta = verdict.kind === "uncertain" ? "Probar de nuevo" : "Otra foto";

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-baseline justify-between px-6 pt-6">
        <span className="text-sm font-semibold tracking-widest text-accent">weedApi</span>
        {(inferenceMs !== undefined || modelVersion) && (
          <span className="text-xs text-muted tabular-nums">
            {inferenceMs !== undefined && `${Math.round(inferenceMs)} ms`}
            {inferenceMs !== undefined && modelVersion && " · "}
            {modelVersion}
          </span>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-6 pb-4 pt-4">
        {verdict.kind === "confident" && (
          <ConfidentBody verdict={verdict} photoUrl={photoUrl} />
        )}
        {verdict.kind === "uncertain" && <UncertainBody verdict={verdict} />}
        {verdict.kind === "negative" && <NegativeBody />}
      </div>

      <footer className="px-6 pb-8 pt-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onRetake}
            className="h-12 flex-1 rounded-card bg-accent text-base font-semibold text-bg active:opacity-80"
          >
            {cta}
          </button>
          {verdict.kind === "confident" && "share" in navigator && (
            <ShareButton verdict={verdict} />
          )}
        </div>
        <p className="mt-3 text-center text-[11px] text-muted">
          Fotos de referencia: dataset DeepWeeds (CC BY 4.0)
        </p>
      </footer>
    </div>
  );
}

function ShareButton({ verdict }: { verdict: Extract<Verdict, { kind: "confident" }> }) {
  const species = speciesByLabel(verdict.top.label);
  if (!species) return null;
  return (
    <button
      type="button"
      onClick={() => share(species, verdict.top.confidence)}
      className="h-12 rounded-card border border-line px-5 text-base font-semibold text-ink active:opacity-80"
    >
      Compartir
    </button>
  );
}

function ConfidentBody({
  verdict,
  photoUrl,
}: {
  verdict: Extract<Verdict, { kind: "confident" }>;
  photoUrl: string;
}) {
  const species = speciesByLabel(verdict.top.label);

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <figure>
          <img
            src={photoUrl}
            alt="Tu foto"
            className="aspect-square w-full rounded-card object-cover"
          />
          <figcaption className="mt-1 text-[11px] font-semibold tracking-widest text-muted">
            TU FOTO
          </figcaption>
        </figure>
        <figure>
          <img
            src={species?.image ?? PLACEHOLDER_IMAGE}
            alt={species ? `Foto de referencia de ${species.es}` : "Foto de referencia"}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = PLACEHOLDER_IMAGE;
            }}
            className="aspect-square w-full rounded-card object-cover"
          />
          <figcaption className="mt-1 text-[11px] font-semibold tracking-widest text-muted">
            REFERENCIA
          </figcaption>
        </figure>
      </div>

      <h1 className="mt-4 text-3xl font-bold leading-tight">
        {species?.es ?? verdict.top.label}
      </h1>
      {species && species.es !== species.scientific && (
        <p className="mt-0.5 text-base italic text-muted">{species.scientific}</p>
      )}

      <div className="mt-3 flex items-center gap-2">
        <span className="rounded bg-accent/15 px-2 py-0.5 text-xs font-semibold tracking-wide text-accent">
          ALTA CONFIANZA
        </span>
        <span className="text-sm font-semibold tabular-nums">
          {formatPct(verdict.top.confidence)}
        </span>
      </div>
      <div className="mt-2">
        <ConfidenceBar value={verdict.top.confidence} tone="accent" />
      </div>

      {species && <p className="mt-4 text-sm leading-relaxed text-muted">{species.blurb}</p>}

      {verdict.runnersUp.length > 0 && (
        <section className="mt-5">
          <h2 className="text-[11px] font-semibold tracking-widest text-muted">OTRAS</h2>
          <ul className="mt-2 space-y-1.5">
            {verdict.runnersUp.map((p) => (
              <li key={p.label} className="flex justify-between text-sm">
                <span>{displayName(p)}</span>
                <span className="text-muted tabular-nums">{formatPct(p.confidence)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function UncertainBody({ verdict }: { verdict: Extract<Verdict, { kind: "uncertain" }> }) {
  return (
    <>
      <h1 role="alert" className="text-3xl font-bold leading-tight text-warn">
        No estoy seguro.
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Ninguna especie supera el umbral. Probá más de cerca, con la hoja llenando el recuadro.
      </p>

      <section className="mt-6">
        <h2 className="text-[11px] font-semibold tracking-widest text-muted">LO MÁS PARECIDO</h2>
        <ul className="mt-2 space-y-3">
          {verdict.candidates.map((p) => (
            <li key={p.label}>
              <div className="flex justify-between text-sm">
                <span>{displayName(p)}</span>
                <span className="text-muted tabular-nums">{formatPct(p.confidence)}</span>
              </div>
              <div className="mt-1">
                <ConfidenceBar value={p.confidence} tone="warn" />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function NegativeBody() {
  return (
    <>
      <h1 role="alert" className="text-3xl font-bold leading-tight">
        No es ninguna de las 8 malezas.
      </h1>
      <section className="mt-6">
        <h2 className="text-[11px] font-semibold tracking-widest text-muted">
          LO QUE SÍ RECONOZCO
        </h2>
        <div className="mt-2">
          <SpeciesGrid />
        </div>
      </section>
    </>
  );
}
