"""Hybrid, explainable publication recommendations for a project.

Candidate generation (all from OpenAlex, cached):
  * works OpenAlex marks as *related* to the saved publications,
  * works *cited by several* saved publications (co-citation),
  * the most cited works that *cite* the saved publications,
  * a topical search built from the library's most frequent keywords.

Ranking combines
  * content similarity to the library (sentence embeddings, TF-IDF fallback),
  * citation-graph signal (how strongly a candidate is connected to the library),
  * citation impact and recency (small weights),
followed by MMR re-ranking so the list is not filled with near-duplicates.
Every recommendation carries machine-readable ``reasons`` the UI explains.
"""
import hashlib
import logging
import math
import re
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, date, datetime

import numpy as np
from django.conf import settings
from django.core.cache import cache

from apps.core.exceptions import UpstreamError
from apps.core.identifiers import parse_doi, parse_openalex_id
from apps.projects.models import RecommendationFeedback
from apps.projects.services.embedding_service import build_text
from apps.projects.services.publications import publications_in_scope
from apps.projects.services.similarity import pairwise
from apps.search.integrations.openalex_client import WORK_LIST_FIELDS, OpenAlexClient, OpenAlexError
from apps.search.services.mapping import clean_text, map_work

logger = logging.getLogger(__name__)

CACHE_VERSION = 2
CACHE_TTL = 60 * 30
MAX_GRAPH_SEEDS = 15
MAX_CITING_SEEDS = 25
MAX_CANDIDATE_IDS = 150
MAX_LIBRARY_SEEDS = 200
CANDIDATE_FIELDS = WORK_LIST_FIELDS + ",referenced_works"
SEED_FIELDS = "id,related_works,referenced_works"
WEIGHTS = {"content": 0.60, "graph": 0.25, "impact": 0.10, "recency": 0.05}
MMR_LAMBDA = 0.8
MAX_PER_VENUE = 3
EXCLUDED_TYPES = {
    "paratext", "erratum", "retraction", "peer-review", "libguides",
    "supplementary-materials", "reference-entry", "grant",
}
_NON_WORD = re.compile(r"[\W_]+", re.UNICODE)


def normalize_title(title):
    return _NON_WORD.sub(" ", (title or "").lower()).strip()


def _short(value):
    return parse_openalex_id(value or "", "W")


def _top_keywords(seeds, limit=3):
    counter = Counter()
    for seed in seeds:
        counter.update({k.lower() for k in seed.keywords or [] if isinstance(k, str) and k.strip()})
    return [keyword for keyword, _ in counter.most_common(limit)]


def _cache_key(project, folder, seed_ids, feedback, limit):
    payload = "|".join([
        str(CACHE_VERSION), str(project.pk), str(folder.pk if folder else ""), str(limit),
        ",".join(sorted(seed_ids)),
        ",".join(f"{key}:{value}" for key, value in sorted(feedback.items())),
    ])
    return "recommendations:" + hashlib.sha256(payload.encode("utf-8")).hexdigest()


def recommend(project, user, folder=None, limit=10):
    seeds = list(publications_in_scope(project, folder).order_by("-saved_at", "-id")[:MAX_LIBRARY_SEEDS])
    if not seeds:
        return {"recommendations": [], "seed_count": 0, "method": None}

    feedback = dict(
        RecommendationFeedback.objects.filter(user=user, project=project).values_list("openalex_id", "feedback")
    )
    seed_short_ids = [short for short in (_short(seed.openalex_id) for seed in seeds) if short]
    cache_key = _cache_key(project, folder, seed_short_ids, feedback, limit)
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    result = _compute(project, seeds, seed_short_ids, feedback, limit)
    cache.set(cache_key, result, CACHE_TTL)
    return result


