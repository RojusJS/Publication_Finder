from django.urls import path

from apps.search.api import views

urlpatterns = [
    path("publications/", views.PublicationSearchView.as_view()),
    path("publications/detail/", views.PublicationDetailView.as_view()),
    path("publications/network/", views.CitationNetworkView.as_view()),
    path("publications/cite/", views.CitationView.as_view()),
    path("authors/", views.AuthorSearchView.as_view()),
    path("authors/detail/", views.AuthorDetailView.as_view()),
    path("authors/works/", views.AuthorWorksView.as_view()),
    path("institutions/autocomplete/", views.InstitutionAutocompleteView.as_view()),
]
