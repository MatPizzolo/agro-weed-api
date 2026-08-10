"""Endpoint de predicción: recibe una imagen y devuelve la especie."""

import io
import time
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError

from weed_api.api.deps import get_model
from weed_api.api.schemas import Prediction, PredictionResponse
from weed_api.config import settings
from weed_api.labels import LABELS
from weed_api.preprocessing import preprocess_pil

router = APIRouter(tags=["predict"])


@router.post("/predict", response_model=PredictionResponse)
async def predict(
    file: UploadFile = File(..., description="Foto de la planta (JPEG/PNG)."),
    model: Any = Depends(get_model),
) -> PredictionResponse:
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(status_code=415, detail="El archivo debe ser una imagen.")

    contents = await file.read(settings.max_upload_bytes + 1)
    if len(contents) > settings.max_upload_bytes:
        mb = settings.max_upload_bytes // (1024 * 1024)
        raise HTTPException(
            status_code=413, detail=f"Imagen demasiado grande (máximo {mb} MB)."
        )

    try:
        image = Image.open(io.BytesIO(contents))
    except UnidentifiedImageError:
        raise HTTPException(status_code=400, detail="Archivo de imagen inválido.")

    batch = preprocess_pil(image)
    started = time.perf_counter()
    probabilities = model.predict(batch)[0]
    elapsed_ms = (time.perf_counter() - started) * 1000.0

    predictions = sorted(
        (Prediction(label=LABELS[i], confidence=float(p)) for i, p in enumerate(probabilities)),
        key=lambda pred: pred.confidence,
        reverse=True,
    )
    return PredictionResponse(
        top=predictions[0],
        predictions=predictions,
        inference_ms=elapsed_ms,
        model_version=settings.model_version,
    )
