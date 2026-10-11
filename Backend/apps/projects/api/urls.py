from django.urls import path

from apps.projects.api import views

urlpatterns = [
    path("", views.ProjectListCreateView.as_view()),
    path("invitations/", views.PendingInvitationsView.as_view()),
    path("invitations/<int:collaborator_id>/respond/", views.RespondInvitationView.as_view()),
    path("<int:project_id>/", views.ProjectDetailView.as_view()),
    path("<int:project_id>/leave/", views.ProjectLeaveView.as_view()),
    path("<int:project_id>/analytics/", views.ProjectAnalyticsView.as_view()),
    path("<int:project_id>/export/", views.ProjectExportView.as_view()),
    path("<int:project_id>/semantic-search/", views.SemanticSearchView.as_view()),
    path("<int:project_id>/recommendation-feedback/", views.RecommendationFeedbackView.as_view()),
    path("<int:project_id>/collaborators/", views.CollaboratorListView.as_view()),
    path("<int:project_id>/collaborators/invite/", views.InviteCollaboratorView.as_view()),
    path("<int:project_id>/collaborators/<int:collaborator_id>/", views.CollaboratorDetailView.as_view()),
    path("<int:project_id>/folders/", views.FolderListCreateView.as_view()),
    path("<int:project_id>/folders/tree/", views.FolderTreeView.as_view()),
    path("<int:project_id>/folders/<int:folder_id>/", views.FolderDetailView.as_view()),
    path("<int:project_id>/publications/", views.PublicationListCreateView.as_view()),
    path("<int:project_id>/publications/<int:publication_id>/", views.PublicationDetailView.as_view()),
    path("<int:project_id>/publications/<int:publication_id>/notes/", views.PublicationNoteListCreateView.as_view()),
    path(
        "<int:project_id>/publications/<int:publication_id>/notes/<int:note_id>/",
        views.PublicationNoteDetailView.as_view(),
    ),
]
