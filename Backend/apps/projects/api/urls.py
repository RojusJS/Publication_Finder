from django.urls import path
from .views import ProjectListCreateView, SavedPublicationListCreateView, SavedPublicationDeleteView, ProjectDeleteView, FolderDeleteView, FolderListCreateView

urlpatterns = [
    path("", ProjectListCreateView.as_view()),
    path("<int:project_id>/", ProjectDeleteView.as_view()),
    path("<int:project_id>/folders/", FolderListCreateView.as_view()),
    path("<int:project_id>/folders/<int:folder_id>/", FolderDeleteView.as_view()),
    path("<int:project_id>/folders/<int:folder_id>/publications/", SavedPublicationListCreateView.as_view()),
    path("<int:project_id>/folders/<int:folder_id>/publications/<int:publication_id>/", SavedPublicationDeleteView.as_view()),
]