from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.projects.access import get_folder, get_project
from apps.projects.services.library import annotate_saved
from apps.recommendations.services import recommend


class RecommendationRequestSerializer(serializers.Serializer):
    folder_id = serializers.IntegerField(required=False, allow_null=True)
    limit = serializers.IntegerField(required=False, min_value=1, max_value=30, default=10)


class ProjectRecommendationsView(APIView):
    throttle_scope = "recommendations"

    def post(self, request, project_id):
        project = get_project(request.user, project_id)
        serializer = RecommendationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        folder = get_folder(project, serializer.validated_data.get("folder_id"))
        result = recommend(project, request.user, folder=folder, limit=serializer.validated_data["limit"])
        recommendations = [dict(item) for item in result["recommendations"]]
        annotate_saved(request.user, recommendations)
        return Response({**result, "recommendations": recommendations})
