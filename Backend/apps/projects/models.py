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

class SavedPublication(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="publications")
    openalex_id = models.CharField(max_length=255)
    title = models.TextField()
    year = models.IntegerField(null=True, blank=True)
    doi = models.URLField(null=True, blank=True, max_length=500)
    pdf_url = models.URLField(null=True, blank=True, max_length=500)
    saved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("project", "openalex_id")
