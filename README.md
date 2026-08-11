# Detector de malezas

[English](README.en.md)

**Sacás una foto de una planta y te dice qué maleza es, desde el celular.**

Clasificador de imágenes sobre el dataset [DeepWeeds](https://github.com/AlexOlsen/DeepWeeds)
(8 especies de maleza + una clase negativa), servido como API FastAPI y consumido por una web mobile
instalable. El foco no está en exprimir el último punto de accuracy: está en que el camino
*entrenar → registrar → servir → usar en la mano* sea uno solo y no se rompa en las costuras. El
preprocesamiento es compartido entre entrenamiento e inferencia, el orden de clases vive en un solo
archivo, y la interfaz tiene un contrato explícito sobre qué puede afirmar y qué no.

---

## Qué hace

| Parte | Qué hace |
|---|---|
| **API de inferencia** | `POST /predict` con una foto devuelve la especie más probable, el ranking completo de las 9 clases, el tiempo de inferencia y la versión del modelo que respondió. |
| **Web mobile** | Cuatro pantallas —capturar, analizando, resultado, error— pensadas para una mano y luz de sol. Instalable como PWA (`manifest.webmanifest`, `display: standalone`). |
| **Veredicto honesto** | La UI no muestra el `argmax` crudo. Por debajo de 0.65 de confianza muestra candidatos en vez de afirmar, y la clase `Negative` se renderiza como "no es ninguna de las 8", nunca como una especie. |
| **Historial de sesión** | Las últimas 5 fotos quedan a mano para volver a un resultado sin repetir la captura. Las `objectURL` se liberan al desalojarlas. |
| **Modo mock** | La app entera corre sin backend ni modelo entrenado, ciclando los cuatro escenarios de la UI. Ver [Probarlo en 30 segundos](#probarlo-en-30-segundos). |
| **Ficha de especies** | `GET /species` devuelve binomial y descripción de cada clase, con nombre común en español solo donde es verificable en Argentina. |

## Probarlo en 30 segundos

Sin Python, sin credenciales, sin modelo entrenado:

```bash
cd frontend && pnpm install && VITE_MOCK=1 pnpm dev
```

`VITE_MOCK=1` intercepta la llamada a `/predict` en `src/api/client.ts` y cicla cuatro respuestas:
veredicto seguro (Lantana, 0.87), veredicto incierto (dos candidatos empatados por debajo del
umbral), veredicto negativo, y un error de red. Es el recorrido completo de la interfaz, incluidos
los estados que son difíciles de provocar a mano.

## Cómo funciona

**El modelo.** Transfer learning sobre ResNet50 preentrenada en ImageNet, con la base congelada y
una cabeza densa de 9 salidas (`src/weed_api/model/architecture.py`). Es la arquitectura que
[Olsen et al. 2019](https://doi.org/10.1038/s41598-018-38343-3) reportan como razonable para este
dataset, y sirve de piso: cualquier mejora posterior se mide contra ella.

**Una sola definición de las clases.** `src/weed_api/labels.py` es la fuente de verdad del orden de
las etiquetas, y ese orden *es* el índice de salida del modelo. Reordenar la lista sin reentrenar
rompe todas las predicciones en silencio, así que hay un solo lugar donde puede pasar.

**Un solo preprocesamiento.** `preprocess_pil()` en `src/weed_api/preprocessing.py` lo usan tanto el
entrenamiento como `/predict`. Servir con un preprocesamiento distinto al del entrenamiento es el
bug clásico de este tipo de proyecto: acá no hay dos implementaciones que puedan divergir.

**Carga del modelo indiferente al origen.** `model/registry.py` resuelve `models:/...` y `runs:/...`
contra MLflow, y cualquier otra cosa como archivo `.keras` local. La API no sabe de dónde viene el
modelo; `MODEL_URI` decide.

**Arranque que no se cae.** El `lifespan` de `api/main.py` hace una predicción dummy al levantar,
para que la primera foto real no pague la carga y compilación de TensorFlow. Si el modelo no existe,
loguea un warning y **la API arranca igual**: `/health` y `/species` siguen respondiendo y solo
`/predict` falla. El modelo se carga una sola vez, perezosamente (`lru_cache` en `api/deps.py`).

**El contrato de honestidad está en el código, no en la UI.** `frontend/src/lib/verdict.ts` traduce
la respuesta cruda a uno de tres veredictos —`confident`, `uncertain`, `negative`— con el umbral en
una constante única. Es la función con test unitario propio.

## API

Base: `http://localhost:8000`. Documentación interactiva en `/docs`.

| Método | Ruta | Qué devuelve |
|---|---|---|
| `GET` | `/health` | `{"status": "ok"}` — vivo aunque no haya modelo cargado |
| `GET` | `/species` | Lista de las 9 clases con binomial, nombre común (cuando aplica) y descripción |
| `POST` | `/predict` | Multipart con `file`: especie top, ranking completo, `inference_ms` y `model_version` |

`/predict` rechaza lo que no es imagen con `415`, lo que supera `MAX_UPLOAD_BYTES` con `413`, y lo
que no se puede decodificar con `400`. El frontend distingue esos tres del error de red y ofrece
reintentar solo cuando reintentar tiene sentido.

## Stack

- **Modelo:** TensorFlow / Keras (`>=2.15,<2.17`, que fija Python 3.11).
- **Tracking:** MLflow — parámetros, métricas y artefactos del entrenamiento; también puede servir de
  origen del modelo en producción vía `models:/`.
- **API:** FastAPI + uvicorn, Pydantic para el contrato y `pydantic-settings` para la configuración.
- **Frontend:** React 18 + Vite 5 + Tailwind v4, TypeScript. Sin router ni store: el estado de la app
  es una máquina de cuatro pantallas en `App.tsx`.
- **Imágenes:** la foto se reduce en el cliente (`lib/downscale.ts`) antes de subirla — en 4G eso es
  la diferencia entre una espera y un timeout.
- **Empaquetado:** `uv` para Python, `pnpm` para el frontend, Docker Compose para levantar los tres
  servicios juntos.

## Estructura

```
src/weed_api/
  config.py             # settings por variables de entorno
  labels.py             # orden canónico de las clases — fuente de verdad
  species.py            # metadatos de cada clase (binomial, descripción)
  preprocessing.py      # preprocesamiento compartido train/inferencia
  model/
    architecture.py     # ResNet50 congelada + cabeza densa
    registry.py         # carga desde ruta local o URI de MLflow
  training/
    data.py             # pipeline tf.data de DeepWeeds
    train.py            # entrenamiento con tracking en MLflow
    evaluate.py         # evaluación del modelo entrenado
  api/
    main.py             # app FastAPI, CORS y warm-up
    deps.py             # modelo como singleton perezoso
    schemas.py          # contratos de request y response
    routes/             # health.py · predict.py · species.py
frontend/
  src/
    App.tsx             # máquina de estados de las 4 pantallas
    api/client.ts       # cliente de /predict + modo mock
    lib/verdict.ts      # umbral y contrato de honestidad (+ test)
    lib/downscale.ts    # reducción de la foto antes de subirla
    components/         # CaptureScreen, AnalyzingScreen, ResultScreen,
                        # ErrorScreen, ConfidenceBar, SpeciesGrid, HistoryStrip
  public/               # icon.svg y manifest.webmanifest
notebooks/
  01_explore_deepweeds.ipynb
tests/
models/                 # pesos entrenados (no versionados)
data/                   # dataset DeepWeeds (no versionado)
```

## Cómo correrlo

Python 3.11 (lo fija TensorFlow), [`uv`](https://docs.astral.sh/uv/) y `pnpm`.

```bash
cp .env.example .env
make install                  # uv sync --extra dev
make serve                    # API en http://localhost:8000

cd frontend && cp .env.example .env
pnpm install && pnpm dev      # web en http://localhost:5173
```

Todo junto en Docker (api :8000 + MLflow :5000 + frontend :5173):

```bash
make up
make down
```

### Variables de entorno

| Variable | Default | Para qué |
|---|---|---|
| `MODEL_URI` | `models/weed_classifier.keras` | Ruta local `.keras` o URI de MLflow (`models:/weed-classifier/Production`) |
| `MODEL_VERSION` | `dev` | Se informa en cada respuesta de `/predict` |
| `MLFLOW_TRACKING_URI` | `http://localhost:5000` | Servidor de tracking |
| `MLFLOW_EXPERIMENT` | `deepweeds` | Nombre del experimento |
| `CORS_ORIGINS` | `http://localhost:5173` | Orígenes permitidos, separados por coma |
| `IMAGE_SIZE` | `224` | Lado de la imagen que espera el modelo |
| `MAX_UPLOAD_BYTES` | `15728640` | Tope de tamaño de la foto subida (15 MB) |
| `VITE_API_URL` | `http://localhost:8000` | *(frontend)* Base de la API |
| `VITE_MOCK` | `0` | *(frontend)* `1` = respuestas simuladas, sin backend |

Solo las cinco primeras y las dos del frontend están en los `.env.example`; las demás tienen default
en `src/weed_api/config.py` y se pueden pisar por entorno.

### Entrenamiento

```bash
make train        # python -m weed_api.training.train — loguea en MLflow
make evaluate
```

## Tests

```bash
make test                     # pytest: health, predict, preprocessing, species
make lint                     # ruff check
cd frontend && pnpm test      # vitest: el contrato de veredicto
```

Los tests de `/predict` cubren los caminos de error (tipo inválido, imagen ilegible, exceso de
tamaño) con el modelo mockeado, así que corren sin pesos entrenados.

## Estado

| Parte | Estado |
|---|---|
| API, contratos y manejo de errores | Andando, con tests |
| Frontend completo en modo mock | Andando, con test del veredicto |
| Carga del dataset DeepWeeds | **Sin implementar.** `training/data.py` levanta `NotImplementedError`: falta bajar el dataset a `data/` y leer su CSV de etiquetas |
| Entrenamiento | Bloqueado por lo anterior — `make train` no corre todavía |
| Modelo entrenado | No hay. `models/` tiene solo `.gitkeep`, así que `/predict` falla contra un backend real hasta que exista uno |
| Umbral de confianza | Provisorio en 0.65. Se ajusta con la matriz de confusión del modelo entrenado |

Dos detalles menores de infraestructura pendientes: `frontend/Dockerfile` instala con `npm` y busca
un `package-lock.json` que no existe (el repo usa `pnpm`), y el servicio `frontend` del compose corre
Vite en modo desarrollo, no un build.

## Licencia

El dataset DeepWeeds tiene su propia licencia — ver
[el repositorio original](https://github.com/AlexOlsen/DeepWeeds). Este repo todavía no declara la
suya.
