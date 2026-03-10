from django.urls import path
from .views import ProjectListCreateView, SavedPublicationListCreateView

urlpatterns = [
    path("", ProjectListCreateView.as_view(), name="project/create"),
    path("<int:project_id>/publications/", SavedPublicationListCreateView.as_view()),
]