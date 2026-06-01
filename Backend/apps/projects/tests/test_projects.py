import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch, MagicMock
import numpy as np

from apps.projects.models import (
    Project, Folder, SavedPublication, PublicationNote,
    ProjectCollaborator, RecommendationFeedback, SearchHistory,
)


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
def other_client(client, other_user):
    c = APIClient()
    c.force_authenticate(user=other_user)
    return c


@pytest.fixture
def project(user):
    return Project.objects.create(user=user, name="Testas", description="Aprašymas")


@pytest.fixture
def folder(project):
    return Folder.objects.create(project=project, name="Aplankas")


@pytest.fixture
def publication(project, folder):
    return SavedPublication.objects.create(
        project=project, folder=folder,
        openalex_id="https://openalex.org/W1",
        title="Test Publication", year=2022,
        authors=["Author"], keywords=["ml"],
    )


@pytest.mark.django_db
def test_create_project(auth_client):
    response = auth_client.post("/api/projects/", {"name": "Naujas", "description": "Desc"}, format="json")
    assert response.status_code == status.HTTP_201_CREATED
    assert response.data["name"] == "Naujas"
    assert "owner" in response.data


@pytest.mark.django_db
def test_list_projects(auth_client, project):
    response = auth_client.get("/api/projects/")
    assert response.status_code == status.HTTP_200_OK
    names = [p["name"] for p in response.data]
    assert "Testas" in names


@pytest.mark.django_db
def test_list_projects_unauthenticated(client):
    response = client.get("/api/projects/")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_retrieve_project(auth_client, project):
    response = auth_client.get(f"/api/projects/{project.id}/")
    assert response.status_code == status.HTTP_200_OK
    assert response.data["name"] == "Testas"


@pytest.mark.django_db
def test_update_project_owner(auth_client, project):
    response = auth_client.patch(f"/api/projects/{project.id}/", {"name": "Atnaujintas"}, format="json")
    assert response.status_code == status.HTTP_200_OK
    assert response.data["name"] == "Atnaujintas"


@pytest.mark.django_db
def test_update_project_viewer_blocked(other_client, user, other_user, project):
    ProjectCollaborator.objects.create(
        project=project, user=other_user, invited_by=user,
        role=ProjectCollaborator.Role.VIEWER, status=ProjectCollaborator.Status.ACCEPTED,
    )
    response = other_client.patch(f"/api/projects/{project.id}/", {"name": "Hack"}, format="json")
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_delete_project_owner(auth_client, project):
    response = auth_client.delete(f"/api/projects/{project.id}/")
    assert response.status_code == status.HTTP_204_NO_CONTENT
    assert not Project.objects.filter(id=project.id).exists()


@pytest.mark.django_db
def test_delete_project_non_owner_blocked(other_client, user, other_user, project):
    ProjectCollaborator.objects.create(
        project=project, user=other_user, invited_by=user,
        role=ProjectCollaborator.Role.EDITOR, status=ProjectCollaborator.Status.ACCEPTED,
    )
    response = other_client.delete(f"/api/projects/{project.id}/")
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_create_folder(auth_client, project):
    response = auth_client.post(f"/api/projects/{project.id}/folders/", {"name": "Naujas aplankalas"}, format="json")
    assert response.status_code == status.HTTP_201_CREATED
    assert response.data["name"] == "Naujas aplankalas"


@pytest.mark.django_db
def test_create_subfolder(auth_client, project, folder):
    response = auth_client.post(
        f"/api/projects/{project.id}/folders/",
        {"name": "Aplankalas aplankale", "parent": folder.id},
        format="json",
    )
    assert response.status_code == status.HTTP_201_CREATED
    assert response.data["parent"] == folder.id


@pytest.mark.django_db
def test_folder_breadcrumb(auth_client, project, folder):
    sub = Folder.objects.create(project=project, parent=folder, name="Aplankalas aplankale")
    response = auth_client.get(f"/api/projects/{project.id}/folders/{sub.id}/")
    assert response.status_code == status.HTTP_200_OK
    crumbs = response.data["breadcrumb"]
    assert crumbs[0]["name"] == folder.name
    assert crumbs[1]["name"] == "Aplankalas aplankale"


@pytest.mark.django_db
def test_folder_subfolder_count(auth_client, project, folder):
    Folder.objects.create(project=project, parent=folder, name="Sub1")
    Folder.objects.create(project=project, parent=folder, name="Sub2")
    response = auth_client.get(f"/api/projects/{project.id}/folders/{folder.id}/")
    assert response.data["subfolder_count"] == 2


