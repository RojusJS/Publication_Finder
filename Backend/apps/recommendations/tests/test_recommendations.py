import pytest

from apps.projects.models import Project, ProjectCollaborator, RecommendationFeedback
from apps.recommendations.services import normalize_title
from conftest import make_work

pytestmark = pytest.mark.django_db
URL = "/api/recommendations/{}/"


@pytest.fixture
def library(project, make_publication, fake_openalex):
    """Two saved papers about protein folding plus a citation neighbourhood in OpenAlex."""
    make_publication(number=1, title="Protein structure prediction", abstract="protein folding structure prediction deep learning")
    make_publication(number=2, title="Folding proteins with networks", abstract="protein folding neural networks structure")
    fake_openalex.add(
        make_work(1, "Protein structure prediction", related=(10, 11), refs=(20, 21)),
        make_work(2, "Folding proteins with networks", related=(10,), refs=(20,)),
        make_work(10, "Deep protein folding models", abstract="protein folding structure deep learning models", cited_by=500),
        make_work(11, "Medieval poetry", abstract="courtly love French verse troubadours", cited_by=5, keywords=("poetry",)),
        make_work(20, "Classic folding energy landscapes", abstract="protein folding energy landscape theory", cited_by=900, year=1997),
        make_work(21, "Unrelated chemistry", abstract="organic synthesis catalysts", cited_by=50, year=2001),
        make_work(30, "Citing work on structure", abstract="protein structure prediction benchmark folding", refs=(1, 2), cited_by=40),
        make_work(31, "Retracted folding claim", abstract="protein folding", refs=(1,), retracted=True),
        make_work(32, "Erratum", abstract="protein folding", refs=(1,), work_type="erratum"),
    )
    return project


def test_requires_membership(client_for, make_user, library):
    response = client_for(make_user("outsider")).post(URL.format(library.id), {}, format="json")
    assert response.status_code == 404


def test_empty_project_returns_no_recommendations(auth_client, user, fake_openalex):
    empty = Project.objects.create(user=user, name="Empty")
    response = auth_client.post(URL.format(empty.id), {}, format="json")
    assert response.status_code == 200
    assert response.json()["recommendations"] == []
    assert fake_openalex.calls == []


def test_recommendations_rank_relevant_works_and_explain_them(auth_client, library):
    response = auth_client.post(URL.format(library.id), {"limit": 10}, format="json")
    assert response.status_code == 200
    data = response.json()
    assert data["seed_count"] == 2
    assert data["method"] == "tfidf"
    ids = [item["openalex_id"].rsplit("/", 1)[-1] for item in data["recommendations"]]
    # Saved works, retracted works and errata are never recommended.
    assert not {"W1", "W2", "W31", "W32"} & set(ids)
    assert ids.index("W10") < ids.index("W11")
    assert ids.index("W30") < ids.index("W21")

    by_id = {item["openalex_id"].rsplit("/", 1)[-1]: item for item in data["recommendations"]}
    reasons = {reason["code"]: reason for reason in by_id["W30"]["reasons"]}
    assert reasons["cites_saved"]["count"] == 2
    w10_reasons = {reason["code"]: reason for reason in by_id["W10"]["reasons"]}
    assert w10_reasons["related_to_saved"]["count"] == 2
    assert {reason["code"] for reason in by_id["W20"]["reasons"]} >= {"cited_by_saved"}
    for item in data["recommendations"]:
        assert 0 <= item["score"] <= 100
        assert item["saved_in"] == []


def test_feedback_excludes_items(auth_client, user, library):
    RecommendationFeedback.objects.create(user=user, project=library, openalex_id="https://openalex.org/W10",
                                          feedback="negative")
    ids = [item["openalex_id"] for item in auth_client.post(URL.format(library.id), {}, format="json").json()["recommendations"]]
    assert "https://openalex.org/W10" not in ids


def test_limit_and_folder_scope(auth_client, library, folder, make_publication):
    response = auth_client.post(URL.format(library.id), {"limit": 2}, format="json")
    assert len(response.json()["recommendations"]) == 2
    empty_scope = auth_client.post(URL.format(library.id), {"folder_id": folder.id}, format="json").json()
    assert empty_scope["seed_count"] == 0
    assert auth_client.post(URL.format(library.id), {"folder_id": 999}, format="json").status_code == 404


def test_results_are_cached_until_library_changes(auth_client, library, fake_openalex, make_publication):
    auth_client.post(URL.format(library.id), {}, format="json")
    calls = len(fake_openalex.calls)
    auth_client.post(URL.format(library.id), {}, format="json")
    assert len(fake_openalex.calls) == calls
    make_publication(number=3, title="New saved paper")
    auth_client.post(URL.format(library.id), {}, format="json")
    assert len(fake_openalex.calls) > calls


def test_collaborators_can_get_recommendations(library, make_user, add_member, client_for):
    viewer = make_user("viewer")
    add_member(library, viewer, ProjectCollaborator.Role.VIEWER)
    assert client_for(viewer).post(URL.format(library.id), {}, format="json").status_code == 200


def test_openalex_outage_is_reported(auth_client, library, fake_openalex):
    fake_openalex.fail = True
    response = auth_client.post(URL.format(library.id), {}, format="json")
    assert response.status_code == 502
    assert response.json()["code"] == "openalex_unavailable"


def test_normalize_title_handles_unicode():
    assert normalize_title("Šaltinis: A Study!") == "šaltinis a study"
