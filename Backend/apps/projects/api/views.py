from django.db import transaction
from django.db.models import Count, Prefetch, Q
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.lookup import find_active_user
from apps.core.exceptions import APIError
from apps.core.identifiers import normalize_work_id
from apps.projects.access import EDITOR, OWNER, VIEWER, accessible_projects, get_folder, get_project
from apps.projects.api.serializers import (
    CollaboratorSerializer,
    CollaboratorUpdateSerializer,
    ExportQuerySerializer,
    FolderDetailSerializer,
    FolderSerializer,
    InvitationResponseSerializer,
    InviteCollaboratorSerializer,
    PendingInvitationSerializer,
    ProjectSerializer,
    PublicationNoteSerializer,
    PublicationUpdateSerializer,
    RecommendationFeedbackInputSerializer,
    RecommendationFeedbackSerializer,
    SavedPublicationSerializer,
    SavePublicationsSerializer,
    ScopeQuerySerializer,
    SemanticSearchSerializer,
    note_editable,
)
from apps.projects.models import (
    Folder,
    Project,
    ProjectCollaborator,
    PublicationNote,
    RecommendationFeedback,
    SavedPublication,
)
from apps.projects.services import exports
from apps.projects.services.analytics import project_analytics
from apps.projects.services.embedding_service import build_text, ensure_embeddings
from apps.projects.services.publications import (
    delete_folder,
    move_publication,
    publications_in_scope,
    save_publications,
)
from apps.projects.services.similarity import similarity


def _annotated_folders(queryset):
    return queryset.annotate(
        subfolder_count=Count("subfolders", distinct=True),
        publication_count=Count("publications", distinct=True),
    )


def _annotated_projects(queryset):
    return queryset.select_related("user").annotate(
        publication_count=Count("publications", distinct=True),
        member_count=Count(
            "collaborators", filter=Q(collaborators__status=ProjectCollaborator.Status.ACCEPTED), distinct=True
        ),
    )


def _publication_queryset():
    return SavedPublication.objects.select_related("added_by").prefetch_related(
        Prefetch("notes", queryset=PublicationNote.objects.select_related("author").order_by("created_at"))
    )


# ---------------------------------------------------------------------------
# Projects
# ---------------------------------------------------------------------------

class ProjectListCreateView(APIView):
    def get(self, request):
        ids = accessible_projects(request.user).values("id")
        projects = _annotated_projects(Project.objects.filter(id__in=ids)).order_by("-updated_at", "-id")
        roles = dict(
            ProjectCollaborator.objects.filter(user=request.user, status=ProjectCollaborator.Status.ACCEPTED)
            .values_list("project_id", "role")
        )
        serializer = ProjectSerializer(projects, many=True, context={"request": request, "roles": roles})
        return Response(serializer.data)

    def post(self, request):
        serializer = ProjectSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        project = serializer.save(user=request.user)
        project.role = OWNER
        return Response(ProjectSerializer(project, context={"request": request}).data, status=status.HTTP_201_CREATED)


