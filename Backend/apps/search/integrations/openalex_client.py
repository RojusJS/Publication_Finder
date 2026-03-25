from datetime import datetime

import requests

SELECTED_FIELDS = ",".join([
    "id",
    "title",
    "publication_year",
    "doi",
    "open_access",
    "type",
    "primary_location",
    "abstract_inverted_index",
    "authorships",
    "cited_by_count",
    "language",
    "keywords",
])

SELECTED_FIELDS_WITH_ABSTRACT = SELECTED_FIELDS + ",abstract_inverted_index"


class OpenAlexClient:

    def get_publication_by_id(self, openalex_id: str) -> dict:
        short_id = openalex_id.replace("https://openalex.org/", "")
        url = f"https://api.openalex.org/works/{short_id}"

        params = {
            "select": SELECTED_FIELDS_WITH_ABSTRACT,
        }

        resp = requests.get(url, params=params, timeout=15)
        resp.raise_for_status()
        return resp.json()

    def search_publications(
            self,
            query: str,
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
        }

        if search_by in ("author", "institution"):
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