from datetime import datetime

from apps.search.integrations.openalex_client import OpenAlexClient

CURRENT_YEAR = datetime.now().year

def reconstruct_abstract(inverted_index: dict | None) -> str | None:
    if not inverted_index:
        return None
    positions = []
    for word, indices in inverted_index.items():
        for idx in indices:
            positions.append((idx, word))
    positions.sort(key=lambda x: x[0])
    return " ".join(word for _, word in positions)

class SearchService:
    def _map_publication(self, publication: dict) -> dict | None:
        primary_location = publication.get("primary_location") or {}
        open_access = publication.get("open_access") or {}
        source = primary_location.get("source") or {}
        authorships = publication.get("authorships") or []
        keywords = publication.get("keywords") or []
        pub_year = publication.get("publication_year")

        if pub_year is not None and pub_year > CURRENT_YEAR:
            return None

        authors = [
            authorship["author"]["display_name"]
            for authorship in authorships
            if authorship.get("author") and authorship["author"].get("display_name")
        ]

        institutions = list({
            institution["display_name"]
            for authorship in authorships
            for institution in (authorship.get("institutions") or [])
            if institution.get("display_name")
        })

        return {
            "openalex_id": publication.get("id"),
            "title": publication.get("title"),
            "year": publication.get("publication_year"),
            "doi": publication.get("doi"),
            "is_oa": open_access.get("is_oa"),
            "type": publication.get("type"),
            "pdf_url": primary_location.get("pdf_url"),
            "landing_page_url": primary_location.get("landing_page_url") or open_access.get("oa_url"),
            "abstract": reconstruct_abstract(publication.get("abstract_inverted_index")),
            "authors": authors,
            "institutions": institutions,
            "source_name": source.get("display_name"),
            "cited_by_count": publication.get("cited_by_count"),
            "language": publication.get("language"),
            "keywords": [kw.get("display_name") for kw in keywords if kw.get("display_name")],
        }

    def get_publication_detail(self, openalex_id: str) -> dict:
        client = OpenAlexClient()
        publication = client.get_publication_by_id(openalex_id)
        mapped = self._map_publication(publication)

        if mapped is None:
            raise ValueError("Publication is invalid")

        return mapped

    def search(
            self,
            query: str,
            per_page: int = 5,
            page: int = 1,
            year_from: int | None = None,
            year_to: int | None = None,
            is_oa: bool | None = None,
            work_type: str | None = None,
            sort: str | None = None,
            search_by: str = "title") -> dict:
        client = OpenAlexClient()
        data = client.search_publications(
            query=query,
            per_page=per_page,
            page=page,
            year_from=year_from,
            year_to=year_to,
            is_oa=is_oa,
            work_type=work_type,
            sort=sort,
            search_by=search_by,
        )

        results = []
        for publication in data.get("results", []):
            mapped = self._map_publication(publication)
            if mapped is not None:
                results.append(mapped)

        return {
            "query": query,
            "count": len(results),
            "filters": {
                "year_from": year_from,
                "year_to": year_to,
                "oa": is_oa,
                "type": work_type,
            },
            "results": results,
        }
