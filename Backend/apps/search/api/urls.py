from django.urls import path
from .views import search_publications, publication_detail

urlpatterns = [
    path("publications/", search_publications),
    path("publications/detail/", publication_detail),
]