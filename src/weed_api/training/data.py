"""Pipeline de datos DeepWeeds con tf.data.

TODO: descargar/ubicar el dataset DeepWeeds en data/ y adaptar la carga
(el dataset trae un CSV con nombre de imagen -> etiqueta).
"""

from pathlib import Path

from weed_api.config import settings

DATA_DIR = Path("data")


def load_datasets(data_dir: Path = DATA_DIR, batch_size: int = 32):
    """Devuelve (train_ds, val_ds) como tf.data.Dataset.

    Placeholder: implementar la lectura real de DeepWeeds.
    """
    size = settings.image_size
    raise NotImplementedError(
        f"Implementar carga de DeepWeeds desde {data_dir} "
        f"(imágenes {size}x{size}, batch={batch_size})."
    )
