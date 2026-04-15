import pytest
from rest_framework.test import APIClient

@pytest.fixture
def client():
    return APIClient()

@pytest.mark.django_db
def test_publication_detail_missing_id(client):
    response = client.get("/api/search/publications/detail/")
    assert response.status_code == 400
    assert response.json()["error"] == "Missing query parameter: id"

@pytest.mark.django_db
def test_publication_detail_pdf_field_present_in_response(client):
    response = client.get("/api/search/publications/detail/?id=https://openalex.org/W2741809807")
    assert response.status_code == 200
    data = response.json()
    assert "pdf_url" in data