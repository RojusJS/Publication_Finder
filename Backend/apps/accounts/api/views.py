from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User

from apps.accounts.api.serializers import (
    RegisterSerializer,
    UserListSerializer,
    LoginSerializer,
)

@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
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

@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
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

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
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
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        return User.objects.exclude(is_superuser=True).order_by("-date_joined")

class UserDeleteView(generics.DestroyAPIView):
    serializer_class = UserListSerializer
    permission_classes = [IsAdminUser]

    def get_object(self):
        from django.shortcuts import get_object_or_404
        from rest_framework.exceptions import PermissionDenied

        user = get_object_or_404(User, id=self.kwargs["user_id"])
        if user.is_superuser:
            raise PermissionDenied("Cannot delete superuser.")
        return user