import io

import numpy as np
from fastapi.testclient import TestClient
from PIL import Image

from weed_api.api.deps import get_model
from weed_api.api.main import app
from weed_api.labels import NUM_CLASSES


class FakeModel:
    def predict(self, batch):
        probs = np.full((1, NUM_CLASSES), 0.05, dtype=np.float32)
        probs[0, 1] = 0.6  # Lantana
        return probs


def make_client() -> TestClient:
    app.dependency_overrides[get_model] = lambda: FakeModel()
    return TestClient(app)


def jpeg_bytes(size=(64, 64)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", size, (10, 120, 40)).save(buf, format="JPEG")
    return buf.getvalue()


def test_predict_includes_timing_and_version():
    client = make_client()
    response = client.post(
        "/predict", files={"file": ("foto.jpg", jpeg_bytes(), "image/jpeg")}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["top"]["label"] == "Lantana"
    assert body["inference_ms"] >= 0
    assert body["model_version"] == "dev"
    app.dependency_overrides.clear()
