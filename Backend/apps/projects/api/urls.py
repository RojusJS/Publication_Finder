from django.urls import path
from django.urls import path
from .views import (
    ProjectListCreateView,
    ProjectDetailView,
    SavedPublicationListCreateView,
    SavedPublicationDeleteView,
    FolderDetailView,
    FolderListCreateView,
    ProjectPublicationListCreateView,
    ProjectPublicationDeleteView,
    PublicationNoteListCreateView,
    PublicationNoteDetailView,
    PublicationLabelUpdateView,
    ProjectAnalyticsView,
)
urlpatterns = [
    path("", ProjectListCreateView.as_view()),
    path("<int:project_id>/", ProjectDetailView.as_view()),
    path("<int:project_id>/analytics/", ProjectAnalyticsView.as_view()),
    path("<int:project_id>/folders/", FolderListCreateView.as_view()),
    path("<int:project_id>/folders/<int:folder_id>/", FolderDetailView.as_view()),
    path("<int:project_id>/folders/<int:folder_id>/publications/", SavedPublicationListCreateView.as_view()),
    path("<int:project_id>/folders/<int:folder_id>/publications/<int:publication_id>/", SavedPublicationDeleteView.as_view()),
    path("<int:project_id>/publications/", ProjectPublicationListCreateView.as_view()),
    path("<int:project_id>/publications/<int:publication_id>/", ProjectPublicationDeleteView.as_view()),
    path("publications/<int:publication_id>/notes/", PublicationNoteListCreateView.as_view()),
    path("publications/<int:publication_id>/notes/<int:note_id>/", PublicationNoteDetailView.as_view()),
    path("publications/<int:publication_id>/label/", PublicationLabelUpdateView.as_view()),
]