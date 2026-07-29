"""Evaluación del modelo entrenado: métricas y matriz de confusión.

Uso:
    uv run python -m weed_api.training.evaluate
"""

from weed_api.config import settings
from weed_api.model.registry import load_model
from weed_api.training.data import load_datasets


def main() -> None:
    _, val_ds = load_datasets()
    model = load_model(settings.model_uri)

    loss, accuracy = model.evaluate(val_ds)
    print(f"loss={loss:.4f} accuracy={accuracy:.4f}")

    # TODO: matriz de confusión + reporte por clase (sklearn / seaborn).


if __name__ == "__main__":
    main()
