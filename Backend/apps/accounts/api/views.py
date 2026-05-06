from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import PermissionDenied

from apps.accounts.api.serializers import (
    RegisterSerializer,
    UserListSerializer,
    LoginSerializer,
)
from apps.projects.models import Project, SavedPublication, SearchHistory


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response(
                {
                    "message": "User created",
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                },
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data["user"]
            refresh = RefreshToken.for_user(user)
            return Response(
                {
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                },
                status=status.HTTP_200_OK,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(
            {
                "id": request.user.id,
                "username": request.user.username,
                "email": request.user.email,
                "is_staff": request.user.is_staff,
            }
        )


class UserListView(generics.ListAPIView):
    serializer_class = UserListSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        return User.objects.exclude(is_superuser=True).order_by("-date_joined")

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        data = serializer.data
        for item in data:
            user_id = item["id"]
            item["project_count"] = Project.objects.filter(user_id=user_id).count()
            item["publication_count"] = SavedPublication.objects.filter(project__user_id=user_id).count()
            item["search_count"] = SearchHistory.objects.filter(user_id=user_id).count()
        return Response(data)


class UserDeleteView(generics.DestroyAPIView):
    serializer_class = UserListSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_object(self):
        user = get_object_or_404(User, id=self.kwargs["user_id"])
        if user.is_superuser:
            raise PermissionDenied("Cannot delete superuser.")
        return user


class UserToggleStaffView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, user_id):
        user = get_object_or_404(User, id=user_id)
        if user.is_superuser:
            raise PermissionDenied("Cannot modify superuser.")
        user.is_staff = not user.is_staff
        user.save()
        return Response({"is_staff": user.is_staff, "username": user.username})