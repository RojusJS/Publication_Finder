from django.urls import path
from .views import search_publications, publication_detail, citing_works, referenced_works
from .author_views import author_search, author_detail

urlpatterns = [
    path("publications/", search_publications),
    path("publications/detail/", publication_detail),
    path("publications/citing/", citing_works),
    path("publications/referenced/", referenced_works),
    path("authors/", author_search),
    path("authors/detail/", author_detail),
]