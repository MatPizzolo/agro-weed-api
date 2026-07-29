"""Dependencias de FastAPI: carga perezosa y única del modelo."""

from functools import lru_cache
from typing import Any

from weed_api.config import settings
from weed_api.model.registry import load_model


@lru_cache(maxsize=1)
def get_model() -> Any:
    """Devuelve el modelo cargado (singleton perezoso).

    Se carga la primera vez que se pide y se reutiliza en cada request.
    """
    return load_model(settings.model_uri)
