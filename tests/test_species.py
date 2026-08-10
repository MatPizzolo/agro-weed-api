from fastapi.testclient import TestClient

from weed_api.api.main import app
from weed_api.labels import LABELS

client = TestClient(app)


def test_species_returns_all_labels_in_canonical_order():
    response = client.get("/species")
    assert response.status_code == 200
    body = response.json()
    assert [s["label"] for s in body] == LABELS


def test_species_have_scientific_name_except_negative():
    body = client.get("/species").json()
    for s in body:
        if s["label"] == "Negative":
            assert s["scientific"] is None
        else:
            assert s["scientific"]
            assert s["blurb"]
