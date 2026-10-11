"""Project exports: BibTeX, RIS, CSV and PDF."""
import csv
import io
import logging
import os
from datetime import date
from xml.sax.saxutils import escape

from django.conf import settings
from django.utils.text import slugify

from apps.projects.models import Folder
from apps.projects.services.publications import publications_in_scope
from apps.search.services.bibliography import bibtex_entry, bibtex_key, ris_entry

logger = logging.getLogger(__name__)

EXPORT_FORMATS = {
    "bibtex": ("bib", "application/x-bibtex; charset=utf-8"),
    "ris": ("ris", "application/x-research-info-systems; charset=utf-8"),
    "csv": ("csv", "text/csv; charset=utf-8"),
    "pdf": ("pdf", "application/pdf"),
}

_TEXT = {
    "en": {
        "exported": "Exported on {date}",
        "count": "{count} publications",
        "root": "Project root",
        "authors": "Authors",
        "source": "Source",
        "year": "Year",
        "label": "Label",
        "notes": "Notes",
        "retracted": "RETRACTED",
        "page": "Page {page}",
        "labels": {"to_read": "To read", "read": "Read", "to_cite": "To cite", "cited": "Cited"},
    },
    "lt": {
        "exported": "Eksportuota {date}",
        "count": "Publikacijų: {count}",
        "root": "Projekto šaknis",
        "authors": "Autoriai",
        "source": "Šaltinis",
        "year": "Metai",
        "label": "Žyma",
        "notes": "Pastabos",
        "retracted": "ATŠAUKTA",
        "page": "Puslapis {page}",
        "labels": {"to_read": "Perskaityti", "read": "Perskaityta", "to_cite": "Cituoti", "cited": "Cituota"},
    },
}


def folder_paths(project):
    folders = {folder.id: folder for folder in Folder.objects.filter(project=project).only("id", "name", "parent_id")}
    paths = {}

    def path(folder_id, depth=0):
        if folder_id in paths:
            return paths[folder_id]
        folder = folders.get(folder_id)
        if folder is None or depth > Folder.MAX_DEPTH:
            return ""
        parent = path(folder.parent_id, depth + 1) if folder.parent_id else ""
        paths[folder_id] = f"{parent} / {folder.name}" if parent else folder.name
        return paths[folder_id]

    for folder_id in folders:
        path(folder_id)
    return paths


def export_publications(project, folder=None):
    paths = folder_paths(project)
    publications = list(
        publications_in_scope(project, folder).prefetch_related("notes").order_by("saved_at", "id")
    )
    publications.sort(key=lambda pub: (paths.get(pub.folder_id, ""), pub.saved_at, pub.id))
    return publications, paths


def export_filename(project, extension):
    base = slugify(project.name) or "project"
    return f"{base[:60]}-{date.today().isoformat()}.{extension}"


def to_bibtex(publications):
    used_keys = set()
    entries = []
    for publication in publications:
        data = publication.as_publication()
        base = bibtex_key(data)
        key, counter = base, 0
        while key in used_keys:
            counter += 1
            key = f"{base}{_suffix(counter)}"
        used_keys.add(key)
        entries.append(bibtex_entry(data, key))
    return "\n\n".join(entries) + ("\n" if entries else "")


def _suffix(number):
    """1 -> "a", 26 -> "z", 27 -> "aa" (bijective base 26)."""
    letters = ""
    while number > 0:
        number, remainder = divmod(number - 1, 26)
        letters = chr(ord("a") + remainder) + letters
    return letters


def to_ris(publications):
    return "\r\n\r\n".join(ris_entry(publication.as_publication()) for publication in publications) + "\r\n"


def _csv_safe(value):
    """Prevent spreadsheet formula injection (cells starting with = + - @)."""
    text = "" if value is None else str(value)
    if text and text[0] in ("=", "+", "-", "@", "\t", "\r"):
        return "'" + text
    return text


def to_csv(publications, paths):
    buffer = io.StringIO()
    buffer.write("\ufeff")  # BOM so Excel opens UTF-8 correctly
    writer = csv.writer(buffer)
    writer.writerow([
        "Title", "Authors", "Year", "Publication date", "Source", "Type", "DOI", "URL", "PDF",
        "Citations", "Open access", "Retracted", "Label", "Folder", "Keywords", "Notes", "OpenAlex ID", "Saved at",
    ])
    for publication in publications:
        writer.writerow([_csv_safe(value) for value in (
            publication.title,
            "; ".join(publication.authors or []),
            publication.year or "",
            publication.publication_date.isoformat() if publication.publication_date else "",
            publication.source_name or "",
            publication.pub_type or "",
            publication.doi or "",
            publication.landing_page_url or "",
            publication.pdf_url or "",
            publication.cited_by_count if publication.cited_by_count is not None else "",
            "yes" if publication.is_oa else ("no" if publication.is_oa is False else ""),
            "yes" if publication.is_retracted else "no",
            publication.label or "",
            paths.get(publication.folder_id, ""),
            "; ".join(k for k in publication.keywords or [] if isinstance(k, str)),
            " | ".join(note.text for note in publication.notes.all()),
            publication.openalex_id,
            publication.saved_at.isoformat() if publication.saved_at else "",
        )])
    return buffer.getvalue()


# ---------------------------------------------------------------------------
# PDF
# ---------------------------------------------------------------------------

