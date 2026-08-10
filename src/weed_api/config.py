"""Configuración de la aplicación (leída de entorno / .env)."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Modelo a servir: ruta local o URI de MLflow.
    model_uri: str = "models/weed_classifier.keras"

    # Versión del modelo servido (se informa en cada respuesta de /predict).
    model_version: str = "dev"

    # Tracking de experimentos.
    mlflow_tracking_uri: str = "http://localhost:5000"
    mlflow_experiment: str = "deepweeds"

    # Orígenes permitidos para CORS (coma-separados).
    cors_origins: str = "http://localhost:5173"

    # Tamaño de imagen esperado por el modelo (alto = ancho).
    image_size: int = 224

    # Tamaño máximo aceptado para la foto subida a /predict.
    max_upload_bytes: int = 15 * 1024 * 1024

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
