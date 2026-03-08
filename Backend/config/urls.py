
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path("api/search/", include("apps.search.api.urls")),
    path("api/auth/", include("apps.accounts.api.urls")),
    path("api/projects/", include("apps.projects.api.urls")),
]
