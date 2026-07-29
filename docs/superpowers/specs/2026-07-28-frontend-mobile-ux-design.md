# Frontend mobile-first UI/UX — diseño

**Fecha:** 2026-07-28
**Alcance:** solo `frontend/`. El contrato de la API (`POST /predict`) no cambia.

## Contexto

`frontend/` hoy son ~120 líneas de React sin una sola regla de CSS: un `<h1>`, un
`<label>` con `<input type="file" capture="environment">`, y un `<ul>` con las 9
clases y su porcentaje. Funciona, pero no comunica nada.

El público objetivo es un **agrónomo en un stand**: no técnico, con el celular en
la mano, sin haber leído nada, y con alguien mirándolo. El resultado tiene que
sentirse como una herramienta de campo terminada, no como una demo de ML.

Dos hechos del dominio condicionan todo el diseño:

1. Las 8 clases de DeepWeeds son **malezas australianas de pastizal**, nombradas
   en inglés. Casi cualquier planta que un agrónomo argentino le apunte está
   **fuera de dominio**.
2. El modelo tiene una novena clase, `Negative`, que significa "ninguna de las 8".
   Es una respuesta de otra naturaleza y no puede renderizarse como una fila más.

De ahí sale el principio rector: **la honestidad es la característica de producto**.
Un veredicto seguro cuando el modelo lo merece; una negativa clara cuando no.

## Decisiones tomadas

| Decisión | Elección |
|---|---|
| Público | Agrónomo / usuario de campo (no evaluador técnico) |
| Nombres de especie | Español + científico + foto de referencia |
| Flujo | Un solo shell de viewport completo, sin router, sin paso de confirmación |
| Incertidumbre | Veredicto primero, pero se niega a afirmar bajo umbral |
| Stack de estilos | Tailwind v4 |
| Dirección visual | **Instrumento de campo**: oscuro, alto contraste, comparación lado a lado |
| Pantalla inicial | **Encuadre guiado**: enseña a sacar la foto |
| Estado `Negative` | **Con dominio**: muestra la grilla de las 8 especies que sí reconoce |

## Arquitectura

Shell de viewport completo que alterna entre cuatro estados. Sin router. El
shell ocupa exactamente el viewport y no scrollea; si el contenido de una
pantalla no entra (caso peor: `negative` con la grilla de 8 especies en un
celular chico), scrollea **ese bloque de contenido**, nunca la página, y la
CTA queda siempre visible al pie.

```
capture ──▶ analyzing ──┬─▶ result
   ▲                    └─▶ error
   └──────────────────────────┘
```

`result` se subdivide en tres **veredictos**, que es donde vive la sustancia del
diseño: `confident`, `uncertain`, `negative`.

### Estructura de archivos

```
frontend/src/
  App.tsx                   host de la máquina de estados (~60 líneas)
  lib/verdict.ts            clasificación pura del veredicto   ← con tests
  lib/downscale.ts          redimensionado por canvas
  data/species.ts           tabla de metadatos, 9 entradas
  api/client.ts             predict() + modo mock
  components/
    CaptureScreen.tsx
    AnalyzingScreen.tsx
    ResultScreen.tsx
    ErrorScreen.tsx
    SpeciesGrid.tsx         grilla de las 8 especies (la usa el estado negative)
    ConfidenceBar.tsx
  index.css                 Tailwind v4 + tokens @theme
frontend/public/species/    8 recortes de referencia
```

### Flujo de datos

```
File (cámara) → downscale() → predict() → PredictionResponse
                                              → classifyVerdict() → Verdict
                                                                       → pantalla
```

## La capa de veredicto

Es el núcleo del diseño y una función pura, sin dependencias:

```ts
// lib/verdict.ts
export type Verdict =
  | { kind: 'confident'; species: Species; confidence: number; runnersUp: Prediction[] }
  | { kind: 'uncertain'; candidates: Prediction[] }
  | { kind: 'negative' }

export const CONFIDENCE_THRESHOLD = 0.65

export function classifyVerdict(response: PredictionResponse): Verdict
```

Reglas, en orden:

1. `top.label === 'Negative'` → `negative`
2. `top.confidence < CONFIDENCE_THRESHOLD` → `uncertain` (con los 3 mejores candidatos)
3. si no → `confident`

Aislarla como función pura permite demostrar por test —sin navegador, sin modelo,
sin red— que *un Parkinsonia al 34% nunca se renderiza como afirmación*. Son ~20
líneas y es la única pieza cuyo test es innegociable.

**El umbral 0.65 es provisorio.** No hay modelo entrenado todavía, así que no se
conoce la distribución real de confianzas. Vive como una única constante nombrada
para que ajustarlo después del entrenamiento sea una línea.

## Pantallas

### `capture` — encuadre guiado

Fondo oscuro. Titular "Sacá una foto de la maleza." Debajo, una ilustración de
encuadre con recuadro punteado y la leyenda "LLENÁ EL RECUADRO", más dos reglas
de tiro: *una sola planta, de cerca* · *hojas bien visibles, sin sombra dura*.
Botón primario "Abrir cámara"; texto secundario "o elegí una foto de la galería".

Sigue siendo un `<input type="file" capture="environment">`. No se usa
MediaDevices: en un stand, el celular de un desconocido tiene que funcionar al
primer intento, sin permisos ni HTTPS.

Enseñar el encuadre ataca la causa real de la mayoría de los errores en vivo: la
foto de entrada.

### `analyzing`

La foto del usuario permanece en pantalla, atenuada, con una línea de barrido.
Titular "Analizando…", subtítulo "Comparando contra 8 especies", barra de
progreso indeterminada. La foto nunca desaparece: la app jamás parece haberla
perdido.

### `result` · veredicto `confident`

De arriba a abajo: barra de marca con el tiempo de inferencia · **tu foto y la
foto de referencia lado a lado**, etiquetadas `TU FOTO` / `REFERENCIA` · nombre
común en español, grande · nombre científico en itálica · etiqueta "ALTA
CONFIANZA" con el porcentaje en cifras tabulares y una barra · descripción breve
· lista `OTRAS` con los 2 candidatos siguientes · botón "Otra foto".

La comparación lado a lado es el motivo por el que se eligió "español +
científico + foto": el usuario **confirma visualmente** el veredicto en vez de
confiar en un número.

### `result` · veredicto `uncertain`

Titular ámbar "No estoy seguro.", explicación "Ninguna especie supera el umbral.
Probá más de cerca, con la hoja llenando el recuadro" —reutiliza el lenguaje de
encuadre de la pantalla inicial—, y los 3 mejores candidatos degradados a secundarios bajo
"LO MÁS PARECIDO". CTA primaria: "Probar de nuevo".

No afirma. Explica y pide una foto mejor.

### `result` · veredicto `negative`

Titular "No es ninguna de las 8 malezas." Debajo, `LO QUE SÍ RECONOZCO`: la
grilla de las 8 especies con miniatura y nombre.

Es el momento exacto en que el usuario se pregunta "¿y entonces qué sabés?".
Enseñar el alcance acá recupera la credibilidad sin costarle velocidad a la
pantalla inicial.

### `error`

Titular "Se cortó la conexión.", texto "Tu foto está guardada. Tocá para
reintentar.", botón "Reintentar" y salida secundaria "Sacar otra foto". El
`File` ya redimensionado queda en el estado para que reintentar no obligue a
volver a sacar la foto.

## Metadatos de especies

Tabla estática nueva, `data/species.ts`, indexada por la etiqueta en inglés
**exacta** de `src/weed_api/labels.py`:

```ts
{ id: 'Lantana', es: 'Lantana', scientific: 'Lantana camara',
  blurb: 'Arbusto invasor…', image: '/species/lantana.jpg' }
```

Mapeo inglés → binomial (según el paper de DeepWeeds, Olsen et al. 2019):

