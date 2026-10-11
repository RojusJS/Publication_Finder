"""Publication, author and institution look-ups backed by OpenAlex."""
import math
from dataclasses import dataclass
from datetime import date

from apps.core.identifiers import parse_doi, parse_openalex_id
from apps.search.integrations.openalex_client import (
    OpenAlexClient,
    OpenAlexNotFound,
    TTL_CITATIONS,
    sanitize_filter_value,
)
from apps.search.services.mapping import clean_text, map_work

MAX_RESULT_WINDOW = 10_000  # OpenAlex basic paging limit
PER_PAGE_CHOICES = (10, 25, 50)

SEARCH_MODES = ("all", "title", "author", "title_and_author")

SORT_OPTIONS = {
    "relevance": None,
    "year_desc": "publication_date:desc",
    "year_asc": "publication_date:asc",
    "cited_by_count_desc": "cited_by_count:desc",
    "cited_by_count_asc": "cited_by_count:asc",
}

WORK_TYPES = (
    "article",
    "review",
    "preprint",
    "book",
    "book-chapter",
    "conference-paper",
    "dissertation",
    "dataset",
    "report",
    "editorial",
    "letter",
    "other",
)


@dataclass
class SearchParams:
    query: str = ""
    mode: str = "all"
    author: str = ""
    year_from: int | None = None
    year_to: int | None = None
    open_access: bool | None = None
    work_type: str | None = None
    language: str | None = None
    institution_id: str | None = None
    sort: str = "relevance"
    page: int = 1
    per_page: int = 10

    def as_history_filters(self):
        values = {
            "author": self.author or None,
            "year_from": self.year_from,
            "year_to": self.year_to,
            "oa": self.open_access,
            "type": self.work_type,
            "language": self.language,
            "institution": self.institution_id,
            "sort": self.sort if self.sort != "relevance" else None,
        }
        return {key: value for key, value in values.items() if value not in (None, "")}


def max_page(per_page):
    return MAX_RESULT_WINDOW // per_page


def _date_filters(year_from, year_to):
    today = date.today()
    filters = []
    if year_from is not None:
        filters.append(f"from_publication_date:{year_from}-01-01")
    upper = today
    if year_to is not None:
        upper = min(date(year_to, 12, 31), today)
    # OpenAlex contains a few records with bogus future dates; never show them.
    filters.append(f"to_publication_date:{upper.isoformat()}")
    return filters


def _paginated(results, total_count, page, per_page, **extra):
    capped = min(total_count, MAX_RESULT_WINDOW)
    return {
        "results": results,
        "total_count": total_count,
        "page": page,
        "per_page": per_page,
        "total_pages": max(1, math.ceil(capped / per_page)) if capped else 0,
        **extra,
    }


