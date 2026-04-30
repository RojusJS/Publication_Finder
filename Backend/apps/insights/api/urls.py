from django.urls import path
from .views import ProjectInsightsView

urlpatterns = [
    path("<int:project_id>/", ProjectInsightsView.as_view()),
]