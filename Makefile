.PHONY: install serve train evaluate test lint up down

install:        ## Instalar dependencias (API + dev)
	uv sync --extra dev

serve:          ## Levantar la API en modo desarrollo
	uv run uvicorn weed_api.api.main:app --reload --host 0.0.0.0 --port 8000

train:          ## Entrenar el clasificador (loguea en MLflow)
	uv run python -m weed_api.training.train

evaluate:       ## Evaluar el modelo entrenado
	uv run python -m weed_api.training.evaluate

test:           ## Correr los tests
	uv run pytest

lint:           ## Chequear estilo con ruff
	uv run ruff check .

up:             ## Levantar todo con Docker (api + mlflow + frontend)
	docker compose up --build

down:           ## Bajar los servicios
	docker compose down
