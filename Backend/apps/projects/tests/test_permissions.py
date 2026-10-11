"""Who may do what inside a project (owner / editor / viewer / outsider)."""
import pytest

from apps.projects.models import Folder, ProjectCollaborator, PublicationNote

pytestmark = pytest.mark.django_db
VIEWER = ProjectCollaborator.Role.VIEWER
EDITOR = ProjectCollaborator.Role.EDITOR


@pytest.fixture
def setup(project, folder, make_publication, make_user, add_member, client_for):
    pub = make_publication(number=1, folder=folder)
    editor, viewer, outsider, pending = (make_user(name) for name in ("editor", "viewer", "outsider", "pending"))
    add_member(project, editor, EDITOR)
    add_member(project, viewer, VIEWER)
    add_member(project, pending, EDITOR, status=ProjectCollaborator.Status.PENDING)
    return {
        "project": project, "folder": folder, "pub": pub,
        "owner": client_for(project.user), "editor": client_for(editor), "viewer": client_for(viewer),
        "outsider": client_for(outsider), "pending": client_for(pending), "editor_user": editor,
    }


@pytest.mark.parametrize("who", ["outsider", "pending"])
def test_non_members_get_404_everywhere(setup, who):
    client, project, folder, pub = setup[who], setup["project"], setup["folder"], setup["pub"]
    urls = [
        f"/api/projects/{project.id}/",
        f"/api/projects/{project.id}/folders/",
        f"/api/projects/{project.id}/folders/{folder.id}/",
        f"/api/projects/{project.id}/publications/?folder={folder.id}",
        f"/api/projects/{project.id}/publications/{pub.id}/",
        f"/api/projects/{project.id}/publications/{pub.id}/notes/",
        f"/api/projects/{project.id}/analytics/",
        f"/api/projects/{project.id}/collaborators/",
        f"/api/projects/{project.id}/export/?format=csv",
    ]
    for url in urls:
        response = client.get(url)
        assert response.status_code == 404, url
        assert response.json()["code"] == "project_not_found"


def test_viewer_can_read_but_not_write(setup):
    viewer, project, folder, pub = setup["viewer"], setup["project"], setup["folder"], setup["pub"]
    assert viewer.get(f"/api/projects/{project.id}/publications/?folder={folder.id}").status_code == 200
    assert viewer.get(f"/api/projects/{project.id}/publications/{pub.id}/notes/").status_code == 200

    forbidden = [
        viewer.post(f"/api/projects/{project.id}/folders/", {"name": "X"}, format="json"),
        viewer.patch(f"/api/projects/{project.id}/folders/{folder.id}/", {"name": "X"}, format="json"),
        viewer.delete(f"/api/projects/{project.id}/folders/{folder.id}/"),
        viewer.post(f"/api/projects/{project.id}/publications/", {"openalex_id": "W5"}, format="json"),
        viewer.patch(f"/api/projects/{project.id}/publications/{pub.id}/", {"label": "read"}, format="json"),
        viewer.delete(f"/api/projects/{project.id}/publications/{pub.id}/"),
        viewer.post(f"/api/projects/{project.id}/publications/{pub.id}/notes/", {"text": "hi"}, format="json"),
        viewer.patch(f"/api/projects/{project.id}/", {"name": "X"}, format="json"),
        viewer.delete(f"/api/projects/{project.id}/"),
    ]
    for response in forbidden:
        assert response.status_code == 403
    assert forbidden[0].json()["code"] == "editor_required"
    assert forbidden[-1].json()["code"] == "owner_required"


def test_editor_can_edit_content_but_not_project(setup):
    editor, project, pub = setup["editor"], setup["project"], setup["pub"]
    assert editor.post(f"/api/projects/{project.id}/folders/", {"name": "New"}, format="json").status_code == 201
    assert editor.patch(f"/api/projects/{project.id}/publications/{pub.id}/", {"label": "read"}, format="json").status_code == 200
    assert editor.patch(f"/api/projects/{project.id}/", {"name": "X"}, format="json").status_code == 403
    assert editor.post(f"/api/projects/{project.id}/collaborators/invite/", {"username": "viewer"}, format="json").status_code == 403


def test_folder_publications_of_other_projects_are_not_reachable(setup, make_user, client_for):
    """Regression: the old API listed any folder's publications for any user."""
    attacker = client_for(make_user("attacker"))
    folder = setup["folder"]
    response = attacker.get(f"/api/projects/{setup['project'].id}/publications/?folder={folder.id}")
    assert response.status_code == 404


def test_folder_ids_are_scoped_to_their_project(setup, user, client_for):
    from apps.projects.models import Project

    mine = Project.objects.create(user=setup["editor_user"], name="Mine")
    client = setup["editor"]
    response = client.get(f"/api/projects/{mine.id}/publications/?folder={setup['folder'].id}")
    assert response.status_code == 404
    assert response.json()["code"] == "folder_not_found"


def test_note_ownership(setup):
    editor, owner, project, pub = setup["editor"], setup["owner"], setup["project"], setup["pub"]
    owner_note = owner.post(f"/api/projects/{project.id}/publications/{pub.id}/notes/", {"text": "owner"}, format="json").json()
    editor_note = editor.post(f"/api/projects/{project.id}/publications/{pub.id}/notes/", {"text": "editor"}, format="json").json()
    assert editor_note["author"]["username"] == "editor"
    assert editor_note["can_edit"] is True

    url = f"/api/projects/{project.id}/publications/{pub.id}/notes/"
    assert editor.patch(f"{url}{owner_note['id']}/", {"text": "hijack"}, format="json").status_code == 403
    assert editor.patch(f"{url}{editor_note['id']}/", {"text": "edited"}, format="json").status_code == 200
    assert owner.delete(f"{url}{editor_note['id']}/").status_code == 204  # owner moderates
    listing = setup["viewer"].get(url).json()
    assert [note["text"] for note in listing] == ["owner"]
    assert listing[0]["can_edit"] is False


def test_notes_cannot_be_reached_through_another_publication(setup, make_publication):
    owner, project = setup["owner"], setup["project"]
    other = make_publication(number=2)
    note = PublicationNote.objects.create(publication=setup["pub"], text="x", author=project.user)
    response = owner.patch(f"/api/projects/{project.id}/publications/{other.id}/notes/{note.id}/", {"text": "y"}, format="json")
    assert response.status_code == 404


def test_label_update_only_changes_label(setup):
    """Regression: the old label endpoint accepted (and saved) any publication field."""
    owner, project, pub = setup["owner"], setup["project"], setup["pub"]
    response = owner.patch(
        f"/api/projects/{project.id}/publications/{pub.id}/",
        {"label": "cited", "title": "Hacked", "openalex_id": "W666"},
        format="json",
    )
    assert response.status_code == 200
    pub.refresh_from_db()
    assert pub.label == "cited"
    assert pub.title == "Saved publication 1"
    invalid = owner.patch(f"/api/projects/{project.id}/publications/{pub.id}/", {"label": "Cituota"}, format="json")
    assert invalid.status_code == 400


def test_collaborators_listing_hides_invitations_from_non_owners(setup):
    project = setup["project"]
    owner_view = setup["owner"].get(f"/api/projects/{project.id}/collaborators/").json()
    viewer_view = setup["viewer"].get(f"/api/projects/{project.id}/collaborators/").json()
    assert {entry["status"] for entry in owner_view} == {"accepted", "pending"}
    assert {entry["status"] for entry in viewer_view} == {"accepted"}
    assert "email" not in owner_view[0]["user"]


def test_folder_count_unaffected_by_other_projects(setup, make_user):
    assert Folder.objects.count() == 1
