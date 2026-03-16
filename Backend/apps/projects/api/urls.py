from django.urls import path
from .views import ProjectListCreateView, SavedPublicationListCreateView, SavedPublicationDeleteView, ProjectDeleteView

urlpatterns = [
    path("", ProjectListCreateView.as_view(), name="project/create"),
    path("<int:project_id>/", ProjectDeleteView.as_view(), name="project/delete"),
    path("<int:project_id>/publications/", SavedPublicationListCreateView.as_view()),
    path("<int:project_id>/publications/<int:publication_id>/", SavedPublicationDeleteView.as_view()),
]