_FONT_CANDIDATES = [
    ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
    ("/usr/share/fonts/dejavu/DejaVuSans.ttf", "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf"),
    ("/usr/share/fonts/TTF/DejaVuSans.ttf", "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf"),
    ("C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/arialbd.ttf"),
    ("/System/Library/Fonts/Supplemental/Arial.ttf", "/System/Library/Fonts/Supplemental/Arial Bold.ttf"),
]
_fonts = None


def _pdf_fonts():
    """Register a Unicode TrueType font once; fall back to Helvetica."""
    global _fonts
    if _fonts is not None:
        return _fonts
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont

    candidates = []
    if settings.PDF_FONT_PATH:
        candidates.append((settings.PDF_FONT_PATH, settings.PDF_FONT_BOLD_PATH or settings.PDF_FONT_PATH))
    candidates.extend(_FONT_CANDIDATES)
    for regular, bold in candidates:
        if not os.path.isfile(regular):
            continue
        try:
            pdfmetrics.registerFont(TTFont("PFSans", regular))
            bold_path = bold if bold and os.path.isfile(bold) else regular
            pdfmetrics.registerFont(TTFont("PFSans-Bold", bold_path))
            pdfmetrics.registerFontFamily(
                "PFSans", normal="PFSans", bold="PFSans-Bold", italic="PFSans", boldItalic="PFSans-Bold"
            )
            _fonts = ("PFSans", "PFSans-Bold")
            return _fonts
        except Exception:
            logger.exception("Could not register PDF font %s", regular)
    logger.warning("No Unicode TTF font found for PDF export; non-Latin characters may not render")
    _fonts = ("Helvetica", "Helvetica-Bold")
    return _fonts


def to_pdf(project, publications, paths, language="en"):
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

    text = _TEXT.get(language, _TEXT["en"])
    regular, bold = _pdf_fonts()
    navy = colors.HexColor("#1e2d4a")
    muted = colors.HexColor("#5a7090")

    styles = {
        "title": ParagraphStyle("title", fontName=bold, fontSize=18, leading=22, textColor=navy, spaceAfter=4),
        "meta": ParagraphStyle("meta", fontName=regular, fontSize=9, leading=12, textColor=muted, spaceAfter=10),
        "description": ParagraphStyle("description", fontName=regular, fontSize=10, leading=14, spaceAfter=6),
        "folder": ParagraphStyle("folder", fontName=bold, fontSize=12, leading=16, textColor=navy, spaceBefore=10, spaceAfter=6),
        "entry": ParagraphStyle("entry", fontName=bold, fontSize=10.5, leading=14, textColor=navy, spaceBefore=6),
        "detail": ParagraphStyle("detail", fontName=regular, fontSize=9, leading=12, textColor=colors.HexColor("#334155")),
        "note": ParagraphStyle("note", fontName=regular, fontSize=8.5, leading=11, leftIndent=8, textColor=muted),
    }

    def footer(canvas, doc):
        canvas.saveState()
        canvas.setFont(regular, 8)
        canvas.setFillColor(muted)
        canvas.drawRightString(A4[0] - 18 * mm, 10 * mm, text["page"].format(page=doc.page))
        canvas.drawString(18 * mm, 10 * mm, project.name[:90])
        canvas.restoreState()

    buffer = io.BytesIO()
    document = SimpleDocTemplate(
        buffer, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=18 * mm, bottomMargin=18 * mm,
        title=project.name, author="Publication Finder",
    )
    story = [Paragraph(escape(project.name), styles["title"])]
    story.append(Paragraph(escape(
        f"{text['exported'].format(date=date.today().isoformat())} · {text['count'].format(count=len(publications))}"
    ), styles["meta"]))
    if project.description:
        story.append(Paragraph(escape(project.description).replace("\n", "<br/>"), styles["description"]))

    current_folder = object()
    for number, publication in enumerate(publications, start=1):
        folder_name = paths.get(publication.folder_id, "") or text["root"]
        if folder_name != current_folder:
            current_folder = folder_name
            story.append(Paragraph(escape(folder_name), styles["folder"]))
        title = escape(publication.title or "")
        if publication.is_retracted:
            title += f' <font color="#c0392b">[{text["retracted"]}]</font>'
        story.append(Paragraph(f"{number}. {title}", styles["entry"]))
        if publication.authors:
            authors = ", ".join(publication.authors[:8]) + (" et al." if len(publication.authors) > 8 else "")
            story.append(Paragraph(f"{text['authors']}: {escape(authors)}", styles["detail"]))
        details = [part for part in (publication.source_name, str(publication.year) if publication.year else None) if part]
        if details:
            story.append(Paragraph(escape(" · ".join(details)), styles["detail"]))
        link = publication.doi or publication.landing_page_url
        if link:
            href = escape(link, {'"': "&quot;"})
            story.append(Paragraph(f'<link href="{href}" color="#2a5db0">{escape(link)}</link>', styles["detail"]))
        if publication.label:
            story.append(Paragraph(f"{text['label']}: {escape(text['labels'].get(publication.label, publication.label))}", styles["detail"]))
        for note in publication.notes.all():
            story.append(Paragraph("– " + escape(note.text).replace("\n", "<br/>"), styles["note"]))
        story.append(Spacer(1, 2))

    document.build(story, onFirstPage=footer, onLaterPages=footer)
    return buffer.getvalue()
