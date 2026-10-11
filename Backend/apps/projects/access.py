"""Single source of truth for project permissions.

Roles: ``owner`` (created the project) > ``editor`` > ``viewer``. Users without a
role get a 404 so the existence of other people's projects is not revealed.
"""
from django.db.models import Q
from rest_framework.exceptions import NotFound, PermissionDenied

from apps.projects.models import Folder, Project, ProjectCollaborator

OWNER = "owner"
EDITOR = "editor"
VIEWER = "viewer"

_LEVELS = {VIEWER: 1, EDITOR: 2, OWNER: 3}
_DENIED = {
    EDITOR: ("You need editor access to this project to do that.", "editor_required"),
    OWNER: ("Only the project owner can do that.", "owner_required"),
}


def accessible_projects(user):
    if not user or not user.is_authenticated:
        return Project.objects.none()
    return Project.objects.filter(
        Q(user=user)
        | Q(collaborators__user=user, collaborators__status=ProjectCollaborator.Status.ACCEPTED)
    ).distinct()


def project_role(user, project):
    if not user or not user.is_authenticated or project is None:
        return None
    if project.user_id == user.id:
        return OWNER
    return (
        ProjectCollaborator.objects.filter(
            project=project, user=user, status=ProjectCollaborator.Status.ACCEPTED
        )
        .values_list("role", flat=True)
        .first()
    )


def has_role(role, required):
    return _LEVELS.get(role, 0) >= _LEVELS[required]


def get_project(user, project_id, required=VIEWER):
    """Return the project with ``project.role`` set, or raise 404/403."""
    project = Project.objects.select_related("user").filter(pk=project_id).first()
    role = project_role(user, project)
    if role is None:
        raise NotFound("Project not found.", code="project_not_found")
    if not has_role(role, required):
        message, code = _DENIED[required]
        raise PermissionDenied(message, code=code)
    project.role = role
    return project


def get_folder(project, folder_id):
    """Return a folder of ``project`` (``None`` for the root) or raise 404."""
    if folder_id in (None, "", "root"):
        return None
    try:
        folder_id = int(folder_id)
    except (TypeError, ValueError):
        raise NotFound("Folder not found.", code="folder_not_found") from None
    folder = Folder.objects.filter(project=project, pk=folder_id).first()
    if folder is None:
        raise NotFound("Folder not found.", code="folder_not_found")
    return folder
