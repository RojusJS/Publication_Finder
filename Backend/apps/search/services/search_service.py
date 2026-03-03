from apps.search.integrations.openalex_client import OpenAlexClient


class SearchService:
    def search(
            self,
            query: str,
            per_page:
            int = 5,
            page: int = 1,
            year_from: int | None = None,
            year_to: int | None = None,
            is_oa: bool | None = None,
            work_type: str | None = None,) -> dict:
        client = OpenAlexClient()
        data = client.search_publications(
            query=query,
            per_page=per_page,
            page=page,
            year_from=year_from,
            year_to=year_to,
            is_oa=is_oa,
            work_type=work_type,
        )

        results = []
        for publication in data.get("results", []):
            primary_location = publication.get("primary_location") or {}
            open_access = publication.get("open_access") or {}

            results.append({
                "openalex_id": publication.get("id"),
                "title": publication.get("title"),
                "year": publication.get("publication_year"),
                "doi": publication.get("doi"),
                "is_oa": open_access.get("is_oa"),
                "type": publication.get("type"),
                "pdf_url": primary_location.get("pdf_url"),
                "landing_page_url": primary_location.get("landing_page_url") or open_access.get("oa_url"),
            })

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