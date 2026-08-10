# Frontend UX + mejoras de API — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar el spec de UX mobile (`docs/superpowers/specs/2026-07-28-frontend-mobile-ux-design.md`) más compartir/historial/PWA-manifest en el frontend, y `/species`, `inference_ms`+`model_version`, validación de subida y warm-up en la API. Sin Grad-CAM ni TFLite.

**Architecture:** La API suma un endpoint de metadatos y enriquece `/predict` sin romper el contrato existente (campos nuevos, aditivos). El frontend se reescribe como un shell de viewport completo con máquina de estados (`capture → analyzing → result|error`), una capa de veredicto pura y testeada, cliente con mock mode y timeout, y estilos Tailwind v4 con tokens `@theme`.

**Tech Stack:** FastAPI + Pydantic (backend), React 18 + TypeScript + Tailwind v4 + Vitest (frontend), pytest (backend tests).

## Global Constraints

- Todo el copy de UI en español rioplatense (voseo: "Sacá", "Probá").
- No inventar nombres vernáculos: si no hay nombre común verificable en Argentina, el titular usa el nombre científico. Verificados: Lantana → "Lantana", Parkinsonia → "Cina-cina". El resto: solo científico.
- Etiquetas del modelo: exactamente las de `src/weed_api/labels.py` (orden canónico, NO reordenar).
- Umbral de confianza: `CONFIDENCE_THRESHOLD = 0.65`, una única constante nombrada en `lib/verdict.ts`.
- Sin router, sin MediaDevices: `<input type="file" capture="environment">`.
- Tema oscuro fijo, alto contraste, targets táctiles ≥ 44px, `tabular-nums` en cifras, respetar `prefers-reduced-motion`.
- El shell no scrollea; scrollea el bloque de contenido interno, la CTA queda al pie.
- Timeout de red: abort a los 10 s.
- Fuera de alcance: Grad-CAM, TFLite, service worker/offline, cuentas, i18n.
- Trabajo en rama `feature/ux-api-improvements`; commit al final de cada task.
- Backend: correr tests con `uv run pytest`, lint con `uv run ruff check .`. Frontend: `pnpm test` y `pnpm build` en `frontend/`.

---

## Parte A — API

### Task A1: Tabla de especies + `GET /species`

**Files:**
- Create: `src/weed_api/species.py`
- Create: `src/weed_api/api/routes/species.py`
- Modify: `src/weed_api/api/schemas.py` (agregar `SpeciesInfo`)
- Modify: `src/weed_api/api/main.py` (incluir router)
- Test: `tests/test_species.py`

**Interfaces:**
- Consumes: `LABELS` de `weed_api.labels`.
- Produces: `SPECIES: list[SpeciesInfo]` (Pydantic) y `GET /species` → `list[SpeciesInfo]` con campos `label: str`, `scientific: str | None`, `common_es: str | None`, `blurb: str`. Orden idéntico a `LABELS` (9 entradas, incluida `Negative` con `scientific=None`).

- [ ] **Step 1: Test que falla** — `tests/test_species.py`:

```python
from fastapi.testclient import TestClient

from weed_api.api.main import app
from weed_api.labels import LABELS

client = TestClient(app)


def test_species_returns_all_labels_in_canonical_order():
    response = client.get("/species")
    assert response.status_code == 200
    body = response.json()
    assert [s["label"] for s in body] == LABELS


def test_species_have_scientific_name_except_negative():
    body = client.get("/species").json()
    for s in body:
        if s["label"] == "Negative":
            assert s["scientific"] is None
        else:
            assert s["scientific"]
            assert s["blurb"]
```

- [ ] **Step 2: Correr y ver FAIL** — `uv run pytest tests/test_species.py -v` → 404 (ruta no existe).
- [ ] **Step 3: Implementación.**

`src/weed_api/api/schemas.py` — agregar al final:

```python
class SpeciesInfo(BaseModel):
    """Metadatos de una clase del modelo."""

    label: str = Field(..., description="Etiqueta exacta del modelo (inglés).")
    scientific: str | None = Field(None, description="Nombre científico (binomial).")
    common_es: str | None = Field(
        None, description="Nombre común en español, solo si es verificable."
    )
    blurb: str = Field("", description="Descripción breve en español.")
```

`src/weed_api/species.py`:

```python
"""Metadatos de las clases DeepWeeds (binomiales según Olsen et al. 2019)."""

from weed_api.api.schemas import SpeciesInfo

SPECIES: list[SpeciesInfo] = [
    SpeciesInfo(
        label="Chinee apple",
        scientific="Ziziphus mauritiana",
        blurb="Árbol espinoso de fruto pequeño; invasor agresivo de pasturas tropicales.",
    ),
    SpeciesInfo(
        label="Lantana",
        scientific="Lantana camara",
        common_es="Lantana",
        blurb="Arbusto de flores multicolores; tóxica para el ganado e invasora de pasturas.",
    ),
    SpeciesInfo(
        label="Parkinsonia",
        scientific="Parkinsonia aculeata",
        common_es="Cina-cina",
        blurb="Árbol espinoso de ramas verdes; forma matorrales densos junto al agua.",
    ),
    SpeciesInfo(
        label="Parthenium",
        scientific="Parthenium hysterophorus",
        blurb="Hierba anual de flores blancas pequeñas; alergénica y muy competitiva.",
    ),
    SpeciesInfo(
        label="Prickly acacia",
        scientific="Vachellia nilotica",
        blurb="Acacia espinosa; invade pastizales y compite con las forrajeras.",
    ),
    SpeciesInfo(
        label="Rubber vine",
        scientific="Cryptostegia grandiflora",
        blurb="Enredadera de látex tóxico; cubre y asfixia la vegetación nativa.",
    ),
    SpeciesInfo(
        label="Siam weed",
        scientific="Chromolaena odorata",
        blurb="Arbusto de crecimiento muy rápido; forma matas densas que desplazan pasturas.",
    ),
    SpeciesInfo(
        label="Snake weed",
        scientific="Stachytarpheta spp.",
        blurb="Hierba de espigas azul-violáceas; común en pasturas degradadas.",
    ),
    SpeciesInfo(
        label="Negative",
        blurb="Ninguna de las 8 malezas del modelo.",
    ),
]
```

`src/weed_api/api/routes/species.py`:

```python
"""Endpoint de metadatos de especies."""

from fastapi import APIRouter

from weed_api.api.schemas import SpeciesInfo
from weed_api.species import SPECIES

router = APIRouter(tags=["species"])


@router.get("/species", response_model=list[SpeciesInfo])
def list_species() -> list[SpeciesInfo]:
    return SPECIES
```

`src/weed_api/api/main.py` — importar y montar: `from weed_api.api.routes import health, predict, species` y `app.include_router(species.router)`.

- [ ] **Step 4: Verificar PASS** — `uv run pytest -v` (todos los tests, no solo el nuevo).
- [ ] **Step 5: Commit** — `git commit -m "feat(api): endpoint GET /species con metadatos de las 9 clases"`.

### Task A2: `inference_ms` y `model_version` en `/predict`

**Files:**
- Modify: `src/weed_api/api/schemas.py` (`PredictionResponse`)
- Modify: `src/weed_api/config.py` (campo `model_version`)
- Modify: `src/weed_api/api/routes/predict.py`
- Test: `tests/test_predict.py` (nuevo)

**Interfaces:**
- Produces: `PredictionResponse` gana `inference_ms: float` (tiempo de `model.predict` en ms) y `model_version: str` (de `settings.model_version`, default `"dev"`, env `MODEL_VERSION`).
- El frontend (Task B5) lee estos campos como opcionales.

- [ ] **Step 1: Test que falla** — `tests/test_predict.py`, con modelo falso vía `dependency_overrides`:

```python
import io

import numpy as np
from fastapi.testclient import TestClient
from PIL import Image

from weed_api.api.deps import get_model
from weed_api.api.main import app
from weed_api.labels import NUM_CLASSES


class FakeModel:
    def predict(self, batch):
        probs = np.full((1, NUM_CLASSES), 0.05, dtype=np.float32)
        probs[0, 1] = 0.6  # Lantana
        return probs


def make_client() -> TestClient:
    app.dependency_overrides[get_model] = lambda: FakeModel()
    return TestClient(app)


def jpeg_bytes(size=(64, 64)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", size, (10, 120, 40)).save(buf, format="JPEG")
    return buf.getvalue()


def test_predict_includes_timing_and_version():
    client = make_client()
    response = client.post(
        "/predict", files={"file": ("foto.jpg", jpeg_bytes(), "image/jpeg")}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["top"]["label"] == "Lantana"
    assert body["inference_ms"] >= 0
    assert body["model_version"] == "dev"
    app.dependency_overrides.clear()
```

