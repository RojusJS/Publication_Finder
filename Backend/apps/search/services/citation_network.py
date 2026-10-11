"""Citation network around a single publication.

The network contains the publication itself, its most cited references and the
most cited works that cite it. Besides the obvious edges to/from the centre it
also includes the citation links *between* the surrounding works, which is what
reveals clusters and the key papers of a topic.
"""
from django.core.cache import cache

from apps.core.identifiers import parse_openalex_id
from apps.search.integrations.openalex_client import TTL_CITATIONS, WORK_GRAPH_FIELDS
from apps.search.services.mapping import map_graph_node
from apps.search.services.search_service import SearchService

MAX_REFERENCES_SCANNED = 200
DEFAULT_LIMIT = 25
MAX_LIMIT = 40


def _short(work_id):
    return parse_openalex_id(work_id or "", "W")


def build_citation_network(short_id, references_limit=DEFAULT_LIMIT, citing_limit=DEFAULT_LIMIT, service=None):
    references_limit = max(0, min(references_limit, MAX_LIMIT))
    citing_limit = max(0, min(citing_limit, MAX_LIMIT))
    cache_key = f"citation-network:v1:{short_id}:{references_limit}:{citing_limit}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    service = service or SearchService()
    client = service.client
    center = client.get_work(short_id, select=WORK_GRAPH_FIELDS)

    reference_ids = [ref for ref in (_short(item) for item in center.get("referenced_works") or []) if ref]
    references_total = len(reference_ids)
    references = []
    if references_limit and reference_ids:
        fetched = client.get_works_by_ids(reference_ids[:MAX_REFERENCES_SCANNED], select=WORK_GRAPH_FIELDS)
        references = sorted(fetched.values(), key=lambda work: work.get("cited_by_count") or 0, reverse=True)
        references = references[:references_limit]

    citing, citing_total = [], 0
    if citing_limit:
        citing, citing_total = service.citing_works(short_id, citing_limit, WORK_GRAPH_FIELDS)

    nodes = {}
    raw_by_id = {}

    def add(work, role):
        node_id = _short(work.get("id"))
        if not node_id or node_id in nodes:
            return
        nodes[node_id] = map_graph_node(work, role)
        raw_by_id[node_id] = work

    add(center, "center")
    for work in references:
        add(work, "reference")
    for work in citing:
        add(work, "citing")

    edges = set()
    for node_id, node in nodes.items():
        if node["role"] == "reference":
            edges.add((short_id, node_id))
        elif node["role"] == "citing":
            edges.add((node_id, short_id))
    for node_id, work in raw_by_id.items():
        if node_id == short_id:
            continue
        for referenced in work.get("referenced_works") or []:
            target = _short(referenced)
            if target and target != node_id and target in nodes:
                edges.add((node_id, target))

    result = {
        "center": nodes[short_id]["id"] if short_id in nodes else None,
        "nodes": list(nodes.values()),
        "edges": [
            {"source": nodes[source]["id"], "target": nodes[target]["id"]}
            for source, target in sorted(edges)
        ],
        "counts": {
            "references_total": references_total,
            "references_shown": len(references),
            "citing_total": citing_total,
            "citing_shown": len(citing),
        },
    }
    cache.set(cache_key, result, TTL_CITATIONS)
    return result
