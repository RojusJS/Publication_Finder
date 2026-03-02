from django.http import JsonResponse
import requests

from apps.search.services.search_service import SearchService


def search_publications(request):
    q = request.GET.get("q", "").strip()
    if not q:
        return JsonResponse({"error": "Missing query parameter: q"}, status=400)
    per_page = 8
    page = 1
    service = SearchService()
    try:
        data = service.search(query=q, per_page=per_page, page=page)
        return JsonResponse(data)
    except requests.RequestException as e:
        return JsonResponse({"error": "OpenAlex request failed", "details": str(e)}, status=502)
    except Exception as e:
        return JsonResponse({"error": "Internal error", "details": str(e)}, status=500)