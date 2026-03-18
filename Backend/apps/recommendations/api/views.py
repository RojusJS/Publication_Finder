from rest_framework import generics, permissions
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response

from apps.projects.models import Project


class ProjectRecommendationsView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, project_id):
        project = get_object_or_404(Project, id=project_id, user=request.user)
        return Response({"recommendations": []})