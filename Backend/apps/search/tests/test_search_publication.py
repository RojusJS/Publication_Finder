import pytest
from rest_framework.test import APIClient

@pytest.fixture
def client():
    return APIClient()

@pytest.mark.django_db
def test_search_publications_success_real_openalex(client):
    response = client.get("/api/search/publications/?q=machine learning")
    assert response.status_code == 200
    data = response.json()
    assert "query" in data
    assert "count" in data
    assert "total_count" in data
    assert "results" in data
    assert data["query"] == "machine learning"
    assert isinstance(data["results"], list)
    if data["results"]:
        first = data["results"][0]
        assert "title" in first
        assert "year" in first
        assert "authors" in first
        assert "doi" in first

@pytest.mark.django_db
def test_search_publications_missing_query(client):
    response = client.get("/api/search/publications/")
    assert response.status_code == 400
    assert response.json()["error"] == "Missing query parameter: q"

@pytest.mark.django_db
def test_search_publications_invalid_sort(client):
    response = client.get("/api/search/publications/?q=test&sort=wrong")
    assert response.status_code == 400
    assert response.json()["error"] == "Invalid sort value"

@pytest.mark.django_db
def test_search_publications_invalid_search_by(client):
    response = client.get("/api/search/publications/?q=test&search_by=wrong")
    assert response.status_code == 400
    assert response.json()["error"] == "Invalid search_by value"

@pytest.mark.django_db
def test_search_publications_invalid_year_range(client):
    response = client.get("/api/search/publications/?q=test&year_from=2025&year_to=2020")
    assert response.status_code == 400
    assert response.json()["error"] == "year_from cannot be greater than year_to"

@pytest.mark.django_db
def test_search_publications_result_contains_required_fields_real_openalex(client):
    response = client.get("/api/search/publications/?q=artificial intelligence")
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert isinstance(data["results"], list)
    if data["results"]:
        publication = data["results"][0]
        assert "title" in publication
        assert "year" in publication
        assert "authors" in publication
        assert "doi" in publication