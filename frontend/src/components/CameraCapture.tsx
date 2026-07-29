interface CameraCaptureProps {
  onCapture: (file: File) => void;
  disabled?: boolean;
}

/**
 * Botón que abre la cámara trasera del celular (o selector de archivo).
 * Usa el atributo `capture` sin depender de la API de MediaDevices.
 */
export default function CameraCapture({ onCapture, disabled }: CameraCaptureProps) {
  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) onCapture(file);
  }

  return (
    <label>
      Sacar foto de la planta
      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        disabled={disabled}
      />
    </label>
  );
}
