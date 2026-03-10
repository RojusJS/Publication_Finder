from django.urls import path
from .views import ProjectListCreateView, SavedPublicationListCreateView, SavedPublicationDeleteView

urlpatterns = [
    path("", ProjectListCreateView.as_view(), name="project/create"),
    path("<int:project_id>/publications/", SavedPublicationListCreateView.as_view()),
    path("<int:project_id>/publications/<int:publication_id>/", SavedPublicationDeleteView.as_view()),
]