- [ ] **Step 2: FAIL** — `uv run pytest tests/test_predict.py -v` → KeyError/validation.
- [ ] **Step 3: Implementación.** En `schemas.py`, `PredictionResponse` suma:

```python
    inference_ms: float = Field(..., ge=0.0, description="Duración de la inferencia en ms.")
    model_version: str = Field(..., description="Versión del modelo servido.")
```

En `config.py`, dentro de `Settings`: `model_version: str = "dev"` (comentario: se sobreescribe con `MODEL_VERSION`). En `predict.py`, cronometrar con `time.perf_counter()` alrededor de `model.predict(batch)` y devolver `PredictionResponse(top=..., predictions=..., inference_ms=elapsed_ms, model_version=settings.model_version)` (importar `settings`).

- [ ] **Step 4: PASS** — `uv run pytest -v`.
- [ ] **Step 5: Commit** — `git commit -m "feat(api): inference_ms y model_version en /predict"`.

### Task A3: Validación de subida (content-type y tamaño)

**Files:**
- Modify: `src/weed_api/config.py` (`max_upload_bytes`)
- Modify: `src/weed_api/api/routes/predict.py`
- Test: `tests/test_predict.py` (agregar casos)

**Interfaces:**
- Produces: `/predict` responde `415` si `file.content_type` no empieza con `image/`; `413` si el cuerpo supera `settings.max_upload_bytes` (default `15 * 1024 * 1024`, env `MAX_UPLOAD_BYTES`). Mensajes en español: `"El archivo debe ser una imagen."`, `"Imagen demasiado grande (máximo 15 MB)."`.

- [ ] **Step 1: Tests que fallan** (agregar a `tests/test_predict.py`):

```python
def test_predict_rejects_non_image_content_type():
    client = make_client()
    response = client.post(
        "/predict", files={"file": ("nota.txt", b"hola", "text/plain")}
    )
    assert response.status_code == 415
    app.dependency_overrides.clear()


def test_predict_rejects_oversized_upload(monkeypatch):
    from weed_api.config import settings

    monkeypatch.setattr(settings, "max_upload_bytes", 1024)
    client = make_client()
    big = jpeg_bytes(size=(2000, 2000))
    assert len(big) > 1024
    response = client.post(
        "/predict", files={"file": ("foto.jpg", big, "image/jpeg")}
    )
    assert response.status_code == 413
    app.dependency_overrides.clear()
```

- [ ] **Step 2: FAIL** — `uv run pytest tests/test_predict.py -v`.
- [ ] **Step 3: Implementación.** `config.py`: `max_upload_bytes: int = 15 * 1024 * 1024`. En `predict.py`, antes de abrir la imagen:

```python
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(status_code=415, detail="El archivo debe ser una imagen.")

    contents = await file.read(settings.max_upload_bytes + 1)
    if len(contents) > settings.max_upload_bytes:
        mb = settings.max_upload_bytes // (1024 * 1024)
        raise HTTPException(
            status_code=413, detail=f"Imagen demasiado grande (máximo {mb} MB)."
        )
```

y usar `contents` en `Image.open(io.BytesIO(contents))`.

- [ ] **Step 4: PASS** — `uv run pytest -v` y `uv run ruff check .`.
- [ ] **Step 5: Commit** — `git commit -m "feat(api): validación de content-type y tamaño en /predict"`.

### Task A4: Warm-up del modelo en el startup

**Files:**
- Modify: `src/weed_api/api/main.py` (lifespan)
- Test: `tests/test_health.py` (agregar caso)

**Interfaces:**
- Produces: en el startup se intenta `get_model()` + una predicción dummy de ceros `(1, image_size, image_size, 3)`. Si el modelo no existe o falla, se loguea un warning y la API arranca igual (`/health` sigue vivo). No cambia ninguna firma.

- [ ] **Step 1: Test que falla** (en `tests/test_health.py` — verifica que el startup con modelo inexistente no tira la app; hoy no hay lifespan, así que primero se implementa y este test protege la regresión):

```python
def test_startup_survives_missing_model():
    # models/ está vacío en el repo: el warm-up debe fallar silenciosamente.
    with TestClient(app) as started:
        response = started.get("/health")
    assert response.status_code == 200
```

