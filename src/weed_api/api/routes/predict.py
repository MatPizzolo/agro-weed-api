"""Endpoint de predicción: recibe una imagen y devuelve la especie."""

import io
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError

from weed_api.api.deps import get_model
from weed_api.api.schemas import Prediction, PredictionResponse
from weed_api.labels import LABELS
from weed_api.preprocessing import preprocess_pil

router = APIRouter(tags=["predict"])


@router.post("/predict", response_model=PredictionResponse)
async def predict(
    file: UploadFile = File(..., description="Foto de la planta (JPEG/PNG)."),
    model: Any = Depends(get_model),
) -> PredictionResponse:
    try:
        image = Image.open(io.BytesIO(await file.read()))
    except UnidentifiedImageError:
        raise HTTPException(status_code=400, detail="Archivo de imagen inválido.")

    batch = preprocess_pil(image)
    probabilities = model.predict(batch)[0]

    predictions = sorted(
        (Prediction(label=LABELS[i], confidence=float(p)) for i, p in enumerate(probabilities)),
        key=lambda pred: pred.confidence,
        reverse=True,
    )
    return PredictionResponse(top=predictions[0], predictions=predictions)
