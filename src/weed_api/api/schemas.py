"""Modelos Pydantic de entrada/salida de la API."""

from pydantic import BaseModel, Field


class Prediction(BaseModel):
    """Una especie candidata con su probabilidad."""

    label: str = Field(..., description="Nombre de la especie de maleza.")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Probabilidad [0, 1].")


class PredictionResponse(BaseModel):
    """Respuesta del endpoint /predict."""

    top: Prediction = Field(..., description="Predicción más probable.")
    predictions: list[Prediction] = Field(
        ..., description="Todas las especies ordenadas por probabilidad."
    )
