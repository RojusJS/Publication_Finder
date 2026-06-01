from django.http import JsonResponse
import requests

from apps.search.services.search_service import SearchService


def publication_detail(request):
    openalex_id = request.GET.get("id", "").strip()
    if not openalex_id:
        return JsonResponse({"error": "Trūksta parametro: id"}, status=400)

    service = SearchService()
    try:
        data = service.get_publication_detail(openalex_id)
        return JsonResponse(data)
    except requests.RequestException as e:
        return JsonResponse({"error": "OpenAlex užklausa nepavyko", "details": str(e)}, status=502)
    except Exception as e:
        return JsonResponse({"error": "Serverio klaida", "details": str(e)}, status=500)


def citing_works(request):
    openalex_id = request.GET.get("id", "").strip()
    if not openalex_id:
        return JsonResponse({"error": "Trūksta parametro: id"}, status=400)

    service = SearchService()
    try:
        data = service.get_citing_works(openalex_id)
        return JsonResponse({"results": data})
    except requests.RequestException as e:
        return JsonResponse({"error": "OpenAlex užklausa nepavyko", "details": str(e)}, status=502)
    except Exception as e:
        return JsonResponse({"error": "Serverio klaida", "details": str(e)}, status=500)


def referenced_works(request):
    openalex_id = request.GET.get("id", "").strip()
    if not openalex_id:
        return JsonResponse({"error": "Trūksta parametro: id"}, status=400)

    service = SearchService()
    try:
        data = service.get_referenced_works(openalex_id)
        return JsonResponse({"results": data})
    except requests.RequestException as e:
        return JsonResponse({"error": "OpenAlex užklausa nepavyko", "details": str(e)}, status=502)
    except Exception as e:
        return JsonResponse({"error": "Serverio klaida", "details": str(e)}, status=500)


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
        return JsonResponse({"error": "Trūksta parametro: q"}, status=400)

    sort = request.GET.get("sort")
    allowed_sorts = {"year_desc", "year_asc", "cited_by_count_desc", "cited_by_count_asc", "", None}
    if sort not in allowed_sorts:
        return JsonResponse({"error": "Neteisinga sort reikšmė"}, status=400)

    search_by = request.GET.get("search_by", "title")
    if search_by not in {"title", "author", "institution", "title_and_author"}:
        return JsonResponse({"error": "Neteisinga search_by reikšmė"}, status=400)

    year_from = _parse_int(request.GET.get("year_from"))
    year_to = _parse_int(request.GET.get("year_to"))
    oa = _parse_bool(request.GET.get("oa"))
    pub_type = request.GET.get("type")
    author = request.GET.get("author", "").strip()

    if year_from is not None and (year_from < 1000 or year_from > 3000):
        return JsonResponse({"error": "year_from neteisingas"}, status=400)
    if year_to is not None and (year_to < 1000 or year_to > 3000):
        return JsonResponse({"error": "year_to neteisingas"}, status=400)
    if year_from is not None and year_to is not None and year_from > year_to:
        return JsonResponse({"error": "year_from negali būti didesnis nei year_to"}, status=400)

    per_page = 10
    page = _parse_int(request.GET.get("page")) or 1
    if page < 1:
        page = 1

    service = SearchService()
    try:
        data = service.search(
            query=q,
            author=author,
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
        return JsonResponse({"error": "OpenAlex užklausa nepavyko", "details": str(e)}, status=502)
    except Exception as e:
        return JsonResponse({"error": "Serverio klaida", "details": str(e)}, status=500)