- [ ] **Step 2: Correr** — `uv run pytest tests/test_health.py -v` (pasa trivialmente hoy; el punto es que siga pasando con el lifespan agregado).
- [ ] **Step 3: Implementación** en `main.py`:

```python
import logging
from contextlib import asynccontextmanager

import numpy as np

from weed_api.api.deps import get_model

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        model = get_model()
        dummy = np.zeros((1, settings.image_size, settings.image_size, 3), dtype=np.float32)
        model.predict(dummy)
        logger.info("Modelo cargado y calentado.")
    except Exception:
        logger.warning(
            "No se pudo cargar el modelo en el arranque; /predict fallará hasta que exista.",
            exc_info=True,
        )
    yield


app = FastAPI(..., lifespan=lifespan)
```

- [ ] **Step 4: PASS** — `uv run pytest -v` y `uv run ruff check .`.
- [ ] **Step 5: Commit** — `git commit -m "feat(api): warm-up del modelo en el startup (tolerante a modelo ausente)"`.

---

## Parte B — Frontend

### Task B1: Base visual — Tailwind v4, tokens y shell

**Files:**
- Create: `frontend/src/index.css`
- Modify: `frontend/vite.config.ts` (plugin `@tailwindcss/vite`)
- Modify: `frontend/src/main.tsx` (importar `./index.css`)
- Modify: `frontend/index.html` (`theme-color`, fondo oscuro)

**Interfaces:**
- Produces: tokens `@theme`: `--color-bg #0c1210`, `--color-surface #16201b`, `--color-line #26362e`, `--color-ink #e8f0ea`, `--color-muted #94a89b`, `--color-accent #4ade80`, `--color-warn #fbbf24`, `--color-danger #f87171`. Clases utilitarias Tailwind (`bg-bg`, `text-ink`, etc.) disponibles para todas las tasks B6–B8.

- [ ] **Step 1: Implementación.** `vite.config.ts`: agregar `import tailwindcss from "@tailwindcss/vite"` y `plugins: [react(), tailwindcss()]`. `main.tsx`: `import "./index.css";`. `index.css`:

```css
@import "tailwindcss";

@theme {
  --color-bg: #0c1210;
  --color-surface: #16201b;
  --color-line: #26362e;
  --color-ink: #e8f0ea;
  --color-muted: #94a89b;
  --color-accent: #4ade80;
  --color-warn: #fbbf24;
  --color-danger: #f87171;
  --radius-card: 0.75rem;
}

html,
body,
#root {
  height: 100%;
}

body {
  background: var(--color-bg);
  color: var(--color-ink);
  overscroll-behavior: none;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation: none !important;
    transition: none !important;
  }
}
```

`index.html`: `<meta name="theme-color" content="#0c1210" />`.

- [ ] **Step 2: Verificar** — `cd frontend && pnpm install && pnpm build` compila.
- [ ] **Step 3: Commit** — `git commit -m "feat(front): Tailwind v4 con tokens de instrumento de campo"`.

### Task B2: Capa de veredicto (TDD)

**Files:**
- Create: `frontend/src/lib/verdict.ts`
- Test: `frontend/src/lib/verdict.test.ts`

**Interfaces:**
- Consumes: tipos `Prediction`, `PredictionResponse` de `../api/client` (ya existen con esa forma).
- Produces:

```ts
export const CONFIDENCE_THRESHOLD = 0.65;
export type Verdict =
  | { kind: "confident"; top: Prediction; runnersUp: Prediction[] }
  | { kind: "uncertain"; candidates: Prediction[] }
  | { kind: "negative" };
export function classifyVerdict(response: PredictionResponse): Verdict;
```

Reglas en orden: (1) `top.label === "Negative"` → `negative`; (2) `top.confidence < CONFIDENCE_THRESHOLD` → `uncertain` con los 3 mejores candidatos **excluyendo** `Negative`; (3) `confident` con `runnersUp` = los 2 siguientes excluyendo `Negative`. En empate exacto en el tope, gana el primero de la lista `predictions` (ya viene ordenada por la API).

- [ ] **Step 1: Tests que fallan** — `verdict.test.ts`:

```ts
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
```

- [ ] **Step 2: FAIL** — `pnpm test` → módulo inexistente.
- [ ] **Step 3: Implementación** — `verdict.ts`:

```ts
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
```

- [ ] **Step 4: PASS** — `pnpm test`.
- [ ] **Step 5: Commit** — `git commit -m "feat(front): capa de veredicto con tests (contrato de honestidad)"`.

