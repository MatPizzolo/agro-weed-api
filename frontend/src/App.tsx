import { useState } from "react";
import CameraCapture from "./components/CameraCapture";
import ResultCard from "./components/ResultCard";
import { predict, type PredictionResponse } from "./api/client";

export default function App() {
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCapture(file: File) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await predict(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <h1>weedApi</h1>
      <p>Sacá una foto de la maleza y te digo qué especie es.</p>

      <CameraCapture onCapture={handleCapture} disabled={loading} />

      {loading && <p>Analizando…</p>}
      {error && <p role="alert">{error}</p>}
      {result && <ResultCard result={result} />}
    </main>
  );
}
