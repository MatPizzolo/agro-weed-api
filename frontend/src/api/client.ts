const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export interface Prediction {
  label: string;
  confidence: number;
}

export interface PredictionResponse {
  top: Prediction;
  predictions: Prediction[];
}

/** Envía una imagen al endpoint /predict y devuelve la clasificación. */
export async function predict(file: File): Promise<PredictionResponse> {
  const form = new FormData();
  form.append("file", file);

  const response = await fetch(`${API_URL}/predict`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    throw new Error(`Error de la API: ${response.status}`);
  }
  return response.json();
}
