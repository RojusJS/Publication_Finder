from django.conf import settings
from django.db import models


class ProjectInsight(models.Model):
    """A generated AI analysis of a project's publications.

    Results are stored so they can be shown again without paying for another
    model call; ``input_hash`` identifies the exact input that produced them.
    """

    class Focus(models.TextChoices):
        OVERVIEW = "overview", "Overview"
        THEMES = "themes", "Themes"
        METHODOLOGY = "methodology", "Methodology"
        GAPS = "gaps", "Research gaps"

    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="insights")
    folder = models.ForeignKey("projects.Folder", on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    focus = models.CharField(max_length=20, choices=Focus.choices)
    language = models.CharField(max_length=5)
    sections = models.JSONField(default=list)
    model_name = models.CharField(max_length=100)
    publication_count = models.PositiveIntegerField(default=0)
    input_hash = models.CharField(max_length=64, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["project", "focus", "language", "created_at"], name="insight_lookup_idx")]

    def __str__(self):
        return f"{self.project} / {self.focus} / {self.created_at:%Y-%m-%d}"
