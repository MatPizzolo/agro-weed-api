import { useRef, type ReactNode } from "react";

interface CaptureScreenProps {
  onCapture: (file: File) => void;
  /** Slot para la tira de historial de la sesión. */
  children?: ReactNode;
}

/** Pantalla inicial: enseña el encuadre y abre la cámara trasera (o la galería). */
export default function CaptureScreen({ onCapture, children }: CaptureScreenProps) {
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) onCapture(file);
    event.target.value = "";
  }

  return (
    <div className="flex h-full flex-col">
      <header className="px-6 pt-6">
        <span className="text-sm font-semibold tracking-widest text-accent">weedApi</span>
      </header>

      <div className="flex-1 overflow-y-auto px-6 pt-4 pb-2">
        <h1 className="text-3xl font-bold leading-tight">Sacá una foto de la maleza.</h1>

        <div className="mt-6 flex aspect-square w-full max-w-xs flex-col items-center justify-center rounded-card border-2 border-dashed border-line mx-auto">
          <svg viewBox="0 0 200 200" className="h-24 w-24" aria-hidden="true">
            <path
              d="M100 150 C 100 110, 70 100, 62 68 C 96 74, 108 96, 108 122 C 112 98, 126 86, 144 80 C 140 112, 122 128, 104 134 Z"
              fill="var(--color-line)"
            />
          </svg>
          <span className="mt-2 text-xs font-semibold tracking-widest text-muted">
            LLENÁ EL RECUADRO
          </span>
        </div>

        <p className="mt-4 text-center text-sm text-muted">
          una sola planta, de cerca · hojas bien visibles, sin sombra dura
        </p>

        {children}
      </div>

      <footer className="px-6 pb-8 pt-2">
        <button
          type="button"
          onClick={() => cameraInput.current?.click()}
          className="h-12 w-full rounded-card bg-accent text-base font-semibold text-bg active:opacity-80"
        >
          Abrir cámara
        </button>
        <button
          type="button"
          onClick={() => galleryInput.current?.click()}
          className="mt-2 min-h-11 w-full text-sm text-muted underline underline-offset-4"
        >
          o elegí una foto de la galería
        </button>

        <input
          ref={cameraInput}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleChange}
          className="hidden"
        />
        <input
          ref={galleryInput}
          type="file"
          accept="image/*"
          onChange={handleChange}
          className="hidden"
        />
      </footer>
    </div>
  );
}
