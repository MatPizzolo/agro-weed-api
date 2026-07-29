"""Carga del modelo entrenado, abstrayendo el origen (local o MLflow)."""

from typing import Any


def load_model(model_uri: str) -> Any:
    """Carga un modelo Keras desde una ruta local o una URI de MLflow.

    - URIs `models:/...` o `runs:/...` -> se resuelven vía mlflow.
    - Cualquier otra cosa -> se trata como ruta de archivo local (.keras).
    """
    if model_uri.startswith(("models:/", "runs:/")):
        import mlflow.keras

        return mlflow.keras.load_model(model_uri)

    import tensorflow as tf

    return tf.keras.models.load_model(model_uri)
