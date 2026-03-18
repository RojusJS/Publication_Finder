from django.urls import path
from .views import ProjectRecommendationsView

urlpatterns = [
    path("<int:project_id>/", ProjectRecommendationsView.as_view()),
]