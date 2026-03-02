import requests

class OpenAlexClient:
    def search_publications(self, query: str, per_page: int = 5, page: int = 1) -> dict:
        url = "https://api.openalex.org/works"
        params = {
            "search": query,
            "per-page": per_page,
            "page": page,
        }

        resp = requests.get(url, params=params, timeout=15)
        resp.raise_for_status()
        return resp.json()