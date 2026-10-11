from unittest.mock import MagicMock

import pytest

from apps.core.identifiers import normalize_work_id, parse_doi, parse_openalex_id
from apps.search.services import bibliography
from apps.search.services.bibliography import (
    bibtex_entry,
    bibtex_escape,
    bibtex_key,
    format_citation,
    initials,
    ris_entry,
    split_name,
)

PUB = {
    "title": "Deep learning",
    "authors": ["Yann LeCun", "Yoshua Bengio", "Geoffrey Hinton"],
    "year": 2015,
    "publication_date": "2015-05-27",
    "doi": "https://doi.org/10.1038/nature14539",
    "type": "article",
    "source_name": "Nature",
    "biblio": {"volume": "521", "issue": "7553", "first_page": "436", "last_page": "444"},
    "landing_page_url": "https://www.nature.com/articles/nature14539",
    "keywords": ["neural networks"],
    "abstract": "Deep learning allows models ...",
    "language": "en",
}


@pytest.mark.parametrize("name, expected", [
    ("Ada Lovelace", ("Ada", "Lovelace")),
    ("Ludwig van Beethoven", ("Ludwig", "van Beethoven")),
    ("Martin Luther King Jr.", ("Martin Luther", "King Jr.")),
    ("Lovelace, Ada", ("Ada", "Lovelace")),
    ("Plato", ("", "Plato")),
    ("", ("", "")),
])
def test_split_name(name, expected):
    assert split_name(name) == expected


def test_initials():
    assert initials("Jean-Paul Anne") == "J.-P. A."
    assert initials("Ada", "") == "A."


@pytest.mark.parametrize("style, expected", [
    ("apa", "LeCun, Y., Bengio, Y., & Hinton, G. (2015). Deep learning. Nature, 521(7553), 436–444. "
            "https://doi.org/10.1038/nature14539"),
    ("mla", "LeCun, Yann, et al. “Deep learning.” Nature, vol. 521, no. 7553, 2015, pp. 436–444. "
            "https://doi.org/10.1038/nature14539."),
    ("chicago", "LeCun, Yann, Yoshua Bengio, and Geoffrey Hinton. 2015. “Deep learning.” "
                "Nature 521 (7553): 436–444. https://doi.org/10.1038/nature14539."),
    ("harvard", "LeCun, Y., Bengio, Y. and Hinton, G. (2015) ‘Deep learning’, Nature, 521(7553), "
                "pp. 436–444. Available at: https://doi.org/10.1038/nature14539."),
    ("ieee", "Y. LeCun, Y. Bengio, and G. Hinton, “Deep learning,” Nature, vol. 521, no. 7553, "
             "pp. 436–444, 2015, doi: 10.1038/nature14539."),
])
def test_local_formatters(style, expected, no_doi_lookup):
    text, source = format_citation(PUB, style)
    assert source == "local"
    assert text == expected


def test_remote_citation_is_preferred_and_cleaned(monkeypatch, db):
    response = MagicMock(status_code=200, headers={"content-type": "text/x-bibliography"},
                         text="[1]Y. LeCun, “Deep learning,” Nature, edited by , vol. 521, 2015.")
    get = MagicMock(return_value=response)
    monkeypatch.setattr(bibliography.requests, "get", get)
    text, source = format_citation(PUB, "ieee")
    assert source == "doi"
    assert text == "Y. LeCun, “Deep learning,” Nature, vol. 521, 2015."
    assert "style=ieee" in get.call_args.kwargs["headers"]["Accept"]
    format_citation(PUB, "ieee")
    assert get.call_count == 1  # cached


def test_remote_failure_falls_back_to_local(monkeypatch, db):
    monkeypatch.setattr(bibliography.requests, "get", MagicMock(return_value=MagicMock(
        status_code=406, headers={"content-type": "application/json"}, text="{}")))
    text, source = format_citation(PUB, "apa")
    assert source == "local"
    assert text.startswith("LeCun, Y.")


def test_bibtex_entry_escapes_and_maps_fields():
    pub = {**PUB, "title": "Costs & 100% of $x_1 {braces}", "type": "conference-paper"}
    entry = bibtex_entry(pub, bibtex_key(pub))
    assert entry.startswith("@inproceedings{lecun2015costs,")
    assert r"title = {Costs \& 100\% of \$x\_1 \{braces\}}" in entry
    assert "booktitle = {Nature}" in entry
    assert "pages = {436--444}" in entry
    assert "doi = {10.1038/nature14539}" in entry
    assert bibtex_escape("a\\b") == r"a\textbackslash{}b"


def test_bibtex_key_is_ascii():
    assert bibtex_key({"authors": ["Žydrūnas Šalčius"], "year": 2020, "title": "The Ąžuolas study"}) == "salcius2020azuolas"
    assert bibtex_key({"authors": [], "title": ""}) == "anon"


def test_ris_entry():
    entry = ris_entry(PUB)
    lines = entry.split("\r\n")
    assert lines[0] == "TY  - JOUR"
    assert "AU  - LeCun, Yann" in lines
    assert "DO  - 10.1038/nature14539" in lines
    assert "SP  - 436" in lines and "EP  - 444" in lines
    assert "DA  - 2015/05/27" in lines
    assert lines[-1] == "ER  - "


def test_identifier_parsing():
    assert parse_openalex_id("https://openalex.org/w123") == "W123"
    assert parse_openalex_id("https://api.openalex.org/works/W5") == "W5"
    assert parse_openalex_id("A1", "W") is None
    assert parse_openalex_id("W1; DROP") is None
    assert normalize_work_id("W7") == "https://openalex.org/W7"
    assert parse_doi("https://doi.org/10.1000/ABC") == "10.1000/abc"
    assert parse_doi("doi: 10.1000/xyz") == "10.1000/xyz"
    assert parse_doi("10.1000") is None
