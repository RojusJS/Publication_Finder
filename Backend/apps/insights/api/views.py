from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.exceptions import APIError
from apps.insights import services
from apps.insights.models import ProjectInsight
from apps.projects.access import get_folder, get_project


class InsightSerializer(serializers.ModelSerializer):
    created_by = serializers.CharField(source="created_by.username", default=None, read_only=True)
    folder_id = serializers.IntegerField(read_only=True)
    model = serializers.CharField(source="model_name", read_only=True)

    class Meta:
        model = ProjectInsight
        fields = ["id", "focus", "language", "folder_id", "sections", "model", "publication_count", "created_by", "created_at"]
        read_only_fields = fields


class InsightRequestSerializer(serializers.Serializer):
    focus = serializers.CharField(required=False, default="overview", max_length=20)
    language = serializers.ChoiceField(choices=services.LANGUAGES, required=False, default="en")
    folder_id = serializers.IntegerField(required=False, allow_null=True)
    force = serializers.BooleanField(required=False, default=False)

    def validate_focus(self, value):
        return services.normalize_focus(value)


class ProjectInsightsView(APIView):
    throttle_scope = "ai"
    throttle_scope_methods = ("POST",)

    @staticmethod
    def _scope(request, project_id, data):
        project = get_project(request.user, project_id)
        return project, get_folder(project, data.get("folder_id"))

    def get(self, request, project_id):
        params = {
            "focus": request.query_params.get("focus", "overview"),
            "language": request.query_params.get("language", "en"),
            "folder_id": request.query_params.get("folder") or None,
        }
        serializer = InsightRequestSerializer(data=params)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        project, folder = self._scope(request, project_id, data)
        insight = (
            ProjectInsight.objects.filter(project=project, folder=folder, focus=data["focus"], language=data["language"])
            .select_related("created_by")
            .order_by("-created_at")
            .first()
        )
        stale = False
        if insight is not None:
            publications = services.select_publications(project, folder)
            stale = services.input_hash(publications, folder, insight.focus, insight.language) != insight.input_hash
        return Response({"insight": InsightSerializer(insight).data if insight else None, "stale": stale})

    def post(self, request, project_id):
        serializer = InsightRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        project, folder = self._scope(request, project_id, data)
        insight, cached = services.generate_insight(
            project, folder, data["focus"], data["language"], request.user, force=data["force"]
        )
        if insight is None:
            raise APIError("There are no publications to analyse yet.", code="no_publications")
        return Response({"insight": InsightSerializer(insight).data, "cached": cached, "stale": False})