| Etiqueta del modelo | Nombre científico |
|---|---|
| Chinee apple | *Ziziphus mauritiana* |
| Lantana | *Lantana camara* |
| Parkinsonia | *Parkinsonia aculeata* |
| Parthenium | *Parthenium hysterophorus* |
| Prickly acacia | *Vachellia nilotica* (syn. *Acacia nilotica*) |
| Rubber vine | *Cryptostegia grandiflora* |
| Siam weed | *Chromolaena odorata* |
| Snake weed | *Stachytarpheta* spp. |

**Requisito de verificación (bloqueante antes de mostrarlo a un agrónomo):** esta
tabla se transcribe de memoria y debe contrastarse contra el paper antes de
publicarse. Un binomial equivocado frente a ese público es peor que no mostrar
ninguno.

**Nombres en español:** varias de estas especies no tienen nombre común
establecido en Argentina. Donde no exista uno verificable, el titular de la
pantalla de resultado usa el **nombre científico** en lugar de una traducción
inventada. No se inventan nombres vernáculos.

**Fotos de referencia:** salen del propio dataset DeepWeeds (CC BY 4.0 → requiere
atribución en un pie de página). No pueden generarse hasta que `data/` esté
poblado, así que la tabla se entrega con los slots de imagen cableados y un
placeholder neutro detrás.

## Dos piezas no visuales de las que depende la demo

### Redimensionado en el cliente

Una foto de celular moderno pesa 4–12 MB y el wifi de un stand es malo. Un
resize por canvas a 1024 px de lado mayor con JPEG q0.85 la deja en ~200 KB.
Es la diferencia entre una demo de un segundo y una de ocho, y cuesta ~25
líneas. El modelo preprocesa a una entrada mucho más chica de todos modos, así
que no se pierde información útil.

### Modo mock

`models/` está vacío y no hay modelo entrenado: hoy nada de esto puede correrse
ni evaluarse. `client.ts` incorpora una rama `VITE_MOCK=1` que devuelve
respuestas predefinidas con un retardo simulado —una por cada tipo de veredicto,
más un caso de error— para poder construir, demostrar y revisar la UI completa
antes de que exista el modelo. Sin esto, el trabajo no es verificable.

## Estilos

Tailwind v4 mediante el plugin `@tailwindcss/vite`. No hay `tailwind.config.js`:
la paleta, la escala tipográfica y los radios se declaran como tokens `@theme`
en `index.css`, de modo que el sistema de diseño quede visible para cualquiera
que lea el repo.

Restricciones de campo:

- Tema oscuro fijo. Alto contraste (legible bajo sol directo).
- Objetivos táctiles ≥ 44 px.
- Cifras de confianza en `font-variant-numeric: tabular-nums`.
- Se respeta `prefers-reduced-motion`: la línea de barrido y las transiciones se
  desactivan.
- `<html lang="es">` ya está correcto. Los estados de error y el veredicto usan
  `role="alert"`.

## Manejo de errores

| Caso | Comportamiento |
|---|---|
| Fallo de red / API caída | Pantalla `error`, conserva el `File`, ofrece reintentar |
| HTTP 400 (imagen inválida) | Pantalla `error` con mensaje propio: el archivo no es una imagen válida |
| Timeout (abort a los 10 s) | Igual que fallo de red |
| Respuesta con forma inesperada | Se trata como fallo de red; no se renderiza un veredicto a medias |

## Testing

Se agrega **vitest** como dependencia de desarrollo (sin configuración).

- `lib/verdict.ts` — tests unitarios: umbral por encima y por debajo, `Negative`
  como top, empates, `Negative` presente pero no top. Es el contrato de
  honestidad del producto.
- `lib/downscale.ts` — sin test unitario (depende de canvas); se valida a mano.
- Componentes — sin tests. El proyecto tiene 9 días y el valor está en la lógica
  de veredicto.

## Fuera de alcance

- Cambios en la API o en el modelo.
- Historial de predicciones, cuentas de usuario, persistencia.
- Modo offline / PWA / service worker.
- Internacionalización más allá del español.
- Live viewfinder con MediaDevices (evaluado y descartado: riesgo de permisos y
  compatibilidad en el celular de un desconocido).
