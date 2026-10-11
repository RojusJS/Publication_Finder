from datetime import date

import pytest

from apps.projects.models import SearchHistory
from apps.search.integrations.openalex_client import OpenAlexClient, sanitize_filter_value
from conftest import make_work

pytestmark = pytest.mark.django_db
SEARCH_URL = "/api/search/publications/"


def test_search_returns_mapped_results_and_pagination(api_client, fake_openalex):
    fake_openalex.add(*[make_work(n, f"Graph networks {n}") for n in range(1, 16)])
    response = api_client.get(SEARCH_URL, {"q": "graph networks", "per_page": 10, "page": 2})
    assert response.status_code == 200
    data = response.json()
    assert data["total_count"] == 15
    assert data["total_pages"] == 2
    assert data["page"] == 2
    assert len(data["results"]) == 5
    first = data["results"][0]
    assert first["openalex_id"].startswith("https://openalex.org/W")
    assert first["abstract"] == "Deep learning methods for testing."
    assert first["institutions"] == ["Vilnius University"]
    assert first["pdf_url"] == "https://example.org/11.pdf"
    assert first["biblio"]["volume"] == "12"


def test_default_mode_uses_full_text_search_and_caps_dates(api_client, fake_openalex):
    fake_openalex.add(make_work(1))
    api_client.get(SEARCH_URL, {"q": "transformers"})
    path, params = fake_openalex.calls[-1]
    assert params["search"] == "transformers"
    assert f"to_publication_date:{date.today().isoformat()}" in params["filter"]


def test_title_mode_uses_title_filter(api_client, fake_openalex):
    fake_openalex.add(make_work(1))
    api_client.get(SEARCH_URL, {"q": "attention", "search_by": "title"})
    params = fake_openalex.calls[-1][1]
    assert "search" not in params
    assert "title.search:attention" in params["filter"]


def test_filter_values_cannot_inject_extra_filters(api_client, fake_openalex):
    fake_openalex.add(make_work(1))
    api_client.get(SEARCH_URL, {"q": "deep,is_oa:true|x", "search_by": "title"})
    filters = fake_openalex.calls[-1][1]["filter"].split(",")
    assert "title.search:deep is_oa true x" in filters
    assert "is_oa:true" not in filters
    assert sanitize_filter_value("a,b|c!d<e>f:g") == "a b c d e f g"


def test_all_filters_are_translated(api_client, fake_openalex):
    fake_openalex.add(make_work(1))
    response = api_client.get(SEARCH_URL, {
        "q": "x", "year_from": 2010, "year_to": 2015, "oa": "true", "type": "preprint",
        "language": "LT", "institution": "https://openalex.org/I123", "sort": "cited_by_count_desc",
    })
    assert response.status_code == 200
    params = fake_openalex.calls[-1][1]
    for expected in ("from_publication_date:2010-01-01", "to_publication_date:2015-12-31", "is_oa:true",
                     "type:preprint", "language:lt", "authorships.institutions.lineage:I123"):
        assert expected in params["filter"]
    assert params["sort"] == "cited_by_count:desc"


def test_institution_only_search_is_allowed_and_sorted_by_citations(api_client, fake_openalex):
    fake_openalex.add(make_work(1))
    response = api_client.get(SEARCH_URL, {"institution": "I42"})
    assert response.status_code == 200
    assert fake_openalex.calls[-1][1]["sort"] == "cited_by_count:desc"


def test_doi_query_returns_exact_match(api_client, fake_openalex):
    fake_openalex.add(make_work(7, "Exact paper", doi="https://doi.org/10.1234/abc.def"), make_work(8))
    response = api_client.get(SEARCH_URL, {"q": "https://doi.org/10.1234/ABC.def"})
    data = response.json()
    assert data["doi_match"] is True
    assert [item["title"] for item in data["results"]] == ["Exact paper"]


@pytest.mark.parametrize("params, field", [
    ({}, "q"),
    ({"q": "x", "sort": "nope"}, "sort"),
    ({"q": "x", "search_by": "nope"}, "search_by"),
    ({"q": "x", "year_from": 2020, "year_to": 2010}, "year_from"),
    ({"q": "x", "year_from": 500}, "year_from"),
    ({"q": "x", "year_to": date.today().year + 1}, "year_to"),
    ({"q": "x", "type": "journal-article"}, "type"),
    ({"q": "x", "language": "english"}, "language"),
    ({"q": "x", "institution": "not-an-id"}, "institution"),
    ({"q": "x", "page": 5000}, "page"),
    ({"q": "x", "per_page": 7}, "per_page"),
    ({"q": "x", "oa": "maybe"}, "oa"),
])
def test_invalid_parameters_are_rejected(api_client, fake_openalex, params, field):
    response = api_client.get(SEARCH_URL, params)
    assert response.status_code == 400
    body = response.json()
    assert body["code"] == "validation_error"
    assert field in body["fields"]
    assert fake_openalex.calls == []


