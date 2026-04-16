import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch

from apps.projects.models import Project, Folder, SavedPublication, PublicationNote

@pytest.fixture
def client():
    return APIClient()

@pytest.fixture
def user_data():
    return {
        "username": "testas",
        "email": "testas@gmail.com",
        "password": "slaptazodis1",
        "password2": "slaptazodis1",
    }

@pytest.fixture
def login_data():
    return {
        "username": "testas",
        "password": "slaptazodis1",
    }

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
def publication_payload():
    return {
        "openalex_id": "https://openalex.org/W123",
        "title": "Publikacija 1",
        "year": 2024,
        "doi": "https://doi.org/10.1234/test",
        "pdf_url": "https://example.com/test.pdf",
        "landing_page_url": "https://example.com/article",
        "abstract": "Santrauka apie publikaciją",
        "authors": ["Jonas Jonaitis"],
        "institutions": ["Vilnius Tech"],
        "source_name": "Test Journal",
        "cited_by_count": 5,
        "language": "en",
        "keywords": ["ai"],
        "is_oa": True,
        "pub_type": "journal-article",
    }


@pytest.mark.django_db
def test_registration_login_and_project_creation_integration(client, user_data, login_data):
    register_response = client.post("/api/auth/register/", user_data, format="json")
    assert register_response.status_code == status.HTTP_201_CREATED
    login_response = client.post("/api/auth/login/", login_data, format="json")
    assert login_response.status_code == status.HTTP_200_OK
    assert "access" in login_response.data
    user = User.objects.get(username="testas")
    client.force_authenticate(user=user)
    project_response = client.post(
        "/api/projects/",
        {
            "name": "Integracinis projektas",
            "description": "Pilnas scenarijus",
        },
        format="json",
    )
    assert project_response.status_code == status.HTTP_201_CREATED
    list_response = client.get("/api/projects/")
    assert list_response.status_code == status.HTTP_200_OK
    project_names = [project["name"] for project in list_response.json()]
    assert "Integracinis projektas" in project_names


@pytest.mark.django_db
def test_project_and_folder_creation_flow_integration(auth_client):
    project_response = auth_client.post(
        "/api/projects/",
        {
            "name": "Projektas su aplankalu",
            "description": "Test",
        },
        format="json",
    )
    assert project_response.status_code == status.HTTP_201_CREATED
    project_id = project_response.json()["id"]
    folder_response = auth_client.post(
        f"/api/projects/{project_id}/folders/",
        {
            "name": "Aplankalas 1",
        },
        format="json",
    )
    assert folder_response.status_code == status.HTTP_201_CREATED
    folders_list_response = auth_client.get(f"/api/projects/{project_id}/folders/")
    assert folders_list_response.status_code == status.HTTP_200_OK
    folder_names = [folder["name"] for folder in folders_list_response.json()]
    assert "Aplankalas 1" in folder_names


@pytest.mark.django_db
def test_save_and_list_publication_in_folder_integration(auth_client, publication_payload):
    project = Project.objects.create(
        user=auth_client.handler._force_user,
        name="Projektas",
        description="Test",
    )
    folder = Folder.objects.create(
        project=project,
        name="Aplankalas",
    )
    save_response = auth_client.post(
        f"/api/projects/{project.id}/folders/{folder.id}/publications/",
        publication_payload,
        format="json",
    )
    assert save_response.status_code == status.HTTP_201_CREATED
    list_response = auth_client.get(
        f"/api/projects/{project.id}/folders/{folder.id}/publications/"
    )
    assert list_response.status_code == status.HTTP_200_OK
    titles = [publication["title"] for publication in list_response.json()]
    assert publication_payload["title"] in titles


@pytest.mark.django_db
def test_save_and_delete_publication_in_folder_integration(auth_client, publication_payload):
    project = Project.objects.create(
        user=auth_client.handler._force_user,
        name="Projektas",
        description="Test",
    )
    folder = Folder.objects.create(
        project=project,
        name="Aplankalas",
    )
    save_response = auth_client.post(
        f"/api/projects/{project.id}/folders/{folder.id}/publications/",
        publication_payload,
        format="json",
    )
    assert save_response.status_code == status.HTTP_201_CREATED
    publication_id = save_response.json()["id"]
    delete_response = auth_client.delete(
        f"/api/projects/{project.id}/folders/{folder.id}/publications/{publication_id}/"
    )
    assert delete_response.status_code == status.HTTP_204_NO_CONTENT
    assert not SavedPublication.objects.filter(id=publication_id).exists()


@pytest.mark.django_db
def test_save_and_list_project_level_publication_integration(auth_client, publication_payload):
    project = Project.objects.create(
        user=auth_client.handler._force_user,
        name="Projektas",
        description="Test",
    )
    save_response = auth_client.post(
        f"/api/projects/{project.id}/publications/",
        publication_payload,
        format="json",
    )
    assert save_response.status_code == status.HTTP_201_CREATED
    list_response = auth_client.get(f"/api/projects/{project.id}/publications/")
    assert list_response.status_code == status.HTTP_200_OK
    titles = [publication["title"] for publication in list_response.json()]
    assert publication_payload["title"] in titles


