from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.contrib.auth.models import User
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from collections import Counter
import numpy as np

from apps.projects.models import (
    Project, Folder, SavedPublication, PublicationNote,
    ProjectCollaborator, RecommendationFeedback, SearchHistory,
)
from apps.projects.api.serializers import (
    ProjectSerializer, FolderSerializer,
    SavedPublicationSerializer, PublicationNoteSerializer,
    ProjectCollaboratorSerializer, InviteCollaboratorSerializer,
    RecommendationFeedbackSerializer, SearchHistorySerializer,
)
from apps.projects.embedding_service import generate_embedding, encode_query


def get_accessible_project(user, project_id):
    try:
        return Project.objects.get(id=project_id, user=user)
    except Project.DoesNotExist:
        pass
    collab = get_object_or_404(
        ProjectCollaborator,
        project_id=project_id,
        user=user,
        status=ProjectCollaborator.Status.ACCEPTED,
    )
    return collab.project


def user_can_edit(user, project):
    if project.user == user:
        return True
    return ProjectCollaborator.objects.filter(
        project=project,
        user=user,
        status=ProjectCollaborator.Status.ACCEPTED,
        role=ProjectCollaborator.Role.EDITOR,
    ).exists()


class ProjectListCreateView(generics.ListCreateAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        owned = Project.objects.filter(user=self.request.user)
        collab_ids = ProjectCollaborator.objects.filter(
            user=self.request.user,
            status=ProjectCollaborator.Status.ACCEPTED,
        ).values_list("project_id", flat=True)
        shared = Project.objects.filter(id__in=collab_ids)
        return (owned | shared).distinct().order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "patch", "delete"]

    def get_object(self):
        return get_accessible_project(self.request.user, self.kwargs["project_id"])

    def perform_update(self, serializer):
        project = self.get_object()
        if project.user != self.request.user:
            self.permission_denied(self.request, message="Only the owner can edit this project.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.user != self.request.user:
            self.permission_denied(self.request, message="Only the owner can delete this project.")
        instance.delete()


class CollaboratorListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, project_id):
        project = get_accessible_project(request.user, project_id)
        owner_entry = {
            "id": None,
            "user": {"id": project.user.id, "username": project.user.username, "email": project.user.email},
            "invited_by": None,
            "role": "owner",
            "status": "accepted",
            "invited_at": None,
            "accepted_at": None,
        }
        collaborators = ProjectCollaborator.objects.filter(project=project).select_related("user", "invited_by")
        collab_data = ProjectCollaboratorSerializer(collaborators, many=True).data
        return Response([owner_entry] + list(collab_data))


class InviteCollaboratorView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, project_id):
        project = get_object_or_404(Project, id=project_id, user=request.user)
        serializer = InviteCollaboratorSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        username = serializer.validated_data["username"]
        role = serializer.validated_data["role"]
        invitee = get_object_or_404(User, username=username)

        if invitee == request.user:
            return Response({"error": "Negalite pakviesti savęs"}, status=status.HTTP_400_BAD_REQUEST)

        collab, created = ProjectCollaborator.objects.get_or_create(
            project=project,
            user=invitee,
            defaults={"invited_by": request.user, "role": role},
        )
        if not created:
            return Response({"error": "Vartotojas jau pakviestas"}, status=status.HTTP_400_BAD_REQUEST)

        return Response(ProjectCollaboratorSerializer(collab).data, status=status.HTTP_201_CREATED)


class RespondInvitationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, collab_id):
        collab = get_object_or_404(ProjectCollaborator, id=collab_id, user=request.user, status=ProjectCollaborator.Status.PENDING)
        action = request.data.get("action")
        if action == "accept":
            collab.status = ProjectCollaborator.Status.ACCEPTED
            collab.accepted_at = timezone.now()
            collab.save()
            return Response({"status": "accepted"})
        elif action == "decline":
            collab.status = ProjectCollaborator.Status.DECLINED
            collab.save()
            return Response({"status": "declined"})
        return Response({"error": "action must be accept or decline"}, status=status.HTTP_400_BAD_REQUEST)


class PendingInvitationsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        pending = ProjectCollaborator.objects.filter(
            user=request.user,
            status=ProjectCollaborator.Status.PENDING,
        ).select_related("project", "invited_by")
        data = [
            {
                "id": c.id,
                "project_id": c.project.id,
                "project_name": c.project.name,
                "invited_by": c.invited_by.username,
                "role": c.role,
                "invited_at": c.invited_at,
            }
            for c in pending
        ]
        return Response(data)


