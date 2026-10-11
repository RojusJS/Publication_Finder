from django.urls import path

from apps.recommendations.api.views import ProjectRecommendationsView

urlpatterns = [
    path("<int:project_id>/", ProjectRecommendationsView.as_view()),
]
