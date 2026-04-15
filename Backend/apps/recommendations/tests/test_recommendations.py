import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch
from apps.projects.models import Project, Folder, SavedPublication

@pytest.fixture
def client():
    return APIClient()

@pytest.fixture
def user():
    return User.objects.create_user(
        username="testas",
        email="testas@gmail.com",
        password="slaptazodis1",
    )

@pytest.fixture
def auth_client(client, user):
    client.force_authenticate(user=user)
    return client

@pytest.fixture
def project_with_saved_publications(user):
    project = Project.objects.create(
        user=user,
        name="AI projektas",
        description="Projektas apie dirbtini intelekta",
    )
    folder = Folder.objects.create(
        project=project,
        name="Folderis 1",
    )
    SavedPublication.objects.create(
        project=project,
        folder=folder,
        openalex_id="https://openalex.org/W1",
        title="Machine learning methods",
        year=2023,
        doi="https://doi.org/10.1111/ml",
        abstract="This paper discusses machine learning and neural networks.",
        authors=["Jonas Jonaitis"],
        institutions=["Vilnius Tech"],
        keywords=["machine learning", "neural networks"],
        is_oa=True,
        pub_type="journal-article",
    )
    SavedPublication.objects.create(
        project=project,
        folder=folder,
        openalex_id="https://openalex.org/W2",
        title="Deep learning applications",
        year=2024,
        doi="https://doi.org/10.2222/dl",
        abstract="Deep learning methods in natural language processing.",
        authors=["Petras Petraitis"],
        institutions=["VU"],
        keywords=["deep learning", "nlp"],
        is_oa=True,
        pub_type="journal-article",
    )
    return project

@pytest.mark.django_db
def test_recommendations_success_real(auth_client, project_with_saved_publications):
    response = auth_client.post(
        f"/api/recommendations/{project_with_saved_publications.id}/",
        {},
        format="json",
    )
    assert response.status_code == 200
    data = response.json()
    assert "recommendations" in data
    assert isinstance(data["recommendations"], list)

@pytest.mark.django_db
def test_recommendations_return_no_more_than_10(auth_client, project_with_saved_publications):
    response = auth_client.post(
        f"/api/recommendations/{project_with_saved_publications.id}/",
        {},
        format="json",
    )
    assert response.status_code == 200
    recommendations = response.json()["recommendations"]
    assert len(recommendations) <= 10

@pytest.mark.django_db
def test_recommendations_empty_when_project_has_no_saved_publications(auth_client, user):
    project = Project.objects.create(
        user=user,
        name="Tuscias projektas",
        description="Nera publikaciju",
    )
    response = auth_client.post(
        f"/api/recommendations/{project.id}/",
        {},
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["recommendations"] == []

@pytest.mark.django_db
@patch("apps.recommendations.api.views.model.encode")
@patch("apps.recommendations.api.views.OpenAlexClient")
def test_recommendations_do_not_include_saved_publications(mock_openalex_class, mock_encode, auth_client, project_with_saved_publications):
    mock_client = mock_openalex_class.return_value
    mock_client.search_publications.side_effect = [
        {
            "results": [
                {
                    "id": "https://openalex.org/W1",
                    "title": "Already saved publication",
                    "publication_year": 2024,
                    "doi": "https://doi.org/10.saved",
                    "primary_location": {
                        "pdf_url": None,
                        "landing_page_url": "https://example.com/saved",
                        "source": {"display_name": "Journal A"},
                    },
                    "open_access": {"oa_url": "https://example.com/saved"},
                    "authorships": [
                        {"author": {"display_name": "Saved Author"}}
                    ],
                    "cited_by_count": 5,
                },
                {
                    "id": "https://openalex.org/W200",
                    "title": "New recommendation",
                    "publication_year": 2024,
                    "doi": "https://doi.org/10.new",
                    "primary_location": {
                        "pdf_url": None,
                        "landing_page_url": "https://example.com/new",
                        "source": {"display_name": "Journal B"},
                    },
                    "open_access": {"oa_url": "https://example.com/new"},
                    "authorships": [
                        {"author": {"display_name": "New Author"}}
                    ],
                    "cited_by_count": 15,
                },
            ]
        },
        {"results": []},
    ]
    mock_encode.side_effect = [
        [[0.1, 0.2, 0.3]],
        [[0.1, 0.2, 0.3]],
    ]
    response = auth_client.post(
        f"/api/recommendations/{project_with_saved_publications.id}/",
        {},
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK
    recommendations = response.json()["recommendations"]
    ids = [r["openalex_id"] for r in recommendations]
    assert "https://openalex.org/W1" not in ids
    assert "https://openalex.org/W200" in ids

@pytest.mark.django_db
def test_unauthenticated_user_cannot_get_recommendations(client, user):
    project = Project.objects.create(
        user=user,
        name="Projektas",
        description="Test",
    )
    response = client.post(
        f"/api/recommendations/{project.id}/",
        {},
        format="json",
    )
    assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]