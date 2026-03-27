from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions
from rest_framework.response import Response
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from collections import Counter

from apps.projects.models import Project, SavedPublication
from apps.search.integrations.openalex_client import OpenAlexClient

model = SentenceTransformer("all-MiniLM-L6-v2")

class ProjectRecommendationsView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, project_id):
        project = get_object_or_404(Project, id=project_id, user=request.user)
        saved_publications = SavedPublication.objects.filter(folder__project=project)
        if not saved_publications:
            return Response({"recommendations": []})

        # rest is unchanged
        saved_ids = set(pub.openalex_id for pub in saved_publications)
        titles = [pub.title for pub in saved_publications if pub.title]
        profile_text = " ".join(titles)
        client = OpenAlexClient()
        words = profile_text.lower().split()
        stopwords = {"the", "a", "an", "of", "in", "and", "or", "for", "to", "on", "with", "is", "are", "was", "were"}
        filtered = [w for w in words if w not in stopwords and len(w) > 3]
        top_keywords = [kw for kw, _ in Counter(filtered).most_common(5)]
        query = " ".join(top_keywords)

        data = client.search_publications(query=query, per_page=50)
        candidates = []
        for pub in data.get("results", []):
            if pub.get("id") in saved_ids:
                continue
            primary_location = pub.get("primary_location") or {}
            open_access = pub.get("open_access") or {}
            authorships = pub.get("authorships") or []
            authors = [
                a["author"]["display_name"]
                for a in authorships
                if a.get("author") and a["author"].get("display_name")
            ]
            candidates.append({
                "openalex_id": pub.get("id"),
                "title": pub.get("title") or "",
                "year": pub.get("publication_year"),
                "doi": pub.get("doi"),
                "pdf_url": primary_location.get("pdf_url"),
                "landing_page_url": primary_location.get("landing_page_url") or open_access.get("oa_url"),
                "authors": authors,
            })

        if not candidates:
            return Response({"recommendations": []})

        profile_vector = model.encode([profile_text])
        candidate_texts = [c["title"] for c in candidates]
        candidate_vectors = model.encode(candidate_texts)
        scores = cosine_similarity(profile_vector, candidate_vectors)[0]
        ranked = sorted(zip(scores, candidates), key=lambda x: x[0], reverse=True)
        top = [pub for _, pub in ranked[:10]]

        return Response({"recommendations": top})