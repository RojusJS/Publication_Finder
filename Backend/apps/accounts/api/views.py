from django.contrib.auth import get_user_model
from django.db.models import Count, IntegerField, OuterRef, Q, Subquery, Value
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.api.serializers import (
    AdminUserSerializer,
    ChangePasswordSerializer,
    DeleteAccountSerializer,
    LoginSerializer,
    ProfileUpdateSerializer,
    RegisterSerializer,
    UserSerializer,
)
from apps.accounts.tokens import (
    blacklist_all_tokens,
    clear_refresh_cookie,
    issue_tokens,
    refresh_token_from_request,
    set_refresh_cookie,
)
from apps.core.exceptions import APIError
from apps.projects.models import Project, SavedPublication, SearchHistory

User = get_user_model()


def _session_response(user, status_code=status.HTTP_200_OK):
    access, refresh = issue_tokens(user)
    response = Response({"access": access, "user": UserSerializer(user).data}, status=status_code)
    return set_refresh_cookie(response, refresh)


class AnonymousAuthView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]


class RegisterView(AnonymousAuthView):
    throttle_scope = "auth"

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return _session_response(user, status.HTTP_201_CREATED)


class LoginView(AnonymousAuthView):
    throttle_scope = "auth"

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        return _session_response(serializer.validated_data["user"])


class RefreshView(AnonymousAuthView):
    def post(self, request):
        token = refresh_token_from_request(request)
        if not token:
            raise APIError("You are not signed in.", code="not_authenticated", status_code=status.HTTP_401_UNAUTHORIZED)
        serializer = TokenRefreshSerializer(data={"refresh": token})
        try:
            serializer.is_valid(raise_exception=True)
        except (TokenError, ValidationError, AuthenticationFailed):
            response = Response(
                {"error": "Your session has expired. Please sign in again.", "code": "session_expired"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            return clear_refresh_cookie(response)
        return Response({"access": serializer.validated_data["access"]})


class LogoutView(AnonymousAuthView):
    def post(self, request):
        token = refresh_token_from_request(request)
        if token:
            try:
                RefreshToken(token).blacklist()
            except TokenError:
                pass  # already invalid or expired
        return clear_refresh_cookie(Response(status=status.HTTP_204_NO_CONTENT))


class MeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = ProfileUpdateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        request.user.email = serializer.validated_data["email"]
        request.user.save(update_fields=["email"])
        return Response(UserSerializer(request.user).data)

    def delete(self, request):
        serializer = DeleteAccountSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        if request.user.is_superuser:
            raise APIError("Superuser accounts cannot be deleted here.", code="superuser_protected")
        blacklist_all_tokens(request.user)
        request.user.delete()
        return clear_refresh_cookie(Response(status=status.HTTP_204_NO_CONTENT))


class ChangePasswordView(APIView):
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = request.user
        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])
        # Sign out every other session, keep this one signed in with fresh tokens.
        blacklist_all_tokens(user)
        return _session_response(user)


# ---------------------------------------------------------------------------
# Administration
# ---------------------------------------------------------------------------

class AdminUserPagination(PageNumberPagination):
    page_size = 25


def _count_subquery(queryset, user_field):
    return Coalesce(
        Subquery(
            queryset.filter(**{user_field: OuterRef("pk")})
            .order_by()
            .values(user_field)
            .annotate(total=Count("pk"))
            .values("total")[:1],
            output_field=IntegerField(),
        ),
        Value(0),
    )


class UserListView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        queryset = User.objects.annotate(
            project_count=_count_subquery(Project.objects.all(), "user"),
            publication_count=_count_subquery(SavedPublication.objects.all(), "project__user"),
            search_count=_count_subquery(SearchHistory.objects.all(), "user"),
        ).order_by("-date_joined", "-id")
        query = (request.query_params.get("q") or "").strip()
        if query:
            queryset = queryset.filter(Q(username__icontains=query) | Q(email__icontains=query))
        paginator = AdminUserPagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        return paginator.get_paginated_response(AdminUserSerializer(page, many=True).data)


class UserAdminDetailView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def delete(self, request, user_id):
        target = get_object_or_404(User, pk=user_id)
        if target.pk == request.user.pk:
            raise PermissionDenied("Use the account settings to delete your own account.", code="cannot_delete_self")
        if target.is_superuser:
            raise PermissionDenied("Superusers cannot be deleted.", code="superuser_protected")
        if target.is_staff and not request.user.is_superuser:
            raise PermissionDenied("Only a superuser can delete administrators.", code="superuser_required")
        blacklist_all_tokens(target)
        target.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserToggleStaffView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, user_id):
        if not request.user.is_superuser:
            raise PermissionDenied("Only a superuser can change administrator rights.", code="superuser_required")
        target = get_object_or_404(User, pk=user_id)
        if target.pk == request.user.pk or target.is_superuser:
            raise PermissionDenied("This account's rights cannot be changed.", code="superuser_protected")
        target.is_staff = not target.is_staff
        target.save(update_fields=["is_staff"])
        return Response({"id": target.pk, "username": target.username, "is_staff": target.is_staff})
