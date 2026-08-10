import { useRef, useState } from "react";
import { ApiError, predict } from "./api/client";
import AnalyzingScreen from "./components/AnalyzingScreen";
import CaptureScreen from "./components/CaptureScreen";
import ErrorScreen from "./components/ErrorScreen";
import ResultScreen from "./components/ResultScreen";
import { downscale } from "./lib/downscale";
import { classifyVerdict, type Verdict } from "./lib/verdict";

type Screen =
  | { kind: "capture" }
  | { kind: "analyzing"; photoUrl: string }
  | {
      kind: "result";
      photoUrl: string;
      verdict: Verdict;
      inferenceMs?: number;
      modelVersion?: string;
    }
  | { kind: "error"; file: File | null; photoUrl: string | null; message: string | null };

export interface HistoryEntry {
  id: number;
  photoUrl: string;
  verdict: Verdict;
}

const HISTORY_LIMIT = 5;

export default function App() {
  const [screen, setScreen] = useState<Screen>({ kind: "capture" });
  const nextId = useRef(1);
  const setHistory = useState<HistoryEntry[]>([])[1];

  async function analyze(file: File, photoUrl: string) {
    setScreen({ kind: "analyzing", photoUrl });
    try {
      const response = await predict(file);
      const verdict = classifyVerdict(response);
      setScreen({
        kind: "result",
        photoUrl,
        verdict,
        inferenceMs: response.inference_ms,
        modelVersion: response.model_version,
      });
      setHistory((prev) => {
        const next = [{ id: nextId.current++, photoUrl, verdict }, ...prev];
        for (const evicted of next.slice(HISTORY_LIMIT)) {
          URL.revokeObjectURL(evicted.photoUrl);
        }
        return next.slice(0, HISTORY_LIMIT);
      });
    } catch (e) {
      if (e instanceof ApiError && e.kind === "invalid-image") {
        URL.revokeObjectURL(photoUrl);
        setScreen({ kind: "error", file: null, photoUrl: null, message: e.message });
      } else {
        setScreen({ kind: "error", file, photoUrl, message: null });
      }
    }
  }

  async function handleCapture(rawFile: File) {
    const file = await downscale(rawFile);
    void analyze(file, URL.createObjectURL(file));
  }

  function handleErrorRetake() {
    if (screen.kind === "error" && screen.photoUrl) {
      // La foto del error nunca llegó al historial: liberar su URL.
      URL.revokeObjectURL(screen.photoUrl);
    }
    setScreen({ kind: "capture" });
  }

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-bg text-ink">
      {screen.kind === "capture" && <CaptureScreen onCapture={handleCapture} />}

      {screen.kind === "analyzing" && <AnalyzingScreen photoUrl={screen.photoUrl} />}

      {screen.kind === "result" && (
        <ResultScreen
          photoUrl={screen.photoUrl}
          verdict={screen.verdict}
          inferenceMs={screen.inferenceMs}
          modelVersion={screen.modelVersion}
          onRetake={() => setScreen({ kind: "capture" })}
        />
      )}

      {screen.kind === "error" && (
        <ErrorScreen
          message={screen.message}
          canRetry={screen.file !== null}
          onRetry={() => {
            if (screen.kind === "error" && screen.file && screen.photoUrl) {
              void analyze(screen.file, screen.photoUrl);
            }
          }}
          onRetake={handleErrorRetake}
        />
      )}
    </main>
  );
}
