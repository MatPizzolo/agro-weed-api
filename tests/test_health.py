from fastapi.testclient import TestClient

from weed_api.api.main import app

client = TestClient(app)


def test_health_ok():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_startup_survives_missing_model():
    # models/ está vacío en el repo: el warm-up debe fallar silenciosamente.
    with TestClient(app) as started:
        response = started.get("/health")
    assert response.status_code == 200
