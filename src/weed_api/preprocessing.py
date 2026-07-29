"""Preprocesamiento de imágenes, compartido por entrenamiento e inferencia.

Mantener una única implementación evita el clásico bug de servir con un
preprocesamiento distinto al usado al entrenar.
"""

import numpy as np
from PIL import Image

from weed_api.config import settings


def preprocess_pil(image: Image.Image, image_size: int | None = None) -> np.ndarray:
    """Convierte una imagen PIL en un batch (1, H, W, 3) float32 normalizado a [0, 1]."""
    size = image_size or settings.image_size
    image = image.convert("RGB").resize((size, size))
    array = np.asarray(image, dtype=np.float32) / 255.0
    return np.expand_dims(array, axis=0)
