from django.urls import path
from .views import register, login, UserListView, UserDeleteView, me

from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path("register/", register),
    path("login/", login),
    path("refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("users/", UserListView.as_view()),
    path("users/<int:user_id>/", UserDeleteView.as_view()),
    path("me/", me),
]