"""Endpoints scoped to the current user: inbox (shared publications),
notification counters and search history."""
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.lookup import find_active_user
from apps.core.exceptions import APIError
from apps.core.identifiers import normalize_work_id
from apps.projects.access import accessible_projects
from apps.projects.api.serializers import (
    SearchHistorySerializer,
    SharedPublicationSerializer,
    SharePublicationSerializer,
)
from apps.projects.models import ProjectCollaborator, SavedPublication, SearchHistory, SharedPublication
from apps.projects.services.publications import resolve_publications


class InboxPagination(PageNumberPagination):
    page_size = 20


class SharePublicationView(APIView):
    throttle_scope = "share"

    def post(self, request):
        serializer = SharePublicationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        recipient = find_active_user(data["username"])
        if recipient is None:
            raise APIError("No user with that username or e-mail was found.", code="user_not_found",
                           status_code=status.HTTP_404_NOT_FOUND)
        if recipient.id == request.user.id:
            raise APIError("You cannot share a publication with yourself.", code="cannot_share_with_self")

        openalex_id = normalize_work_id(data["openalex_id"])
        saved = (
            SavedPublication.objects.filter(openalex_id=openalex_id, project__in=accessible_projects(request.user))
            .order_by("-saved_at")
            .first()
        )
        if saved is not None:
            publication = saved.as_publication()
        else:
            publication = resolve_publications([data["openalex_id"]]).get(data["openalex_id"])
            if publication is None:
                raise APIError("Publication not found.", code="publication_not_found",
                               status_code=status.HTTP_404_NOT_FOUND)

        existing = SharedPublication.objects.filter(
            sender=request.user, recipient=recipient, openalex_id=openalex_id, viewed=False
        ).first()
        if existing:
            existing.message = data["message"]
            existing.publication_data = publication
            existing.created_at = timezone.now()
            existing.save(update_fields=["message", "publication_data", "created_at"])
            shared = existing
        else:
            shared = SharedPublication.objects.create(
                sender=request.user,
                recipient=recipient,
                openalex_id=openalex_id,
                publication_data=publication,
                message=data["message"],
            )
        return Response(SharedPublicationSerializer(shared).data, status=status.HTTP_201_CREATED)


class InboxListView(APIView):
    def get(self, request):
        queryset = SharedPublication.objects.filter(recipient=request.user).select_related("sender")
        if request.query_params.get("unread") in ("1", "true"):
            queryset = queryset.filter(viewed=False)
        paginator = InboxPagination()
        page = paginator.paginate_queryset(queryset.order_by("-created_at", "-id"), request, view=self)
        return paginator.get_paginated_response(SharedPublicationSerializer(page, many=True).data)


class InboxItemView(APIView):
    def delete(self, request, shared_id):
        get_object_or_404(SharedPublication, pk=shared_id, recipient=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class InboxMarkReadView(APIView):
    def post(self, request, shared_id):
        updated = SharedPublication.objects.filter(pk=shared_id, recipient=request.user).update(viewed=True)
        if not updated:
            raise APIError("Not found.", code="not_found", status_code=status.HTTP_404_NOT_FOUND)
        return Response({"viewed": True})


class InboxMarkAllReadView(APIView):
    def post(self, request):
        count = SharedPublication.objects.filter(recipient=request.user, viewed=False).update(viewed=True)
        return Response({"updated": count})


class NotificationSummaryView(APIView):
    def get(self, request):
        return Response({
            "pending_invitations": ProjectCollaborator.objects.filter(
                user=request.user, status=ProjectCollaborator.Status.PENDING
            ).count(),
            "unread_shared": SharedPublication.objects.filter(recipient=request.user, viewed=False).count(),
        })


class SearchHistoryView(APIView):
    def get(self, request):
        history = SearchHistory.objects.filter(user=request.user).order_by("-created_at", "-id")[:30]
        return Response(SearchHistorySerializer(history, many=True).data)

    def delete(self, request):
        SearchHistory.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SearchHistoryEntryView(APIView):
    def delete(self, request, entry_id):
        get_object_or_404(SearchHistory, pk=entry_id, user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
