from django.urls import path
from .views import register, UserListView, UserDeleteView

from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path("register/", register),
    path("login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("users/", UserListView.as_view()),
    path("users/<int:user_id>/", UserDeleteView.as_view()),
]