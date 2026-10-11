from django.conf import settings
from django.db import models


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
    MAX_DEPTH = 50

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="folders")
    parent = models.ForeignKey("self", on_delete=models.CASCADE, null=True, blank=True, related_name="subfolders")
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("project", "parent", "name")
        constraints = [
            # ``unique_together`` above does not apply to root folders because
            # NULL parents are never equal in SQL.
            models.UniqueConstraint(
                fields=["project", "name"],
                condition=models.Q(parent__isnull=True),
                name="unique_root_folder_name",
            ),
        ]

    def __str__(self):
        return f"{self.project.name} / {self.name}"

    def get_breadcrumb(self):
        crumbs = []
        node = self
        seen = set()
        while node is not None and node.pk not in seen and len(crumbs) < self.MAX_DEPTH:
            seen.add(node.pk)
            crumbs.append({"id": node.id, "name": node.name})
            node = node.parent
        crumbs.reverse()
        return crumbs


class SavedPublication(models.Model):
    class Label(models.TextChoices):
        TO_READ = "to_read", "To read"
        READ = "read", "Read"
        TO_CITE = "to_cite", "To cite"
        CITED = "cited", "Cited"

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="publications")
    folder = models.ForeignKey(Folder, on_delete=models.SET_NULL, null=True, blank=True, related_name="publications")
    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="saved_publications"
    )
    label = models.CharField(max_length=20, choices=Label.choices, null=True, blank=True)
    openalex_id = models.CharField(max_length=255)
    title = models.TextField()
    year = models.IntegerField(null=True, blank=True)
    publication_date = models.DateField(null=True, blank=True)
    doi = models.URLField(null=True, blank=True, max_length=500)
    pdf_url = models.URLField(null=True, blank=True, max_length=500)
    landing_page_url = models.URLField(null=True, blank=True, max_length=500)
    oa_url = models.URLField(null=True, blank=True, max_length=500)
    abstract = models.TextField(null=True, blank=True)
    authors = models.JSONField(default=list, blank=True)
    institutions = models.JSONField(default=list, blank=True)
    source_name = models.CharField(null=True, blank=True, max_length=500)
    source_type = models.CharField(null=True, blank=True, max_length=50)
    cited_by_count = models.IntegerField(null=True, blank=True)
    language = models.CharField(null=True, blank=True, max_length=50)
    keywords = models.JSONField(default=list, blank=True)
    is_oa = models.BooleanField(null=True, blank=True)
    is_retracted = models.BooleanField(default=False)
    pub_type = models.CharField(null=True, blank=True, max_length=100)
    biblio = models.JSONField(default=dict, blank=True)
    saved_at = models.DateTimeField(auto_now_add=True)
    embedding = models.JSONField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["folder", "openalex_id"],
                condition=models.Q(folder__isnull=False),
                name="unique_pub_in_folder",
            ),
            models.UniqueConstraint(
                fields=["project", "openalex_id"],
                condition=models.Q(folder__isnull=True),
                name="unique_pub_in_project",
            ),
        ]
        indexes = [
            models.Index(fields=["project", "saved_at"], name="savedpub_project_saved_idx"),
            models.Index(fields=["openalex_id"], name="savedpub_openalex_idx"),
        ]

    def __str__(self):
        return self.title

    def as_publication(self):
        """Return the publication in the API's common shape (used by exports and citations)."""
        return {
            "openalex_id": self.openalex_id,
            "title": self.title,
            "year": self.year,
            "publication_date": self.publication_date.isoformat() if self.publication_date else None,
            "doi": self.doi,
            "type": self.pub_type,
            "is_oa": self.is_oa,
            "oa_url": self.oa_url,
            "pdf_url": self.pdf_url,
            "landing_page_url": self.landing_page_url,
            "abstract": self.abstract or "",
            "authors": list(self.authors or []),
            "institutions": list(self.institutions or []),
            "source_name": self.source_name,
            "source_type": self.source_type,
            "cited_by_count": self.cited_by_count or 0,
            "language": self.language,
            "keywords": [k for k in (self.keywords or []) if isinstance(k, str)],
            "is_retracted": self.is_retracted,
            "biblio": dict(self.biblio or {}),
        }


class PublicationNote(models.Model):
    publication = models.ForeignKey(SavedPublication, on_delete=models.CASCADE, related_name="notes")
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="publication_notes"
    )
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


class SharedPublication(models.Model):
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_publications")
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="received_publications")
    openalex_id = models.CharField(max_length=255, blank=True, default="")
    publication_data = models.JSONField()
    message = models.TextField(blank=True)
    viewed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["recipient", "viewed"], name="shared_recipient_viewed_idx")]

    def __str__(self):
        return f"{self.sender.username} -> {self.recipient.username}: {str(self.publication_data.get('title', ''))[:40]}"


class SearchHistory(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="search_history")
    query = models.CharField(max_length=500)
    search_by = models.CharField(max_length=50, default="title")
    filters = models.JSONField(default=dict, blank=True)
    result_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "created_at"], name="searchhistory_user_idx")]

    def __str__(self):
        return f"{self.user.username}: {self.query}"
