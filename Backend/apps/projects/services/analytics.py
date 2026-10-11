"""Aggregate statistics shown on a project's overview tab."""
from collections import Counter
from statistics import median

from apps.projects.models import Folder, PublicationNote, SavedPublication
from apps.projects.services.publications import folder_subtree_ids, publications_in_scope

TOP_N = 10


def _keyword_names(values):
    for value in values or []:
        if isinstance(value, str) and value.strip():
            yield value.strip()
        elif isinstance(value, dict) and value.get("display_name"):
            yield value["display_name"]


def project_analytics(project, folder=None):
    publications = publications_in_scope(project, folder)
    rows = list(
        publications.values(
            "id", "title", "year", "cited_by_count", "is_oa", "label", "pub_type",
            "keywords", "authors", "source_name", "is_retracted",
        )
    )
    total = len(rows)
    years = sorted(row["year"] for row in rows if row["year"])
    citations = [row["cited_by_count"] or 0 for row in rows]

    label_counts = Counter(row["label"] for row in rows if row["label"])
    labels = {code: label_counts.get(code, 0) for code in SavedPublication.Label.values}

    keyword_counter = Counter()
    author_counter = Counter()
    source_counter = Counter()
    for row in rows:
        keyword_counter.update(set(_keyword_names(row["keywords"])))
        author_counter.update({name for name in row["authors"] or [] if isinstance(name, str) and name})
        if row["source_name"]:
            source_counter[row["source_name"]] += 1

    most_cited = sorted(rows, key=lambda row: row["cited_by_count"] or 0, reverse=True)[:5]

    folder_scope = Folder.objects.filter(project=project)
    if folder is not None:
        folder_scope = folder_scope.filter(id__in=folder_subtree_ids(folder)).exclude(id=folder.id)

    return {
        "total_publications": total,
        "total_citations": sum(citations),
        "median_citations": int(median(citations)) if citations else 0,
        "year_min": years[0] if years else None,
        "year_max": years[-1] if years else None,
        "median_year": int(median(years)) if years else None,
        "year_distribution": [{"year": year, "count": count} for year, count in sorted(Counter(years).items())],
        "open_access_count": sum(1 for row in rows if row["is_oa"]),
        "labels": labels,
        "unlabeled_count": total - sum(labels.values()),
        "type_distribution": dict(Counter(row["pub_type"] for row in rows if row["pub_type"]).most_common()),
        "top_keywords": [{"name": name, "count": count} for name, count in keyword_counter.most_common(TOP_N)],
        "top_authors": [{"name": name, "count": count} for name, count in author_counter.most_common(TOP_N)],
        "top_sources": [{"name": name, "count": count} for name, count in source_counter.most_common(TOP_N)],
        "most_cited": [
            {"id": row["id"], "title": row["title"], "year": row["year"], "cited_by_count": row["cited_by_count"] or 0}
            for row in most_cited
        ],
        "retracted": [{"id": row["id"], "title": row["title"]} for row in rows if row["is_retracted"]],
        "notes_count": PublicationNote.objects.filter(publication__in=publications).count(),
        "folder_count": folder_scope.count(),
    }