class RemoveCollaboratorView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, project_id, collab_id):
        project = get_object_or_404(Project, id=project_id, user=request.user)
        collab = get_object_or_404(ProjectCollaborator, id=collab_id, project=project)
        collab.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class FolderListCreateView(generics.ListCreateAPIView):
    serializer_class = FolderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_project(self):
        return get_accessible_project(self.request.user, self.kwargs["project_id"])

    def get_queryset(self):
        project = self.get_project()
        parent_id = self.request.query_params.get("parent")
        if parent_id is None or parent_id == "root":
            return Folder.objects.filter(project=project, parent__isnull=True).order_by("created_at")
        try:
            return Folder.objects.filter(project=project, parent_id=int(parent_id)).order_by("created_at")
        except (ValueError, TypeError):
            return Folder.objects.filter(project=project, parent__isnull=True).order_by("created_at")

    def perform_create(self, serializer):
        project = self.get_project()
        if not user_can_edit(self.request.user, project):
            self.permission_denied(self.request)
        parent_id = self.request.data.get("parent")
        parent = None
        if parent_id:
            parent = get_object_or_404(Folder, id=parent_id, project=project)
        serializer.save(project=project, parent=parent)


class FolderDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = FolderSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "patch", "delete"]

    def get_object(self):
        project = get_accessible_project(self.request.user, self.kwargs["project_id"])
        return get_object_or_404(Folder, id=self.kwargs["folder_id"], project=project)

    def perform_update(self, serializer):
        project = get_accessible_project(self.request.user, self.kwargs["project_id"])
        if not user_can_edit(self.request.user, project):
            self.permission_denied(self.request)
        serializer.save()

    def perform_destroy(self, instance):
        project = get_accessible_project(self.request.user, self.kwargs["project_id"])
        if not user_can_edit(self.request.user, project):
            self.permission_denied(self.request)
        instance.delete()


class SavedPublicationListCreateView(generics.ListCreateAPIView):
    serializer_class = SavedPublicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_project(self):
        return get_accessible_project(self.request.user, self.kwargs["project_id"])

    def get_queryset(self):
        folder = get_object_or_404(
            Folder,
            id=self.kwargs["folder_id"],
            project__id=self.kwargs["project_id"],
        )
        return folder.publications.order_by("-saved_at")

    def perform_create(self, serializer):
        project = self.get_project()
        if not user_can_edit(self.request.user, project):
            self.permission_denied(self.request)
        folder = get_object_or_404(Folder, id=self.kwargs["folder_id"], project=project)
        instance = serializer.save(project=project, folder=folder)
        self._attach_embedding(instance)

    def _attach_embedding(self, instance):
        embedding = generate_embedding(instance.title, instance.abstract, instance.keywords)
        if embedding is not None:
            instance.embedding = embedding
            instance.save(update_fields=["embedding"])


