from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework import generics
from apps.accounts.api.serializers import RegisterSerializer, UserListSerializer
from django.contrib.auth.models import User


@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        return Response({"message": "User created", "id": user.id, "username": user.username, "email": user.email},
            status=status.HTTP_201_CREATED,
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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
        user = get_object_or_404(User, id=self.kwargs["user_id"])
        if user.is_superuser:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Cannot delete superuser.")
        return user