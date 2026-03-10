from rest_framework import serializers
from apps.projects.models import Project, SavedPublication

class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ["id", "name", "description", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

class SavedPublicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedPublication
        fields = ["id", "openalex_id", "title", "year", "doi", "pdf_url", "saved_at"]
        read_only_fields = ["id", "saved_at"]