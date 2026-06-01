from django.http import JsonResponse
import requests
import os

from apps.search.services.search_service import SearchService

OPENALEX_API_KEY = os.getenv("OPENALEX_API_KEY")

def author_search(request):
    q = request.GET.get("q", "").strip()
    if not q:
        return JsonResponse({"error": "Trūksta parametro: q"}, status=400)

    try:
        url = "https://api.openalex.org/authors"
        page = int(request.GET.get("page", 1))
        params = {
            "search": q,
            "per-page": 10,
            "page": page,
            "api_key": OPENALEX_API_KEY,
        }
        resp = requests.get(url, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()

        authors = []
        for a in data.get("results", []):
            institutions = []
            for inst in (a.get("last_known_institutions") or []):
                if inst.get("display_name"):
                    institutions.append(inst["display_name"])

            concepts = []
            counts_by_year = a.get("counts_by_year") or []

            authors.append({
                "id": a.get("id"),
                "display_name": a.get("display_name"),
                "hint": a.get("hint"),
                "cited_by_count": a.get("cited_by_count", 0),
                "works_count": a.get("works_count", 0),
                "institutions": institutions,
                "concepts": concepts,
                "counts_by_year": counts_by_year[:5],
            })

        return JsonResponse({"results": authors, "total_count": data.get("meta", {}).get("count", 0)})

    except requests.RequestException as e:
        return JsonResponse({"error": "OpenAlex request failed", "details": str(e)}, status=502)
    except Exception as e:
        return JsonResponse({"error": "Internal error", "details": str(e)}, status=500)


def author_detail(request):
    author_id = request.GET.get("id", "").strip()
    if not author_id:
        return JsonResponse({"error": "Trūksta parametro: id"}, status=400)

    try:
        short_id = author_id.replace("https://openalex.org/", "")
        url = f"https://api.openalex.org/authors/{short_id}"
        resp = requests.get(
            url,
            params={"api_key": OPENALEX_API_KEY},
            timeout=15
        )
        resp.raise_for_status()
        a = resp.json()

        institutions = []
        for inst in (a.get("last_known_institutions") or []):
            if inst.get("display_name"):
                institutions.append(inst["display_name"])

        concepts = []
        for c in (a.get("topics") or [])[:8]:
            if c.get("display_name"):
                concepts.append({"name": c["display_name"], "score": round(c.get("score", 0))})

        works_url = "https://api.openalex.org/works"
        works_params = {
            "filter": f"author.id:{short_id}",
            "sort": "cited_by_count:desc",
            "per-page": 200,
            "select": "id,title,publication_year,doi,cited_by_count,open_access,primary_location,type,authorships,abstract_inverted_index,keywords",
            "api_key": OPENALEX_API_KEY,
        }
        works_resp = requests.get(works_url, params=works_params, timeout=20)
        works_resp.raise_for_status()
        works_data = works_resp.json()

        service = SearchService()
        publications = []
        for work in works_data.get("results", []):
            mapped = service._map_publication(work)
            if mapped:
                publications.append(mapped)

        summary_stats = a.get("summary_stats") or {}

        return JsonResponse({
            "id": a.get("id"),
            "display_name": a.get("display_name"),
            "hint": a.get("hint"),
            "orcid": a.get("orcid"),
            "cited_by_count": a.get("cited_by_count", 0),
            "works_count": a.get("works_count", 0),
            "two_yr_mean_citedness": summary_stats.get("2yr_mean_citedness"),
            "h_index": summary_stats.get("h_index"),
            "i10_index": summary_stats.get("i10_index"),
            "institutions": institutions,
            "concepts": concepts,
            "publications": publications,
        })

    except requests.RequestException as e:
        return JsonResponse({"error": "OpenAlex užklausa nepavyko", "details": str(e)}, status=502)
    except Exception as e:
        return JsonResponse({"error": "Serverio klaida", "details": str(e)}, status=500)