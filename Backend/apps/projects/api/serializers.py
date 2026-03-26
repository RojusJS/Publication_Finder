from rest_framework import serializers
from apps.projects.models import Project, Folder, SavedPublication


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ["id", "name", "description", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class FolderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Folder
        fields = ["id", "name", "created_at"]
        read_only_fields = ["id", "created_at"]


class SavedPublicationSerializer(serializers.ModelSerializer):
    folder_id = serializers.PrimaryKeyRelatedField(
        queryset=Folder.objects.all(),
        source="folder",
        write_only=True
    )

    class Meta:
        model = SavedPublication
        fields = ["id", "folder_id", "openalex_id", "title", "year", "doi", "pdf_url", "saved_at"]
        read_only_fields = ["id", "saved_at"]