"""Public search endpoints (no login required; logged-in users get extras such
as search history and "already saved" markers)."""
from contextlib import contextmanager

from rest_framework import permissions
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.exceptions import UpstreamError
from apps.core.identifiers import normalize_work_id
from apps.projects.models import SavedPublication
from apps.projects.access import accessible_projects
from apps.projects.services.library import annotate_saved, record_search
from apps.search.api.serializers import (
    AuthorIdQuerySerializer,
    AuthorSearchQuerySerializer,
    AuthorWorksQuerySerializer,
    CitationNetworkQuerySerializer,
    CitationQuerySerializer,
    InstitutionAutocompleteQuerySerializer,
    PublicationIdQuerySerializer,
    PublicationSearchQuerySerializer,
)
from apps.search.integrations.openalex_client import OpenAlexError, OpenAlexNotFound
from apps.search.services.bibliography import format_citation
from apps.search.services.citation_network import build_citation_network
from apps.search.services.search_service import SearchParams, SearchService


@contextmanager
def openalex_errors(not_found_message="Publication not found."):
    try:
        yield
    except OpenAlexNotFound:
        raise NotFound(not_found_message) from None
    except OpenAlexError:
        raise UpstreamError(
            "The publication database (OpenAlex) is not responding. Please try again shortly.",
            code="openalex_unavailable",
        ) from None


def _validated(serializer_class, request):
    serializer = serializer_class(data=request.query_params)
    serializer.is_valid(raise_exception=True)
    return serializer.validated_data


class PublicSearchView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = "search"


class PublicationSearchView(PublicSearchView):
    def get(self, request):
        data = _validated(PublicationSearchQuerySerializer, request)
        params = SearchParams(
            query=data["q"],
            mode=data["search_by"],
            author=data["author"],
            year_from=data.get("year_from"),
            year_to=data.get("year_to"),
            open_access=data["oa"],
            work_type=data["type"],
            language=data["language"],
            institution_id=data["institution"],
            sort=data["sort"],
            page=data["page"],
            per_page=data["per_page"],
        )
        with openalex_errors():
            result = SearchService().search_publications(params)

        if request.user.is_authenticated:
            annotate_saved(request.user, result["results"])
            if params.page == 1 and params.query:
                record_search(request.user, params.query, params.mode, params.as_history_filters(), result["total_count"])
        result["query"] = params.query
        result["search_by"] = params.mode
        return Response(result)


class PublicationDetailView(PublicSearchView):
    def get(self, request):
        data = _validated(PublicationIdQuerySerializer, request)
        with openalex_errors():
            publication = SearchService().get_publication(data["id"])
        if request.user.is_authenticated:
            annotate_saved(request.user, [publication])
        return Response(publication)


class CitationNetworkView(PublicSearchView):
    def get(self, request):
        data = _validated(CitationNetworkQuerySerializer, request)
        with openalex_errors():
            network = build_citation_network(data["id"], data["references"], data["citing"])

        in_library = set()
        if request.user.is_authenticated:
            node_ids = [node["id"] for node in network["nodes"]]
            in_library = set(
                SavedPublication.objects.filter(
                    openalex_id__in=node_ids, project__in=accessible_projects(request.user)
                ).values_list("openalex_id", flat=True)
            )
        nodes = [{**node, "in_library": node["id"] in in_library} for node in network["nodes"]]
        return Response({**network, "nodes": nodes})


class CitationView(PublicSearchView):
    def get(self, request):
        data = _validated(CitationQuerySerializer, request)
        publication = None
        if request.user.is_authenticated:
            saved = (
                SavedPublication.objects.filter(
                    openalex_id=normalize_work_id(data["id"]), project__in=accessible_projects(request.user)
                )
                .order_by("-saved_at")
                .first()
            )
            publication = saved.as_publication() if saved else None
        if publication is None:
            with openalex_errors():
                publication = SearchService().get_publication(data["id"])
        text, source = format_citation(publication, data["style"])
        return Response({"style": data["style"], "text": text, "source": source})


class AuthorSearchView(PublicSearchView):
    def get(self, request):
        data = _validated(AuthorSearchQuerySerializer, request)
        with openalex_errors("Author not found."):
            result = SearchService().search_authors(data["q"].strip(), page=data["page"])
        if request.user.is_authenticated and data["page"] == 1:
            record_search(request.user, data["q"], "author", {}, result["total_count"])
        return Response(result)


class AuthorDetailView(PublicSearchView):
    def get(self, request):
        data = _validated(AuthorIdQuerySerializer, request)
        with openalex_errors("Author not found."):
            return Response(SearchService().get_author(data["id"]))


class AuthorWorksView(PublicSearchView):
    def get(self, request):
        data = _validated(AuthorWorksQuerySerializer, request)
        with openalex_errors("Author not found."):
            result = SearchService().get_author_works(data["id"], page=data["page"], sort=data["sort"])
        if request.user.is_authenticated:
            annotate_saved(request.user, result["results"])
        return Response(result)


class InstitutionAutocompleteView(PublicSearchView):
    def get(self, request):
        data = _validated(InstitutionAutocompleteQuerySerializer, request)
        with openalex_errors():
            return Response({"results": SearchService().autocomplete_institutions(data["q"].strip())})
