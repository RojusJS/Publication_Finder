from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions
from rest_framework.response import Response
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from collections import Counter
from datetime import datetime
import math
import re
import nltk
from nltk.corpus import stopwords
nltk.download("stopwords", quiet=True)

from apps.projects.models import Project, SavedPublication
from apps.search.integrations.openalex_client import OpenAlexClient

model = SentenceTransformer("all-MiniLM-L6-v2")
class ProjectRecommendationsView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    def post(self, request, project_id):
        project = get_object_or_404(Project, id=project_id, user=request.user)
        saved_publications = list(SavedPublication.objects.filter(folder__project=project))
        if not saved_publications:
            return Response({"recommendations": []})

        saved_ids = set(pub.openalex_id for pub in saved_publications)
        current_year = datetime.now().year
        weighted_texts = []
        for pub in saved_publications:
            text = " ".join(filter(None, [pub.title, getattr(pub, "abstract", None)]))
            year = getattr(pub, "year", None) or current_year
            weight = max(1, 3 - (current_year - year))
            weighted_texts.extend([text] * weight)
        profile_text = " ".join(filter(None, [project.description, " ".join(weighted_texts)]))
        stop_words = set(stopwords.words("english"))
        full_text = " ".join(
            part
            for pub in saved_publications
            for part in [pub.title, getattr(pub, "abstract", None)]
            if part
        )
        words = re.findall(r'\b[a-z]{4,}\b', full_text.lower())
        filtered_words = [w for w in words if w not in stop_words]
        bigrams = [f"{filtered_words[i]} {filtered_words[i+1]}" for i in range(len(filtered_words) - 1)]
        top_keywords = [kw for kw, _ in Counter(filtered_words + bigrams).most_common(5)]
        query = " ".join(top_keywords)

        top_authors = [
            name for name, _ in Counter(
                author
                for pub in saved_publications
                for author in (getattr(pub, "authors", None) or [])
            ).most_common(2)
        ]

        client = OpenAlexClient()
        primary_data = client.search_publications(query=query, per_page=50)
        author_data = {"results": []}
        if top_authors:
            author_query = " ".join(top_authors)
            author_data = client.search_publications(query=author_query, per_page=25)

        seen_ids = set(saved_ids)
        candidates = []
        for pub in primary_data.get("results", []) + author_data.get("results", []):
            openalex_id = pub.get("id")
            if not openalex_id or openalex_id in seen_ids:
                continue
            seen_ids.add(openalex_id)

            primary_location = pub.get("primary_location") or {}
            open_access = pub.get("open_access") or {}
            authorships = pub.get("authorships") or []
            authors = [
                a["author"]["display_name"]
                for a in authorships
                if a.get("author") and a["author"].get("display_name")
            ]
            candidates.append({
                "openalex_id": openalex_id,
                "title": pub.get("title") or "",
                "year": pub.get("publication_year"),
                "doi": pub.get("doi"),
                "pdf_url": primary_location.get("pdf_url"),
                "landing_page_url": primary_location.get("landing_page_url") or open_access.get("oa_url"),
                "authors": authors,
                "citation_count": pub.get("cited_by_count") or 0,
                "venue": (primary_location.get("source") or {}).get("display_name"),
            })

        if not candidates:
            return Response({"recommendations": []})

        profile_vector = model.encode([profile_text])
        candidate_vectors = model.encode([c["title"] for c in candidates])
        similarity_scores = cosine_similarity(profile_vector, candidate_vectors)[0]
        max_citations = max((c["citation_count"] for c in candidates), default=1)
        def combined_score(similarity, citation_count):
            citation_score = math.log1p(citation_count) / math.log1p(max_citations)
            return 0.8 * similarity + 0.2 * citation_score

        for i, candidate in enumerate(candidates):
            candidate["_score"] = combined_score(similarity_scores[i], candidate["citation_count"])

        ranked = sorted(candidates, key=lambda c: c["_score"], reverse=True)
        top = []
        seen_venues = Counter()
        for pub in ranked:
            venue = pub.get("venue")
            if venue and seen_venues[venue] >= 2:
                continue
            if venue:
                seen_venues[venue] += 1
            pub.pop("_score", None)
            pub.pop("citation_count", None)
            top.append(pub)
            if len(top) == 10:
                break

        return Response({"recommendations": top})