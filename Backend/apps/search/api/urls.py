from django.urls import path
from .views import search_publications

urlpatterns = [
    path("publications/", search_publications),
]