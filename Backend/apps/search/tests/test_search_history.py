import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status

from apps.projects.models import Project, SavedPublication, SearchHistory

@pytest.fixture
def client():
    return APIClient()

@pytest.fixture
def user():
    return User.objects.create_user(username="testas", email="testas@gmail.com", password="slaptazodis1")

@pytest.fixture
def other_user():
    return User.objects.create_user(username="kitas", email="kitas@gmail.com", password="slaptazodis1")

@pytest.fixture
def auth_client(client, user):
    client.force_authenticate(user=user)
    return client

@pytest.fixture
def other_client(other_user):
    c = APIClient()
    c.force_authenticate(user=other_user)
    return c

@pytest.fixture
def project(user):
    return Project.objects.create(user=user, name="Projektas")

@pytest.fixture
def project_with_publications(user):
    p = Project.objects.create(user=user, name="Projektas su publikacijomis")
    SavedPublication.objects.create(
        project=p,
        openalex_id="https://openalex.org/W1",
        title="Machine learning in healthcare",
        abstract="A survey of ML methods applied to healthcare problems.",
        year=2022,
        authors=["Jonas Jonaitis"],
        keywords=["machine learning", "healthcare"],
        embedding=[0.1] * 384,
    )
    SavedPublication.objects.create(
        project=p,
        openalex_id="https://openalex.org/W2",
        title="Deep neural networks for image classification",
        abstract="Deep learning methods for visual recognition tasks.",
        year=2021,
        authors=["Petras Petraitis"],
        keywords=["deep learning", "computer vision"],
        embedding=[0.2] * 384,
    )
    return p

@pytest.mark.django_db
def test_search_history_list(auth_client, user):
    SearchHistory.objects.create(user=user, query="machine learning", search_by="title", result_count=10)
    SearchHistory.objects.create(user=user, query="deep learning", search_by="title", result_count=5)
    response = auth_client.get("/api/projects/search-history/")
    assert response.status_code == status.HTTP_200_OK
    assert len(response.data) == 2
    queries = [h["query"] for h in response.data]
    assert "machine learning" in queries
    assert "deep learning" in queries

@pytest.mark.django_db
def test_search_history_user_sees_only_own(auth_client, other_client, user, other_user):
    SearchHistory.objects.create(user=user, query="mano užklausa", search_by="title", result_count=3)
    SearchHistory.objects.create(user=other_user, query="kito užklausa", search_by="title", result_count=7)
    response = auth_client.get("/api/projects/search-history/")
    assert response.status_code == status.HTTP_200_OK
    queries = [h["query"] for h in response.data]
    assert "mano užklausa" in queries
    assert "kito užklausa" not in queries

@pytest.mark.django_db
def test_search_history_delete_one(auth_client, user):
    entry = SearchHistory.objects.create(user=user, query="ištrinti šią", search_by="title", result_count=2)
    SearchHistory.objects.create(user=user, query="palikti šią", search_by="title", result_count=1)
    response = auth_client.delete(f"/api/projects/search-history/{entry.id}/")
    assert response.status_code == status.HTTP_204_NO_CONTENT
    assert not SearchHistory.objects.filter(id=entry.id).exists()
    assert SearchHistory.objects.filter(user=user, query="palikti šią").exists()

@pytest.mark.django_db
def test_search_history_delete_all(auth_client, user):
    SearchHistory.objects.create(user=user, query="pirma", search_by="title", result_count=1)
    SearchHistory.objects.create(user=user, query="antra", search_by="title", result_count=2)
    SearchHistory.objects.create(user=user, query="trečia", search_by="title", result_count=3)
    response = auth_client.delete("/api/projects/search-history/")
    assert response.status_code == status.HTTP_204_NO_CONTENT
    assert SearchHistory.objects.filter(user=user).count() == 0

@pytest.mark.django_db
def test_search_history_delete_all_only_deletes_own(auth_client, other_client, user, other_user):
    SearchHistory.objects.create(user=user, query="mano", search_by="title", result_count=1)
    SearchHistory.objects.create(user=other_user, query="kito", search_by="title", result_count=1)
    auth_client.delete("/api/projects/search-history/")
    assert SearchHistory.objects.filter(user=other_user).count() == 1
    assert SearchHistory.objects.filter(user=user).count() == 0

@pytest.mark.django_db
def test_search_history_unauthenticated(client):
    response = client.get("/api/projects/search-history/")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

@pytest.mark.django_db
def test_semantic_search_missing_query(auth_client, project_with_publications):
    response = auth_client.post(
        f"/api/projects/{project_with_publications.id}/semantic-search/",
        {"query": ""},
        format="json",
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST

@pytest.mark.django_db
def test_semantic_search_unauthenticated(client, project):
    response = client.post(
        f"/api/projects/{project.id}/semantic-search/",
        {"query": "machine learning"},
        format="json",
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED