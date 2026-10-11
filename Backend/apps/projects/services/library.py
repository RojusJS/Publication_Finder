"""Cross-project helpers: "is this already in my library?" and search history."""
from apps.projects.access import accessible_projects
from apps.projects.models import SavedPublication, SearchHistory

SEARCH_HISTORY_LIMIT = 30


def saved_index(user, openalex_ids):
    """Map each given OpenAlex id to the projects (visible to ``user``) that contain it."""
    ids = [value for value in set(openalex_ids) if value]
    if not ids or not user or not user.is_authenticated:
        return {}
    rows = (
        SavedPublication.objects.filter(openalex_id__in=ids, project__in=accessible_projects(user))
        .values_list("openalex_id", "project_id", "project__name")
        .distinct()
    )
    index = {}
    for openalex_id, project_id, project_name in rows:
        entries = index.setdefault(openalex_id, [])
        if not any(entry["project_id"] == project_id for entry in entries):
            entries.append({"project_id": project_id, "project_name": project_name})
    return index


def annotate_saved(user, publications):
    """Add ``saved_in`` to publication dicts (in place) and return them."""
    index = saved_index(user, [pub.get("openalex_id") for pub in publications])
    for pub in publications:
        pub["saved_in"] = index.get(pub.get("openalex_id"), [])
    return publications


def record_search(user, query, search_by, filters, result_count):
    if not user or not user.is_authenticated or not query:
        return
    query = query.strip()[:500]
    SearchHistory.objects.filter(user=user, query=query, search_by=search_by).delete()
    SearchHistory.objects.create(
        user=user,
        query=query,
        search_by=search_by,
        filters=filters or {},
        result_count=max(0, int(result_count or 0)),
    )
    stale_ids = list(
        SearchHistory.objects.filter(user=user).order_by("-created_at", "-id").values_list("id", flat=True)[SEARCH_HISTORY_LIMIT:]
    )
    if stale_ids:
        SearchHistory.objects.filter(id__in=stale_ids).delete()
