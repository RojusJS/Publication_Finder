from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions
from apps.projects.models import Project, Folder, SavedPublication, PublicationNote
from apps.projects.api.serializers import ProjectSerializer, FolderSerializer, SavedPublicationSerializer, PublicationNoteSerializer
from rest_framework.views import APIView
from rest_framework.response import Response
from collections import Counter


class ProjectListCreateView(generics.ListCreateAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Project.objects.filter(user=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "patch", "delete"]
    def get_object(self):
        return get_object_or_404(Project, id=self.kwargs["project_id"], user=self.request.user)


class FolderListCreateView(generics.ListCreateAPIView):
    serializer_class = FolderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_project(self):
        return get_object_or_404(Project, id=self.kwargs["project_id"], user=self.request.user)

    def get_queryset(self):
        return self.get_project().folders.order_by("created_at")

    def perform_create(self, serializer):
        serializer.save(project=self.get_project())

class FolderDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = FolderSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "patch", "delete"]
    def get_object(self):
        return get_object_or_404(
            Folder,
            id=self.kwargs["folder_id"],
            project__id=self.kwargs["project_id"],
            project__user=self.request.user
        )

class SavedPublicationListCreateView(generics.ListCreateAPIView):
    serializer_class = SavedPublicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_project(self):
        return get_object_or_404(Project, id=self.kwargs["project_id"], user=self.request.user)

    def get_queryset(self):
        folder = get_object_or_404(
            Folder,
            id=self.kwargs["folder_id"],
            project__id=self.kwargs["project_id"],
            project__user=self.request.user
        )
        return folder.publications.order_by("-saved_at")

    def perform_create(self, serializer):
        project = self.get_project()
        folder = get_object_or_404(
            Folder,
            id=self.kwargs["folder_id"],
            project=project
        )
        serializer.save(project=project, folder=folder)


class SavedPublicationDeleteView(generics.DestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return get_object_or_404(
            SavedPublication,
            id=self.kwargs["publication_id"],
            folder__id=self.kwargs["folder_id"],
            project__user=self.request.user
        )

class ProjectPublicationListCreateView(generics.ListCreateAPIView):
    serializer_class = SavedPublicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_project(self):
        return get_object_or_404(Project, id=self.kwargs["project_id"], user=self.request.user)

    def get_queryset(self):
        return SavedPublication.objects.filter(
            project=self.get_project(), folder=None
        ).order_by("-saved_at")

    def perform_create(self, serializer):
        serializer.save(project=self.get_project(), folder=None)


class ProjectPublicationDeleteView(generics.DestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return get_object_or_404(
            SavedPublication,
            id=self.kwargs["publication_id"],
            folder=None,
            project__user=self.request.user
        )

class PublicationNoteListCreateView(generics.ListCreateAPIView):
    serializer_class = PublicationNoteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_publication(self):
        return get_object_or_404(
            SavedPublication,
            id=self.kwargs["publication_id"],
            project__user=self.request.user
        )

    def get_queryset(self):
        return self.get_publication().notes.order_by("created_at")

    def perform_create(self, serializer):
        serializer.save(publication=self.get_publication())


class PublicationNoteDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PublicationNoteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return get_object_or_404(
            PublicationNote,
            id=self.kwargs["note_id"],
            publication__id=self.kwargs["publication_id"],
            publication__project__user=self.request.user
        )

class PublicationLabelUpdateView(generics.UpdateAPIView):
    serializer_class = SavedPublicationSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["patch"]

    def get_object(self):
        return get_object_or_404(
            SavedPublication,
            id=self.kwargs["publication_id"],
            project__user=self.request.user
        )

class ProjectAnalyticsView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request, project_id):
        project = get_object_or_404(Project, id=project_id, user=request.user)
        publications = SavedPublication.objects.filter(project=project)
        total_publications = publications.count()
        years = [
            pub.year for pub in publications
            if pub.year is not None
        ]
        average_year = round(sum(years) / len(years)) if years else None
        total_citations = sum(
            pub.cited_by_count or 0 for pub in publications
        )
        keyword_counter = Counter()
        for pub in publications:
            for keyword in pub.keywords or []:
                if isinstance(keyword, str):
                    keyword_counter[keyword] += 1
                elif isinstance(keyword, dict):
                    name = keyword.get("display_name")
                    if name:
                        keyword_counter[name] += 1
        top_keywords = [
            keyword for keyword, _ in keyword_counter.most_common(5)
        ]
        type_distribution = Counter(
            pub.pub_type for pub in publications if pub.pub_type
        )
        label_distribution = Counter(
            pub.label for pub in publications if pub.label
        )
        return Response({
            "total_publications": total_publications,
            "average_year": average_year,
            "total_citations": total_citations,
            "top_keywords": top_keywords,
            "type_distribution": dict(type_distribution),
            "label_distribution": dict(label_distribution),
        })