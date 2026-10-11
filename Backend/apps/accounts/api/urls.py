from django.urls import path

from apps.accounts.api import views

urlpatterns = [
    path("register/", views.RegisterView.as_view()),
    path("login/", views.LoginView.as_view()),
    path("refresh/", views.RefreshView.as_view()),
    path("logout/", views.LogoutView.as_view()),
    path("me/", views.MeView.as_view()),
    path("me/password/", views.ChangePasswordView.as_view()),
    path("users/", views.UserListView.as_view()),
    path("users/<int:user_id>/", views.UserAdminDetailView.as_view()),
    path("users/<int:user_id>/toggle-staff/", views.UserToggleStaffView.as_view()),
]
