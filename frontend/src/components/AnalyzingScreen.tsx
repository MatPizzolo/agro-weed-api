interface AnalyzingScreenProps {
  photoUrl: string;
}

/** La foto del usuario queda visible, atenuada, mientras se consulta al modelo. */
export default function AnalyzingScreen({ photoUrl }: AnalyzingScreenProps) {
  return (
    <div className="relative h-full overflow-hidden">
      <img
        src={photoUrl}
        alt="Tu foto"
        className="absolute inset-0 h-full w-full object-cover opacity-40"
      />
      <div className="scan-line absolute left-0 right-0 h-0.5 bg-accent/80" aria-hidden="true" />

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg to-transparent px-6 pb-10 pt-16">
        <h1 className="text-2xl font-bold">Analizando…</h1>
        <p className="mt-1 text-sm text-muted">Comparando contra 8 especies</p>
        <div className="mt-4 h-1 w-full overflow-hidden rounded bg-surface">
          <div className="indeterminate-bar h-full w-1/4 rounded bg-accent" />
        </div>
      </div>
    </div>
  );
}
