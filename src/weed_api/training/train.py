"""Entrenamiento del clasificador con tracking en MLflow.

Uso:
    uv run python -m weed_api.training.train
"""

from weed_api.config import settings
from weed_api.model.architecture import build_model
from weed_api.training.data import load_datasets


def main(epochs: int = 10, batch_size: int = 32) -> None:
    import mlflow

    mlflow.set_tracking_uri(settings.mlflow_tracking_uri)
    mlflow.set_experiment(settings.mlflow_experiment)

    train_ds, val_ds = load_datasets(batch_size=batch_size)
    model = build_model()

    with mlflow.start_run():
        mlflow.log_params({"epochs": epochs, "batch_size": batch_size})
        mlflow.keras.autolog()
        model.fit(train_ds, validation_data=val_ds, epochs=epochs)
        mlflow.keras.log_model(model, artifact_path="model")


if __name__ == "__main__":
    main()