class SavedPublicationDeleteView(generics.DestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        project = get_accessible_project(self.request.user, self.kwargs["project_id"])
        if not user_can_edit(self.request.user, project):
            self.permission_denied(self.request)
        return get_object_or_404(
            SavedPublication,
            id=self.kwargs["publication_id"],
            folder__id=self.kwargs["folder_id"],
            project=project,
        )


class ProjectPublicationListCreateView(generics.ListCreateAPIView):
    serializer_class = SavedPublicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_project(self):
        return get_accessible_project(self.request.user, self.kwargs["project_id"])

    def get_queryset(self):
        return SavedPublication.objects.filter(
            project=self.get_project(), folder=None
        ).order_by("-saved_at")

    def perform_create(self, serializer):
        project = self.get_project()
        if not user_can_edit(self.request.user, project):
            self.permission_denied(self.request)
        instance = serializer.save(project=project, folder=None)
        self._attach_embedding(instance)

    def _attach_embedding(self, instance):
        embedding = generate_embedding(instance.title, instance.abstract, instance.keywords)
        if embedding is not None:
            instance.embedding = embedding
            instance.save(update_fields=["embedding"])


class ProjectPublicationDeleteView(generics.DestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        project = get_accessible_project(self.request.user, self.kwargs["project_id"])
        if not user_can_edit(self.request.user, project):
            self.permission_denied(self.request)
        return get_object_or_404(
            SavedPublication,
            id=self.kwargs["publication_id"],
            folder=None,
            project=project,
        )


class PublicationNoteListCreateView(generics.ListCreateAPIView):
    serializer_class = PublicationNoteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_publication(self):
        pub = get_object_or_404(SavedPublication, id=self.kwargs["publication_id"])
        get_accessible_project(self.request.user, pub.project_id)
        return pub

    def get_queryset(self):
        return self.get_publication().notes.order_by("created_at")

    def perform_create(self, serializer):
        serializer.save(publication=self.get_publication())


class PublicationNoteDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PublicationNoteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        pub = get_object_or_404(SavedPublication, id=self.kwargs["publication_id"])
        get_accessible_project(self.request.user, pub.project_id)
        return get_object_or_404(PublicationNote, id=self.kwargs["note_id"], publication=pub)


class PublicationLabelUpdateView(generics.UpdateAPIView):
    serializer_class = SavedPublicationSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["patch"]

    def get_object(self):
        pub = get_object_or_404(SavedPublication, id=self.kwargs["publication_id"])
        get_accessible_project(self.request.user, pub.project_id)
        return pub


class ProjectAnalyticsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, project_id):
        project = get_accessible_project(request.user, project_id)
        publications = SavedPublication.objects.filter(project=project)
        total_publications = publications.count()
        years = [pub.year for pub in publications if pub.year is not None]
        average_year = round(sum(years) / len(years)) if years else None
        total_citations = sum(pub.cited_by_count or 0 for pub in publications)
        keyword_counter = Counter()
        for pub in publications:
            for keyword in pub.keywords or []:
                if isinstance(keyword, str):
                    keyword_counter[keyword] += 1
                elif isinstance(keyword, dict):
                    name = keyword.get("display_name")
                    if name:
                        keyword_counter[name] += 1
        top_keywords = [keyword for keyword, _ in keyword_counter.most_common(5)]
        type_distribution = Counter(pub.pub_type for pub in publications if pub.pub_type)
        label_distribution = Counter(pub.label for pub in publications if pub.label)
        return Response({
            "total_publications": total_publications,
            "average_year": average_year,
            "total_citations": total_citations,
            "top_keywords": top_keywords,
            "type_distribution": dict(type_distribution),
            "label_distribution": dict(label_distribution),
        })


class SemanticSearchView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, project_id):
        project = get_accessible_project(request.user, project_id)
        query = (request.data.get("query") or "").strip()
        if not query:
            return Response({"error": "query is required"}, status=400)

        publications = SavedPublication.objects.filter(project=project, embedding__isnull=False)
        if not publications.exists():
            return Response({"results": []})

        query_vector = np.array(encode_query(query), dtype=np.float32)
        scored = []
        for pub in publications:
            pub_vector = np.array(pub.embedding, dtype=np.float32)
            score = float(np.dot(query_vector, pub_vector))
            scored.append((score, pub))

        scored.sort(key=lambda x: x[0], reverse=True)
        results = []
        for score, pub in scored[:10]:
            results.append({
                "id": pub.id,
                "openalex_id": pub.openalex_id,
                "title": pub.title,
                "year": pub.year,
                "doi": pub.doi,
                "authors": pub.authors,
                "abstract": pub.abstract,
                "source_name": pub.source_name,
                "cited_by_count": pub.cited_by_count,
                "is_oa": pub.is_oa,
                "pub_type": pub.pub_type,
                "label": pub.label,
                "saved_at": pub.saved_at.isoformat() if pub.saved_at else None,
                "similarity": round(score * 100),
            })
        return Response({"results": results})


class RecommendationFeedbackView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, project_id):
        project = get_accessible_project(request.user, project_id)
        openalex_id = request.data.get("openalex_id", "").strip()
        feedback_value = request.data.get("feedback", "").strip()
        title = request.data.get("title", "").strip()

        if not openalex_id or feedback_value not in RecommendationFeedback.Feedback.values:
            return Response({"error": "openalex_id and valid feedback required"}, status=400)

        obj, created = RecommendationFeedback.objects.update_or_create(
            user=request.user,
            project=project,
            openalex_id=openalex_id,
            defaults={"feedback": feedback_value, "title": title},
        )
        return Response(RecommendationFeedbackSerializer(obj).data, status=201 if created else 200)

    def get(self, request, project_id):
        project = get_accessible_project(request.user, project_id)
        feedback = RecommendationFeedback.objects.filter(user=request.user, project=project)
        return Response(RecommendationFeedbackSerializer(feedback, many=True).data)


class SearchHistoryListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        history = SearchHistory.objects.filter(user=request.user)[:20]
        return Response(SearchHistorySerializer(history, many=True).data)

    def delete(self, request):
        SearchHistory.objects.filter(user=request.user).delete()
        return Response(status=204)


class SearchHistoryCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        query = request.data.get("query", "").strip()
        if not query:
            return Response({"error": "query required"}, status=400)

        existing = SearchHistory.objects.filter(
            user=request.user,
            query=query,
            search_by=request.data.get("search_by", "title"),
        ).first()
        if existing:
            existing.delete()

        entry = SearchHistory.objects.create(
            user=request.user,
            query=query,
            search_by=request.data.get("search_by", "title"),
            filters=request.data.get("filters", {}),
            result_count=request.data.get("result_count", 0),
        )
        SearchHistory.objects.filter(user=request.user)[20:].delete()
        return Response(SearchHistorySerializer(entry).data, status=201)


class SearchHistoryDeleteOneView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, entry_id):
        entry = get_object_or_404(SearchHistory, id=entry_id, user=request.user)
        entry.delete()
        return Response(status=204)