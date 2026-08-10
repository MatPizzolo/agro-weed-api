import { describe, expect, it } from "vitest";
import type { PredictionResponse } from "../api/client";
import { CONFIDENCE_THRESHOLD, classifyVerdict } from "./verdict";

function response(entries: [string, number][]): PredictionResponse {
  const predictions = entries
    .map(([label, confidence]) => ({ label, confidence }))
    .sort((a, b) => b.confidence - a.confidence);
  return { top: predictions[0], predictions };
}

describe("classifyVerdict", () => {
  it("afirma por encima del umbral", () => {
    const v = classifyVerdict(
      response([["Lantana", 0.82], ["Parkinsonia", 0.1], ["Negative", 0.05], ["Siam weed", 0.03]]),
    );
    expect(v.kind).toBe("confident");
    if (v.kind === "confident") {
      expect(v.top.label).toBe("Lantana");
      expect(v.runnersUp.map((p) => p.label)).toEqual(["Parkinsonia", "Siam weed"]);
    }
  });

  it("no afirma por debajo del umbral", () => {
    const v = classifyVerdict(
      response([["Parkinsonia", 0.34], ["Lantana", 0.3], ["Negative", 0.2], ["Siam weed", 0.16]]),
    );
    expect(v.kind).toBe("uncertain");
    if (v.kind === "uncertain") {
      expect(v.candidates.map((p) => p.label)).toEqual(["Parkinsonia", "Lantana", "Siam weed"]);
    }
  });

  it("exactamente en el umbral afirma", () => {
    const v = classifyVerdict(response([["Lantana", CONFIDENCE_THRESHOLD], ["Negative", 0.35]]));
    expect(v.kind).toBe("confident");
  });

  it("Negative arriba gana aunque tenga confianza alta", () => {
    expect(classifyVerdict(response([["Negative", 0.9], ["Lantana", 0.1]])).kind).toBe("negative");
  });

  it("Negative presente pero no arriba no contamina candidatos", () => {
    const v = classifyVerdict(
      response([["Lantana", 0.4], ["Negative", 0.35], ["Parkinsonia", 0.25]]),
    );
    expect(v.kind).toBe("uncertain");
    if (v.kind === "uncertain") {
      expect(v.candidates.map((p) => p.label)).toEqual(["Lantana", "Parkinsonia"]);
    }
  });
});