### Task B3: Metadatos de especies + placeholder

**Files:**
- Create: `frontend/src/data/species.ts`
- Create: `frontend/public/species/placeholder.svg`

**Interfaces:**
- Produces:

```ts
export interface Species {
  id: string;          // etiqueta exacta del modelo
  es: string;          // titular: nombre común verificado o científico
  scientific: string;  // binomial (itálica en UI)
  blurb: string;
  image: string;       // /species/<slug>.jpg (aún no existen → onError placeholder)
}
export const SPECIES: Species[] = [/* 8 entradas, sin Negative */];
export const PLACEHOLDER_IMAGE = "/species/placeholder.svg";
export function speciesByLabel(label: string): Species | undefined;
```

Tabla (binomiales del paper DeepWeeds, Olsen et al. 2019): Chinee apple/*Ziziphus mauritiana*, Lantana/*Lantana camara* (es: Lantana), Parkinsonia/*Parkinsonia aculeata* (es: Cina-cina), Parthenium/*Parthenium hysterophorus*, Prickly acacia/*Vachellia nilotica*, Rubber vine/*Cryptostegia grandiflora*, Siam weed/*Chromolaena odorata*, Snake weed/*Stachytarpheta* spp. Blurbs iguales a los de Task A1. Slugs: `chinee-apple.jpg`, `lantana.jpg`, `parkinsonia.jpg`, `parthenium.jpg`, `prickly-acacia.jpg`, `rubber-vine.jpg`, `siam-weed.jpg`, `snake-weed.jpg`.

- [ ] **Step 1: Implementación** de la tabla y un `placeholder.svg` neutro (rectángulo `#16201b` con una hoja estilizada en `#26362e` y texto "sin foto aún").
- [ ] **Step 2: Verificar** — `pnpm build`.
- [ ] **Step 3: Commit** — `git commit -m "feat(front): tabla de especies y placeholder de referencia"`.

### Task B4: Redimensionado en el cliente

**Files:**
- Create: `frontend/src/lib/downscale.ts`

**Interfaces:**
- Produces: `export async function downscale(file: File, maxSide = 1024, quality = 0.85): Promise<File>` — canvas + `createImageBitmap`, salida JPEG; si la imagen ya es más chica que `maxSide` o cualquier paso falla, devuelve el `File` original (nunca lanza). Sin test unitario (depende de canvas; se valida a mano según el spec).

- [ ] **Step 1: Implementación:**

```ts
/** Reduce la foto a maxSide px (lado mayor) en JPEG. Ante cualquier fallo, devuelve el original. */
export async function downscale(file: File, maxSide = 1024, quality = 0.85): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = maxSide / Math.max(bitmap.width, bitmap.height);
    if (scale >= 1) return file;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (!blob) return file;
    return new File([blob], "foto.jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}
```

- [ ] **Step 2: Verificar** — `pnpm build`.
- [ ] **Step 3: Commit** — `git commit -m "feat(front): redimensionado por canvas antes de subir"`.

### Task B5: Cliente de API — timeout, errores tipados y modo mock

**Files:**
- Modify: `frontend/src/api/client.ts` (reescritura)
- Modify: `frontend/.env.example` (documentar `VITE_MOCK`)

**Interfaces:**
- Consumes: contrato de la API con los campos nuevos de Task A2.
- Produces:

```ts
export interface Prediction { label: string; confidence: number }
export interface PredictionResponse {
  top: Prediction;
  predictions: Prediction[];
  inference_ms?: number;
  model_version?: string;
}
export type ApiErrorKind = "invalid-image" | "network";
export class ApiError extends Error { readonly kind: ApiErrorKind }
export async function predict(file: File): Promise<PredictionResponse>;
```

Comportamiento: `AbortController` con timeout de 10 s; HTTP 400/413/415 → `ApiError("invalid-image", detail del cuerpo si existe)`; cualquier otro fallo (red, timeout, 5xx, JSON con forma inesperada — validar que `top.label` sea `string` y `predictions` array) → `ApiError("network")`. Con `import.meta.env.VITE_MOCK === "1"`, `predict()` no toca la red: cicla determinísticamente confident → uncertain → negative → error de red, con ~900 ms de retardo, usando confianzas realistas (0.87 / 0.34-0.30-0.16 / Negative 0.91).

- [ ] **Step 1: Implementación** (reescribir `client.ts` completo con `let mockCall = 0` module-level para el ciclo del mock).
- [ ] **Step 2: Verificar** — `pnpm test && pnpm build` (los tests de verdict siguen tipando contra los tipos nuevos).
- [ ] **Step 3: `.env.example`** — agregar `# Modo demo sin backend (1 = respuestas simuladas)` y `VITE_MOCK=0`.
- [ ] **Step 4: Commit** — `git commit -m "feat(front): cliente con timeout, errores tipados y modo mock"`.

### Task B6: Máquina de estados + pantallas capture / analyzing / error

**Files:**
- Modify: `frontend/src/App.tsx` (reescritura: host de la máquina de estados)
- Create: `frontend/src/components/CaptureScreen.tsx`
- Create: `frontend/src/components/AnalyzingScreen.tsx`
- Create: `frontend/src/components/ErrorScreen.tsx`
- Delete: `frontend/src/components/CameraCapture.tsx`

**Interfaces:**
- Consumes: `downscale` (B4), `predict`/`ApiError` (B5), `classifyVerdict`/`Verdict` (B2).
- Produces (para B7/B8):

```ts
type Screen =
  | { kind: "capture" }
  | { kind: "analyzing"; photoUrl: string }
  | { kind: "result"; photoUrl: string; verdict: Verdict; inferenceMs?: number; modelVersion?: string }
  | { kind: "error"; file: File | null; photoUrl: string | null; message: string };
interface HistoryEntry { id: number; photoUrl: string; verdict: Verdict }
```

Flujo en `App.tsx`: `handleCapture(rawFile)` → `downscale` → `URL.createObjectURL` → estado `analyzing` → `predict` → `classifyVerdict` → `result` + push a historial (máx 5; al desalojar, `URL.revokeObjectURL` del desalojado **solo si** no es la foto en pantalla). `ApiError.kind === "invalid-image"` → pantalla `error` con su mensaje y **sin** botón reintentar (`file: null`); `"network"` → `error` conservando el `File` para reintentar sin re-sacar la foto. El shell: `<main class="h-dvh overflow-hidden flex flex-col bg-bg text-ink">`; cada pantalla scrollea su bloque interno (`overflow-y-auto`) con la CTA fija al pie.

Copy exacto (del spec): capture: titular "Sacá una foto de la maleza.", recuadro punteado "LLENÁ EL RECUADRO", reglas "una sola planta, de cerca · hojas bien visibles, sin sombra dura", botón "Abrir cámara", secundario "o elegí una foto de la galería" (mismo input, sin `capture` en el segundo). analyzing: foto atenuada + línea de barrido (animación CSS, off con reduced-motion), "Analizando…", "Comparando contra 8 especies", barra indeterminada. error de red: "Se cortó la conexión.", "Tu foto está guardada. Tocá para reintentar.", botones "Reintentar" / "Sacar otra foto"; error de imagen inválida: "Esa foto no se pudo leer." + "Sacar otra foto". `role="alert"` en el titular de error.

- [ ] **Step 1: Implementación** de los 4 archivos. En esta task, el estado `result` renderiza un placeholder mínimo inline (`<pre>{JSON.stringify(verdict)}</pre>`) que B7 reemplaza. Como el nuevo `App.tsx` ya no importa `CameraCapture.tsx` ni `ResultCard.tsx`, ambos se borran acá.
- [ ] **Step 2: Verificar** — `pnpm test && pnpm build`; smoke manual con `VITE_MOCK=1 pnpm dev` (capture → analyzing → resultado JSON → error en el 4.º intento).
- [ ] **Step 3: Commit** — `git commit -m "feat(front): shell de viewport con máquina de estados y pantallas de captura/análisis/error"`.

### Task B7: ResultScreen — tres veredictos, comparación lado a lado, compartir

**Files:**
- Create: `frontend/src/components/ResultScreen.tsx`
- Create: `frontend/src/components/ConfidenceBar.tsx`
- Create: `frontend/src/components/SpeciesGrid.tsx`
- Modify: `frontend/src/App.tsx` (reemplazar placeholder de `result`)
- Delete: `frontend/src/components/ResultCard.tsx` (si no se borró en B6)

**Interfaces:**
- Consumes: `Verdict` (B2), `SPECIES`/`speciesByLabel`/`PLACEHOLDER_IMAGE` (B3).
- Produces: `ResultScreen({ photoUrl, verdict, inferenceMs, modelVersion, onRetake }: {...; onRetake: () => void })`; `ConfidenceBar({ value, tone }: { value: number; tone: "accent" | "warn" })`; `SpeciesGrid()` (grilla 2×4 con miniatura + nombre, `onError` → placeholder).

Layout por veredicto (copy del spec):
- **confident:** barra de marca ("weedApi" + `{inferenceMs} ms` + `modelVersion` en `text-muted tabular-nums`, solo si vienen) · fotos lado a lado etiquetadas `TU FOTO` / `REFERENCIA` · nombre `es` grande · científico en `<i>` · chip "ALTA CONFIANZA" + porcentaje `tabular-nums` + `ConfidenceBar tone="accent"` · blurb · `OTRAS` con los 2 runners-up (nombre + %) · botones "Otra foto" (primario) y "Compartir" (solo si `navigator.share` existe; comparte `"weedApi: {es} ({scientific}) — {pct}% de confianza"`).
- **uncertain:** titular ámbar `role="alert"` "No estoy seguro." · "Ninguna especie supera el umbral. Probá más de cerca, con la hoja llenando el recuadro." · `LO MÁS PARECIDO`: candidatos con nombre + % + `ConfidenceBar tone="warn"` · CTA "Probar de nuevo".
- **negative:** titular "No es ninguna de las 8 malezas." · `LO QUE SÍ RECONOZCO`: `<SpeciesGrid />` · CTA "Otra foto".
- Pie común: atribución "Fotos de referencia: dataset DeepWeeds (CC BY 4.0)".

- [ ] **Step 1: Implementación** de los 3 componentes + integración en App.
- [ ] **Step 2: Verificar** — `pnpm test && pnpm build`; smoke con `VITE_MOCK=1` recorriendo los 3 veredictos.
- [ ] **Step 3: Commit** — `git commit -m "feat(front): pantalla de resultado con veredictos, comparación lado a lado y compartir"`.

### Task B8: Historial de sesión

**Files:**
- Create: `frontend/src/components/HistoryStrip.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `HistoryEntry` (B6).
- Produces: `HistoryStrip({ entries, onSelect }: { entries: HistoryEntry[]; onSelect: (e: HistoryEntry) => void })` — tira horizontal de miniaturas (44px, borde por veredicto: accent/warn/muted) visible solo en `capture` cuando hay entradas, bajo el título "ESTA SESIÓN". Tocar una reabre su `result` (sin `inferenceMs`). En memoria solamente; se pierde al recargar (decisión: los objectURL no sobreviven la recarga y sessionStorage con data-URLs arriesga quota — YAGNI).

- [ ] **Step 1: Implementación** + integración (estado `history: HistoryEntry[]` ya creado en B6; acá solo se renderiza y conecta `onSelect`).
- [ ] **Step 2: Verificar** — `pnpm test && pnpm build`; smoke: dos análisis mock → volver a capture → tocar miniatura reabre el veredicto.
- [ ] **Step 3: Commit** — `git commit -m "feat(front): historial de la sesión en la pantalla de captura"`.

### Task B9: PWA manifest + cierre

**Files:**
- Create: `frontend/public/manifest.webmanifest`
- Create: `frontend/public/icon.svg`
- Modify: `frontend/index.html` (link manifest + icon)
- Modify: `README.md` (sección "Cómo correr la demo" con `VITE_MOCK`)

**Interfaces:**
- Produces: manifest `{ name: "weedApi", short_name: "weedApi", display: "standalone", background_color: "#0c1210", theme_color: "#0c1210", icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }] }`. `icon.svg`: hoja estilizada accent sobre fondo `#0c1210`, 512×512 viewBox. Sin service worker (fuera de alcance).

- [ ] **Step 1: Implementación** de manifest, ícono y links en `index.html` (`<link rel="manifest" href="/manifest.webmanifest" />`, `<link rel="icon" href="/icon.svg" type="image/svg+xml" />`).
- [ ] **Step 2: Verificación final completa** — `pnpm test && pnpm build` en frontend; `uv run pytest && uv run ruff check .` en la raíz.
- [ ] **Step 3: README** — agregar bajo el título: cómo levantar API (`make serve`), frontend (`cd frontend && pnpm dev`), y demo sin modelo (`VITE_MOCK=1 pnpm dev`).
- [ ] **Step 4: Commit** — `git commit -m "feat(front): manifest PWA, ícono y docs de la demo"`.
