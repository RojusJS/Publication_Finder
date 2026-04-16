from rest_framework import serializers
from apps.projects.models import Project, Folder, SavedPublication, PublicationNote


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

class PublicationNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = PublicationNote
        fields = ["id", "text", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

class SavedPublicationSerializer(serializers.ModelSerializer):
    notes = PublicationNoteSerializer(many=True, read_only=True)
    label_choices = serializers.SerializerMethodField(read_only=True)

    def get_label_choices(self, obj):
        return [{"value": v, "label": l} for v, l in SavedPublication.Label.choices]

    class Meta:
        model = SavedPublication
        fields = [
            "id", "openalex_id", "title", "year", "doi", "pdf_url",
            "landing_page_url", "abstract", "authors", "institutions",
            "source_name", "cited_by_count", "language", "keywords",
            "is_oa", "pub_type", "saved_at", "notes", "label", "label_choices",
        ]
        read_only_fields = ["id", "saved_at"]