import type { PredictionResponse } from "../api/client";

interface ResultCardProps {
  result: PredictionResponse;
}

/** Muestra la especie más probable y el ranking completo. */
export default function ResultCard({ result }: ResultCardProps) {
  return (
    <div>
      <h2>
        {result.top.label} ({(result.top.confidence * 100).toFixed(1)}%)
      </h2>
      <ul>
        {result.predictions.map((p) => (
          <li key={p.label}>
            {p.label}: {(p.confidence * 100).toFixed(1)}%
          </li>
        ))}
      </ul>
    </div>
  );
}
