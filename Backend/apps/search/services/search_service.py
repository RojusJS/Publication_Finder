from apps.search.integrations.openalex_client import OpenAlexClient


class SearchService:
    def search(self, query: str, per_page: int = 5, page: int = 1) -> dict:
        client = OpenAlexClient()
        data = client.search_publications(query=query, per_page=per_page, page=page)

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
                "pdf_url": primary_location.get("pdf_url"),
                "landing_page_url": primary_location.get("landing_page_url") or open_access.get("oa_url"),
            })

        return {
            "query": query,
            "count": len(results),
            "results": results,
        }