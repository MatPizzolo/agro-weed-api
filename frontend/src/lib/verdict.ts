import type { Prediction, PredictionResponse } from "../api/client";

/** Umbral provisorio: ajustar tras entrenar (una sola línea). */
export const CONFIDENCE_THRESHOLD = 0.65;

export type Verdict =
  | { kind: "confident"; top: Prediction; runnersUp: Prediction[] }
  | { kind: "uncertain"; candidates: Prediction[] }
  | { kind: "negative" };

/** Contrato de honestidad: nunca afirmar bajo el umbral ni renderizar Negative como especie. */
export function classifyVerdict(response: PredictionResponse): Verdict {
  const { top, predictions } = response;
  if (top.label === "Negative") return { kind: "negative" };

  const species = predictions.filter((p) => p.label !== "Negative");
  if (top.confidence < CONFIDENCE_THRESHOLD) {
    return { kind: "uncertain", candidates: species.slice(0, 3) };
  }
  return { kind: "confident", top, runnersUp: species.slice(1, 3) };
}