def _compute(project, seeds, seed_short_ids, feedback, limit):
    client = OpenAlexClient()
    library = list(project.publications.values_list("openalex_id", "doi", "title"))
    excluded_ids = {_short(openalex_id) for openalex_id, _, _ in library} | {_short(key) for key in feedback}
    excluded_ids.discard(None)
    excluded_dois = {parse_doi(doi) for _, doi, _ in library if doi}
    excluded_titles = {normalize_title(title) for _, _, title in library if title}
    positive_ids = [_short(key) for key, value in feedback.items() if value == RecommendationFeedback.Feedback.POSITIVE]
    seed_set = set(seed_short_ids)

    # 1) Expand the citation graph around the most recent seeds (+ liked recommendations).
    graph_seed_ids = list(dict.fromkeys(seed_short_ids[:MAX_GRAPH_SEEDS] + [p for p in positive_ids[:5] if p]))
    seed_lookup_failed = False
    try:
        seed_works = client.get_works_by_ids(graph_seed_ids, select=SEED_FIELDS)
    except OpenAlexError:
        seed_works = {}
        seed_lookup_failed = True
        logger.warning("Recommendations: could not load seed works")

    related, co_cited = Counter(), Counter()
    for work in seed_works.values():
        related.update({_short(item) for item in work.get("related_works") or []} - {None})
        co_cited.update({_short(item) for item in work.get("referenced_works") or []} - {None})
    if len(seed_works) > 1:
        co_cited = Counter({key: count for key, count in co_cited.items() if count >= 2})
    else:
        co_cited = Counter(dict(co_cited.most_common(30)))

    pool = related + co_cited
    candidate_ids = [
        key for key, _ in pool.most_common()
        if key not in excluded_ids and key not in seed_set
    ][:MAX_CANDIDATE_IDS]

    # 2) Fetch candidate metadata, citing works and a topical search in parallel.
    keywords = _top_keywords(seeds)
    topic_query = " ".join(keywords) if keywords else clean_text(seeds[0].title)[:200]
    today = date.today().isoformat()
    tasks = {
        "citing": lambda: client.list_works(
            filters=[f"cites:{'|'.join(seed_short_ids[:MAX_CITING_SEEDS])}", f"to_publication_date:{today}"],
            sort="cited_by_count:desc", per_page=50, select=CANDIDATE_FIELDS,
        ).get("results") or [],
    }
    if candidate_ids:
        tasks["metadata"] = lambda: client.get_works_by_ids(candidate_ids, select=CANDIDATE_FIELDS)
    if topic_query:
        tasks["topic"] = lambda: client.list_works(
            search=topic_query, filters=[f"to_publication_date:{today}"], per_page=25, select=CANDIDATE_FIELDS,
        ).get("results") or []
    outcomes = {}
    with ThreadPoolExecutor(max_workers=max(1, min(3, settings.OPENALEX.get("MAX_WORKERS", 3)))) as executor:
        futures = {name: executor.submit(task) for name, task in tasks.items()}
        for name, future in futures.items():
            try:
                outcomes[name] = future.result()
            except OpenAlexError:
                logger.warning("Recommendations: %s lookup failed", name)
                outcomes[name] = None
    if seed_lookup_failed and all(value is None for value in outcomes.values()):
        raise UpstreamError(
            "Recommendations are temporarily unavailable because OpenAlex is not responding.",
            code="openalex_unavailable",
        )

    candidates, sources = {}, {}
    for work in (outcomes.get("metadata") or {}).values():
        _add_candidate(candidates, sources, work, "graph")
    for work in outcomes.get("citing") or []:
        _add_candidate(candidates, sources, work, "citing")
    for work in outcomes.get("topic") or []:
        _add_candidate(candidates, sources, work, "topic")

    current_year = date.today().year
    filtered = []
    for key, work in candidates.items():
        if key in excluded_ids or key in seed_set:
            continue
        if work.get("is_retracted") or (work.get("type") in EXCLUDED_TYPES):
            continue
        title = work.get("display_name") or work.get("title")
        if not title or normalize_title(title) in excluded_titles:
            continue
        doi = parse_doi(work.get("doi") or "")
        if doi and doi in excluded_dois:
            continue
        year = work.get("publication_year")
        if year and year > current_year:
            continue
        filtered.append((key, work))
    if not filtered:
        return _result([], seeds, None)

    # 3) Score.
    candidate_pubs = [map_work(work) for _, work in filtered]
    candidate_texts = [build_text(pub["title"], pub["abstract"], pub["keywords"]) for pub in candidate_pubs]
    seed_texts = [build_text(seed.title, seed.abstract, seed.keywords) for seed in seeds]
    seed_vectors = [seed.embedding for seed in seeds]
    sim_cs, sim_cc, method = pairwise(candidate_texts, seed_texts, seed_vectors)
    sim_cs = np.clip(sim_cs, 0.0, 1.0)

    best_seed = sim_cs.argmax(axis=1)
    best_sim = sim_cs.max(axis=1)
    top_k = min(3, sim_cs.shape[1])
    mean_top = np.sort(sim_cs, axis=1)[:, -top_k:].mean(axis=1)
    content = 0.5 * best_sim + 0.5 * mean_top
    if method == "tfidf" and content.max() > 0:
        content = content / content.max()  # TF-IDF cosines live on a much smaller scale

    citations = [pub["cited_by_count"] or 0 for pub in candidate_pubs]
    max_log_citations = math.log1p(max(citations)) or 1.0

    scored = []
    for index, (key, work) in enumerate(filtered):
        references = {_short(item) for item in work.get("referenced_works") or []}
        cites_saved = len(references & seed_set)
        graph_strength = related.get(key, 0) + co_cited.get(key, 0) + cites_saved
        graph = 1.0 - math.exp(-0.6 * graph_strength)
        impact = math.log1p(citations[index]) / max_log_citations
        year = candidate_pubs[index]["year"]
        age = current_year - year if year else None
        recency = 0.3 if age is None else (1.0 if age <= 2 else max(0.0, 1.0 - (age - 2) / 20))
        score = (
            WEIGHTS["content"] * float(content[index])
            + WEIGHTS["graph"] * graph
            + WEIGHTS["impact"] * impact
            + WEIGHTS["recency"] * recency
        )
        reasons = []
        if cites_saved:
            reasons.append({"code": "cites_saved", "count": cites_saved})
        if co_cited.get(key):
            reasons.append({"code": "cited_by_saved", "count": co_cited[key]})
        if related.get(key):
            reasons.append({"code": "related_to_saved", "count": related[key]})
        similar_threshold = 0.45 if method == "embeddings" else 0.12
        if best_sim[index] >= similar_threshold:
            reasons.append({
                "code": "similar_to",
                "title": seeds[int(best_seed[index])].title,
                "similarity": round(float(best_sim[index]) * 100),
            })
        if not reasons and "topic" in sources.get(key, set()) and keywords:
            reasons.append({"code": "topic_match", "keywords": keywords})
        scored.append({"index": index, "score": score, "reasons": reasons})

    # 4) Diversify with maximal marginal relevance; prefer a mix of venues, but
    #    fall back to over-represented venues rather than returning fewer items.
    selected, deferred = [], []
    venues = Counter()
    remaining = sorted(scored, key=lambda item: item["score"], reverse=True)
    while remaining and len(selected) < limit:
        best, best_value = None, -1e9
        for item in remaining:
            redundancy = max((float(sim_cc[item["index"], other["index"]]) for other in selected), default=0.0)
            value = MMR_LAMBDA * item["score"] - (1 - MMR_LAMBDA) * redundancy
            if value > best_value:
                best, best_value = item, value
        remaining.remove(best)
        venue = candidate_pubs[best["index"]]["source_name"]
        if venue and venues[venue] >= MAX_PER_VENUE:
            deferred.append(best)
            continue
        if venue:
            venues[venue] += 1
        selected.append(best)
    selected.extend(deferred[: max(0, limit - len(selected))])

    recommendations = []
    for item in selected:
        pub = dict(candidate_pubs[item["index"]])
        pub["score"] = round(min(1.0, item["score"]) * 100)
        pub["reasons"] = item["reasons"]
        recommendations.append(pub)
    return _result(recommendations, seeds, method)


def _add_candidate(candidates, sources, work, source):
    key = _short(work.get("id"))
    if not key:
        return
    if key not in candidates or (not candidates[key].get("abstract_inverted_index") and work.get("abstract_inverted_index")):
        candidates[key] = work
    sources.setdefault(key, set()).add(source)


def _result(recommendations, seeds, method):
    return {
        "recommendations": recommendations,
        "seed_count": len(seeds),
        "method": method,
        "generated_at": datetime.now(UTC).isoformat(),
    }
