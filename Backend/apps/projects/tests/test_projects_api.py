import csv
import io

import pytest

from apps.projects.models import (
    Folder,
    Project,
    ProjectCollaborator,
    PublicationNote,
    RecommendationFeedback,
    SavedPublication,
)
from conftest import make_work

pytestmark = pytest.mark.django_db


# -- projects -----------------------------------------------------------------

def test_create_and_list_projects_with_roles_and_counts(auth_client, user, make_user, add_member, make_publication, project):
    make_publication(number=1)
    shared = Project.objects.create(user=make_user("alice"), name="Shared")
    add_member(shared, user, ProjectCollaborator.Role.VIEWER)
    created = auth_client.post("/api/projects/", {"name": "  New  ", "description": "d"}, format="json")
    assert created.status_code == 201
    assert created.json()["name"] == "New"
    assert created.json()["role"] == "owner"

    listing = {item["name"]: item for item in auth_client.get("/api/projects/").json()}
    assert listing["Thesis"]["publication_count"] == 1
    assert listing["Thesis"]["role"] == "owner"
    assert listing["Shared"]["role"] == "viewer"
    assert listing["Shared"]["owner"] == "alice"
    assert listing["Shared"]["member_count"] == 1


def test_project_validation(auth_client):
    assert auth_client.post("/api/projects/", {"name": "   "}, format="json").status_code == 400
    assert auth_client.post("/api/projects/", {"name": "x" * 256}, format="json").status_code == 400


def test_update_and_delete_project(auth_client, project):
    response = auth_client.patch(f"/api/projects/{project.id}/", {"name": "Renamed"}, format="json")
    assert response.json()["name"] == "Renamed"
    assert auth_client.delete(f"/api/projects/{project.id}/").status_code == 204
    assert not Project.objects.filter(pk=project.pk).exists()


def test_collaborator_can_leave_but_owner_cannot(auth_client, project, make_user, add_member, client_for):
    member = make_user("member")
    add_member(project, member)
    assert client_for(member).post(f"/api/projects/{project.id}/leave/").status_code == 204
    assert not ProjectCollaborator.objects.filter(project=project, user=member).exists()
    response = auth_client.post(f"/api/projects/{project.id}/leave/")
    assert response.status_code == 400
    assert response.json()["code"] == "owner_cannot_leave"


# -- folders --------------------------------------------------------------------

def test_folder_crud_and_breadcrumb(auth_client, project, folder):
    url = f"/api/projects/{project.id}/folders/"
    sub = auth_client.post(url, {"name": "Sub", "parent": folder.id}, format="json").json()
    detail = auth_client.get(f"{url}{sub['id']}/").json()
    assert [crumb["name"] for crumb in detail["breadcrumb"]] == ["Methods", "Sub"]
    root_listing = auth_client.get(url).json()
    assert root_listing[0]["subfolder_count"] == 1
    assert [item["name"] for item in auth_client.get(url, {"parent": folder.id}).json()] == ["Sub"]
    renamed = auth_client.patch(f"{url}{folder.id}/", {"name": "Methodology"}, format="json").json()
    assert renamed["name"] == "Methodology"
    assert renamed["subfolder_count"] == 1


def test_duplicate_folder_names_are_rejected_including_root(auth_client, project, folder):
    url = f"/api/projects/{project.id}/folders/"
    response = auth_client.post(url, {"name": "methods"}, format="json")
    assert response.status_code == 400
    assert "name" in response.json()["fields"]
    auth_client.post(url, {"name": "Child", "parent": folder.id}, format="json")
    assert auth_client.post(url, {"name": "Child", "parent": folder.id}, format="json").status_code == 400


def test_folder_cannot_be_moved_into_itself_or_descendant(auth_client, project, folder):
    child = Folder.objects.create(project=project, parent=folder, name="Child")
    url = f"/api/projects/{project.id}/folders/{folder.id}/"
    assert auth_client.patch(url, {"parent": folder.id}, format="json").status_code == 400
    assert auth_client.patch(url, {"parent": child.id}, format="json").status_code == 400


