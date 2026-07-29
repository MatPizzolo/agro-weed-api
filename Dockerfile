# Imagen de la API de inferencia (FastAPI + TensorFlow)
FROM python:3.11-slim

# uv para instalar dependencias
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

ENV PYTHONUNBUFFERED=1 \
    UV_SYSTEM_PYTHON=1 \
    UV_COMPILE_BYTECODE=1

WORKDIR /app

# Instalar dependencias primero (mejor cache)
COPY pyproject.toml uv.lock* README.md ./
RUN uv pip install --system .

# Código fuente
COPY src ./src

EXPOSE 8000
CMD ["uvicorn", "weed_api.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
