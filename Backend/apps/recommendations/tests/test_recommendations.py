import pytest
from unittest.mock import patch, MagicMock
import numpy as np
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from apps.projects.models import Project, Folder, SavedPublication, RecommendationFeedback

MOCK_WORKS_RESPONSE = {
    "results": [
        {
            "id": "https://openalex.org/W999",
            "title": "Deep Learning Survey",
            "publication_year": 2021,
            "doi": "https://doi.org/10.9999/dl",
            "open_access": {"is_oa": False, "oa_url": None},
            "type": "journal-article",
            "primary_location": {
                "pdf_url": None,
                "landing_page_url": "https://example.com",
                "source": {"display_name": "IEEE"},
            },
            "authorships": [{"author": {"display_name": "Jane Doe"}, "institutions": []}],
            "cited_by_count": 100,
            "language": "en",
            "keywords": [{"display_name": "deep learning"}],
            "abstract_inverted_index": {"Deep": [0], "learning": [1]},
        }
    ]
}


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def user():
    return User.objects.create_user(username="testas", email="testas@gmail.com", password="slaptazodis1")


@pytest.fixture
def auth_client(client, user):
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def project_with_publications(user):
    project = Project.objects.create(user=user, name="Projektas")
    SavedPublication.objects.create(
        project=project,
        openalex_id="https://openalex.org/W123",
        title="Machine Learning Overview",
        abstract="A survey of machine learning methods.",
        year=2020,
        authors=["Jonas Jonaitis"],
        keywords=["machine learning"],
    )
    return project


@pytest.mark.django_db
def test_recommendations_empty_project_returns_empty(auth_client, user):
    project = Project.objects.create(user=user, name="Tuščias projektas")
    response = auth_client.post(f"/api/recommendations/{project.id}/", {}, format="json")
    assert response.status_code == status.HTTP_200_OK
    assert response.data["recommendations"] == []


@pytest.mark.django_db
def test_recommendations_unauthenticated_blocked(client, user):
    project = Project.objects.create(user=user, name="Projektas")
    response = client.post(f"/api/recommendations/{project.id}/", {}, format="json")
    assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]


@pytest.mark.django_db
def test_recommendations_nonexistent_project(auth_client):
    response = auth_client.post("/api/recommendations/99999/", {}, format="json")
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_recommendations_success(auth_client, project_with_publications):
    mock_vector = np.ones(384, dtype=np.float32)
    with patch("apps.projects.embedding_service.get_model") as mock_get_model:
        mock_model = MagicMock()
        mock_model.encode.return_value = mock_vector
        mock_get_model.return_value = mock_model
        with patch("apps.search.integrations.openalex_client.requests.get") as mock_get:
            mock_resp = MagicMock()
            mock_resp.json.return_value = MOCK_WORKS_RESPONSE
            mock_resp.raise_for_status = MagicMock()
            mock_get.return_value = mock_resp
            response = auth_client.post(
                f"/api/recommendations/{project_with_publications.id}/", {}, format="json"
            )
    assert response.status_code == status.HTTP_200_OK
    assert "recommendations" in response.data


@pytest.mark.django_db
def test_recommendations_return_no_more_than_10(auth_client, user):
    project = Project.objects.create(user=user, name="Projektas")
    for i in range(5):
        SavedPublication.objects.create(
            project=project,
            openalex_id=f"https://openalex.org/W{i}",
            title=f"Publication {i}",
            abstract="Some abstract about machine learning.",
            year=2020,
            authors=["Author"],
            keywords=["ml"],
        )
    many_results = {"results": [
        {
            "id": f"https://openalex.org/W9{i}",
            "title": f"Candidate {i}",
            "publication_year": 2022,
            "doi": f"https://doi.org/10.0/{i}",
            "open_access": {"is_oa": False, "oa_url": None},
            "type": "journal-article",
            "primary_location": {"pdf_url": None, "landing_page_url": None, "source": {"display_name": f"Journal {i}"}},
            "authorships": [{"author": {"display_name": f"Author {i}"}, "institutions": []}],
            "cited_by_count": i * 10,
            "language": "en",
            "keywords": [{"display_name": "ml"}],
            "abstract_inverted_index": {"ml": [0]},
        }
        for i in range(30)
    ]}
    mock_vector = np.ones(384, dtype=np.float32)
    with patch("apps.projects.embedding_service.get_model") as mock_get_model:
        mock_model = MagicMock()
        mock_model.encode.return_value = mock_vector
        mock_get_model.return_value = mock_model
        with patch("apps.search.integrations.openalex_client.requests.get") as mock_get:
            mock_resp = MagicMock()
            mock_resp.json.return_value = many_results
            mock_resp.raise_for_status = MagicMock()
            mock_get.return_value = mock_resp
            response = auth_client.post(f"/api/recommendations/{project.id}/", {}, format="json")
    assert response.status_code == status.HTTP_200_OK
    assert len(response.data["recommendations"]) <= 10