def test_folder_parent_must_belong_to_project(auth_client, project, folder, make_user):
    foreign = Folder.objects.create(project=Project.objects.create(user=make_user("x"), name="X"), name="F")
    response = auth_client.post(f"/api/projects/{project.id}/folders/", {"name": "N", "parent": foreign.id}, format="json")
    assert response.status_code == 400


def test_folder_tree(auth_client, project, folder, make_publication):
    child = Folder.objects.create(project=project, parent=folder, name="Child")
    Folder.objects.create(project=project, name="Another")
    make_publication(number=1, folder=child)
    tree = auth_client.get(f"/api/projects/{project.id}/folders/tree/").json()
    assert [(item["path"], item["depth"]) for item in tree] == [("Another", 0), ("Methods", 0), ("Methods / Child", 1)]
    assert tree[2]["publication_count"] == 1


def test_deleting_folder_keeps_publications_and_merges_duplicates(auth_client, project, folder, make_publication):
    child = Folder.objects.create(project=project, parent=folder, name="Child")
    in_root = make_publication(number=1)
    duplicate = make_publication(number=1, folder=child, label="cited")
    PublicationNote.objects.create(publication=duplicate, text="keep me")
    unique = make_publication(number=2, folder=child)
    assert auth_client.delete(f"/api/projects/{project.id}/folders/{folder.id}/").status_code == 204
    assert not Folder.objects.filter(project=project).exists()
    in_root.refresh_from_db()
    unique.refresh_from_db()
    assert unique.folder_id is None
    assert in_root.label == "cited"
    assert list(in_root.notes.values_list("text", flat=True)) == ["keep me"]
    assert SavedPublication.objects.filter(project=project).count() == 2


def test_deleting_folder_with_publications(auth_client, project, folder, make_publication):
    make_publication(number=1, folder=folder)
    auth_client.delete(f"/api/projects/{project.id}/folders/{folder.id}/?keep_publications=false")
    assert SavedPublication.objects.count() == 0


# -- publications ----------------------------------------------------------------

def test_save_publications_resolves_metadata_on_server(auth_client, user, project, folder, fake_openalex):
    fake_openalex.add(make_work(1, "Real title", doi="https://doi.org/10.1/x"), make_work(2))
    response = auth_client.post(
        f"/api/projects/{project.id}/publications/",
        {"openalex_ids": ["W1", "https://openalex.org/W2", "W2", "W404", "nonsense"], "folder_id": folder.id},
        format="json",
    )
    assert response.status_code == 201
    body = response.json()
    assert sorted(item["title"] for item in body["saved"]) == ["Publication 2", "Real title"]
    reasons = sorted((item["openalex_id"], item["reason"]) for item in body["skipped"])
    assert reasons == [("https://openalex.org/W404", "not_found"), ("nonsense", "invalid_id")]
    saved = SavedPublication.objects.get(openalex_id="https://openalex.org/W1")
    assert saved.added_by == user
    assert saved.folder == folder
    assert saved.doi == "https://doi.org/10.1/x"
    assert saved.biblio == {"volume": "12", "issue": "3", "first_page": "100", "last_page": "110"}

    again = auth_client.post(f"/api/projects/{project.id}/publications/", {"openalex_id": "W1", "folder_id": folder.id}, format="json")
    assert again.status_code == 200
    assert again.json()["skipped"] == [{"openalex_id": "https://openalex.org/W1", "reason": "already_saved"}]


def test_save_is_rejected_when_openalex_is_down(auth_client, project, fake_openalex):
    fake_openalex.fail = True
    response = auth_client.post(f"/api/projects/{project.id}/publications/", {"openalex_id": "W1"}, format="json")
    assert response.status_code == 502
    assert response.json()["code"] == "openalex_unavailable"


def test_save_requires_ids_and_limits_batch(auth_client, project):
    url = f"/api/projects/{project.id}/publications/"
    assert auth_client.post(url, {}, format="json").status_code == 400
    assert auth_client.post(url, {"openalex_ids": [f"W{n}" for n in range(101)]}, format="json").status_code == 400