@pytest.mark.django_db
def test_list_root_folders(auth_client, project, folder):
    response = auth_client.get(f"/api/projects/{project.id}/folders/")
    assert response.status_code == status.HTTP_200_OK
    names = [f["name"] for f in response.data]
    assert folder.name in names


@pytest.mark.django_db
def test_list_subfolders_by_parent(auth_client, project, folder):
    sub = Folder.objects.create(project=project, parent=folder, name="Aplankalas aplankale")
    response = auth_client.get(f"/api/projects/{project.id}/folders/?parent={folder.id}")
    assert response.status_code == status.HTTP_200_OK
    names = [f["name"] for f in response.data]
    assert "Aplankalas aplankale" in names


@pytest.mark.django_db
def test_create_note(auth_client, publication):
    response = auth_client.post(
        f"/api/projects/publications/{publication.id}/notes/",
        {"text": "Pastaba"},
        format="json",
    )
    assert response.status_code == status.HTTP_201_CREATED
    assert response.data["text"] == "Pastaba"


@pytest.mark.django_db
def test_list_notes(auth_client, publication):
    PublicationNote.objects.create(publication=publication, text="Pastaba 1")
    PublicationNote.objects.create(publication=publication, text="Pastaba 2")
    response = auth_client.get(f"/api/projects/publications/{publication.id}/notes/")
    assert response.status_code == status.HTTP_200_OK
    assert len(response.data) == 2


@pytest.mark.django_db
def test_collaborator_can_read_notes(user, other_user, project, publication):
    ProjectCollaborator.objects.create(
        project=project, user=other_user, invited_by=user,
        role=ProjectCollaborator.Role.EDITOR, status=ProjectCollaborator.Status.ACCEPTED,
    )
    PublicationNote.objects.create(publication=publication, text="Bendra pastaba")
    c = APIClient()
    c.force_authenticate(user=other_user)
    response = c.get(f"/api/projects/publications/{publication.id}/notes/")
    assert response.status_code == status.HTTP_200_OK
    assert any(n["text"] == "Bendra pastaba" for n in response.data)


