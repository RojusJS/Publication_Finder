from django.urls import path
from .views import ProjectListCreateView, SavedPublicationListCreateView, SavedPublicationDeleteView, ProjectDeleteView, FolderDeleteView, FolderListCreateView, ProjectPublicationListCreateView, ProjectPublicationDeleteView

urlpatterns = [
    path("", ProjectListCreateView.as_view()),
    path("<int:project_id>/", ProjectDeleteView.as_view()),
    path("<int:project_id>/folders/", FolderListCreateView.as_view()),
    path("<int:project_id>/folders/<int:folder_id>/", FolderDeleteView.as_view()),
    path("<int:project_id>/folders/<int:folder_id>/publications/", SavedPublicationListCreateView.as_view()),
    path("<int:project_id>/folders/<int:folder_id>/publications/<int:publication_id>/", SavedPublicationDeleteView.as_view()),
    path("<int:project_id>/publications/", ProjectPublicationListCreateView.as_view()),
    path("<int:project_id>/publications/<int:publication_id>/", ProjectPublicationDeleteView.as_view()),
]