def test_list_publications_filters_sorting_and_pagination(auth_client, project, folder, make_publication):
    make_publication(number=1, title="Alpha networks", year=2010, label="read")
    make_publication(number=2, title="Beta", year=2020, authors=["Grace Hopper"])
    make_publication(number=3, title="In folder", folder=folder)
    url = f"/api/projects/{project.id}/publications/"
    root = auth_client.get(url).json()
    assert root["count"] == 2
    assert [item["title"] for item in auth_client.get(url, {"sort": "year_asc"}).json()["results"]] == ["Alpha networks", "Beta"]
    assert [item["title"] for item in auth_client.get(url, {"q": "hopper"}).json()["results"]] == ["Beta"]
    assert [item["title"] for item in auth_client.get(url, {"label": "read"}).json()["results"]] == ["Alpha networks"]
    assert [item["title"] for item in auth_client.get(url, {"label": "none"}).json()["results"]] == ["Beta"]
    assert auth_client.get(url, {"folder": "all"}).json()["count"] == 3
    assert auth_client.get(url, {"folder": folder.id}).json()["results"][0]["type"] is None
    paged = auth_client.get(url, {"folder": "all", "page_size": 2, "page": 2}).json()
    assert paged["count"] == 3 and len(paged["results"]) == 1


def test_move_publication(auth_client, project, folder, make_publication):
    pub = make_publication(number=1)
    make_publication(number=1, folder=folder)
    url = f"/api/projects/{project.id}/publications/{pub.id}/"
    conflict = auth_client.patch(url, {"folder_id": folder.id}, format="json")
    assert conflict.status_code == 409
    assert conflict.json()["code"] == "duplicate_in_folder"
    other = Folder.objects.create(project=project, name="Other")
    moved = auth_client.patch(url, {"folder_id": other.id, "label": "to_read"}, format="json").json()
    assert moved["folder_id"] == other.id and moved["label"] == "to_read"
    assert auth_client.patch(url, {"folder_id": None}, format="json").json()["folder_id"] is None


def test_move_conflict_rolls_back_label(auth_client, project, folder, make_publication):
    pub = make_publication(number=1)
    make_publication(number=1, folder=folder)
    auth_client.patch(f"/api/projects/{project.id}/publications/{pub.id}/", {"label": "cited", "folder_id": folder.id}, format="json")
    pub.refresh_from_db()
    assert pub.label is None


# -- analytics, exports, semantic search ---------------------------------------------

def test_analytics(auth_client, project, folder, make_publication):
    make_publication(number=1, year=2018, cited_by_count=10, is_oa=True, label="read", keywords=["ml", "nlp"])
    make_publication(number=2, year=2020, cited_by_count=30, keywords=["ml"], folder=folder, is_retracted=True)
    data = auth_client.get(f"/api/projects/{project.id}/analytics/").json()
    assert data["total_publications"] == 2
    assert data["total_citations"] == 40
    assert data["year_distribution"] == [{"year": 2018, "count": 1}, {"year": 2020, "count": 1}]
    assert data["labels"] == {"to_read": 0, "read": 1, "to_cite": 0, "cited": 0}
    assert data["unlabeled_count"] == 1
    assert data["top_keywords"][0] == {"name": "ml", "count": 2}
    assert data["open_access_count"] == 1
    assert data["most_cited"][0]["cited_by_count"] == 30
    assert len(data["retracted"]) == 1
    scoped = auth_client.get(f"/api/projects/{project.id}/analytics/", {"folder": folder.id}).json()
    assert scoped["total_publications"] == 1


