from django.urls import path

from apps.projects.api import user_views

urlpatterns = [
    path("inbox/", user_views.InboxListView.as_view()),
    path("inbox/share/", user_views.SharePublicationView.as_view()),
    path("inbox/read-all/", user_views.InboxMarkAllReadView.as_view()),
    path("inbox/<int:shared_id>/", user_views.InboxItemView.as_view()),
    path("inbox/<int:shared_id>/read/", user_views.InboxMarkReadView.as_view()),
    path("notifications/", user_views.NotificationSummaryView.as_view()),
    path("history/", user_views.SearchHistoryView.as_view()),
    path("history/<int:entry_id>/", user_views.SearchHistoryEntryView.as_view()),
]
