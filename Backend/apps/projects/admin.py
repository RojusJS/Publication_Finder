from django.contrib import admin

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
from apps.projects.services.publications import delete_folder


class CollaboratorInline(admin.TabularInline):
    model = ProjectCollaborator
    fk_name = "project"
    extra = 0
    raw_id_fields = ("user", "invited_by")


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "created_at", "updated_at")
    search_fields = ("name", "user__username")
    raw_id_fields = ("user",)
    inlines = [CollaboratorInline]


@admin.register(Folder)
class FolderAdmin(admin.ModelAdmin):
    list_display = ("name", "project", "parent", "created_at")
    search_fields = ("name", "project__name")
    raw_id_fields = ("project", "parent")

    # Deleting through the service keeps the publications (moved to the parent).
    def delete_model(self, request, obj):
        delete_folder(obj, keep_publications=True)

    def delete_queryset(self, request, queryset):
        for folder in queryset.order_by("-id"):
            if Folder.objects.filter(pk=folder.pk).exists():
                delete_folder(folder, keep_publications=True)


@admin.register(SavedPublication)
class SavedPublicationAdmin(admin.ModelAdmin):
    list_display = ("title", "project", "folder", "year", "label", "saved_at")
    list_filter = ("label", "is_oa", "is_retracted", "pub_type")
    search_fields = ("title", "openalex_id", "doi", "project__name")
    raw_id_fields = ("project", "folder", "added_by")
    exclude = ("embedding",)


@admin.register(PublicationNote)
class PublicationNoteAdmin(admin.ModelAdmin):
    list_display = ("publication", "author", "created_at")
    raw_id_fields = ("publication", "author")


@admin.register(ProjectCollaborator)
class ProjectCollaboratorAdmin(admin.ModelAdmin):
    list_display = ("user", "project", "role", "status", "invited_at")
    list_filter = ("role", "status")
    raw_id_fields = ("project", "user", "invited_by")


@admin.register(RecommendationFeedback)
class RecommendationFeedbackAdmin(admin.ModelAdmin):
    list_display = ("user", "project", "feedback", "openalex_id", "created_at")
    list_filter = ("feedback",)
    raw_id_fields = ("user", "project")


@admin.register(SharedPublication)
class SharedPublicationAdmin(admin.ModelAdmin):
    list_display = ("sender", "recipient", "openalex_id", "viewed", "created_at")
    list_filter = ("viewed",)
    raw_id_fields = ("sender", "recipient")


@admin.register(SearchHistory)
class SearchHistoryAdmin(admin.ModelAdmin):
    list_display = ("user", "query", "search_by", "result_count", "created_at")
    search_fields = ("query", "user__username")
    raw_id_fields = ("user",)