def test_upstream_failure_is_reported_without_leaking_details(api_client, fake_openalex, settings):
    settings.OPENALEX = {**settings.OPENALEX, "API_KEY": "secret-key"}
    fake_openalex.fail = True
    response = api_client.get(SEARCH_URL, {"q": "x"})
    assert response.status_code == 502
    body = response.json()
    assert body["code"] == "openalex_unavailable"
    assert "secret-key" not in response.content.decode()


def test_api_key_is_sent_but_not_part_of_cache_key(api_client, fake_openalex, settings):
    settings.OPENALEX = {**settings.OPENALEX, "API_KEY": "k1"}
    fake_openalex.add(make_work(1))
    api_client.get(SEARCH_URL, {"q": "cache me"})
    assert fake_openalex.calls[-1][1]["api_key"] == "k1"
    settings.OPENALEX = {**settings.OPENALEX, "API_KEY": "k2"}
    api_client.get(SEARCH_URL, {"q": "cache me"})
    assert len(fake_openalex.calls) == 1  # second request served from cache


def test_logged_in_search_records_history_and_marks_saved(auth_client, user, fake_openalex, make_publication):
    fake_openalex.add(make_work(1), make_work(2))
    make_publication(number=1)
    response = auth_client.get(SEARCH_URL, {"q": "  learning  "})
    results = {item["openalex_id"]: item for item in response.json()["results"]}
    assert results["https://openalex.org/W1"]["saved_in"][0]["project_name"] == "Thesis"
    assert results["https://openalex.org/W2"]["saved_in"] == []
    entry = SearchHistory.objects.get(user=user)
    assert entry.query == "learning"
    assert entry.result_count == 2

    auth_client.get(SEARCH_URL, {"q": "learning"})
    assert SearchHistory.objects.filter(user=user).count() == 1  # deduplicated
    auth_client.get(SEARCH_URL, {"q": "learning", "page": 2, "per_page": 10})
    assert SearchHistory.objects.filter(user=user).count() == 1  # later pages are not recorded


def test_anonymous_search_does_not_record_history(api_client, fake_openalex):
    fake_openalex.add(make_work(1))
    api_client.get(SEARCH_URL, {"q": "x"})
    assert SearchHistory.objects.count() == 0


def test_publication_detail(api_client, fake_openalex):
    fake_openalex.add(make_work(5, "<i>E. coli</i> &amp; friends"))
    response = api_client.get("/api/search/publications/detail/", {"id": "https://openalex.org/W5"})
    assert response.status_code == 200
    assert response.json()["title"] == "E. coli & friends"

    assert api_client.get("/api/search/publications/detail/", {"id": "W999"}).status_code == 404
    bad = api_client.get("/api/search/publications/detail/", {"id": "../authors"})
    assert bad.status_code == 400


def test_unsafe_urls_from_upstream_are_dropped(api_client, fake_openalex):
    work = make_work(5)
    work["primary_location"]["landing_page_url"] = "javascript:alert(1)"
    work["doi"] = "javascript:alert(2)"
    fake_openalex.add(work)
    data = api_client.get("/api/search/publications/detail/", {"id": "W5"}).json()
    assert data["doi"] is None
    assert not (data["landing_page_url"] or "").startswith("javascript")


def test_citation_network_includes_inter_citations(api_client, fake_openalex):
    fake_openalex.add(
        make_work(1, "Center", refs=(2, 3)),
        make_work(2, "Ref A", cited_by=50),
        make_work(3, "Ref B", cited_by=5, refs=(2,)),
        make_work(4, "Citing", refs=(1, 2)),
    )
    response = api_client.get("/api/search/publications/network/", {"id": "W1"})
    assert response.status_code == 200
    data = response.json()
    roles = {node["id"].rsplit("/", 1)[-1]: node["role"] for node in data["nodes"]}
    assert roles == {"W1": "center", "W2": "reference", "W3": "reference", "W4": "citing"}
    edges = {(edge["source"].rsplit("/", 1)[-1], edge["target"].rsplit("/", 1)[-1]) for edge in data["edges"]}
    assert edges == {("W1", "W2"), ("W1", "W3"), ("W4", "W1"), ("W3", "W2"), ("W4", "W2")}
    assert data["counts"] == {"references_total": 2, "references_shown": 2, "citing_total": 1, "citing_shown": 1}