class SearchService:
    def __init__(self, client=None):
        self.client = client or OpenAlexClient()

    # -- publications ------------------------------------------------------

    def search_publications(self, params: SearchParams):
        query = params.query.strip()
        doi = parse_doi(query) if params.mode in ("all", "title") else None
        if doi:
            return self._search_by_doi(doi, params)

        filters = []
        search = None
        safe_query = sanitize_filter_value(query)
        safe_author = sanitize_filter_value(params.author)

        if params.mode == "all":
            search = query or None
        elif params.mode == "title":
            if safe_query:
                filters.append(f"title.search:{safe_query}")
        elif params.mode == "author":
            if safe_query:
                filters.append(f"raw_author_name.search:{safe_query}")
        elif params.mode == "title_and_author":
            if safe_query:
                filters.append(f"title.search:{safe_query}")
            if safe_author:
                filters.append(f"raw_author_name.search:{safe_author}")

        filters.extend(_date_filters(params.year_from, params.year_to))
        if params.open_access is not None:
            filters.append(f"is_oa:{'true' if params.open_access else 'false'}")
        if params.work_type:
            filters.append(f"type:{params.work_type}")
        if params.language:
            filters.append(f"language:{params.language}")
        if params.institution_id:
            filters.append(f"authorships.institutions.lineage:{params.institution_id}")

        has_text = bool(search) or any(".search:" in item for item in filters)
        sort = SORT_OPTIONS.get(params.sort)
        if sort is None and not has_text:
            # Relevance is undefined without a text query (e.g. institution only).
            sort = "cited_by_count:desc"

        data = self.client.list_works(
            search=search,
            filters=filters,
            sort=sort,
            page=params.page,
            per_page=params.per_page,
        )
        results = [map_work(work) for work in data.get("results") or []]
        total = (data.get("meta") or {}).get("count") or 0
        return _paginated(results, total, params.page, params.per_page, doi_match=False)

    def _search_by_doi(self, doi, params):
        try:
            work = self.client.get_work_by_doi(doi)
        except OpenAlexNotFound:
            return _paginated([], 0, 1, params.per_page, doi_match=False)
        return _paginated([map_work(work)], 1, 1, params.per_page, doi_match=True)

    def get_publication(self, short_id):
        return map_work(self.client.get_work(short_id))

    def get_publications(self, short_ids):
        """Return ``{requested_short_id: publication}`` for every id OpenAlex knows.

        Works that were merged into another record are not returned by the
        batch filter, so a few missing ids are retried individually (the
        single-work endpoint follows the merge redirect).
        """
        requested = set(short_ids)
        works = self.client.get_works_by_ids(short_ids)
        result = {short_id: map_work(work) for short_id, work in works.items() if short_id in requested}
        missing = [short_id for short_id in short_ids if short_id not in result]
        for short_id in missing[:10]:
            try:
                result[short_id] = map_work(self.client.get_work(short_id))
            except OpenAlexNotFound:
                continue
        return result

    # -- authors -----------------------------------------------------------

    @staticmethod
    def _institution_names(author, limit=3):
        names = [
            clean_text(item.get("display_name"))
            for item in author.get("last_known_institutions") or []
            if item.get("display_name")
        ]
        if not names:
            for affiliation in author.get("affiliations") or []:
                name = clean_text((affiliation.get("institution") or {}).get("display_name"))
                if name and name not in names:
                    names.append(name)
        return names[:limit]

    def search_authors(self, query, page=1, per_page=10):
        data = self.client.search_authors(query, page=page, per_page=per_page)
        results = []
        for author in data.get("results") or []:
            stats = author.get("summary_stats") or {}
            results.append({
                "id": author.get("id"),
                "display_name": clean_text(author.get("display_name")),
                "orcid": author.get("orcid"),
                "works_count": author.get("works_count") or 0,
                "cited_by_count": author.get("cited_by_count") or 0,
                "h_index": stats.get("h_index"),
                "institutions": self._institution_names(author),
                "topics": [
                    clean_text(topic.get("display_name"))
                    for topic in (author.get("topics") or [])[:3]
                    if topic.get("display_name")
                ],
            })
        total = (data.get("meta") or {}).get("count") or 0
        return _paginated(results, total, page, per_page)

    def get_author(self, short_id):
        author = self.client.get_author(short_id)
        stats = author.get("summary_stats") or {}
        current_year = date.today().year
        counts = sorted(
            (
                {
                    "year": item.get("year"),
                    "works_count": item.get("works_count") or 0,
                    "cited_by_count": item.get("cited_by_count") or 0,
                }
                for item in author.get("counts_by_year") or []
                if isinstance(item.get("year"), int) and current_year - 10 <= item["year"] <= current_year
            ),
            key=lambda item: item["year"],
        )
        return {
            "id": author.get("id"),
            "display_name": clean_text(author.get("display_name")),
            "orcid": author.get("orcid"),
            "works_count": author.get("works_count") or 0,
            "cited_by_count": author.get("cited_by_count") or 0,
            "h_index": stats.get("h_index"),
            "i10_index": stats.get("i10_index"),
            "two_year_mean_citedness": stats.get("2yr_mean_citedness"),
            "institutions": self._institution_names(author, limit=5),
            "topics": [
                {"name": clean_text(topic.get("display_name")), "count": topic.get("count") or 0}
                for topic in (author.get("topics") or [])[:8]
                if topic.get("display_name")
            ],
            "counts_by_year": counts,
        }

    def get_author_works(self, short_id, page=1, per_page=10, sort="cited_by_count_desc"):
        filters = [f"author.id:{short_id}", *_date_filters(None, None)]
        data = self.client.list_works(
            filters=filters,
            sort=SORT_OPTIONS.get(sort) or "cited_by_count:desc",
            page=page,
            per_page=per_page,
        )
        results = [map_work(work) for work in data.get("results") or []]
        total = (data.get("meta") or {}).get("count") or 0
        return _paginated(results, total, page, per_page)

    # -- institutions ------------------------------------------------------

    def autocomplete_institutions(self, query):
        data = self.client.autocomplete_institutions(query)
        suggestions = []
        for item in (data.get("results") or [])[:8]:
            short_id = parse_openalex_id(item.get("id"), "I")
            if short_id:
                suggestions.append({
                    "id": short_id,
                    "display_name": clean_text(item.get("display_name")),
                    "hint": clean_text(item.get("hint")) or None,
                })
        return suggestions

    # -- citations ---------------------------------------------------------

    def citing_works(self, short_id, per_page, select):
        data = self.client.list_works(
            filters=[f"cites:{short_id}"],
            sort="cited_by_count:desc",
            per_page=per_page,
            select=select,
            cache_ttl=TTL_CITATIONS,
        )
        return data.get("results") or [], (data.get("meta") or {}).get("count") or 0

