import pytest
from unittest.mock import patch, MagicMock
from rest_framework.test import APIClient
from rest_framework import status


MOCK_WORKS_RESPONSE = {
    "meta": {"count": 1},
    "results": [
        {
            "id": "https://openalex.org/W123",
            "title": "Machine Learning in Healthcare",
            "publication_year": 2022,
            "doi": "https://doi.org/10.1234/test",
            "open_access": {"is_oa": True, "oa_url": None},
            "type": "journal-article",
            "primary_location": {
                "pdf_url": "https://example.com/paper.pdf",
                "landing_page_url": "https://example.com/article",
                "source": {"display_name": "Nature"},
            },
            "authorships": [
                {"author": {"display_name": "Jonas Jonaitis"}, "institutions": []}
            ],
            "cited_by_count": 42,
            "language": "en",
            "keywords": [{"display_name": "machine learning"}],
            "abstract_inverted_index": {"Abstract": [0]},
        }
    ],
}

MOCK_DETAIL_RESPONSE = {
    "id": "https://openalex.org/W2741809807",
    "title": "Attention Is All You Need",
    "publication_year": 2017,
    "doi": "https://doi.org/10.48550/arXiv.1706.03762",
    "open_access": {"is_oa": True, "oa_url": "https://arxiv.org/abs/1706.03762"},
    "type": "preprint",
    "primary_location": {
        "pdf_url": "https://arxiv.org/pdf/1706.03762",
        "landing_page_url": "https://arxiv.org/abs/1706.03762",
        "source": {"display_name": "arXiv"},
    },
    "authorships": [
        {"author": {"display_name": "Ashish Vaswani"}, "institutions": []}
    ],
    "cited_by_count": 90000,
    "language": "en",
    "keywords": [{"display_name": "transformer"}],
    "abstract_inverted_index": {"The": [0], "transformer": [1]},
}


@pytest.fixture
def client():
    return APIClient()


@pytest.mark.django_db
def test_search_publications_success(client):
    with patch("apps.search.integrations.openalex_client.requests.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.json.return_value = MOCK_WORKS_RESPONSE
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp
        response = client.get("/api/search/publications/?q=machine+learning")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["query"] == "machine learning"
    assert isinstance(data["results"], list)
    assert "title" in data["results"][0]
    assert "year" in data["results"][0]
    assert "authors" in data["results"][0]
    assert "doi" in data["results"][0]


@pytest.mark.django_db
def test_search_publications_missing_query(client):
    response = client.get("/api/search/publications/")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json()["error"] == "Missing query parameter: q"


@pytest.mark.django_db
def test_search_publications_invalid_sort(client):
    response = client.get("/api/search/publications/?q=test&sort=wrong")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json()["error"] == "Invalid sort value"


@pytest.mark.django_db
def test_search_publications_invalid_search_by(client):
    response = client.get("/api/search/publications/?q=test&search_by=wrong")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json()["error"] == "Invalid search_by value"


@pytest.mark.django_db
def test_search_publications_invalid_year_range(client):
    response = client.get("/api/search/publications/?q=test&year_from=2025&year_to=2020")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json()["error"] == "year_from cannot be greater than year_to"


@pytest.mark.django_db
def test_publication_detail_missing_id(client):
    response = client.get("/api/search/publications/detail/")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json()["error"] == "Missing query parameter: id"


@pytest.mark.django_db
def test_publication_detail_returns_expected_fields(client):
    with patch("apps.search.integrations.openalex_client.requests.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.json.return_value = MOCK_DETAIL_RESPONSE
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp
        response = client.get("/api/search/publications/detail/?id=https://openalex.org/W2741809807")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "pdf_url" in data
    assert "title" in data
    assert "authors" in data


@pytest.mark.django_db
def test_filter_by_year_range(client):
    with patch("apps.search.integrations.openalex_client.requests.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.json.return_value = MOCK_WORKS_RESPONSE
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp
        response = client.get("/api/search/publications/?q=machine+learning&year_from=2020&year_to=2024")
    assert response.status_code == status.HTTP_200_OK
    assert "results" in response.json()


@pytest.mark.django_db
def test_filter_open_access_only(client):
    with patch("apps.search.integrations.openalex_client.requests.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.json.return_value = MOCK_WORKS_RESPONSE
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp
        response = client.get("/api/search/publications/?q=machine+learning&oa=true")
    assert response.status_code == status.HTTP_200_OK
    for pub in response.json()["results"]:
        assert pub.get("is_oa") is True


@pytest.mark.django_db
def test_filter_by_publication_type(client):
    with patch("apps.search.integrations.openalex_client.requests.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.json.return_value = MOCK_WORKS_RESPONSE
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp
        response = client.get("/api/search/publications/?q=machine+learning&type=journal-article")
    assert response.status_code == status.HTTP_200_OK
    assert "results" in response.json()


@pytest.mark.django_db
def test_sort_by_year_desc(client):
    response_data = {
        "meta": {"count": 2},
        "results": [
            {**MOCK_WORKS_RESPONSE["results"][0], "publication_year": 2023},
            {**MOCK_WORKS_RESPONSE["results"][0], "id": "W2", "publication_year": 2020},
        ],
    }
    with patch("apps.search.integrations.openalex_client.requests.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.json.return_value = response_data
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp
        response = client.get("/api/search/publications/?q=machine+learning&sort=year_desc")
    assert response.status_code == status.HTTP_200_OK
    years = [p["year"] for p in response.json()["results"] if p.get("year")]
    if len(years) > 1:
        assert years == sorted(years, reverse=True)


@pytest.mark.django_db
def test_sort_by_year_asc(client):
    response_data = {
        "meta": {"count": 2},
        "results": [
            {**MOCK_WORKS_RESPONSE["results"][0], "publication_year": 2020},
            {**MOCK_WORKS_RESPONSE["results"][0], "id": "W2", "publication_year": 2023},
        ],
    }
    with patch("apps.search.integrations.openalex_client.requests.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.json.return_value = response_data
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp
        response = client.get("/api/search/publications/?q=machine+learning&sort=year_asc")
    assert response.status_code == status.HTTP_200_OK
    years = [p["year"] for p in response.json()["results"] if p.get("year")]
    if len(years) > 1:
        assert years == sorted(years)


@pytest.mark.django_db
def test_search_by_author(client):
    with patch("apps.search.integrations.openalex_client.requests.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.json.return_value = MOCK_WORKS_RESPONSE
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp
        response = client.get("/api/search/publications/?q=Jonas+Jonaitis&search_by=author")
    assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
def test_search_year_from_out_of_range(client):
    response = client.get("/api/search/publications/?q=test&year_from=500")
    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_search_year_to_out_of_range(client):
    response = client.get("/api/search/publications/?q=test&year_to=9999")
    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_author_search_missing_query(client):
    response = client.get("/api/search/authors/")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "error" in response.json()


@pytest.mark.django_db
def test_author_search_returns_results(client):
    mock_author_response = {
        "meta": {"count": 1},
        "results": [
            {
                "id": "https://openalex.org/A123",
                "display_name": "Jonas Jonaitis",
                "hint": "Vilnius University",
                "cited_by_count": 1000,
                "works_count": 50,
                "last_known_institutions": [{"display_name": "Vilnius University"}],
                "topics": [],
                "counts_by_year": [],
            }
        ],
    }
    with patch("apps.search.api.author_views.requests.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.json.return_value = mock_author_response
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp
        response = client.get("/api/search/authors/?q=Jonas")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "results" in data
    assert data["results"][0]["display_name"] == "Jonas Jonaitis"