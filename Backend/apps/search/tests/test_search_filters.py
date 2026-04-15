import pytest
from rest_framework.test import APIClient

@pytest.fixture
def client():
    return APIClient()

@pytest.mark.django_db
def test_filter_by_year_range(client):
    response = client.get("/api/search/publications/?q=machine learning&year_from=2020&year_to=2024")
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    for publication in data["results"]:
        year = publication.get("year")
        if year is not None:
            assert 2020 <= year <= 2024

@pytest.mark.django_db
def test_filter_open_access_only(client):
    response = client.get("/api/search/publications/?q=machine learning&oa=true")
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    for publication in data["results"]:
        assert publication.get("is_oa") is True

@pytest.mark.django_db
def test_filter_by_publication_type(client):
    response = client.get("/api/search/publications/?q=machine learning&type=journal-article")
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    for publication in data["results"]:
        assert publication.get("type") == "journal-article"

@pytest.mark.django_db
def test_sort_by_year_desc(client):
    response = client.get("/api/search/publications/?q=machine learning&sort=year_desc")
    assert response.status_code == 200
    data = response.json()
    years = [p["year"] for p in data["results"] if p.get("year") is not None]
    if len(years) > 1:
        assert years == sorted(years, reverse=True)

@pytest.mark.django_db
def test_sort_by_year_asc(client):
    response = client.get("/api/search/publications/?q=machine learning&sort=year_asc")
    assert response.status_code == 200
    data = response.json()
    years = [p["year"] for p in data["results"] if p.get("year") is not None]
    if len(years) > 1:
        assert years == sorted(years)

@pytest.mark.django_db
def test_invalid_year_range_returns_400(client):
    response = client.get("/api/search/publications/?q=machine learning&year_from=2025&year_to=2020")
    assert response.status_code == 400
    assert response.json()["error"] == "year_from cannot be greater than year_to"