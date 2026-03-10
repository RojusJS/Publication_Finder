from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions
from apps.projects.models import Project, SavedPublication
from apps.projects.api.serializers import ProjectSerializer, SavedPublicationSerializer


class ProjectListCreateView(generics.ListCreateAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Project.objects.filter(user=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class SavedPublicationListCreateView(generics.ListCreateAPIView):
    serializer_class = SavedPublicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        project = get_object_or_404(Project, id=self.kwargs["project_id"], user=self.request.user)
        return project.publications.order_by("-saved_at")

    def perform_create(self, serializer):
        project = get_object_or_404(Project, id=self.kwargs["project_id"], user=self.request.user)
        serializer.save(project=project)

class SavedPublicationDeleteView(generics.DestroyAPIView):
    serializer_class = SavedPublicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return get_object_or_404(
            SavedPublication,
            id=self.kwargs["publication_id"],
            project__user=self.request.user
        )