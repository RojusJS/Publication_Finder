from django.db import models
from django.conf import settings


class Project(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="projects")
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class Folder(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="folders")
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("project", "name")

    def __str__(self):
        return f"{self.project.name} / {self.name}"


class SavedPublication(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="publications")
    folder = models.ForeignKey(Folder, on_delete=models.SET_NULL, null=True, blank=True, related_name="publications")
    openalex_id = models.CharField(max_length=255)
    title = models.TextField()
    year = models.IntegerField(null=True, blank=True)
    doi = models.URLField(null=True, blank=True, max_length=500)
    pdf_url = models.URLField(null=True, blank=True, max_length=500)
    landing_page_url = models.URLField(null=True, blank=True, max_length=500)
    abstract = models.TextField(null=True, blank=True)
    authors = models.JSONField(default=list, blank=True)
    institutions = models.JSONField(default=list, blank=True)
    source_name = models.CharField(null=True, blank=True, max_length=500)
    cited_by_count = models.IntegerField(null=True, blank=True)
    language = models.CharField(null=True, blank=True, max_length=50)
    keywords = models.JSONField(default=list, blank=True)
    is_oa = models.BooleanField(null=True, blank=True)
    pub_type = models.CharField(null=True, blank=True, max_length=100)
    saved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["folder", "openalex_id"],
                condition=models.Q(folder__isnull=False),
                name="unique_pub_in_folder"
            ),
            models.UniqueConstraint(
                fields=["project", "openalex_id"],
                condition=models.Q(folder__isnull=True),
                name="unique_pub_in_project"
            ),
        ]

    def __str__(self):
        return self.title

class PublicationNote(models.Model):
    publication = models.ForeignKey(
        SavedPublication,
        on_delete=models.CASCADE,
        related_name="notes"
    )
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Note for {self.publication.title[:40]}"