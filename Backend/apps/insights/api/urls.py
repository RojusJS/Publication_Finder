from django.urls import path

from apps.insights.api.views import ProjectInsightsView

urlpatterns = [
    path("<int:project_id>/", ProjectInsightsView.as_view()),
]
