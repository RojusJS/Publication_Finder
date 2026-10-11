from datetime import date

from rest_framework import serializers

from apps.core.identifiers import parse_openalex_id
from apps.search.services.bibliography import ALL_STYLES
from apps.search.services.search_service import (
    PER_PAGE_CHOICES,
    SEARCH_MODES,
    SORT_OPTIONS,
    WORK_TYPES,
    max_page,
)

_TRI_STATE = {"true": True, "1": True, "yes": True, "false": False, "0": False, "no": False}


class OpenAlexIdField(serializers.CharField):
    """Accepts ``W123`` or ``https://openalex.org/W123`` and returns ``W123``."""

    def __init__(self, kind="W", **kwargs):
        self.kind = kind
        kwargs.setdefault("max_length", 100)
        super().__init__(**kwargs)

    def to_internal_value(self, data):
        value = super().to_internal_value(data)
        if value == "" and self.allow_blank:
            return ""
        short_id = parse_openalex_id(value, self.kind)
        if not short_id:
            raise serializers.ValidationError("Invalid OpenAlex identifier.")
        return short_id


class PublicationSearchQuerySerializer(serializers.Serializer):
    q = serializers.CharField(required=False, allow_blank=True, max_length=300, default="")
    search_by = serializers.ChoiceField(choices=SEARCH_MODES, default="all")
    author = serializers.CharField(required=False, allow_blank=True, max_length=200, default="")
    year_from = serializers.IntegerField(required=False, min_value=1000)
    year_to = serializers.IntegerField(required=False, min_value=1000)
    oa = serializers.CharField(required=False, allow_blank=True, default="")
    type = serializers.ChoiceField(choices=WORK_TYPES, required=False, allow_blank=True)
    language = serializers.RegexField(r"^[A-Za-z]{2}$", required=False, allow_blank=True)
    institution = OpenAlexIdField(kind="I", required=False, allow_blank=True)
    sort = serializers.ChoiceField(choices=list(SORT_OPTIONS), default="relevance")
    page = serializers.IntegerField(min_value=1, default=1)
    per_page = serializers.ChoiceField(choices=PER_PAGE_CHOICES, default=10)

    def validate_oa(self, value):
        value = (value or "").strip().lower()
        if value == "":
            return None
        if value not in _TRI_STATE:
            raise serializers.ValidationError("Must be true or false.")
        return _TRI_STATE[value]

    def validate(self, attrs):
        current_year = date.today().year
        for name in ("year_from", "year_to"):
            if attrs.get(name) is not None and attrs[name] > current_year:
                raise serializers.ValidationError({name: f"Must not be later than {current_year}."})
        if attrs.get("year_from") and attrs.get("year_to") and attrs["year_from"] > attrs["year_to"]:
            raise serializers.ValidationError({"year_from": "Must not be later than the end year."})

        attrs["per_page"] = int(attrs["per_page"])
        if attrs["page"] > max_page(attrs["per_page"]):
            raise serializers.ValidationError({"page": "Page is beyond the last available result."})

        query = attrs["q"].strip()
        author = attrs.get("author", "").strip()
        institution = attrs.get("institution") or None
        attrs["institution"] = institution
        attrs["language"] = (attrs.get("language") or "").lower() or None
        attrs["type"] = attrs.get("type") or None
        if attrs["search_by"] == "title_and_author":
            if not (query or author):
                raise serializers.ValidationError({"q": "Enter a title or an author."})
        elif not (query or institution):
            raise serializers.ValidationError({"q": "Enter a search query."})
        attrs["q"] = query
        attrs["author"] = author
        return attrs


class PublicationIdQuerySerializer(serializers.Serializer):
    id = OpenAlexIdField(kind="W")


class CitationNetworkQuerySerializer(PublicationIdQuerySerializer):
    references = serializers.IntegerField(min_value=0, max_value=40, default=25)
    citing = serializers.IntegerField(min_value=0, max_value=40, default=25)


class CitationQuerySerializer(PublicationIdQuerySerializer):
    style = serializers.ChoiceField(choices=ALL_STYLES, default="apa")


class AuthorSearchQuerySerializer(serializers.Serializer):
    q = serializers.CharField(max_length=200)
    page = serializers.IntegerField(min_value=1, max_value=max_page(10), default=1)


class AuthorIdQuerySerializer(serializers.Serializer):
    id = OpenAlexIdField(kind="A")


class AuthorWorksQuerySerializer(AuthorIdQuerySerializer):
    page = serializers.IntegerField(min_value=1, max_value=max_page(10), default=1)
    sort = serializers.ChoiceField(choices=["cited_by_count_desc", "year_desc"], default="cited_by_count_desc")


class InstitutionAutocompleteQuerySerializer(serializers.Serializer):
    q = serializers.CharField(min_length=2, max_length=100)
