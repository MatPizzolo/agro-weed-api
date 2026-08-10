"""Punto de entrada de la API FastAPI."""

import logging
from contextlib import asynccontextmanager

import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from weed_api.api.deps import get_model
from weed_api.api.routes import health, predict, species
from weed_api.config import settings

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Warm-up: la primera inferencia de TF paga carga+compilación; hacerla acá
    # evita que la pague la primera foto real. Si el modelo no existe, la API
    # arranca igual (/health sigue vivo) y /predict fallará hasta que exista.
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


app = FastAPI(
    title="weedApi",
    description="Clasificador de malezas DeepWeeds (8 especies).",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(predict.router)
app.include_router(species.router)
