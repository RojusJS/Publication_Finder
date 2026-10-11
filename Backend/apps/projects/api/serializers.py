from rest_framework import serializers

from apps.projects.access import OWNER, has_role, EDITOR
from apps.projects.models import (
    Folder,
    Project,
    ProjectCollaborator,
    PublicationNote,
    RecommendationFeedback,
    SavedPublication,
    SearchHistory,
    SharedPublication,
)
from apps.projects.services.publications import MAX_BULK_SAVE, validate_folder_parent
from apps.search.api.serializers import OpenAlexIdField


def _clean_text(value, field_name, max_length, allow_blank=False):
    value = (value or "").strip()
    if not value and not allow_blank:
        raise serializers.ValidationError(f"{field_name} cannot be empty.")
    if len(value) > max_length:
        raise serializers.ValidationError(f"{field_name} must be at most {max_length} characters.")
    return value


class UserSummarySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()


# ---------------------------------------------------------------------------
# Projects
# ---------------------------------------------------------------------------

class ProjectSerializer(serializers.ModelSerializer):
    owner = serializers.CharField(source="user.username", read_only=True)
    role = serializers.SerializerMethodField()
    publication_count = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "id", "name", "description", "created_at", "updated_at",
            "owner", "role", "publication_count", "member_count",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_role(self, obj):
        role = getattr(obj, "role", None)
        if role:
            return role
        roles = self.context.get("roles") or {}
        request = self.context.get("request")
        if request and obj.user_id == request.user.id:
            return OWNER
        return roles.get(obj.id)

    def get_publication_count(self, obj):
        return getattr(obj, "publication_count", 0)

    def get_member_count(self, obj):
        return getattr(obj, "member_count", 0)

    def validate_name(self, value):
        return _clean_text(value, "Name", 255)

    def validate_description(self, value):
        return _clean_text(value, "Description", 2000, allow_blank=True)


# ---------------------------------------------------------------------------
# Folders
# ---------------------------------------------------------------------------

class FolderSerializer(serializers.ModelSerializer):
    parent = serializers.PrimaryKeyRelatedField(queryset=Folder.objects.none(), allow_null=True, required=False)
    subfolder_count = serializers.SerializerMethodField()
    publication_count = serializers.SerializerMethodField()

    class Meta:
        model = Folder
        fields = ["id", "name", "parent", "created_at", "subfolder_count", "publication_count"]
        read_only_fields = ["id", "created_at"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        project = self.context.get("project")
        if project is not None:
            self.fields["parent"].queryset = Folder.objects.filter(project=project)

    def get_subfolder_count(self, obj):
        return getattr(obj, "subfolder_count", 0)

    def get_publication_count(self, obj):
        return getattr(obj, "publication_count", 0)

    def validate_name(self, value):
        return _clean_text(value, "Name", 255)

    def validate(self, attrs):
        project = self.context["project"]
        instance = self.instance
        parent = attrs.get("parent", instance.parent if instance else None)
        name = attrs.get("name", instance.name if instance else None)

        if instance is not None and "parent" in attrs:
            try:
                validate_folder_parent(instance, parent)
            except ValueError as exc:
                raise serializers.ValidationError({"parent": str(exc)}) from None

        siblings = Folder.objects.filter(project=project, parent=parent, name__iexact=name)
        if instance is not None:
            siblings = siblings.exclude(pk=instance.pk)
        if siblings.exists():
            raise serializers.ValidationError({"name": "A folder with this name already exists here."})
        return attrs


class FolderDetailSerializer(FolderSerializer):
    breadcrumb = serializers.SerializerMethodField()

    class Meta(FolderSerializer.Meta):
        fields = FolderSerializer.Meta.fields + ["breadcrumb"]

    def get_breadcrumb(self, obj):
        return obj.get_breadcrumb()


# ---------------------------------------------------------------------------
# Publications and notes
# ---------------------------------------------------------------------------

class PublicationNoteSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()

    class Meta:
        model = PublicationNote
        fields = ["id", "text", "author", "created_at", "updated_at", "can_edit"]
        read_only_fields = ["id", "author", "created_at", "updated_at", "can_edit"]

    def get_author(self, obj):
        if obj.author_id is None:
            return None
        return {"id": obj.author_id, "username": obj.author.username}

    def get_can_edit(self, obj):
        request = self.context.get("request")
        role = self.context.get("role")
        if not request:
            return False
        return note_editable(request.user, role, obj)

    def validate_text(self, value):
        return _clean_text(value, "Note", 5000)


def note_editable(user, role, note):
    if role == OWNER:
        return True
    if not has_role(role, EDITOR):
        return False
    return note.author_id is None or note.author_id == user.id


class SavedPublicationSerializer(serializers.ModelSerializer):
    type = serializers.CharField(source="pub_type", read_only=True)
    folder_id = serializers.IntegerField(read_only=True)
    added_by = serializers.SerializerMethodField()
    notes = PublicationNoteSerializer(many=True, read_only=True)

    class Meta:
        model = SavedPublication
        fields = [
            "id", "openalex_id", "title", "year", "publication_date", "doi", "pdf_url",
            "landing_page_url", "oa_url", "abstract", "authors", "institutions", "source_name",
            "source_type", "cited_by_count", "language", "keywords", "is_oa", "is_retracted",
            "type", "biblio", "label", "folder_id", "saved_at", "added_by", "notes",
        ]
        read_only_fields = fields

    def get_added_by(self, obj):
        return obj.added_by.username if obj.added_by_id else None


class SavePublicationsSerializer(serializers.Serializer):
    openalex_id = serializers.CharField(required=False, max_length=255)
    openalex_ids = serializers.ListField(
        child=serializers.CharField(max_length=255), required=False, max_length=MAX_BULK_SAVE
    )
    folder_id = serializers.IntegerField(required=False, allow_null=True)

    def validate(self, attrs):
        ids = list(attrs.get("openalex_ids") or [])
        if attrs.get("openalex_id"):
            ids.append(attrs["openalex_id"])
        if not ids:
            raise serializers.ValidationError({"openalex_ids": "Provide at least one publication."})
        attrs["ids"] = ids
        return attrs


class PublicationUpdateSerializer(serializers.Serializer):
    label = serializers.ChoiceField(choices=SavedPublication.Label.choices, allow_null=True, required=False)
    folder_id = serializers.IntegerField(allow_null=True, required=False)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError("Nothing to update.")
        return attrs


# ---------------------------------------------------------------------------
# Collaboration
# ---------------------------------------------------------------------------

class CollaboratorSerializer(serializers.ModelSerializer):
    user = UserSummarySerializer(read_only=True)
    invited_by = serializers.CharField(source="invited_by.username", read_only=True)

    class Meta:
        model = ProjectCollaborator
        fields = ["id", "user", "invited_by", "role", "status", "invited_at", "accepted_at"]
        read_only_fields = fields


class InviteCollaboratorSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=254, help_text="Username or e-mail address")
    role = serializers.ChoiceField(choices=ProjectCollaborator.Role.choices, default=ProjectCollaborator.Role.EDITOR)

    def validate_username(self, value):
        return _clean_text(value, "Username", 254)


class CollaboratorUpdateSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=ProjectCollaborator.Role.choices)


class InvitationResponseSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["accept", "decline"])


class PendingInvitationSerializer(serializers.ModelSerializer):
    project_id = serializers.IntegerField(source="project.id", read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)
    invited_by = serializers.CharField(source="invited_by.username", read_only=True)

    class Meta:
        model = ProjectCollaborator
        fields = ["id", "project_id", "project_name", "invited_by", "role", "invited_at"]
        read_only_fields = fields


# ---------------------------------------------------------------------------
# Recommendations feedback, semantic search, history and sharing
# ---------------------------------------------------------------------------

class RecommendationFeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecommendationFeedback
        fields = ["id", "openalex_id", "title", "feedback", "created_at"]
        read_only_fields = fields


class RecommendationFeedbackInputSerializer(serializers.Serializer):
    openalex_id = OpenAlexIdField(kind="W")
    title = serializers.CharField(required=False, allow_blank=True, max_length=1000, default="")
    feedback = serializers.ChoiceField(choices=RecommendationFeedback.Feedback.choices, allow_null=True)


class SemanticSearchSerializer(serializers.Serializer):
    query = serializers.CharField(max_length=300)
    limit = serializers.IntegerField(min_value=1, max_value=50, default=15)
    folder_id = serializers.IntegerField(required=False, allow_null=True)

    def validate_query(self, value):
        return _clean_text(value, "Query", 300)


class ScopeQuerySerializer(serializers.Serializer):
    folder = serializers.IntegerField(required=False, min_value=1)


class ExportQuerySerializer(ScopeQuerySerializer):
    format = serializers.ChoiceField(choices=["bibtex", "ris", "csv", "pdf"])


class SearchHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SearchHistory
        fields = ["id", "query", "search_by", "filters", "result_count", "created_at"]
        read_only_fields = fields


class SharePublicationSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=254)
    openalex_id = OpenAlexIdField(kind="W")
    message = serializers.CharField(required=False, allow_blank=True, max_length=500, default="")

    def validate_username(self, value):
        return _clean_text(value, "Username", 254)


class SharedPublicationSerializer(serializers.ModelSerializer):
    sender = UserSummarySerializer(read_only=True)
    publication = serializers.JSONField(source="publication_data", read_only=True)

    class Meta:
        model = SharedPublication
        fields = ["id", "sender", "openalex_id", "publication", "message", "viewed", "created_at"]
        read_only_fields = fields
