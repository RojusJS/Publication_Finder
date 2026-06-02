from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions
from rest_framework.response import Response
from sklearn.metrics.pairwise import cosine_similarity
from collections import Counter
from datetime import datetime
import math
import re

from apps.projects.models import Project, SavedPublication, Folder, RecommendationFeedback
from apps.projects.services.embedding_service import get_model
from apps.search.integrations.openalex_client import OpenAlexClient


class ProjectRecommendationsView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, project_id):
        project = get_object_or_404(Project, id=project_id, user=request.user)
        folder_id = request.data.get("folder_id")

        if folder_id:
            folder = get_object_or_404(Folder, id=folder_id, project=project)
            saved_publications = list(SavedPublication.objects.filter(project=project, folder=folder))
        else:
            saved_publications = list(SavedPublication.objects.filter(project=project))

        if not saved_publications:
            return Response({"recommendations": []})

        negatively_rated_ids = set(
            RecommendationFeedback.objects.filter(
                user=request.user,
                project=project,
                feedback=RecommendationFeedback.Feedback.NEGATIVE,
            ).values_list("openalex_id", flat=True)
        )
        positive_feedback = RecommendationFeedback.objects.filter(
            user=request.user,
            project=project,
            feedback=RecommendationFeedback.Feedback.POSITIVE,
        )
        saved_ids = {pub.openalex_id for pub in saved_publications if pub.openalex_id}
        saved_dois = {pub.doi.lower().strip() for pub in saved_publications if pub.doi}
        saved_titles = {self.normalize_title(pub.title) for pub in saved_publications if pub.title}
        current_year = datetime.now().year

        def publication_text(pub):
            return " ".join(filter(None, [pub.title, pub.abstract, " ".join(pub.keywords or [])]))

        saved_texts = []
        for pub in saved_publications:
            text = publication_text(pub)
            if not text.strip():
                continue
            year = pub.year or current_year
            age = max(0, current_year - year)
            weight = 1 + max(0, 3 - age)
            saved_texts.extend([text] * weight)

        for fb in positive_feedback:
            if fb.title and fb.title.strip():
                saved_texts.extend([fb.title] * 2)

        if not saved_texts:
            return Response({"recommendations": []})

        profile_text = " ".join(saved_texts)
        queries = [pub.title for pub in saved_publications[:5] if pub.title]
        queries = [re.sub(r"\s+", " ", q).strip() for q in queries if q.strip()][:6]
        top_authors = [
            name for name, _ in Counter(
                author for pub in saved_publications for author in (pub.authors or [])
            ).most_common(2)
        ]

        client = OpenAlexClient()
        primary_results = []
        for q in queries:
            data = client.search_publications(query=q, per_page=15)
            primary_results.extend(data.get("results", []))

        author_data = {"results": []}
        if top_authors:
            author_data = client.search_publications(query=" ".join(top_authors), per_page=25)

        seen_ids = set(saved_ids)
        candidates = []

        for pub in primary_results + author_data.get("results", []):
            openalex_id = pub.get("id")
            candidate_doi = (pub.get("doi") or "").lower().strip()
            candidate_title = self.normalize_title(pub.get("title"))

            if not openalex_id or openalex_id in seen_ids:
                continue
            if openalex_id in negatively_rated_ids:
                continue
            if candidate_doi and candidate_doi in saved_dois:
                continue
            if candidate_title and candidate_title in saved_titles:
                continue

            seen_ids.add(openalex_id)
            primary_location = pub.get("primary_location") or {}
            open_access = pub.get("open_access") or {}
            authorships = pub.get("authorships") or []
            authors = [
                item["author"]["display_name"]
                for item in authorships
                if item.get("author") and item["author"].get("display_name")
            ]
            abstract = self.reconstruct_abstract(pub.get("abstract_inverted_index"))
            keywords = [
                kw.get("display_name")
                for kw in (pub.get("keywords") or [])
                if kw.get("display_name")
            ]
            candidate_text = " ".join(filter(None, [pub.get("title") or "", abstract, " ".join(keywords)]))
            if not candidate_text.strip():
                continue

            candidates.append({
                "openalex_id": openalex_id,
                "title": pub.get("title") or "",
                "year": pub.get("publication_year"),
                "doi": pub.get("doi"),
                "pdf_url": primary_location.get("pdf_url"),
                "landing_page_url": primary_location.get("landing_page_url") or open_access.get("oa_url"),
                "authors": authors,
                "abstract": abstract,
                "keywords": keywords,
                "citation_count": pub.get("cited_by_count") or 0,
                "venue": (primary_location.get("source") or {}).get("display_name"),
                "is_oa": open_access.get("is_oa"),
                "pub_type": pub.get("type"),
                "_text": candidate_text,
            })

        if not candidates:
            return Response({"recommendations": []})

        model = get_model()
        profile_vector = model.encode([profile_text], normalize_embeddings=True)
        candidate_vectors = model.encode([c["_text"] for c in candidates], normalize_embeddings=True)
        similarity_scores = cosine_similarity(profile_vector, candidate_vectors)[0]
        max_citations = max((c["citation_count"] for c in candidates), default=1)
        def combined_score(similarity, citation_count, year):
            citation_score = math.log1p(citation_count) / math.log1p(max_citations)
            return 0.90 * similarity + 0.10 * citation_score

        for i, candidate in enumerate(candidates):
            candidate["_score"] = combined_score(similarity_scores[i], candidate["citation_count"], candidate["year"])
            candidate["similarity"] = round(float(similarity_scores[i]) * 100)

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
            pub.pop("_text", None)
            pub.pop("citation_count", None)
            top.append(pub)
            if len(top) == 10:
                break

        return Response({"recommendations": top})

    def reconstruct_abstract(self, inverted_index):
        if not inverted_index:
            return ""
        words = []
        for word, positions in inverted_index.items():
            for position in positions:
                words.append((position, word))
        words.sort(key=lambda item: item[0])
        return " ".join(word for _, word in words)

    def normalize_title(self, title):
        title = (title or "").lower()
        title = re.sub(r"[^a-z0-9\s]", "", title)
        return re.sub(r"\s+", " ", title).strip()