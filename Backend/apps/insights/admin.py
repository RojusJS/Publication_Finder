from django.contrib import admin

from apps.insights.models import ProjectInsight


@admin.register(ProjectInsight)
class ProjectInsightAdmin(admin.ModelAdmin):
    list_display = ("project", "focus", "language", "model_name", "publication_count", "created_at")
    list_filter = ("focus", "language")
    raw_id_fields = ("project", "folder", "created_by")
    readonly_fields = ("input_hash",)