def test_citation_network_marks_library_items(auth_client, fake_openalex, make_publication):
    fake_openalex.add(make_work(1, refs=(2,)), make_work(2))
    make_publication(number=2)
    data = auth_client.get("/api/search/publications/network/", {"id": "W1"}).json()
    in_library = {node["id"].rsplit("/", 1)[-1]: node["in_library"] for node in data["nodes"]}
    assert in_library == {"W1": False, "W2": True}


def test_cite_endpoint_formats_locally_without_doi(api_client, fake_openalex, no_doi_lookup):
    fake_openalex.add(make_work(9, "A study of things", authors=("Jean-Paul van der Berg", "Ada Lovelace"), year=2019))
    response = api_client.get("/api/search/publications/cite/", {"id": "W9", "style": "apa"})
    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "local"
    assert body["text"].startswith("van der Berg, J.-P., & Lovelace, A. (2019). A study of things.")

    bibtex = api_client.get("/api/search/publications/cite/", {"id": "W9", "style": "bibtex"}).json()
    assert bibtex["text"].startswith("@article{vanderberg2019study,")


def test_author_search_and_detail(api_client, fake_openalex):
    fake_openalex.authors = {
        "A1": {
            "id": "https://openalex.org/A1", "display_name": "Ada Lovelace", "works_count": 3, "cited_by_count": 99,
            "summary_stats": {"h_index": 2, "i10_index": 1, "2yr_mean_citedness": 1.5},
            "last_known_institutions": [{"display_name": "University of London"}],
            "topics": [{"display_name": "Computing", "count": 3}],
            "counts_by_year": [{"year": date.today().year, "works_count": 1, "cited_by_count": 10}],
        }
    }
    results = api_client.get("/api/search/authors/", {"q": "ada"}).json()
    assert results["results"][0]["institutions"] == ["University of London"]
    assert results["results"][0]["topics"] == ["Computing"]
    detail = api_client.get("/api/search/authors/detail/", {"id": "A1"}).json()
    assert detail["h_index"] == 2
    assert detail["topics"] == [{"name": "Computing", "count": 3}]
    assert api_client.get("/api/search/authors/detail/", {"id": "W1"}).status_code == 400


def test_author_works_are_paginated_server_side(api_client, fake_openalex):
    fake_openalex.add(*[make_work(n) for n in range(1, 13)])
    data = api_client.get("/api/search/authors/works/", {"id": "A1", "page": 2}).json()
    assert data["total_count"] == 12
    assert len(data["results"]) == 2
    assert "author.id:A1" in fake_openalex.calls[-1][1]["filter"]


def test_institution_autocomplete_proxy(api_client, fake_openalex):
    fake_openalex.institutions = [
        {"id": "https://openalex.org/I1", "display_name": "Vilnius University", "hint": "Vilnius, Lithuania"},
        {"id": "garbage", "display_name": "Ignored"},
    ]
    data = api_client.get("/api/search/institutions/autocomplete/", {"q": "vil"}).json()
    assert data["results"] == [{"id": "I1", "display_name": "Vilnius University", "hint": "Vilnius, Lithuania"}]
    assert api_client.get("/api/search/institutions/autocomplete/", {"q": "v"}).status_code == 400


def test_openalex_client_merges_batches_and_follows_merged_ids(fake_openalex):
    from apps.search.services.search_service import SearchService

    fake_openalex.add(*[make_work(n) for n in range(1, 151)])
    found = OpenAlexClient().get_works_by_ids([f"W{n}" for n in range(1, 151)])
    assert len(found) == 150
    batch_calls = [params for path, params in fake_openalex.calls if path == "/works"]
    assert len(batch_calls) == 2  # chunks of 100

    merged = make_work(500, "Canonical")
    fake_openalex.works["W499"] = merged  # W499 was merged into W500
    result = SearchService().get_publications(["W499"])
    assert result["W499"]["title"] == "Canonical"
