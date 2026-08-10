const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const TIMEOUT_MS = 10_000;

export interface Prediction {
  label: string;
  confidence: number;
}

export interface PredictionResponse {
  top: Prediction;
  predictions: Prediction[];
  inference_ms?: number;
  model_version?: string;
}

export type ApiErrorKind = "invalid-image" | "network";

export class ApiError extends Error {
  readonly kind: ApiErrorKind;

  constructor(kind: ApiErrorKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

/** Envía una imagen al endpoint /predict y devuelve la clasificación. */
export async function predict(file: File): Promise<PredictionResponse> {
  if (import.meta.env.VITE_MOCK === "1") return mockPredict();

  const form = new FormData();
  form.append("file", file);

  let response: Response;
  try {
    response = await fetch(`${API_URL}/predict`, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new ApiError("network", "No se pudo conectar con el servidor.");
  }

  if (response.status === 400 || response.status === 413 || response.status === 415) {
    const detail = await response
      .json()
      .then((body) => (typeof body?.detail === "string" ? body.detail : null))
      .catch(() => null);
    throw new ApiError("invalid-image", detail ?? "Esa foto no se pudo leer.");
  }
  if (!response.ok) {
    throw new ApiError("network", `Error de la API: ${response.status}`);
  }

  const body: unknown = await response.json().catch(() => null);
  if (!isPredictionResponse(body)) {
    throw new ApiError("network", "La respuesta del servidor no tiene la forma esperada.");
  }
  return body;
}

function isPredictionResponse(body: unknown): body is PredictionResponse {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  const top = b.top as Record<string, unknown> | undefined;
  return (
    typeof top === "object" &&
    top !== null &&
    typeof top.label === "string" &&
    typeof top.confidence === "number" &&
    Array.isArray(b.predictions)
  );
}

// --- Modo mock (VITE_MOCK=1): demo completa sin backend ni modelo. ---

let mockCall = 0;

const MOCK_RESPONSES: PredictionResponse[] = [
  {
    top: { label: "Lantana", confidence: 0.87 },
    predictions: [
      { label: "Lantana", confidence: 0.87 },
      { label: "Siam weed", confidence: 0.06 },
      { label: "Parkinsonia", confidence: 0.03 },
      { label: "Negative", confidence: 0.02 },
      { label: "Chinee apple", confidence: 0.01 },
      { label: "Parthenium", confidence: 0.005 },
      { label: "Prickly acacia", confidence: 0.003 },
      { label: "Rubber vine", confidence: 0.001 },
      { label: "Snake weed", confidence: 0.001 },
    ],
    inference_ms: 42,
    model_version: "mock",
  },
  {
    top: { label: "Parkinsonia", confidence: 0.34 },
    predictions: [
      { label: "Parkinsonia", confidence: 0.34 },
      { label: "Prickly acacia", confidence: 0.3 },
      { label: "Negative", confidence: 0.2 },
      { label: "Chinee apple", confidence: 0.16 },
    ],
    inference_ms: 38,
    model_version: "mock",
  },
  {
    top: { label: "Negative", confidence: 0.91 },
    predictions: [
      { label: "Negative", confidence: 0.91 },
      { label: "Snake weed", confidence: 0.04 },
      { label: "Lantana", confidence: 0.05 },
    ],
    inference_ms: 40,
    model_version: "mock",
  },
];

async function mockPredict(): Promise<PredictionResponse> {
  await new Promise((resolve) => setTimeout(resolve, 900));
  const turn = mockCall++ % 4;
  if (turn === 3) throw new ApiError("network", "No se pudo conectar con el servidor.");
  return MOCK_RESPONSES[turn];
}