@pytest.mark.django_db
def test_update_note(auth_client, publication):
    note = PublicationNote.objects.create(publication=publication, text="Sena")
    response = auth_client.patch(
        f"/api/projects/publications/{publication.id}/notes/{note.id}/",
        {"text": "Nauja"},
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.data["text"] == "Nauja"


@pytest.mark.django_db
def test_delete_note(auth_client, publication):
    note = PublicationNote.objects.create(publication=publication, text="Trinti")
    response = auth_client.delete(f"/api/projects/publications/{publication.id}/notes/{note.id}/")
    assert response.status_code == status.HTTP_204_NO_CONTENT
    assert not PublicationNote.objects.filter(id=note.id).exists()


@pytest.mark.django_db
def test_update_label(auth_client, publication):
    response = auth_client.patch(
        f"/api/projects/publications/{publication.id}/label/",
        {"label": "Cituota"},
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK
    publication.refresh_from_db()
    assert publication.label == "Cituota"


@pytest.mark.django_db
def test_invite_collaborator(auth_client, project, other_user):
    response = auth_client.post(
        f"/api/projects/{project.id}/collaborators/invite/",
        {"username": other_user.username, "role": "editor"},
        format="json",
    )
    assert response.status_code == status.HTTP_201_CREATED
    assert ProjectCollaborator.objects.filter(project=project, user=other_user).exists()


@pytest.mark.django_db
def test_cannot_invite_self(auth_client, project, user):
    response = auth_client.post(
        f"/api/projects/{project.id}/collaborators/invite/",
        {"username": user.username, "role": "editor"},
        format="json",
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_cannot_invite_duplicate(auth_client, project, other_user):
    auth_client.post(
        f"/api/projects/{project.id}/collaborators/invite/",
        {"username": other_user.username, "role": "editor"},
        format="json",
    )
    response = auth_client.post(
        f"/api/projects/{project.id}/collaborators/invite/",
        {"username": other_user.username, "role": "editor"},
        format="json",
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_invite_nonexistent_user(auth_client, project):
    response = auth_client.post(
        f"/api/projects/{project.id}/collaborators/invite/",
        {"username": "neegzistuoja", "role": "editor"},
        format="json",
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_accept_invitation(other_client, user, other_user, project):
    collab = ProjectCollaborator.objects.create(
        project=project, user=other_user, invited_by=user,
        role=ProjectCollaborator.Role.EDITOR, status=ProjectCollaborator.Status.PENDING,
    )
    response = other_client.post(f"/api/projects/invitations/{collab.id}/respond/", {"action": "accept"}, format="json")
    assert response.status_code == status.HTTP_200_OK
    collab.refresh_from_db()
    assert collab.status == ProjectCollaborator.Status.ACCEPTED
    assert collab.accepted_at is not None


@pytest.mark.django_db
def test_decline_invitation(other_client, user, other_user, project):
    collab = ProjectCollaborator.objects.create(
        project=project, user=other_user, invited_by=user,
        role=ProjectCollaborator.Role.EDITOR, status=ProjectCollaborator.Status.PENDING,
    )
    response = other_client.post(f"/api/projects/invitations/{collab.id}/respond/", {"action": "decline"}, format="json")
    assert response.status_code == status.HTTP_200_OK
    collab.refresh_from_db()
    assert collab.status == ProjectCollaborator.Status.DECLINED


@pytest.mark.django_db
def test_pending_invitations_list(other_client, user, other_user, project):
    ProjectCollaborator.objects.create(
        project=project, user=other_user, invited_by=user,
        role=ProjectCollaborator.Role.EDITOR, status=ProjectCollaborator.Status.PENDING,
    )
    response = other_client.get("/api/projects/invitations/pending/")
    assert response.status_code == status.HTTP_200_OK
    assert len(response.data) == 1
    assert response.data[0]["project_name"] == project.name


@pytest.mark.django_db
def test_collaborator_list_includes_owner(auth_client, project):
    response = auth_client.get(f"/api/projects/{project.id}/collaborators/")
    assert response.status_code == status.HTTP_200_OK
    roles = [c["role"] for c in response.data]
    assert "owner" in roles


@pytest.mark.django_db
def test_remove_collaborator(auth_client, project, user, other_user):
    collab = ProjectCollaborator.objects.create(
        project=project, user=other_user, invited_by=user,
        role=ProjectCollaborator.Role.EDITOR, status=ProjectCollaborator.Status.ACCEPTED,
    )
    response = auth_client.delete(f"/api/projects/{project.id}/collaborators/{collab.id}/")
    assert response.status_code == status.HTTP_204_NO_CONTENT
    assert not ProjectCollaborator.objects.filter(id=collab.id).exists()


@pytest.mark.django_db
def test_accepted_collaborator_sees_shared_project(other_client, user, other_user, project):
    ProjectCollaborator.objects.create(
        project=project, user=other_user, invited_by=user,
        role=ProjectCollaborator.Role.EDITOR, status=ProjectCollaborator.Status.ACCEPTED,
    )
    response = other_client.get("/api/projects/")
    assert response.status_code == status.HTTP_200_OK
    names = [p["name"] for p in response.data]
    assert project.name in names


@pytest.mark.django_db
def test_submit_positive_feedback(auth_client, project):
    response = auth_client.post(
        f"/api/projects/{project.id}/recommendation-feedback/",
        {"openalex_id": "https://openalex.org/W1", "title": "Paper", "feedback": "positive"},
        format="json",
    )
    assert response.status_code in [status.HTTP_200_OK, status.HTTP_201_CREATED]
    assert RecommendationFeedback.objects.filter(
        project=project, openalex_id="https://openalex.org/W1", feedback="positive"
    ).exists()


@pytest.mark.django_db
def test_submit_negative_feedback(auth_client, project):
    response = auth_client.post(
        f"/api/projects/{project.id}/recommendation-feedback/",
        {"openalex_id": "https://openalex.org/W2", "title": "Paper 2", "feedback": "negative"},
        format="json",
    )
    assert response.status_code in [status.HTTP_200_OK, status.HTTP_201_CREATED]


@pytest.mark.django_db
def test_get_feedback_list(auth_client, project, user):
    RecommendationFeedback.objects.create(
        user=user, project=project,
        openalex_id="https://openalex.org/W4", title="Paper",
        feedback=RecommendationFeedback.Feedback.POSITIVE,
    )
    response = auth_client.get(f"/api/projects/{project.id}/recommendation-feedback/")
    assert response.status_code == status.HTTP_200_OK
    assert len(response.data) == 1