@pytest.mark.django_db
def test_recommendations_do_not_include_saved_publications(auth_client, project_with_publications):
    saved_id = "https://openalex.org/W123"
    results_including_saved = {"results": [
        {
            "id": saved_id,
            "title": "Machine Learning Overview",
            "publication_year": 2020,
            "doi": "https://doi.org/10.0/saved",
            "open_access": {"is_oa": False, "oa_url": None},
            "type": "journal-article",
            "primary_location": {"pdf_url": None, "landing_page_url": None, "source": {"display_name": "Journal"}},
            "authorships": [{"author": {"display_name": "Jonas Jonaitis"}, "institutions": []}],
            "cited_by_count": 5,
            "language": "en",
            "keywords": [{"display_name": "ml"}],
            "abstract_inverted_index": {"ml": [0]},
        }
    ]}
    mock_vector = np.ones(384, dtype=np.float32)
    with patch("apps.projects.embedding_service.get_model") as mock_get_model:
        mock_model = MagicMock()
        mock_model.encode.return_value = mock_vector
        mock_get_model.return_value = mock_model
        with patch("apps.search.integrations.openalex_client.requests.get") as mock_get:
            mock_resp = MagicMock()
            mock_resp.json.return_value = results_including_saved
            mock_resp.raise_for_status = MagicMock()
            mock_get.return_value = mock_resp
            response = auth_client.post(
                f"/api/recommendations/{project_with_publications.id}/", {}, format="json"
            )
    assert response.status_code == status.HTTP_200_OK
    rec_ids = [r["openalex_id"] for r in response.data["recommendations"]]
    assert saved_id not in rec_ids


@pytest.mark.django_db
def test_recommendations_exclude_negatively_rated(auth_client, user):
    project = Project.objects.create(user=user, name="Projektas")
    SavedPublication.objects.create(
        project=project,
        openalex_id="https://openalex.org/W1",
        title="Saved pub",
        abstract="Abstract",
        year=2020,
        authors=["Author"],
        keywords=["ml"],
    )
    RecommendationFeedback.objects.create(
        user=user,
        project=project,
        openalex_id="https://openalex.org/W999",
        title="Negatively rated",
        feedback=RecommendationFeedback.Feedback.NEGATIVE,
    )
    disliked_result = {"results": [{
        "id": "https://openalex.org/W999",
        "title": "Negatively rated",
        "publication_year": 2021,
        "doi": None,
        "open_access": {"is_oa": False, "oa_url": None},
        "type": "journal-article",
        "primary_location": {"pdf_url": None, "landing_page_url": None, "source": {"display_name": "J"}},
        "authorships": [{"author": {"display_name": "Author"}, "institutions": []}],
        "cited_by_count": 5,
        "language": "en",
        "keywords": [{"display_name": "ml"}],
        "abstract_inverted_index": {"ml": [0]},
    }]}
    mock_vector = np.ones(384, dtype=np.float32)
    with patch("apps.projects.embedding_service.get_model") as mock_get_model:
        mock_model = MagicMock()
        mock_model.encode.return_value = mock_vector
        mock_get_model.return_value = mock_model
        with patch("apps.search.integrations.openalex_client.requests.get") as mock_get:
            mock_resp = MagicMock()
            mock_resp.json.return_value = disliked_result
            mock_resp.raise_for_status = MagicMock()
            mock_get.return_value = mock_resp
            response = auth_client.post(f"/api/recommendations/{project.id}/", {}, format="json")
    assert response.status_code == status.HTTP_200_OK
    rec_ids = [r["openalex_id"] for r in response.data["recommendations"]]
    assert "https://openalex.org/W999" not in rec_ids