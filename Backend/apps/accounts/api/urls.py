from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, LoginView, MeView,
    UserListView, UserDeleteView,
    UserToggleStaffView,
)

urlpatterns = [
    path("register/", RegisterView.as_view()),
    path("login/", LoginView.as_view()),
    path("refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", MeView.as_view()),
    path("users/", UserListView.as_view()),
    path("users/<int:user_id>/", UserDeleteView.as_view()),
    path("users/<int:user_id>/toggle-staff/", UserToggleStaffView.as_view()),
]