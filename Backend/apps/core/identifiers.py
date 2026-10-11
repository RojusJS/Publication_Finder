"""Parsing and normalisation of OpenAlex identifiers and DOIs."""
import re

OPENALEX_PREFIX = "https://openalex.org/"

_OPENALEX_ID_RE = re.compile(r"^(?:https?://(?:api\.)?openalex\.org/(?:works/|authors/|institutions/)?)?([WAIwai]\d{1,15})$")
_DOI_RE = re.compile(r"^10\.\d{4,9}/\S+$", re.IGNORECASE)
_DOI_PREFIX_RE = re.compile(r"^(?:https?://(?:dx\.)?doi\.org/|doi:\s*)", re.IGNORECASE)


def parse_openalex_id(value, kind="W"):
    """Return the short form (e.g. ``W123``) or ``None`` when invalid.

    Accepts short ids, full ``https://openalex.org/W123`` URLs and API URLs.
    ``kind`` restricts the entity type: W(ork), A(uthor) or I(nstitution).
    """
    if not isinstance(value, str):
        return None
    match = _OPENALEX_ID_RE.match(value.strip())
    if not match:
        return None
    short_id = match.group(1).upper()
    if kind and not short_id.startswith(kind):
        return None
    return short_id


def openalex_url(short_id):
    return f"{OPENALEX_PREFIX}{short_id}"


def normalize_work_id(value):
    """Return the canonical stored form ``https://openalex.org/W123`` or ``None``."""
    short_id = parse_openalex_id(value, "W")
    return openalex_url(short_id) if short_id else None


def parse_doi(value):
    """Return a bare, lower-cased DOI (``10.1234/abc``) or ``None``."""
    if not isinstance(value, str):
        return None
    candidate = _DOI_PREFIX_RE.sub("", value.strip()).strip()
    if _DOI_RE.match(candidate):
        return candidate.lower()
    return None


def doi_url(doi):
    bare = parse_doi(doi)
    return f"https://doi.org/{bare}" if bare else None
