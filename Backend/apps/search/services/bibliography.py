"""Citation formatting (APA, MLA, Chicago, Harvard, IEEE) and BibTeX/RIS entries.

For publications with a DOI the formatted citation is requested from the DOI
registration agency through content negotiation (``https://doi.org`` with
``Accept: text/x-bibliography``), which uses the official CSL styles and the
publisher's structured metadata. When that is not possible a local formatter
is used. BibTeX and RIS are always generated locally.

Every function takes a "publication dict" in the API shape (``title``,
``authors``, ``year``, ``doi``, ``type``, ``source_name``, ``biblio`` ...).
"""
import hashlib
import logging
import re
import unicodedata
from urllib.parse import quote

import requests
from django.core.cache import cache

from apps.core.identifiers import parse_doi

logger = logging.getLogger(__name__)

CITATION_STYLES = ("apa", "mla", "chicago", "harvard", "ieee")
EXPORT_STYLES = ("bibtex", "ris")
ALL_STYLES = CITATION_STYLES + EXPORT_STYLES

_CSL_NAMES = {
    "apa": "apa",
    "mla": "modern-language-association",
    "chicago": "chicago-author-date",
    "harvard": "harvard-cite-them-right",
    "ieee": "ieee",
}
_CITATION_TTL = 60 * 60 * 24 * 30
_DOI_TIMEOUT = 10

_PARTICLES = {"van", "von", "der", "den", "de", "del", "della", "di", "da", "dos", "du", "la", "le", "ter", "ten"}
_SUFFIXES = {"jr", "jr.", "sr", "sr.", "ii", "iii", "iv"}
_WHITESPACE = re.compile(r"\s+")


# ---------------------------------------------------------------------------
# Names
# ---------------------------------------------------------------------------

def split_name(display_name):
    """Split ``"Jean-Paul van der Berg"`` into ``("Jean-Paul", "van der Berg")``."""
    name = _WHITESPACE.sub(" ", (display_name or "").strip())
    if not name:
        return "", ""
    if "," in name:
        family, given = (part.strip() for part in name.split(",", 1))
        return given, family
    parts = name.split(" ")
    suffix = ""
    if len(parts) > 2 and parts[-1].lower() in _SUFFIXES:
        suffix = parts.pop()
    if len(parts) == 1:
        return "", f"{parts[0]} {suffix}".strip()
    index = len(parts) - 1
    family_parts = [parts[index]]
    index -= 1
    while index > 0 and parts[index].lower() in _PARTICLES:
        family_parts.insert(0, parts[index])
        index -= 1
    given = " ".join(parts[: index + 1])
    family = " ".join(family_parts)
    if suffix:
        family = f"{family} {suffix}"
    return given, family


def initials(given, separator=" "):
    """``"Jean-Paul Anne"`` -> ``"J.-P. A."``."""
    result = []
    for token in given.split():
        pieces = [piece for piece in token.split("-") if piece]
        if pieces:
            result.append("-".join(f"{piece[0].upper()}." for piece in pieces))
    return separator.join(result)


def _ascii(text):
    normalized = unicodedata.normalize("NFKD", text or "")
    return normalized.encode("ascii", "ignore").decode("ascii")


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def _end(text, mark="."):
    text = (text or "").strip()
    if not text:
        return ""
    return text if text[-1] in ".?!" else text + mark


def _pages(pub, dash="–"):
    biblio = pub.get("biblio") or {}
    first, last = biblio.get("first_page"), biblio.get("last_page")
    if first and last and first != last:
        return f"{first}{dash}{last}"
    return first or ""


def _doi_link(pub):
    doi = parse_doi(pub.get("doi") or "")
    if doi:
        return f"https://doi.org/{doi}"
    return pub.get("landing_page_url") or ""


def _year(pub):
    return str(pub.get("year")) if pub.get("year") else "n.d."


def _volume_issue(pub, issue_format="({})"):
    biblio = pub.get("biblio") or {}
    volume, issue = biblio.get("volume"), biblio.get("issue")
    text = volume or ""
    if issue:
        text += issue_format.format(issue)
    return text


def _join(items, last_separator, oxford_comma=True):
    items = [item for item in items if item]
    if len(items) <= 1:
        return "".join(items)
    if len(items) == 2:
        return f"{items[0]}{last_separator}{items[1]}"
    return ", ".join(items[:-1]) + ("," if oxford_comma else "") + last_separator + items[-1]