@pytest.mark.parametrize("fmt, content_type, extension", [
    ("bibtex", "application/x-bibtex", ".bib"),
    ("ris", "application/x-research-info-systems", ".ris"),
    ("csv", "text/csv", ".csv"),
    ("pdf", "application/pdf", ".pdf"),
])
def test_exports(auth_client, project, folder, make_publication, fmt, content_type, extension):
    make_publication(number=1, title="Šaltinis & co", authors=["Žydrūnas Šalčius"], year=2021, label="cited")
    pub = make_publication(number=2, title="=HYPERLINK(evil)", folder=folder)
    PublicationNote.objects.create(publication=pub, text="note text")
    response = auth_client.get(f"/api/projects/{project.id}/export/", {"format": fmt})
    assert response.status_code == 200
    assert response["Content-Type"].startswith(content_type)
    assert response["Content-Disposition"].endswith(f'{extension}"')
    body = response.content
    if fmt == "pdf":
        assert body.startswith(b"%PDF")
    elif fmt == "bibtex":
        text = body.decode()
        assert "@article{salcius2021saltinis," in text or "@misc{salcius2021saltinis," in text
        assert r"\&" in text
    elif fmt == "ris":
        assert body.decode().count("ER  - ") == 2
    else:
        rows = list(csv.reader(io.StringIO(body.decode("utf-8-sig"))))
        assert rows[0][0] == "Title"
        titles = [row[0] for row in rows[1:]]
        assert "'=HYPERLINK(evil)" in titles
        folder_column = rows[0].index("Folder")
        assert {row[folder_column] for row in rows[1:]} == {"", "Methods"}


def test_export_requires_valid_format(auth_client, project):
    assert auth_client.get(f"/api/projects/{project.id}/export/", {"format": "docx"}).status_code == 400


def test_semantic_search_with_tfidf_fallback(auth_client, project, make_publication):
    make_publication(number=1, title="Protein folding with deep networks", abstract="AlphaFold protein structure", keywords=[])
    make_publication(number=2, title="Medieval poetry", abstract="Courtly love in French verse", keywords=[])
    response = auth_client.post(f"/api/projects/{project.id}/semantic-search/", {"query": "protein structure"}, format="json")
    data = response.json()
    assert data["method"] == "tfidf"
    assert [item["title"] for item in data["results"]] == ["Protein folding with deep networks"]
    assert 0 < data["results"][0]["similarity"] <= 100


def test_semantic_search_uses_stored_embeddings(auth_client, project, make_publication, monkeypatch):
    import numpy as np
    from apps.projects.services import similarity

    make_publication(number=1, title="A", embedding=[1.0, 0.0])
    make_publication(number=2, title="B", embedding=[0.0, 1.0])
    monkeypatch.setattr(similarity, "encode", lambda texts: np.array([[0.6, 0.8]] * len(texts), dtype=np.float32))
    data = auth_client.post(f"/api/projects/{project.id}/semantic-search/", {"query": "q"}, format="json").json()
    assert data["method"] == "embeddings"
    assert [(item["title"], item["similarity"]) for item in data["results"]] == [("B", 80), ("A", 60)]


# -- feedback, collaboration, inbox, history ---------------------------------------

def test_recommendation_feedback_set_and_clear(auth_client, user, project):
    url = f"/api/projects/{project.id}/recommendation-feedback/"
    created = auth_client.post(url, {"openalex_id": "W1", "title": "T", "feedback": "negative"}, format="json")
    assert created.status_code == 201
    assert created.json()["openalex_id"] == "https://openalex.org/W1"
    assert auth_client.post(url, {"openalex_id": "W1", "feedback": "positive"}, format="json").status_code == 200
    assert RecommendationFeedback.objects.get().feedback == "positive"
    assert auth_client.post(url, {"openalex_id": "W1", "feedback": None}, format="json").status_code == 204
    assert not RecommendationFeedback.objects.exists()
    assert auth_client.post(url, {"openalex_id": "bad", "feedback": "positive"}, format="json").status_code == 400


