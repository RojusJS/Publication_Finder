"""Thin, cached and resilient HTTP client for the OpenAlex API.

* One shared ``requests.Session`` with connection pooling and automatic
  retries (with back-off) on 429/5xx responses.
* Responses are cached in the Django cache; the API key is never part of the
  cache key and never logged.
* Errors are raised as ``OpenAlexError`` / ``OpenAlexNotFound`` and must be
  translated into API errors by the caller. Raw exception text is never sent
  to clients because it can contain the request URL (and the API key).
"""
import hashlib
import json
import logging
import re
import threading
from urllib.parse import quote

import requests
from django.conf import settings
from django.core.cache import cache
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

logger = logging.getLogger(__name__)

MAX_IDS_PER_REQUEST = 100  # OpenAlex limit for OR-filters
MAX_PER_PAGE = 200

TTL_SEARCH = 60 * 10
TTL_ENTITY = 60 * 60 * 24
TTL_CITATIONS = 60 * 60 * 6
TTL_AUTOCOMPLETE = 60 * 60

WORK_LIST_FIELDS = ",".join([
    "id",
    "display_name",
    "publication_year",
    "publication_date",
    "doi",
    "open_access",
    "type",
    "primary_location",
    "best_oa_location",
    "authorships",
    "cited_by_count",
    "language",
    "keywords",
    "abstract_inverted_index",
    "is_retracted",
    "biblio",
    "referenced_works_count",
])

WORK_GRAPH_FIELDS = ",".join([
    "id",
    "display_name",
    "publication_year",
    "cited_by_count",
    "referenced_works",
    "authorships",
    "doi",
    "type",
])

_FILTER_UNSAFE = re.compile(r"[,|!<>:]")
_WHITESPACE = re.compile(r"\s+")


class OpenAlexError(Exception):
    def __init__(self, message="OpenAlex request failed", status_code=None):
        super().__init__(message)
        self.status_code = status_code


class OpenAlexNotFound(OpenAlexError):
    pass


def sanitize_filter_value(value):
    """Make free text safe to embed in an OpenAlex ``filter`` expression.

    The filter syntax uses ``,`` between filters, ``|`` for OR, ``!`` for
    negation, ``<``/``>`` for ranges and ``:`` between key and value. Leaving
    them in user input would let a query inject additional filters.
    """
    cleaned = _FILTER_UNSAFE.sub(" ", value or "")
    return _WHITESPACE.sub(" ", cleaned).strip()


_session = None
_session_lock = threading.Lock()


def _get_session():
    global _session
    if _session is None:
        with _session_lock:
            if _session is None:
                session = requests.Session()
                retry = Retry(
                    total=3,
                    connect=3,
                    read=2,
                    status=3,
                    backoff_factor=0.6,
                    status_forcelist=(429, 500, 502, 503, 504),
                    allowed_methods=frozenset({"GET"}),
                    respect_retry_after_header=True,
                    raise_on_status=False,
                )
                adapter = HTTPAdapter(max_retries=retry, pool_connections=10, pool_maxsize=20)
                session.mount("https://", adapter)
                session.mount("http://", adapter)
                mailto = settings.OPENALEX.get("MAILTO")
                agent = "PublicationFinder/2.0"
                session.headers["User-Agent"] = f"{agent} (mailto:{mailto})" if mailto else agent
                session.headers["Accept"] = "application/json"
                _session = session
    return _session


def _chunks(items, size):
    for index in range(0, len(items), size):
        yield items[index:index + size]


class OpenAlexClient:
    def __init__(self):
        config = settings.OPENALEX
        self.base_url = config["BASE_URL"]
        self.api_key = config.get("API_KEY") or ""
        self.mailto = config.get("MAILTO") or ""
        self.timeout = config.get("TIMEOUT", 15)

    # -- low level ---------------------------------------------------------

    def get(self, path, params=None, cache_ttl=TTL_SEARCH):
        params = {key: value for key, value in (params or {}).items() if value not in (None, "")}
        cache_key = None
        if cache_ttl:
            fingerprint = json.dumps([path, params], sort_keys=True, default=str)
            cache_key = "openalex:" + hashlib.sha256(fingerprint.encode("utf-8")).hexdigest()
            cached = cache.get(cache_key)
            if cached is not None:
                return cached

        request_params = dict(params)
        if self.api_key:
            request_params["api_key"] = self.api_key
        if self.mailto:
            request_params["mailto"] = self.mailto

        data = self._request(path, request_params)
        if cache_key:
            cache.set(cache_key, data, cache_ttl)
        return data

    def _request(self, path, params):
        url = f"{self.base_url}{path}"
        try:
            response = _get_session().get(url, params=params, timeout=self.timeout)
        except requests.RequestException as exc:
            # Do not log ``exc`` itself: its message contains the full URL.
            logger.warning("OpenAlex request to %s failed (%s)", path, exc.__class__.__name__)
            raise OpenAlexError("OpenAlex is unreachable") from None

        if response.status_code == 404:
            raise OpenAlexNotFound("Not found in OpenAlex", 404)
        if response.status_code >= 400:
            logger.warning("OpenAlex %s returned HTTP %s: %s", path, response.status_code, response.text[:300])
            raise OpenAlexError("OpenAlex returned an error", response.status_code)
        try:
            return response.json()
        except ValueError:
            logger.warning("OpenAlex %s returned invalid JSON", path)
            raise OpenAlexError("OpenAlex returned invalid data") from None

    # -- works -------------------------------------------------------------

    def list_works(self, *, search=None, filters=None, sort=None, page=1, per_page=10,
                   select=WORK_LIST_FIELDS, cache_ttl=TTL_SEARCH):
        params = {
            "search": search,
            "filter": ",".join(filters) if filters else None,
            "sort": sort,
            "page": page,
            "per-page": min(per_page, MAX_PER_PAGE),
            "select": select,
        }
        return self.get("/works", params, cache_ttl=cache_ttl)

    def get_work(self, short_id, select=WORK_LIST_FIELDS):
        return self.get(f"/works/{short_id}", {"select": select}, cache_ttl=TTL_ENTITY)

    def get_work_by_doi(self, doi, select=WORK_LIST_FIELDS):
        return self.get(f"/works/doi:{quote(doi, safe='/')}", {"select": select}, cache_ttl=TTL_ENTITY)

    def get_works_by_ids(self, short_ids, select=WORK_LIST_FIELDS):
        """Fetch many works at once. Returns ``{short_id: work}``; unknown ids are omitted."""
        unique_ids = list(dict.fromkeys(short_ids))
        found = {}
        for chunk in _chunks(unique_ids, MAX_IDS_PER_REQUEST):
            data = self.list_works(
                filters=[f"openalex_id:{'|'.join(chunk)}"],
                per_page=len(chunk),
                select=select,
                cache_ttl=TTL_ENTITY,
            )
            for work in data.get("results") or []:
                work_id = (work.get("id") or "").rsplit("/", 1)[-1].upper()
                if work_id:
                    found[work_id] = work
        return found

    # -- authors & institutions -------------------------------------------

    def search_authors(self, query, page=1, per_page=10):
        return self.get("/authors", {"search": query, "page": page, "per-page": per_page}, cache_ttl=TTL_SEARCH)

    def get_author(self, short_id):
        return self.get(f"/authors/{short_id}", cache_ttl=TTL_ENTITY)

    def autocomplete_institutions(self, query):
        return self.get("/autocomplete/institutions", {"q": query}, cache_ttl=TTL_AUTOCOMPLETE)