# ---------------------------------------------------------------------------
# Local formatters (used when there is no DOI or the DOI service fails)
# ---------------------------------------------------------------------------

def _format_apa(pub):
    names = [split_name(author) for author in pub.get("authors") or []]
    formatted = [f"{family}, {initials(given)}".strip().rstrip(",") for given, family in names]
    if len(formatted) > 20:
        authors = ", ".join(formatted[:19]) + ", . . . " + formatted[-1]
    elif len(formatted) > 1:
        authors = ", ".join(formatted[:-1]) + ", & " + formatted[-1]
    else:
        authors = "".join(formatted)
    parts = []
    title = _end(pub.get("title"))
    if authors:
        parts.append(f"{_end(authors)} ({_year(pub)}).")
        parts.append(title)
    else:
        parts.append(f"{title} ({_year(pub)}).")
    source = pub.get("source_name")
    if source:
        container = source
        volume_issue = _volume_issue(pub)
        if volume_issue:
            container += f", {volume_issue}"
        pages = _pages(pub)
        if pages:
            container += f", {pages}"
        parts.append(_end(container))
    link = _doi_link(pub)
    if link:
        parts.append(link)
    return " ".join(part for part in parts if part)


def _format_mla(pub):
    names = [split_name(author) for author in pub.get("authors") or []]
    if not names:
        authors = ""
    elif len(names) == 1:
        authors = ", ".join(part for part in (names[0][1], names[0][0]) if part)
    elif len(names) == 2:
        first = ", ".join(part for part in (names[0][1], names[0][0]) if part)
        authors = f"{first}, and {' '.join(part for part in names[1] if part)}"
    else:
        authors = ", ".join(part for part in (names[0][1], names[0][0]) if part) + ", et al"
    parts = []
    if authors:
        parts.append(_end(authors))
    parts.append(f"“{_end(pub.get('title'))}”")
    container = []
    if pub.get("source_name"):
        container.append(pub["source_name"])
    biblio = pub.get("biblio") or {}
    if biblio.get("volume"):
        container.append(f"vol. {biblio['volume']}")
    if biblio.get("issue"):
        container.append(f"no. {biblio['issue']}")
    if pub.get("year"):
        container.append(str(pub["year"]))
    pages = _pages(pub)
    if pages:
        container.append(f"pp. {pages}")
    if container:
        parts.append(_end(", ".join(container)))
    link = _doi_link(pub)
    if link:
        parts.append(_end(link))
    return " ".join(parts)


def _format_chicago(pub):
    names = [split_name(author) for author in pub.get("authors") or []]
    formatted = []
    for index, (given, family) in enumerate(names[:10]):
        if index == 0:
            formatted.append(", ".join(part for part in (family, given) if part))
        else:
            formatted.append(" ".join(part for part in (given, family) if part))
    if len(names) > 10:
        authors = ", ".join(formatted[:7]) + ", et al"
    else:
        authors = _join(formatted, " and ")
    parts = []
    if authors:
        parts.append(_end(authors))
    parts.append(_end(_year(pub)))
    parts.append(f"“{_end(pub.get('title'))}”")
    if pub.get("source_name"):
        container = pub["source_name"]
        biblio = pub.get("biblio") or {}
        if biblio.get("volume"):
            container += f" {biblio['volume']}"
        if biblio.get("issue"):
            container += f" ({biblio['issue']})"
        pages = _pages(pub)
        if pages:
            container += f": {pages}"
        parts.append(_end(container))
    link = _doi_link(pub)
    if link:
        parts.append(_end(link))
    return " ".join(parts)


def _format_harvard(pub):
    names = [split_name(author) for author in pub.get("authors") or []]
    formatted = [f"{family}, {initials(given, '')}".strip().rstrip(",") for given, family in names]
    if len(formatted) > 3:
        authors = f"{formatted[0]} et al."
    else:
        authors = _join(formatted, " and ", oxford_comma=False)
    parts = []
    if authors:
        parts.append(f"{authors} ({_year(pub)})")
    else:
        parts.append(f"({_year(pub)})")
    parts.append(f"‘{(pub.get('title') or '').strip()}’,")
    if pub.get("source_name"):
        container = pub["source_name"]
        volume_issue = _volume_issue(pub)
        if volume_issue:
            container += f", {volume_issue}"
        pages = _pages(pub)
        if pages:
            container += f", pp. {pages}"
        parts.append(_end(container))
    link = _doi_link(pub)
    if link:
        parts.append(f"Available at: {link}.")
    text = " ".join(parts)
    return text[:-1] + "." if text.endswith(",") else text


