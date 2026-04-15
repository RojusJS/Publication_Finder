from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions
from apps.projects.models import Project, Folder, SavedPublication
from apps.projects.api.serializers import ProjectSerializer, FolderSerializer, SavedPublicationSerializer


class ProjectListCreateView(generics.ListCreateAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Project.objects.filter(user=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ProjectDeleteView(generics.DestroyAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

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


class FolderDeleteView(generics.DestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]

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