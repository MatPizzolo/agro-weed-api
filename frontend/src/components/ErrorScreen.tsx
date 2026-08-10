interface ErrorScreenProps {
  /** Mensaje secundario; para imagen inválida viene del detalle de la API. */
  message: string | null;
  canRetry: boolean;
  onRetry: () => void;
  onRetake: () => void;
}

/** Fallo de red (con reintento, la foto se conserva) o imagen ilegible. */
export default function ErrorScreen({ message, canRetry, onRetry, onRetake }: ErrorScreenProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <h1 role="alert" className="text-2xl font-bold text-danger">
          {canRetry ? "Se cortó la conexión." : "Esa foto no se pudo leer."}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {canRetry ? "Tu foto está guardada. Tocá para reintentar." : message}
        </p>
      </div>

      <footer className="px-6 pb-8">
        {canRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="h-12 w-full rounded-card bg-accent text-base font-semibold text-bg active:opacity-80"
          >
            Reintentar
          </button>
        )}
        <button
          type="button"
          onClick={onRetake}
          className={
            canRetry
              ? "mt-2 min-h-11 w-full text-sm text-muted underline underline-offset-4"
              : "h-12 w-full rounded-card bg-accent text-base font-semibold text-bg active:opacity-80"
          }
        >
          Sacar otra foto
        </button>
      </footer>
    </div>
  );
}