def _format_ieee(pub):
    names = [split_name(author) for author in pub.get("authors") or []]
    formatted = [" ".join(part for part in (initials(given), family) if part) for given, family in names]
    if len(formatted) > 6:
        authors = f"{formatted[0]} et al."
    else:
        authors = _join(formatted, " and ")
    pieces = []
    if authors:
        pieces.append(authors)
    pieces.append(f"“{(pub.get('title') or '').strip()},”")
    details = []
    if pub.get("source_name"):
        details.append(pub["source_name"])
    biblio = pub.get("biblio") or {}
    if biblio.get("volume"):
        details.append(f"vol. {biblio['volume']}")
    if biblio.get("issue"):
        details.append(f"no. {biblio['issue']}")
    pages = _pages(pub)
    if pages:
        details.append(f"pp. {pages}")
    if pub.get("year"):
        details.append(str(pub["year"]))
    doi = parse_doi(pub.get("doi") or "")
    if doi:
        details.append(f"doi: {doi}")
    text = (", ".join(pieces[:-1]) + ", " if len(pieces) > 1 else "") + pieces[-1]
    if details:
        text += " " + ", ".join(details)
    return _end(text)


_LOCAL_FORMATTERS = {
    "apa": _format_apa,
    "mla": _format_mla,
    "chicago": _format_chicago,
    "harvard": _format_harvard,
    "ieee": _format_ieee,
}


# ---------------------------------------------------------------------------
# DOI content negotiation
# ---------------------------------------------------------------------------

_EDITED_BY_ARTIFACT = re.compile(r"[.,]?\s*edited by\s*,\s*", re.IGNORECASE)
_NUMBER_PREFIX = re.compile(r"^\[\d+\]\s*")


def _clean_remote_citation(text):
    text = _WHITESPACE.sub(" ", text or "").strip()
    text = _NUMBER_PREFIX.sub("", text)
    text = _EDITED_BY_ARTIFACT.sub(", ", text)
    return text.strip()


def fetch_doi_citation(doi, style):
    """Return the citation formatted by the DOI registration agency, or ``None``."""
    csl_name = _CSL_NAMES.get(style)
    bare = parse_doi(doi or "")
    if not csl_name or not bare:
        return None
    cache_key = "doi-citation:" + hashlib.sha256(f"{bare}|{csl_name}".encode()).hexdigest()
    cached = cache.get(cache_key)
    if cached is not None:
        return cached or None
    try:
        response = requests.get(
            f"https://doi.org/{quote(bare, safe='/')}",
            headers={"Accept": f"text/x-bibliography; style={csl_name}; locale=en-US"},
            timeout=_DOI_TIMEOUT,
        )
    except requests.RequestException as exc:
        logger.info("DOI citation lookup failed (%s)", exc.__class__.__name__)
        return None
    text = ""
    if response.status_code == 200 and "html" not in response.headers.get("content-type", ""):
        response.encoding = "utf-8"
        text = _clean_remote_citation(response.text)
        if len(text) < 10 or text.startswith("<"):
            text = ""
    # Cache misses too (as ""), so a DOI without CSL support is not re-queried.
    cache.set(cache_key, text, _CITATION_TTL if text else 60 * 60)
    return text or None


def format_citation(pub, style):
    """Return ``(text, source)`` where ``source`` is ``"doi"``, ``"local"`` or ``"generated"``."""
    if style == "bibtex":
        return bibtex_entry(pub, bibtex_key(pub)), "generated"
    if style == "ris":
        return ris_entry(pub), "generated"
    remote = fetch_doi_citation(pub.get("doi"), style)
    if remote:
        return remote, "doi"
    return _LOCAL_FORMATTERS[style](pub), "local"


# ---------------------------------------------------------------------------
# BibTeX
# ---------------------------------------------------------------------------

_BIBTEX_ESCAPES = {
    "\\": r"\textbackslash{}",
    "{": r"\{",
    "}": r"\}",
    "&": r"\&",
    "%": r"\%",
    "$": r"\$",
    "#": r"\#",
    "_": r"\_",
    "~": r"\textasciitilde{}",
    "^": r"\textasciicircum{}",
}
_STOP_WORDS = {"a", "an", "the", "on", "of", "in", "for", "and", "to", "with", "from", "by", "at", "is"}


