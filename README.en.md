# Weed Detector

[Español](README.md)

**Take a photo of a plant and it tells you which weed it is, from your phone.**

Image classifier over the [DeepWeeds](https://github.com/AlexOlsen/DeepWeeds) dataset (8 weed species
plus a negative class), served as a FastAPI service and consumed by an installable mobile web app.
The focus is not on squeezing out the last accuracy point: it is on making the path
*train → register → serve → use in your hand* a single path that does not break at the seams.
Preprocessing is shared between training and inference, class ordering lives in one file, and the
interface has an explicit contract about what it may and may not assert.

---

## What it does

| Part | What it does |
|---|---|
| **Inference API** | `POST /predict` with a photo returns the most likely species, the full ranking over all 9 classes, inference time, and the model version that answered. |
| **Mobile web app** | Four screens — capture, analyzing, result, error — designed for one hand and direct sunlight. Installable as a PWA (`manifest.webmanifest`, `display: standalone`). |
| **Honest verdict** | The UI does not show the raw `argmax`. Below 0.65 confidence it shows candidates instead of asserting, and the `Negative` class renders as "none of the 8", never as a species. |
| **Session history** | The last 5 photos stay within reach so you can revisit a result without retaking it. Their `objectURL`s are revoked on eviction. |
| **Mock mode** | The whole app runs with no backend and no trained model, cycling through the four UI scenarios. See [Try it in 30 seconds](#try-it-in-30-seconds). |
| **Species reference** | `GET /species` returns the binomial and a description for each class, with a Spanish common name only where one is verifiable in Argentina. |

## Try it in 30 seconds

No Python, no credentials, no trained model:

```bash
cd frontend && pnpm install && VITE_MOCK=1 pnpm dev
```

`VITE_MOCK=1` intercepts the `/predict` call in `src/api/client.ts` and cycles four responses:
confident verdict (Lantana, 0.87), uncertain verdict (two candidates tied below the threshold),
negative verdict, and a network error. That is the full interface walkthrough, including the states
that are hard to trigger by hand.

## How it works

**The model.** Transfer learning on ResNet50 pretrained on ImageNet, with a frozen base and a dense
9-output head (`src/weed_api/model/architecture.py`). It is the architecture
[Olsen et al. 2019](https://doi.org/10.1038/s41598-018-38343-3) report as reasonable for this
dataset, and it serves as the floor: any later improvement is measured against it.

**One definition of the classes.** `src/weed_api/labels.py` is the source of truth for label ordering,
and that ordering *is* the model's output index. Reordering the list without retraining silently
breaks every prediction, so there is exactly one place where that can happen.

**One preprocessing path.** `preprocess_pil()` in `src/weed_api/preprocessing.py` is used by both
training and `/predict`. Serving with different preprocessing than training is the classic bug in
this kind of project: here there are no two implementations that can drift apart.

**Model loading agnostic to origin.** `model/registry.py` resolves `models:/...` and `runs:/...`
against MLflow, and anything else as a local `.keras` file. The API does not know where the model
comes from; `MODEL_URI` decides.

**Startup that does not fall over.** The `lifespan` in `api/main.py` runs a dummy prediction on boot
so the first real photo does not pay TensorFlow's load and compile cost. If the model does not exist
it logs a warning and **the API still starts**: `/health` and `/species` keep responding and only
`/predict` fails. The model is loaded once, lazily (`lru_cache` in `api/deps.py`).

**The honesty contract lives in code, not in the UI.** `frontend/src/lib/verdict.ts` translates the
raw response into one of three verdicts — `confident`, `uncertain`, `negative` — with the threshold
in a single constant. It is the function with its own unit test.

## API

Base: `http://localhost:8000`. Interactive docs at `/docs`.

| Method | Path | Returns |
|---|---|---|
| `GET` | `/health` | `{"status": "ok"}` — alive even with no model loaded |
| `GET` | `/species` | The 9 classes with binomial, common name (where applicable) and description |
| `POST` | `/predict` | Multipart `file`: top species, full ranking, `inference_ms` and `model_version` |

`/predict` rejects non-images with `415`, anything over `MAX_UPLOAD_BYTES` with `413`, and
undecodable files with `400`. The frontend distinguishes those three from a network error and offers
a retry only when retrying makes sense.

## Stack

- **Model:** TensorFlow / Keras (`>=2.15,<2.17`, which pins Python 3.11).
- **Tracking:** MLflow — training params, metrics and artifacts; it can also act as the production
  model source via `models:/`.
- **API:** FastAPI + uvicorn, Pydantic for the contract and `pydantic-settings` for configuration.
- **Frontend:** React 18 + Vite 5 + Tailwind v4, TypeScript. No router, no store: the app state is a
  four-screen machine in `App.tsx`.
- **Images:** the photo is downscaled client-side (`lib/downscale.ts`) before upload — on 4G that is
  the difference between a wait and a timeout.
- **Packaging:** `uv` for Python, `pnpm` for the frontend, Docker Compose to bring the three services
  up together.

## Layout

```
src/weed_api/
  config.py             # environment-driven settings
  labels.py             # canonical class ordering — source of truth
  species.py            # per-class metadata (binomial, description)
  preprocessing.py      # preprocessing shared by training and inference
  model/
    architecture.py     # frozen ResNet50 + dense head
    registry.py         # loads from a local path or an MLflow URI
  training/
    data.py             # tf.data pipeline for DeepWeeds
    train.py            # training with MLflow tracking
    evaluate.py         # evaluation of the trained model
  api/
    main.py             # FastAPI app, CORS and warm-up
    deps.py             # model as a lazy singleton
    schemas.py          # request and response contracts
    routes/             # health.py · predict.py · species.py
frontend/
  src/
    App.tsx             # four-screen state machine
    api/client.ts       # /predict client + mock mode
    lib/verdict.ts      # threshold and honesty contract (+ test)
    lib/downscale.ts    # photo downscaling before upload
    components/         # CaptureScreen, AnalyzingScreen, ResultScreen,
                        # ErrorScreen, ConfidenceBar, SpeciesGrid, HistoryStrip
  public/               # icon.svg and manifest.webmanifest
notebooks/
  01_explore_deepweeds.ipynb
tests/
models/                 # trained weights (not versioned)
data/                   # DeepWeeds dataset (not versioned)
```

## Running it

Python 3.11 (pinned by TensorFlow), [`uv`](https://docs.astral.sh/uv/) and `pnpm`.

```bash
cp .env.example .env
make install                  # uv sync --extra dev
make serve                    # API at http://localhost:8000

cd frontend && cp .env.example .env
pnpm install && pnpm dev      # web at http://localhost:5173
```

Everything at once with Docker (api :8000 + MLflow :5000 + frontend :5173):

```bash
make up
make down
```

### Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `MODEL_URI` | `models/weed_classifier.keras` | Local `.keras` path or MLflow URI (`models:/weed-classifier/Production`) |
| `MODEL_VERSION` | `dev` | Reported in every `/predict` response |
| `MLFLOW_TRACKING_URI` | `http://localhost:5000` | Tracking server |
| `MLFLOW_EXPERIMENT` | `deepweeds` | Experiment name |
| `CORS_ORIGINS` | `http://localhost:5173` | Allowed origins, comma-separated |
| `IMAGE_SIZE` | `224` | Input side length expected by the model |
| `MAX_UPLOAD_BYTES` | `15728640` | Upload size cap (15 MB) |
| `VITE_API_URL` | `http://localhost:8000` | *(frontend)* API base URL |
| `VITE_MOCK` | `0` | *(frontend)* `1` = mocked responses, no backend |

Only the first five and the two frontend ones are in the `.env.example` files; the rest default in
`src/weed_api/config.py` and can be overridden through the environment.

### Training

```bash
make train        # python -m weed_api.training.train — logs to MLflow
make evaluate
```

## Tests

```bash
make test                     # pytest: health, predict, preprocessing, species
make lint                     # ruff check
cd frontend && pnpm test      # vitest: the verdict contract
```

The `/predict` tests cover the error paths (invalid type, unreadable image, oversized upload) with a
mocked model, so they run without trained weights.

## Status

| Part | Status |
|---|---|
| API, contracts and error handling | Working, with tests |
| Full frontend in mock mode | Working, with a verdict test |
| DeepWeeds dataset loading | **Not implemented.** `training/data.py` raises `NotImplementedError`: the dataset still needs to be fetched into `data/` and its label CSV parsed |
| Training | Blocked by the above — `make train` does not run yet |
| Trained model | None. `models/` holds only `.gitkeep`, so `/predict` fails against a real backend until one exists |
| Confidence threshold | Provisional at 0.65. To be tuned from the trained model's confusion matrix |

Two minor infrastructure loose ends: `frontend/Dockerfile` installs with `npm` and looks for a
`package-lock.json` that does not exist (the repo uses `pnpm`), and the compose `frontend` service
runs Vite in dev mode rather than a build.

## License

The DeepWeeds dataset carries its own license — see
[the original repository](https://github.com/AlexOlsen/DeepWeeds). This repo does not declare one
yet.
