from rest_framework import serializers
from django.contrib.auth.models import User
from apps.projects.models import (
    Project, Folder, SavedPublication, PublicationNote,
    ProjectCollaborator, RecommendationFeedback, SearchHistory,
)

class ProjectSerializer(serializers.ModelSerializer):
    owner = serializers.SerializerMethodField()

    def get_owner(self, obj):
        return obj.user.username

    class Meta:
        model = Project
        fields = ["id", "name", "description", "created_at", "updated_at", "owner"]
        read_only_fields = ["id", "created_at", "updated_at", "owner"]

class CollaboratorUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email"]

class ProjectCollaboratorSerializer(serializers.ModelSerializer):
    user = CollaboratorUserSerializer(read_only=True)
    invited_by = CollaboratorUserSerializer(read_only=True)

    class Meta:
        model = ProjectCollaborator
        fields = ["id", "user", "invited_by", "role", "status", "invited_at", "accepted_at"]
        read_only_fields = ["id", "invited_at", "accepted_at"]


class InviteCollaboratorSerializer(serializers.Serializer):
    username = serializers.CharField()
    role = serializers.ChoiceField(choices=ProjectCollaborator.Role.choices, default=ProjectCollaborator.Role.EDITOR)

    def validate_username(self, value):
        try:
            user = User.objects.get(username=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("Vartotojas nerastas")
        return value


class FolderSerializer(serializers.ModelSerializer):
    subfolder_count = serializers.SerializerMethodField()
    publication_count = serializers.SerializerMethodField()
    breadcrumb = serializers.SerializerMethodField()
    def get_subfolder_count(self, obj):
        return obj.subfolders.count()
    def get_publication_count(self, obj):
        return obj.publications.count()
    def get_breadcrumb(self, obj):
        return obj.get_breadcrumb()

    class Meta:
        model = Folder
        fields = ["id", "name", "parent", "created_at", "subfolder_count", "publication_count", "breadcrumb"]
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


class RecommendationFeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecommendationFeedback
        fields = ["id", "openalex_id", "title", "feedback", "created_at"]
        read_only_fields = ["id", "created_at"]


class SearchHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SearchHistory
        fields = ["id", "query", "search_by", "filters", "result_count", "created_at"]
        read_only_fields = ["id", "created_at"]