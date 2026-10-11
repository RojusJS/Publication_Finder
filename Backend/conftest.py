"""Shared pytest fixtures.

``fake_openalex`` replaces the HTTP layer of the OpenAlex client with an
in-memory index, so tests never touch the network and can assert on the exact
requests that were made.
"""
import itertools

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.projects.models import Folder, Project, ProjectCollaborator, SavedPublication
from apps.search.integrations.openalex_client import OpenAlexClient, OpenAlexNotFound

User = get_user_model()
PASSWORD = "Correct-Horse-42"
_counter = itertools.count(1)


def make_work(number, title=None, *, year=2021, cited_by=10, refs=(), related=(), doi=None,
              authors=("Ada Lovelace",), keywords=("machine learning",), work_type="article",
              source="Journal of Tests", abstract="Deep learning methods for testing.", retracted=False):
    words = abstract.split()
    return {
        "id": f"https://openalex.org/W{number}",
        "display_name": title or f"Publication {number}",
        "publication_year": year,
        "publication_date": f"{year}-03-01",
        "doi": doi,
        "type": work_type,
        "open_access": {"is_oa": True, "oa_url": f"https://example.org/oa/{number}"},
        "primary_location": {
            "landing_page_url": f"https://example.org/{number}",
            "pdf_url": None,
            "source": {"display_name": source, "type": "journal"},
        },
        "best_oa_location": {"pdf_url": f"https://example.org/{number}.pdf"},
        "authorships": [
            {"author": {"display_name": name}, "institutions": [{"display_name": "Vilnius University"}]}
            for name in authors
        ],
        "cited_by_count": cited_by,
        "language": "en",
        "keywords": [{"display_name": keyword} for keyword in keywords],
        "abstract_inverted_index": {word: [index] for index, word in enumerate(words)},
        "is_retracted": retracted,
        "biblio": {"volume": "12", "issue": "3", "first_page": "100", "last_page": "110"},
        "referenced_works": [f"https://openalex.org/W{ref}" for ref in refs],
        "related_works": [f"https://openalex.org/W{rel}" for rel in related],
        "referenced_works_count": len(refs),
    }


class FakeOpenAlex:
    def __init__(self):
        self.works = {}
        self.calls = []
        self.fail = False
        self.authors = {}
        self.institutions = []

    def add(self, *works):
        for work in works:
            self.works[work["id"].rsplit("/", 1)[-1]] = work
        return self

    def _page(self, results, params):
        per_page = int(params.get("per-page", 25))
        page = int(params.get("page", 1))
        start = (page - 1) * per_page
        return {"meta": {"count": len(results)}, "results": results[start:start + per_page]}

    def __call__(self, client, path, params):
        self.calls.append((path, dict(params)))
        if self.fail:
            from apps.search.integrations.openalex_client import OpenAlexError
            raise OpenAlexError("down", 503)
        if path.startswith("/works/doi:"):
            doi = path.split("doi:", 1)[1].lower()
            for work in self.works.values():
                if (work.get("doi") or "").lower().endswith(doi):
                    return work
            raise OpenAlexNotFound()
        if path.startswith("/works/"):
            short_id = path.rsplit("/", 1)[-1]
            if short_id not in self.works:
                raise OpenAlexNotFound()
            return self.works[short_id]
        if path == "/works":
            results = list(self.works.values())
            for item in (params.get("filter") or "").split(","):
                if item.startswith("openalex_id:"):
                    ids = set(item.split(":", 1)[1].split("|"))
                    results = [w for w in results if w["id"].rsplit("/", 1)[-1] in ids]
                elif item.startswith("cites:"):
                    targets = {f"https://openalex.org/{value}" for value in item.split(":", 1)[1].split("|")}
                    results = [w for w in results if targets & set(w.get("referenced_works") or [])]
            if params.get("sort") == "cited_by_count:desc":
                results.sort(key=lambda w: w["cited_by_count"], reverse=True)
            return self._page(results, params)
        if path == "/authors":
            return self._page(list(self.authors.values()), params)
        if path.startswith("/authors/"):
            short_id = path.rsplit("/", 1)[-1]
            if short_id not in self.authors:
                raise OpenAlexNotFound()
            return self.authors[short_id]
        if path == "/autocomplete/institutions":
            return {"results": self.institutions}
        raise AssertionError(f"Unexpected OpenAlex path {path}")

    def filters(self):
        return [params.get("filter", "") for path, params in self.calls if path == "/works"]


@pytest.fixture(autouse=True)
def _clear_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def fake_openalex(monkeypatch):
    fake = FakeOpenAlex()
    monkeypatch.setattr(OpenAlexClient, "_request", lambda self, path, params: fake(self, path, params))
    return fake


@pytest.fixture
def no_doi_lookup(monkeypatch):
    monkeypatch.setattr("apps.search.services.bibliography.fetch_doi_citation", lambda doi, style: None)


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def make_user(db):
    def factory(username=None, password=PASSWORD, **extra):
        username = username or f"user{next(_counter)}"
        extra.setdefault("email", f"{username}@example.com")
        return User.objects.create_user(username=username, password=password, **extra)
    return factory


@pytest.fixture
def user(make_user):
    return make_user("owner")


@pytest.fixture
def other_user(make_user):
    return make_user("stranger")


@pytest.fixture
def client_for():
    def factory(user):
        client = APIClient()
        client.force_authenticate(user=user)
        return client
    return factory


@pytest.fixture
def auth_client(client_for, user):
    return client_for(user)


@pytest.fixture
def project(user):
    return Project.objects.create(user=user, name="Thesis", description="Literature review")


@pytest.fixture
def folder(project):
    return Folder.objects.create(project=project, name="Methods")


@pytest.fixture
def add_member(user):
    def factory(project, member, role=ProjectCollaborator.Role.EDITOR, status=ProjectCollaborator.Status.ACCEPTED):
        return ProjectCollaborator.objects.create(
            project=project, user=member, invited_by=project.user, role=role, status=status
        )
    return factory


@pytest.fixture
def make_publication(project):
    def factory(number=None, folder=None, target_project=None, **fields):
        number = number or next(_counter) + 1000
        defaults = {
            "openalex_id": f"https://openalex.org/W{number}",
            "title": f"Saved publication {number}",
            "year": 2020,
            "authors": ["Ada Lovelace"],
            "keywords": ["machine learning"],
            "abstract": "Deep learning methods for testing.",
        }
        defaults.update(fields)
        return SavedPublication.objects.create(project=target_project or project, folder=folder, **defaults)
    return factory
