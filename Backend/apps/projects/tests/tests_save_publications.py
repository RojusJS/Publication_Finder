import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status

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

@pytest.mark.django_db
def test_save_publication_to_project_success(auth_client, user):
    project = Project.objects.create(
        user=user,
        name="Projektas",
        description="Test",
    )
    folder = Folder.objects.create(
        project=project,
        name="Folderis",
    )
    payload = {
        "openalex_id": "https://openalex.org/W123",
        "title": "Publikacija 1",
        "year": 2024,
        "doi": "https://doi.org/10.1234/test",
        "pdf_url": "https://example.com/test.pdf",
        "landing_page_url": "https://example.com/article",
        "abstract": "Santrauka",
        "authors": ["Jonas Jonaitis"],
        "institutions": ["Vilnius Tech"],
        "source_name": "Leidejas",
        "cited_by_count": 5,
        "language": "en",
        "keywords": ["ai"],
        "is_oa": True,
        "pub_type": "journal-article",
    }
    response = auth_client.post(
        f"/api/projects/{project.id}/folders/{folder.id}/publications/",
        payload,
        format="json",
    )
    assert response.status_code == status.HTTP_201_CREATED
    assert SavedPublication.objects.filter(
        project=project,
        folder=folder,
        doi="https://doi.org/10.1234/test",
    ).exists()

@pytest.mark.django_db
def test_saved_publication_is_visible_in_project_folder_list(auth_client, user):
    project = Project.objects.create(
        user=user,
        name="Projektas",
        description="Test",
    )
    folder = Folder.objects.create(
        project=project,
        name="Folderis",
    )
    SavedPublication.objects.create(
        project=project,
        folder=folder,
        openalex_id="https://openalex.org/W123",
        title="Matoma publikacija",
        year=2024,
        doi="https://doi.org/10.5555/visible",
        authors=["Jonas Jonaitis"],
        institutions=["Vilnius Tech"],
        keywords=["ai"],
        is_oa=True,
        pub_type="journal-article",
    )
    response = auth_client.get(
        f"/api/projects/{project.id}/folders/{folder.id}/publications/"
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    titles = [publication["title"] for publication in data]
    assert "Matoma publikacija" in titles

@pytest.mark.django_db
def test_unauthenticated_user_cannot_save_publication(client, user):
    project = Project.objects.create(
        user=user,
        name="Projektas",
        description="Test",
    )
    folder = Folder.objects.create(
        project=project,
        name="Folderis",
    )
    payload = {
        "openalex_id": "https://openalex.org/W123",
        "title": "Publikacija",
        "year": 2024,
        "doi": "https://doi.org/10.7777/noauth",
        "authors": ["Jonas Jonaitis"],
        "institutions": ["Vilnius Tech"],
        "keywords": ["ai"],
        "is_oa": True,
        "pub_type": "journal-article",
    }
    response = client.post(
        f"/api/projects/{project.id}/folders/{folder.id}/publications/",
        payload,
        format="json",
    )
    assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]