class ProjectDetailView(APIView):
    def _serialize(self, request, project):
        annotated = _annotated_projects(Project.objects.filter(pk=project.pk)).get()
        annotated.role = project.role
        return ProjectSerializer(annotated, context={"request": request}).data

    def get(self, request, project_id):
        project = get_project(request.user, project_id)
        return Response(self._serialize(request, project))

    def patch(self, request, project_id):
        project = get_project(request.user, project_id, OWNER)
        serializer = ProjectSerializer(project, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(self._serialize(request, project))

    def delete(self, request, project_id):
        project = get_project(request.user, project_id, OWNER)
        project.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProjectLeaveView(APIView):
    def post(self, request, project_id):
        project = get_project(request.user, project_id)
        if project.role == OWNER:
            raise APIError("The owner cannot leave their own project.", code="owner_cannot_leave")
        ProjectCollaborator.objects.filter(project=project, user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProjectAnalyticsView(APIView):
    def get(self, request, project_id):
        project = get_project(request.user, project_id)
        query = ScopeQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        folder = get_folder(project, query.validated_data.get("folder"))
        return Response(project_analytics(project, folder))


class ProjectExportView(APIView):
    throttle_scope = "export"

    def get(self, request, project_id):
        project = get_project(request.user, project_id)
        query = ExportQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        export_format = query.validated_data["format"]
        folder = get_folder(project, query.validated_data.get("folder"))
        publications, paths = exports.export_publications(project, folder)

        if export_format == "bibtex":
            content = exports.to_bibtex(publications)
        elif export_format == "ris":
            content = exports.to_ris(publications)
        elif export_format == "csv":
            content = exports.to_csv(publications, paths)
        else:
            language = "lt" if (getattr(request, "LANGUAGE_CODE", "") or "").startswith("lt") else "en"
            content = exports.to_pdf(project, publications, paths, language)

        extension, content_type = exports.EXPORT_FORMATS[export_format]
        response = HttpResponse(content, content_type=content_type)
        response["Content-Disposition"] = f'attachment; filename="{exports.export_filename(project, extension)}"'
        response["Cache-Control"] = "no-store"
        return response


class SemanticSearchView(APIView):
    def post(self, request, project_id):
        project = get_project(request.user, project_id)
        serializer = SemanticSearchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        folder = get_folder(project, data.get("folder_id"))

        publications = list(_publication_queryset().filter(
            id__in=publications_in_scope(project, folder).values("id")
        ))
        if not publications:
            return Response({"results": [], "method": None})

        ensure_embeddings(publications)
        texts = [build_text(pub.title, pub.abstract, pub.keywords) for pub in publications]
        vectors = [pub.embedding for pub in publications]
        scores, method = similarity([data["query"]], texts, vectors)
        ranked = sorted(zip(scores[0].tolist(), publications, strict=True), key=lambda item: item[0], reverse=True)

        threshold = 0.2 if method == "embeddings" else 0.02
        results = []
        for score, publication in ranked:
            if score < threshold or len(results) >= data["limit"]:
                break
            item = SavedPublicationSerializer(publication, context={"request": request}).data
            item["similarity"] = round(max(0.0, min(1.0, score)) * 100)
            results.append(item)
        return Response({"results": results, "method": method})


class RecommendationFeedbackView(APIView):
    def get(self, request, project_id):
        project = get_project(request.user, project_id)
        feedback = RecommendationFeedback.objects.filter(user=request.user, project=project).order_by("-created_at")
        return Response(RecommendationFeedbackSerializer(feedback, many=True).data)

    def post(self, request, project_id):
        project = get_project(request.user, project_id)
        serializer = RecommendationFeedbackInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        openalex_id = normalize_work_id(data["openalex_id"])
        if data["feedback"] is None:
            RecommendationFeedback.objects.filter(user=request.user, project=project, openalex_id=openalex_id).delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        feedback, created = RecommendationFeedback.objects.update_or_create(
            user=request.user,
            project=project,
            openalex_id=openalex_id,
            defaults={"feedback": data["feedback"], "title": data["title"]},
        )
        return Response(
            RecommendationFeedbackSerializer(feedback).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


# ---------------------------------------------------------------------------
# Collaborators & invitations
# ---------------------------------------------------------------------------

class CollaboratorListView(APIView):
    def get(self, request, project_id):
        project = get_project(request.user, project_id)
        members = ProjectCollaborator.objects.filter(project=project).select_related("user", "invited_by")
        if project.role != OWNER:
            # Only the owner sees pending/declined invitations.
            members = members.filter(status=ProjectCollaborator.Status.ACCEPTED)
        owner = {
            "id": None,
            "user": {"id": project.user.id, "username": project.user.username},
            "invited_by": None,
            "role": OWNER,
            "status": ProjectCollaborator.Status.ACCEPTED,
            "invited_at": None,
            "accepted_at": None,
        }
        return Response([owner] + list(CollaboratorSerializer(members.order_by("invited_at"), many=True).data))


class InviteCollaboratorView(APIView):
    def post(self, request, project_id):
        project = get_project(request.user, project_id, OWNER)
        serializer = InviteCollaboratorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        identifier = serializer.validated_data["username"]
        role = serializer.validated_data["role"]

        invitee = find_active_user(identifier)
        if invitee is None:
            raise APIError("No user with that username or e-mail was found.", code="user_not_found",
                           status_code=status.HTTP_404_NOT_FOUND)
        if invitee.id == project.user_id:
            raise APIError("You cannot invite the project owner.", code="cannot_invite_owner")

        existing = ProjectCollaborator.objects.filter(project=project, user=invitee).first()
        if existing and existing.status == ProjectCollaborator.Status.ACCEPTED:
            raise APIError("This user is already a member of the project.", code="already_member")
        if existing and existing.status == ProjectCollaborator.Status.PENDING:
            raise APIError("This user has already been invited.", code="already_invited")
        if existing:  # previously declined: send a fresh invitation
            existing.status = ProjectCollaborator.Status.PENDING
            existing.role = role
            existing.invited_by = request.user
            existing.invited_at = timezone.now()
            existing.accepted_at = None
            existing.save()
            collaborator = existing
        else:
            collaborator = ProjectCollaborator.objects.create(
                project=project, user=invitee, invited_by=request.user, role=role
            )
        return Response(CollaboratorSerializer(collaborator).data, status=status.HTTP_201_CREATED)


class CollaboratorDetailView(APIView):
    def _get(self, request, project_id, collaborator_id):
        project = get_project(request.user, project_id, OWNER)
        return get_object_or_404(ProjectCollaborator.objects.select_related("user", "invited_by"),
                                 pk=collaborator_id, project=project)

    def patch(self, request, project_id, collaborator_id):
        collaborator = self._get(request, project_id, collaborator_id)
        serializer = CollaboratorUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        collaborator.role = serializer.validated_data["role"]
        collaborator.save(update_fields=["role"])
        return Response(CollaboratorSerializer(collaborator).data)

    def delete(self, request, project_id, collaborator_id):
        self._get(request, project_id, collaborator_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PendingInvitationsView(APIView):
    def get(self, request):
        invitations = (
            ProjectCollaborator.objects.filter(user=request.user, status=ProjectCollaborator.Status.PENDING)
            .select_related("project", "invited_by")
            .order_by("-invited_at")
        )
        return Response(PendingInvitationSerializer(invitations, many=True).data)


class RespondInvitationView(APIView):
    def post(self, request, collaborator_id):
        invitation = get_object_or_404(
            ProjectCollaborator, pk=collaborator_id, user=request.user, status=ProjectCollaborator.Status.PENDING
        )
        serializer = InvitationResponseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if serializer.validated_data["action"] == "accept":
            invitation.status = ProjectCollaborator.Status.ACCEPTED
            invitation.accepted_at = timezone.now()
        else:
            invitation.status = ProjectCollaborator.Status.DECLINED
        invitation.save(update_fields=["status", "accepted_at"])
        return Response({"status": invitation.status, "project_id": invitation.project_id})


# ---------------------------------------------------------------------------
# Folders
# ---------------------------------------------------------------------------

class FolderListCreateView(APIView):
    def get(self, request, project_id):
        project = get_project(request.user, project_id)
        parent = get_folder(project, request.query_params.get("parent"))
        folders = _annotated_folders(Folder.objects.filter(project=project, parent=parent)).order_by("name", "id")
        return Response(FolderSerializer(folders, many=True, context={"project": project}).data)

    def post(self, request, project_id):
        project = get_project(request.user, project_id, EDITOR)
        serializer = FolderSerializer(data=request.data, context={"project": project})
        serializer.is_valid(raise_exception=True)
        folder = serializer.save(project=project)
        return Response(
            FolderSerializer(folder, context={"project": project}).data, status=status.HTTP_201_CREATED
        )


class FolderTreeView(APIView):
    """All folders of a project as a flat, depth-first ordered list."""

    def get(self, request, project_id):
        project = get_project(request.user, project_id)
        folders = list(
            Folder.objects.filter(project=project)
            .annotate(publication_count=Count("publications"))
            .values("id", "name", "parent_id", "publication_count")
        )
        children = {}
        for folder in folders:
            children.setdefault(folder["parent_id"], []).append(folder)
        for items in children.values():
            items.sort(key=lambda item: item["name"].lower())

        ordered = []

        def walk(parent_id, depth, path):
            for folder in children.get(parent_id, []):
                if depth > Folder.MAX_DEPTH:
                    return
                folder_path = f"{path} / {folder['name']}" if path else folder["name"]
                ordered.append({
                    "id": folder["id"],
                    "name": folder["name"],
                    "parent": folder["parent_id"],
                    "depth": depth,
                    "path": folder_path,
                    "publication_count": folder["publication_count"],
                })
                walk(folder["id"], depth + 1, folder_path)

        walk(None, 0, "")
        return Response(ordered)


class FolderDetailView(APIView):
    def get(self, request, project_id, folder_id):
        project = get_project(request.user, project_id)
        folder = get_object_or_404(_annotated_folders(Folder.objects.filter(project=project)), pk=folder_id)
        return Response(FolderDetailSerializer(folder, context={"project": project}).data)

    def patch(self, request, project_id, folder_id):
        project = get_project(request.user, project_id, EDITOR)
        folder = get_object_or_404(Folder, project=project, pk=folder_id)
        serializer = FolderSerializer(folder, data=request.data, partial=True, context={"project": project})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        folder = _annotated_folders(Folder.objects.filter(pk=folder.pk)).get()
        return Response(FolderDetailSerializer(folder, context={"project": project}).data)

    def delete(self, request, project_id, folder_id):
        project = get_project(request.user, project_id, EDITOR)
        folder = get_object_or_404(Folder, project=project, pk=folder_id)
        keep = request.query_params.get("keep_publications", "true").lower() not in ("false", "0", "no")
        delete_folder(folder, keep_publications=keep)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Publications
# ---------------------------------------------------------------------------

class PublicationPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 200


PUBLICATION_SORTS = {
    "saved_desc": ("-saved_at", "-id"),
    "saved_asc": ("saved_at", "id"),
    "year_desc": ("-year", "-saved_at"),
    "year_asc": ("year", "-saved_at"),
    "citations_desc": ("-cited_by_count", "-saved_at"),
    "title": ("title", "id"),
}


class PublicationListCreateView(APIView):
    def get(self, request, project_id):
        project = get_project(request.user, project_id)
        folder_param = request.query_params.get("folder", "root")
        queryset = _publication_queryset().filter(project=project)
        if folder_param != "all":
            queryset = queryset.filter(folder=get_folder(project, folder_param))

        text = (request.query_params.get("q") or "").strip()[:200]
        if text:
            queryset = queryset.filter(
                Q(title__icontains=text) | Q(authors__icontains=text) | Q(source_name__icontains=text)
            )
        label = request.query_params.get("label")
        if label == "none":
            queryset = queryset.filter(label__isnull=True)
        elif label in SavedPublication.Label.values:
            queryset = queryset.filter(label=label)

        ordering = PUBLICATION_SORTS.get(request.query_params.get("sort"), PUBLICATION_SORTS["saved_desc"])
        queryset = queryset.order_by(*ordering)

        paginator = PublicationPagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        context = {"request": request, "role": project.role}
        return paginator.get_paginated_response(SavedPublicationSerializer(page, many=True, context=context).data)

    def post(self, request, project_id):
        project = get_project(request.user, project_id, EDITOR)
        serializer = SavePublicationsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        folder = get_folder(project, serializer.validated_data.get("folder_id"))
        created, skipped = save_publications(project, folder, serializer.validated_data["ids"], request.user)
        saved = _publication_queryset().filter(pk__in=[pub.pk for pub in created]).order_by("-saved_at", "-id")
        context = {"request": request, "role": project.role}
        return Response(
            {"saved": SavedPublicationSerializer(saved, many=True, context=context).data, "skipped": skipped},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class PublicationDetailView(APIView):
    def _get(self, request, project_id, publication_id, required=VIEWER):
        project = get_project(request.user, project_id, required)
        publication = get_object_or_404(_publication_queryset(), pk=publication_id, project=project)
        return project, publication

    def get(self, request, project_id, publication_id):
        project, publication = self._get(request, project_id, publication_id)
        return Response(SavedPublicationSerializer(publication, context={"request": request, "role": project.role}).data)

    def patch(self, request, project_id, publication_id):
        project, publication = self._get(request, project_id, publication_id, EDITOR)
        serializer = PublicationUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        with transaction.atomic():
            if "label" in data:
                publication.label = data["label"]
                publication.save(update_fields=["label"])
            if "folder_id" in data:
                move_publication(publication, get_folder(project, data["folder_id"]))
        publication = _publication_queryset().get(pk=publication.pk)
        return Response(SavedPublicationSerializer(publication, context={"request": request, "role": project.role}).data)

    def delete(self, request, project_id, publication_id):
        _, publication = self._get(request, project_id, publication_id, EDITOR)
        publication.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PublicationNoteListCreateView(APIView):
    def get(self, request, project_id, publication_id):
        project = get_project(request.user, project_id)
        publication = get_object_or_404(SavedPublication, pk=publication_id, project=project)
        notes = publication.notes.select_related("author").order_by("created_at")
        context = {"request": request, "role": project.role}
        return Response(PublicationNoteSerializer(notes, many=True, context=context).data)

    def post(self, request, project_id, publication_id):
        project = get_project(request.user, project_id, EDITOR)
        publication = get_object_or_404(SavedPublication, pk=publication_id, project=project)
        context = {"request": request, "role": project.role}
        serializer = PublicationNoteSerializer(data=request.data, context=context)
        serializer.is_valid(raise_exception=True)
        note = serializer.save(publication=publication, author=request.user)
        return Response(PublicationNoteSerializer(note, context=context).data, status=status.HTTP_201_CREATED)


class PublicationNoteDetailView(APIView):
    def _get(self, request, project_id, publication_id, note_id):
        project = get_project(request.user, project_id)
        note = get_object_or_404(
            PublicationNote.objects.select_related("author"),
            pk=note_id, publication_id=publication_id, publication__project=project,
        )
        if not note_editable(request.user, project.role, note):
            raise PermissionDenied("You can only change your own notes.", code="note_not_editable")
        return project, note

    def patch(self, request, project_id, publication_id, note_id):
        project, note = self._get(request, project_id, publication_id, note_id)
        context = {"request": request, "role": project.role}
        serializer = PublicationNoteSerializer(note, data=request.data, partial=True, context=context)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, project_id, publication_id, note_id):
        _, note = self._get(request, project_id, publication_id, note_id)
        note.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