def bibtex_escape(value):
    return "".join(_BIBTEX_ESCAPES.get(char, char) for char in _WHITESPACE.sub(" ", str(value)).strip())


def bibtex_key(pub):
    authors = pub.get("authors") or []
    family = split_name(authors[0])[1] if authors else "anon"
    family = re.sub(r"[^a-z]", "", _ascii(family).lower()) or "anon"
    words = re.findall(r"[a-z0-9]+", _ascii(pub.get("title") or "").lower())
    word = next((item for item in words if item not in _STOP_WORDS), "")
    return f"{family}{pub.get('year') or ''}{word}"


def _bibtex_type(pub):
    pub_type = pub.get("type") or ""
    if pub_type == "conference-paper" or (pub_type == "article" and pub.get("source_type") == "conference"):
        return "inproceedings"
    return {
        "article": "article",
        "review": "article",
        "book": "book",
        "book-chapter": "incollection",
        "dissertation": "phdthesis",
        "report": "techreport",
    }.get(pub_type, "misc")


def bibtex_entry(pub, key):
    entry_type = _bibtex_type(pub)
    fields = []

    def add(name, value):
        if value not in (None, "", []):
            fields.append((name, bibtex_escape(value)))

    add("author", " and ".join(pub.get("authors") or []))
    add("title", pub.get("title"))
    source = pub.get("source_name")
    if entry_type == "article":
        add("journal", source)
    elif entry_type in ("inproceedings", "incollection"):
        add("booktitle", source)
    elif entry_type == "book":
        add("publisher", source)
    elif entry_type == "techreport":
        add("institution", source)
    elif entry_type == "phdthesis":
        add("school", (pub.get("institutions") or [None])[0] or source)
    else:
        add("howpublished", source)
    add("year", pub.get("year"))
    biblio = pub.get("biblio") or {}
    add("volume", biblio.get("volume"))
    add("number", biblio.get("issue"))
    pages = _pages(pub, dash="--")
    add("pages", pages)
    add("doi", parse_doi(pub.get("doi") or ""))
    add("url", pub.get("landing_page_url") or _doi_link(pub))
    if pub.get("type") == "preprint":
        add("note", "Preprint")
    add("language", pub.get("language"))
    add("keywords", ", ".join(pub.get("keywords") or []))
    add("abstract", pub.get("abstract"))
    body = ",\n".join(f"  {name} = {{{value}}}" for name, value in fields)
    return f"@{entry_type}{{{key},\n{body}\n}}"


# ---------------------------------------------------------------------------
# RIS
# ---------------------------------------------------------------------------

_RIS_TYPES = {
    "article": "JOUR",
    "review": "JOUR",
    "conference-paper": "CPAPER",
    "book": "BOOK",
    "book-chapter": "CHAP",
    "dissertation": "THES",
    "report": "RPRT",
    "dataset": "DATA",
    "preprint": "UNPB",
}


def _ris_value(value):
    return _WHITESPACE.sub(" ", str(value)).strip()


def ris_entry(pub):
    lines = []

    def add(tag, value):
        if value not in (None, "", []):
            lines.append(f"{tag}  - {_ris_value(value)}")

    ris_type = _RIS_TYPES.get(pub.get("type") or "", "GEN")
    if ris_type == "JOUR" and pub.get("source_type") == "conference":
        ris_type = "CPAPER"
    add("TY", ris_type)
    for author in pub.get("authors") or []:
        given, family = split_name(author)
        add("AU", f"{family}, {given}" if given else family)
    add("TI", pub.get("title"))
    add("T2", pub.get("source_name"))
    add("PY", pub.get("year"))
    if pub.get("publication_date"):
        add("DA", str(pub["publication_date"]).replace("-", "/"))
    biblio = pub.get("biblio") or {}
    add("VL", biblio.get("volume"))
    add("IS", biblio.get("issue"))
    add("SP", biblio.get("first_page"))
    add("EP", biblio.get("last_page"))
    add("DO", parse_doi(pub.get("doi") or ""))
    add("UR", pub.get("landing_page_url") or _doi_link(pub))
    add("AB", pub.get("abstract"))
    for keyword in pub.get("keywords") or []:
        add("KW", keyword)
    add("LA", pub.get("language"))
    lines.append("ER  - ")
    return "\r\n".join(lines)
