"""Saving, moving and organising publications inside projects.

Publication metadata is always resolved on the server from OpenAlex (cached),
so clients only send identifiers and stored data cannot be forged.
"""
import logging

from django.db import IntegrityError, transaction
from django.utils.dateparse import parse_date

from apps.core.exceptions import ConflictError, UpstreamError
from apps.core.identifiers import normalize_work_id, parse_openalex_id
from apps.projects.models import Folder, PublicationNote, SavedPublication
from apps.projects.services.embedding_service import ensure_embeddings
from apps.search.integrations.openalex_client import OpenAlexError
from apps.search.services.search_service import SearchService

logger = logging.getLogger(__name__)

MAX_BULK_SAVE = 100


def _truncate(value, length):
    if value in (None, ""):
        return None
    return str(value)[:length]


def _safe_date(value):
    try:
        return parse_date(value) if value else None
    except (TypeError, ValueError):
        return None


def apply_publication_data(instance, pub):
    instance.openalex_id = pub["openalex_id"]
    instance.title = pub.get("title") or "Untitled"
    instance.year = pub.get("year")
    instance.publication_date = _safe_date(pub.get("publication_date"))
    instance.doi = _truncate(pub.get("doi"), 500)
    instance.pdf_url = _truncate(pub.get("pdf_url"), 500)
    instance.landing_page_url = _truncate(pub.get("landing_page_url"), 500)
    instance.oa_url = _truncate(pub.get("oa_url"), 500)
    instance.abstract = pub.get("abstract") or None
    instance.authors = list(pub.get("authors") or [])
    instance.institutions = list(pub.get("institutions") or [])
    instance.source_name = _truncate(pub.get("source_name"), 500)
    instance.source_type = _truncate(pub.get("source_type"), 50)
    instance.cited_by_count = pub.get("cited_by_count")
    instance.language = _truncate(pub.get("language"), 50)
    instance.keywords = list(pub.get("keywords") or [])
    instance.is_oa = pub.get("is_oa")
    instance.is_retracted = bool(pub.get("is_retracted"))
    instance.pub_type = _truncate(pub.get("type"), 100)
    instance.biblio = dict(pub.get("biblio") or {})
    return instance


def resolve_publications(short_ids):
    """Return ``{short_id: publication}`` from OpenAlex, raising a clean API error on failure."""
    try:
        return SearchService().get_publications(short_ids)
    except OpenAlexError:
        raise UpstreamError(
            "Could not load publication details from OpenAlex. Please try again.",
            code="openalex_unavailable",
        ) from None


def save_publications(project, folder, openalex_ids, user):
    """Save publications into ``folder`` (``None`` = project root).

    Returns ``(created, skipped)`` where ``skipped`` lists ``{openalex_id, reason}``
    with reason ``already_saved``, ``not_found`` or ``invalid_id``.
    """
    skipped = []
    short_ids = []
    for raw in openalex_ids:
        short_id = parse_openalex_id(raw, "W")
        if short_id:
            short_ids.append(short_id)
        else:
            skipped.append({"openalex_id": str(raw)[:255], "reason": "invalid_id"})
    short_ids = list(dict.fromkeys(short_ids))

    urls = {short_id: normalize_work_id(short_id) for short_id in short_ids}
    existing = set(
        SavedPublication.objects.filter(project=project, folder=folder, openalex_id__in=urls.values())
        .values_list("openalex_id", flat=True)
    )
    to_fetch = []
    for short_id in short_ids:
        if urls[short_id] in existing:
            skipped.append({"openalex_id": urls[short_id], "reason": "already_saved"})
        else:
            to_fetch.append(short_id)

    resolved = resolve_publications(to_fetch) if to_fetch else {}
    created = []
    for short_id in to_fetch:
        pub = resolved.get(short_id)
        if not pub or not pub.get("openalex_id"):
            skipped.append({"openalex_id": urls[short_id], "reason": "not_found"})
            continue
        instance = apply_publication_data(SavedPublication(project=project, folder=folder, added_by=user), pub)
        try:
            with transaction.atomic():
                instance.save()
        except IntegrityError:
            skipped.append({"openalex_id": instance.openalex_id, "reason": "already_saved"})
            continue
        created.append(instance)

    if created:
        try:
            ensure_embeddings(created)
        except Exception:  # embeddings are an optimisation; never fail a save because of them
            logger.exception("Could not compute embeddings for newly saved publications")
        project.save(update_fields=["updated_at"])
    return created, skipped


def move_publication(publication, target_folder):
    target_id = target_folder.id if target_folder else None
    if publication.folder_id == target_id:
        return publication
    duplicate = SavedPublication.objects.filter(
        project_id=publication.project_id, folder=target_folder, openalex_id=publication.openalex_id
    ).exclude(pk=publication.pk)
    if duplicate.exists():
        raise ConflictError("This publication is already in the selected folder.", code="duplicate_in_folder")
    publication.folder = target_folder
    try:
        with transaction.atomic():
            publication.save(update_fields=["folder"])
    except IntegrityError:
        raise ConflictError("This publication is already in the selected folder.", code="duplicate_in_folder") from None
    return publication


def folder_subtree_ids(folder):
    """Ids of ``folder`` and all of its descendants."""
    ids = [folder.id]
    seen = {folder.id}
    frontier = [folder.id]
    while frontier:
        children = [
            child_id
            for child_id in Folder.objects.filter(parent_id__in=frontier).values_list("id", flat=True)
            if child_id not in seen
        ]
        seen.update(children)
        ids.extend(children)
        frontier = children
    return ids


def publications_in_scope(project, folder=None, include_subfolders=True):
    queryset = SavedPublication.objects.filter(project=project)
    if folder is None:
        return queryset
    if include_subfolders:
        return queryset.filter(folder_id__in=folder_subtree_ids(folder))
    return queryset.filter(folder=folder)


@transaction.atomic
def delete_folder(folder, keep_publications=True):
    """Delete a folder and its sub-folders.

    With ``keep_publications`` the publications inside are moved to the parent
    folder (or project root). If the target already contains the same
    publication, notes are merged into the existing copy instead of being lost.
    """
    subtree = folder_subtree_ids(folder)
    if keep_publications:
        target = folder.parent
        occupied = dict(
            SavedPublication.objects.filter(project_id=folder.project_id, folder=target)
            .values_list("openalex_id", "id")
        )
        for publication in SavedPublication.objects.filter(folder_id__in=subtree).order_by("saved_at", "id"):
            existing_id = occupied.get(publication.openalex_id)
            if existing_id:
                PublicationNote.objects.filter(publication=publication).update(publication_id=existing_id)
                if publication.label:
                    SavedPublication.objects.filter(pk=existing_id, label__isnull=True).update(label=publication.label)
                publication.delete()
            else:
                publication.folder = target
                publication.save(update_fields=["folder"])
                occupied[publication.openalex_id] = publication.id
    else:
        SavedPublication.objects.filter(folder_id__in=subtree).delete()
    folder.delete()


def validate_folder_parent(folder, new_parent):
    """Raise ``ValueError`` if ``new_parent`` would create a cycle."""
    if new_parent is None or folder.pk is None:
        return
    if new_parent.project_id != folder.project_id:
        raise ValueError("The parent folder belongs to a different project.")
    if new_parent.pk in folder_subtree_ids(folder):
        raise ValueError("A folder cannot be moved into itself or one of its sub-folders.")
