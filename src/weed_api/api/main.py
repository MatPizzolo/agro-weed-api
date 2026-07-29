"""Punto de entrada de la API FastAPI."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from weed_api.api.routes import health, predict
from weed_api.config import settings

app = FastAPI(
    title="weedApi",
    description="Clasificador de malezas DeepWeeds (8 especies).",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(predict.router)
