from django.contrib import admin
from django.urls import include, path

from apps.core.views import HealthView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", HealthView.as_view(), name="health"),
    path("api/auth/", include("apps.accounts.api.urls")),
    path("api/search/", include("apps.search.api.urls")),
    path("api/projects/", include("apps.projects.api.urls")),
    path("api/", include("apps.projects.api.user_urls")),
    path("api/recommendations/", include("apps.recommendations.api.urls")),
    path("api/insights/", include("apps.insights.api.urls")),
]