@pytest.mark.django_db
def test_save_and_delete_project_level_publication_integration(auth_client, publication_payload):
    project = Project.objects.create(
        user=auth_client.handler._force_user,
        name="Projektas",
        description="Test",
    )
    save_response = auth_client.post(
        f"/api/projects/{project.id}/publications/",
        publication_payload,
        format="json",
    )
    assert save_response.status_code == status.HTTP_201_CREATED
    publication_id = save_response.json()["id"]
    delete_response = auth_client.delete(
        f"/api/projects/{project.id}/publications/{publication_id}/"
    )
    assert delete_response.status_code == status.HTTP_204_NO_CONTENT
    assert not SavedPublication.objects.filter(id=publication_id).exists()


@pytest.mark.django_db
def test_note_crud_flow_integration(auth_client, publication_payload):
    project = Project.objects.create(
        user=auth_client.handler._force_user,
        name="Projektas",
        description="Test",
    )
    folder = Folder.objects.create(
        project=project,
        name="Aplankalas",
    )
    publication = SavedPublication.objects.create(
        project=project,
        folder=folder,
        **publication_payload,
    )
    create_response = auth_client.post(
        f"/api/projects/publications/{publication.id}/notes/",
        {"text": "Pirma pastaba"},
        format="json",
    )
    assert create_response.status_code == status.HTTP_201_CREATED
    note_id = create_response.json()["id"]
    list_response = auth_client.get(
        f"/api/projects/publications/{publication.id}/notes/"
    )
    assert list_response.status_code == status.HTTP_200_OK
    texts = [note["text"] for note in list_response.json()]
    assert "Pirma pastaba" in texts
    update_response = auth_client.patch(
        f"/api/projects/publications/{publication.id}/notes/{note_id}/",
        {"text": "Atnaujinta pastaba"},
        format="json",
    )
    assert update_response.status_code == status.HTTP_200_OK
    note = PublicationNote.objects.get(id=note_id)
    assert note.text == "Atnaujinta pastaba"
    delete_response = auth_client.delete(
        f"/api/projects/publications/{publication.id}/notes/{note_id}/"
    )
    assert delete_response.status_code == status.HTTP_204_NO_CONTENT
    assert not PublicationNote.objects.filter(id=note_id).exists()


@pytest.mark.django_db
def test_label_update_flow_integration(auth_client, publication_payload):
    project = Project.objects.create(
        user=auth_client.handler._force_user,
        name="Projektas",
        description="Test",
    )
    folder = Folder.objects.create(
        project=project,
        name="Aplankalas",
    )
    publication = SavedPublication.objects.create(
        project=project,
        folder=folder,
        **publication_payload,
    )
    response = auth_client.patch(
        f"/api/projects/publications/{publication.id}/label/",
        {"label": "Cituoti"},
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK
    publication.refresh_from_db()
    assert publication.label == "Cituoti"


@pytest.mark.django_db
def test_search_with_filters_integration(client):
    response = client.get(
        "/api/search/publications/?q=machine learning&year_from=2020&year_to=2024&oa=true&type=journal-article&sort=year_desc"
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "results" in data
    for publication in data["results"]:
        year = publication.get("year")
        if year is not None:
            assert 2020 <= year <= 2024
        assert publication.get("is_oa") is True
        assert publication.get("type") == "journal-article"

@pytest.mark.django_db
def test_publication_detail_integration(client):
    response = client.get(
        "/api/search/publications/detail/?id=https://openalex.org/W2741809807"
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "title" in data
    assert "authors" in data
    assert "doi" in data
    assert "pdf_url" in data

@pytest.mark.django_db
def test_recommendations_empty_project_integration(auth_client):
    project = Project.objects.create(
        user=auth_client.handler._force_user,
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
def test_recommendations_limit_integration(auth_client, user):
    project = Project.objects.create(
        user=user,
        name="AI projektas",
        description="Test",
    )
    folder = Folder.objects.create(
        project=project,
        name="Aplankalas",
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
    response = auth_client.post(
        f"/api/recommendations/{project.id}/",
        {},
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK
    recommendations = response.json()["recommendations"]
    assert isinstance(recommendations, list)
    assert len(recommendations) <= 10


@pytest.mark.django_db
@patch("apps.recommendations.api.views.model.encode")
@patch("apps.recommendations.api.views.OpenAlexClient")
def test_recommendations_exclude_saved_publications_integration(
    mock_openalex_class,
    mock_encode,
    auth_client,
    user,
):
    project = Project.objects.create(
        user=user,
        name="AI projektas",
        description="Test",
    )
    folder = Folder.objects.create(
        project=project,
        name="Aplankalas",
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
        f"/api/recommendations/{project.id}/",
        {},
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK
    recommendations = response.json()["recommendations"]
    ids = [recommendation["openalex_id"] for recommendation in recommendations]
    assert "https://openalex.org/W1" not in ids
    assert "https://openalex.org/W200" in ids