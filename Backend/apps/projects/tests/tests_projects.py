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
def other_user():
    return User.objects.create_user(
        username="kitas",
        email="kitas@gmail.com",
        password="slaptazodis2",
    )

@pytest.fixture
def auth_client(client, user):
    client.force_authenticate(user=user)
    return client

@pytest.mark.django_db
def test_create_project_success(auth_client):
    payload = {
        "name": "Mano projektas",
        "description": "Testinis projekto aprasymas",
    }
    response = auth_client.post("/api/projects/", payload, format="json")
    assert response.status_code == status.HTTP_201_CREATED
    assert Project.objects.filter(name="Mano projektas").exists()

@pytest.mark.django_db
def test_created_project_saved_with_user(auth_client, user):
    payload = {
        "name": "Projektas 1",
        "description": "Aprasymas 1",
    }
    auth_client.post("/api/projects/", payload, format="json")
    project = Project.objects.get(name="Projektas 1")
    assert project.user == user
    assert project.description == "Aprasymas 1"

@pytest.mark.django_db
def test_list_projects_returns_only_current_user_projects(auth_client, user, other_user):
    Project.objects.create(user=user, name="Mano projektas", description="A")
    Project.objects.create(user=other_user, name="Svetimas projektas", description="B")
    response = auth_client.get("/api/projects/")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    names = [project["name"] for project in data]
    assert "Mano projektas" in names
    assert "Svetimas projektas" not in names

@pytest.mark.django_db
def test_delete_project_success(auth_client, user):
    project = Project.objects.create(
        user=user,
        name="Trinamas projektas",
        description="Bus istrintas",
    )
    response = auth_client.delete(f"/api/projects/{project.id}/")
    assert response.status_code == status.HTTP_204_NO_CONTENT
    assert not Project.objects.filter(id=project.id).exists()

@pytest.mark.django_db
def test_user_cannot_delete_other_users_project(auth_client, other_user):
    project = Project.objects.create(
        user=other_user,
        name="Svetimas projektas",
        description="Negalima trinti",
    )
    response = auth_client.delete(f"/api/projects/{project.id}/")
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert Project.objects.filter(id=project.id).exists()

@pytest.mark.django_db
def test_unauthenticated_user_cannot_create_project(client):
    payload = {
        "name": "Neleistinas projektas",
        "description": "Test",
    }
    response = client.post("/api/projects/", payload, format="json")
    assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]


@pytest.mark.django_db
def test_create_folder_success(auth_client, user):
    project = Project.objects.create(
        user=user,
        name="Projektas su aplankalu",
        description="Test",
    )
    payload = {
        "name": "Aplankalas 1",
    }
    response = auth_client.post(f"/api/projects/{project.id}/folders/", payload, format="json")
    assert response.status_code == status.HTTP_201_CREATED
    assert Folder.objects.filter(name="Aplankalas 1", project=project).exists()

@pytest.mark.django_db
def test_list_folders_returns_only_project_folders(auth_client, user):
    project = Project.objects.create(
        user=user,
        name="Projektas",
        description="Test",
    )
    Folder.objects.create(project=project, name="Aplankalas A")
    Folder.objects.create(project=project, name="Aplankalas B")
    response = auth_client.get(f"/api/projects/{project.id}/folders/")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    names = [folder["name"] for folder in data]
    assert "Aplankalas A" in names
    assert "Aplankalas B" in names


@pytest.mark.django_db
def test_save_publication_to_folder(auth_client, user):
    project = Project.objects.create(
        user=user,
        name="Projektas",
        description="Test",
    )
    folder = Folder.objects.create(project=project, name="Aplankalas")

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
        "source_name": "Test Journal",
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
    assert SavedPublication.objects.filter(title="Publikacija 1", project=project, folder=folder).exists()


@pytest.mark.django_db
def test_list_saved_publications_in_folder(auth_client, user):
    project = Project.objects.create(
        user=user,
        name="Projektas",
        description="Test",
    )
    folder = Folder.objects.create(project=project, name="Aplankalas")

    SavedPublication.objects.create(
        project=project,
        folder=folder,
        openalex_id="https://openalex.org/W123",
        title="Publikacija 1",
        year=2024,
        doi="https://doi.org/10.1234/test1",
        authors=["Jonas Jonaitis"],
        institutions=["Vilnius Tech"],
        keywords=["ai"],
        is_oa=True,
        pub_type="journal-article",
    )

    response = auth_client.get(f"/api/projects/{project.id}/folders/{folder.id}/publications/")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    titles = [publication["title"] for publication in data]
    assert "Publikacija 1" in titles


@pytest.mark.django_db
def test_delete_saved_publication(auth_client, user):
    project = Project.objects.create(
        user=user,
        name="Projektas",
        description="Test",
    )
    folder = Folder.objects.create(project=project, name="Aplankalas")

    publication = SavedPublication.objects.create(
        project=project,
        folder=folder,
        openalex_id="https://openalex.org/W123",
        title="Publikacija trynimui",
        year=2024,
        doi="https://doi.org/10.1234/test-delete",
        authors=["Jonas Jonaitis"],
        institutions=["Vilnius Tech"],
        keywords=["ai"],
        is_oa=True,
        pub_type="journal-article",
    )

    response = auth_client.delete(
        f"/api/projects/{project.id}/folders/{folder.id}/publications/{publication.id}/"
    )
    assert response.status_code == status.HTTP_204_NO_CONTENT
    assert not SavedPublication.objects.filter(id=publication.id).exists()