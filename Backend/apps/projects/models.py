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


class ProjectCollaborator(models.Model):
    class Role(models.TextChoices):
        VIEWER = "viewer", "Viewer"
        EDITOR = "editor", "Editor"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        DECLINED = "declined", "Declined"

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="collaborators")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="collaborations")
    invited_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_invitations")
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.EDITOR)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    invited_at = models.DateTimeField(auto_now_add=True)
    accepted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("project", "user")

    def __str__(self):
        return f"{self.user.username} -> {self.project.name} ({self.status})"


class Folder(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="folders")
    parent = models.ForeignKey("self", on_delete=models.CASCADE, null=True, blank=True, related_name="subfolders")
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("project", "parent", "name")

    def __str__(self):
        return f"{self.project.name} / {self.name}"

    def get_breadcrumb(self):
        crumbs = []
        node = self
        while node is not None:
            crumbs.append({"id": node.id, "name": node.name})
            node = node.parent
        crumbs.reverse()
        return crumbs


class SavedPublication(models.Model):
    class Label(models.TextChoices):
        CITED = "Cituota", "Cituota"
        TO_BE_CITED = "Cituoti", "Cituoti"
        READ = "Perskaityta", "Perskaityta"
        TO_BE_READ = "Perskaityti", "Perskaityti"

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="publications")
    folder = models.ForeignKey(Folder, on_delete=models.SET_NULL, null=True, blank=True, related_name="publications")
    label = models.CharField(max_length=20, choices=Label.choices, null=True, blank=True)
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
    embedding = models.JSONField(null=True, blank=True)

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
    publication = models.ForeignKey(SavedPublication, on_delete=models.CASCADE, related_name="notes")
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Note for {self.publication.title[:40]}"


class RecommendationFeedback(models.Model):
    class Feedback(models.TextChoices):
        POSITIVE = "positive", "Positive"
        NEGATIVE = "negative", "Negative"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="recommendation_feedback")
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="recommendation_feedback")
    openalex_id = models.CharField(max_length=255)
    title = models.TextField(blank=True)
    feedback = models.CharField(max_length=20, choices=Feedback.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "project", "openalex_id")

    def __str__(self):
        return f"{self.user.username} / {self.feedback} / {self.openalex_id}"


class SearchHistory(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="search_history")
    query = models.CharField(max_length=500)
    search_by = models.CharField(max_length=50, default="title")
    filters = models.JSONField(default=dict, blank=True)
    result_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.username}: {self.query}"