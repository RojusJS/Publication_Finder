"""Conversion of raw OpenAlex records into the API's publication shape."""
import html
import re

from django.utils.html import strip_tags

from apps.core.identifiers import normalize_work_id

_WHITESPACE = re.compile(r"\s+")


def clean_text(value):
    """Strip markup and collapse whitespace (OpenAlex titles/abstracts may contain HTML)."""
    if not value:
        return ""
    text = html.unescape(strip_tags(str(value)))
    return _WHITESPACE.sub(" ", text).strip()


def safe_url(value):
    """Only allow absolute http(s) links so stored data can never inject ``javascript:`` URLs."""
    if isinstance(value, str) and value.strip().lower().startswith(("https://", "http://")):
        return value.strip()[:500]
    return None


def reconstruct_abstract(inverted_index):
    if not isinstance(inverted_index, dict) or not inverted_index:
        return ""
    positions = []
    for word, indices in inverted_index.items():
        for index in indices or []:
            if isinstance(index, int):
                positions.append((index, word))
    positions.sort(key=lambda item: item[0])
    return clean_text(" ".join(word for _, word in positions))


def author_names(work, limit=None):
    names = []
    for authorship in work.get("authorships") or []:
        author = authorship.get("author") or {}
        name = clean_text(author.get("display_name") or authorship.get("raw_author_name"))
        if name:
            names.append(name)
            if limit and len(names) >= limit:
                break
    return names


def _institution_names(work):
    names = []
    seen = set()
    for authorship in work.get("authorships") or []:
        for institution in authorship.get("institutions") or []:
            name = clean_text(institution.get("display_name"))
            if name and name not in seen:
                seen.add(name)
                names.append(name)
    return names


def _biblio(work):
    biblio = work.get("biblio") or {}
    return {
        key: str(biblio[key])[:50]
        for key in ("volume", "issue", "first_page", "last_page")
        if biblio.get(key) not in (None, "")
    }


def map_work(work):
    """Map an OpenAlex work to the publication dictionary used across the API."""
    primary = work.get("primary_location") or {}
    best_oa = work.get("best_oa_location") or {}
    source = primary.get("source") or {}
    open_access = work.get("open_access") or {}
    keywords = [
        clean_text(keyword.get("display_name"))
        for keyword in work.get("keywords") or []
        if isinstance(keyword, dict) and keyword.get("display_name")
    ]
    title = clean_text(work.get("display_name") or work.get("title"))

    return {
        "openalex_id": normalize_work_id(work.get("id")),
        "title": title,
        "year": work.get("publication_year"),
        "publication_date": work.get("publication_date"),
        "doi": safe_url(work.get("doi")),
        "type": work.get("type"),
        "is_oa": open_access.get("is_oa"),
        "oa_url": safe_url(open_access.get("oa_url")),
        "pdf_url": safe_url(best_oa.get("pdf_url") or primary.get("pdf_url")),
        "landing_page_url": safe_url(
            primary.get("landing_page_url") or best_oa.get("landing_page_url") or open_access.get("oa_url")
        ),
        "abstract": reconstruct_abstract(work.get("abstract_inverted_index")),
        "authors": author_names(work),
        "institutions": _institution_names(work),
        "source_name": clean_text(source.get("display_name")) or None,
        "source_type": source.get("type"),
        "cited_by_count": work.get("cited_by_count") or 0,
        "language": work.get("language"),
        "keywords": keywords,
        "is_retracted": bool(work.get("is_retracted")),
        "biblio": _biblio(work),
    }


def map_graph_node(work, role):
    authors = author_names(work, limit=3)
    return {
        "id": normalize_work_id(work.get("id")),
        "title": clean_text(work.get("display_name") or work.get("title")) or None,
        "year": work.get("publication_year"),
        "cited_by_count": work.get("cited_by_count") or 0,
        "authors": authors,
        "doi": safe_url(work.get("doi")),
        "type": work.get("type"),
        "role": role,
    }
