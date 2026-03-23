from django.http import JsonResponse
import requests

from apps.search.services.search_service import SearchService

def _parse_bool(value: str | None) -> bool | None:
    if value is None:
        return None
    v = value.strip().lower()
    if v in ("1", "true", "yes", "y", "on"):
        return True
    if v in ("0", "false", "no", "n", "off"):
        return False
    return None

def _parse_int(value: str | None) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except ValueError:
        return None

def search_publications(request):
    q = request.GET.get("q", "").strip()
    if not q:
        return JsonResponse({"error": "Missing query parameter: q"}, status=400)

    sort = request.GET.get("sort")
    allowed_sorts = {"year_desc", "year_asc", "", None}
    if sort not in allowed_sorts:
        return JsonResponse({"error": "Invalid sort value"}, status=400)

    search_by = request.GET.get("search_by", "title")
    if search_by not in {"title", "author", "institution"}:
        return JsonResponse({"error": "Invalid search_by value"}, status=400)


    year_from = _parse_int(request.GET.get("year_from"))
    year_to = _parse_int(request.GET.get("year_to"))
    oa = _parse_bool(request.GET.get("oa"))
    pub_type = request.GET.get("type")

    if year_from is not None and (year_from < 1000 or year_from > 3000):
        return JsonResponse({"error": "year_from is invalid"}, status=400)
    if year_to is not None and (year_to < 1000 or year_to > 3000):
        return JsonResponse({"error": "year_to is invalid"}, status=400)
    if year_from is not None and year_to is not None and year_from > year_to:
        return JsonResponse({"error": "year_from cannot be greater than year_to"}, status=400)

    per_page = 10
    page = 1

    service = SearchService()
    try:
        data = service.search(
            query=q,
            per_page=per_page,
            page=page,
            year_from=year_from,
            year_to=year_to,
            is_oa=oa,
            work_type=pub_type,
            sort=sort,
            search_by=search_by,
        )
        return JsonResponse(data)
    except requests.RequestException as e:
        return JsonResponse({"error": "OpenAlex request failed", "details": str(e)}, status=502)
    except Exception as e:
        return JsonResponse({"error": "Internal error", "details": str(e)}, status=500)