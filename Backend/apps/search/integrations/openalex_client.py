from datetime import datetime
import requests
import os

OPENALEX_API_KEY = os.getenv("OPENALEX_API_KEY")

SELECTED_FIELDS = ",".join([
    "id",
    "title",
    "publication_year",
    "doi",
    "open_access",
    "type",
    "primary_location",
    "authorships",
    "cited_by_count",
    "language",
    "keywords",
])

SELECTED_FIELDS_WITH_ABSTRACT = SELECTED_FIELDS + ",abstract_inverted_index"

CITATION_GRAPH_FIELDS = "id,title,publication_year,cited_by_count"


class OpenAlexClient:

    def get_publication_by_id(self, openalex_id: str) -> dict:
        short_id = openalex_id.replace("https://openalex.org/", "")
        url = f"https://api.openalex.org/works/{short_id}"
        params = {
            "select": SELECTED_FIELDS_WITH_ABSTRACT,
            "api_key": OPENALEX_API_KEY,
        }
        resp = requests.get(url, params=params, timeout=15)
        resp.raise_for_status()
        return resp.json()

    def get_citing_works(self, openalex_id: str, per_page: int = 16) -> list:
        short_id = openalex_id.replace("https://openalex.org/", "")
        url = "https://api.openalex.org/works"
        params = {
            "filter": f"cites:{short_id}",
            "select": CITATION_GRAPH_FIELDS,
            "per-page": per_page,
            "api_key": OPENALEX_API_KEY,
        }
        resp = requests.get(url, params=params, timeout=15)
        resp.raise_for_status()
        return resp.json().get("results", [])

    def get_referenced_works(self, openalex_id: str, per_page: int = 16) -> list:
        short_id = openalex_id.replace("https://openalex.org/", "")
        meta_url = f"https://api.openalex.org/works/{short_id}"
        meta_resp = requests.get(
            meta_url,
            params={
                "select": "referenced_works",
                "api_key": OPENALEX_API_KEY,
            },
            timeout=15
        )
        meta_resp.raise_for_status()
        refs = meta_resp.json().get("referenced_works", [])
        if not refs:
            return []
        ids = "|".join(
            r.replace("https://openalex.org/", "")
            for r in refs[:per_page]
        )
        url = "https://api.openalex.org/works"
        params = {
            "filter": f"openalex_id:{ids}",
            "select": CITATION_GRAPH_FIELDS,
            "per-page": per_page,
            "api_key": OPENALEX_API_KEY,
        }
        resp = requests.get(url, params=params, timeout=15)
        resp.raise_for_status()
        return resp.json().get("results", [])

    def search_publications(
            self,
            query: str,
            author: str = "",
            per_page: int = 5,
            page: int = 1,
            year_from: int | None = None,
            year_to: int | None = None,
            is_oa: bool | None = None,
            work_type: str | None = None,
            sort: str | None = None,
            search_by: str = "title",
    ) -> dict:
        url = "https://api.openalex.org/works"
        filters = []

        if search_by == "author":
            filters.append(f'raw_author_name.search:{query}')
        if search_by == "institution":
            filters.append(f"institutions.id:{query}")
        if search_by == "title_and_author":
            filters.append(f'raw_author_name.search:{author}')

        if year_from is not None:
            filters.append(f"from_publication_date:{year_from}-01-01")
        if year_to is not None:
            filters.append(f"to_publication_date:{year_to}-12-31")
        if year_to is None and search_by == "title":
            filters.append(f"to_publication_date:{datetime.now().year}-12-31")
        if is_oa is True:
            filters.append("is_oa:true")
        elif is_oa is False:
            filters.append("is_oa:false")
        if work_type:
            filters.append(f"type:{work_type}")

        params = {
            "per-page": per_page,
            "page": page,
            "select": SELECTED_FIELDS if search_by in ("author", "institution") else SELECTED_FIELDS_WITH_ABSTRACT,
            "api_key": OPENALEX_API_KEY,
        }

        if search_by in ("author", "institution"):
            params["filter"] = ",".join(filters)
        elif search_by == "title_and_author":
            params["search"] = query
            if filters:
                params["filter"] = ",".join(filters)
        else:
            params["search"] = query
            if filters:
                params["filter"] = ",".join(filters)

        sort_map = {
            "year_desc": "publication_date:desc",
            "year_asc": "publication_date:asc",
        }
        if sort:
            params["sort"] = sort_map.get(sort, "publication_date:desc")

        resp = requests.get(url, params=params, timeout=15)
        resp.raise_for_status()
        return resp.json()