def test_invitation_flow(auth_client, project, make_user, client_for):
    invitee = make_user("invitee", email="invitee@example.com")
    url = f"/api/projects/{project.id}/collaborators/invite/"
    invited = auth_client.post(url, {"username": "INVITEE@example.com", "role": "viewer"}, format="json")
    assert invited.status_code == 201
    assert auth_client.post(url, {"username": "invitee"}, format="json").json()["code"] == "already_invited"
    assert auth_client.post(url, {"username": "owner"}, format="json").json()["code"] == "cannot_invite_owner"
    missing = auth_client.post(url, {"username": "ghost"}, format="json")
    assert missing.status_code == 404 and missing.json()["code"] == "user_not_found"

    invitee_client = client_for(invitee)
    pending = invitee_client.get("/api/projects/invitations/").json()
    assert pending[0]["project_name"] == "Thesis"
    assert invitee_client.get("/api/notifications/").json()["pending_invitations"] == 1
    invitee_client.post(f"/api/projects/invitations/{pending[0]['id']}/respond/", {"action": "decline"}, format="json")
    assert invitee_client.get(f"/api/projects/{project.id}/").status_code == 404

    reinvite = auth_client.post(url, {"username": "invitee", "role": "editor"}, format="json")
    assert reinvite.status_code == 201  # declined invitations can be re-sent
    collaborator_id = reinvite.json()["id"]
    invitee_client.post(f"/api/projects/invitations/{collaborator_id}/respond/", {"action": "accept"}, format="json")
    assert invitee_client.get(f"/api/projects/{project.id}/").json()["role"] == "editor"
    assert auth_client.post(url, {"username": "invitee"}, format="json").json()["code"] == "already_member"

    changed = auth_client.patch(f"/api/projects/{project.id}/collaborators/{collaborator_id}/", {"role": "viewer"}, format="json")
    assert changed.json()["role"] == "viewer"
    assert auth_client.delete(f"/api/projects/{project.id}/collaborators/{collaborator_id}/").status_code == 204
    assert invitee_client.get(f"/api/projects/{project.id}/").status_code == 404


def test_share_publication_and_inbox(auth_client, user, make_user, client_for, fake_openalex, make_publication):
    recipient = make_user("recipient")
    fake_openalex.add(make_work(9, "Shared paper"))
    response = auth_client.post("/api/inbox/share/", {"username": "recipient", "openalex_id": "W9", "message": "Read"}, format="json")
    assert response.status_code == 201
    assert response.json()["publication"]["title"] == "Shared paper"
    # Sharing again while unread updates the existing item instead of spamming.
    auth_client.post("/api/inbox/share/", {"username": "recipient", "openalex_id": "W9", "message": "Again"}, format="json")

    inbox_client = client_for(recipient)
    inbox = inbox_client.get("/api/inbox/").json()
    assert inbox["count"] == 1
    item = inbox["results"][0]
    assert item["message"] == "Again" and item["sender"]["username"] == "owner"
    assert inbox_client.get("/api/notifications/").json()["unread_shared"] == 1
    inbox_client.post(f"/api/inbox/{item['id']}/read/")
    assert inbox_client.get("/api/notifications/").json()["unread_shared"] == 0
    assert inbox_client.get("/api/inbox/", {"unread": "true"}).json()["count"] == 0
    assert auth_client.delete(f"/api/inbox/{item['id']}/").status_code == 404  # only the recipient can delete
    assert inbox_client.delete(f"/api/inbox/{item['id']}/").status_code == 204


def test_share_validation(auth_client, fake_openalex):
    assert auth_client.post("/api/inbox/share/", {"username": "owner", "openalex_id": "W1"}, format="json").json()["code"] == "cannot_share_with_self"
    assert auth_client.post("/api/inbox/share/", {"username": "ghost", "openalex_id": "W1"}, format="json").status_code == 404
    assert auth_client.post("/api/inbox/share/", {"username": "owner", "openalex_id": "javascript:1"}, format="json").status_code == 400
    long_message = auth_client.post("/api/inbox/share/", {"username": "x", "openalex_id": "W1", "message": "m" * 501}, format="json")
    assert long_message.status_code == 400


def test_search_history_endpoints(auth_client, user, client_for, make_user):
    from apps.projects.models import SearchHistory
    from apps.projects.services.library import SEARCH_HISTORY_LIMIT, record_search

    for index in range(SEARCH_HISTORY_LIMIT + 5):
        record_search(user, f"query {index}", "all", {}, index)
    history = auth_client.get("/api/history/").json()
    assert len(history) == SEARCH_HISTORY_LIMIT
    assert history[0]["query"] == f"query {SEARCH_HISTORY_LIMIT + 4}"
    other_client = client_for(make_user("other"))
    assert other_client.delete(f"/api/history/{history[0]['id']}/").status_code == 404
    assert auth_client.delete(f"/api/history/{history[0]['id']}/").status_code == 204
    assert auth_client.delete("/api/history/").status_code == 204
    assert SearchHistory.objects.filter(user=user).count() == 0
