from django.urls import path
from apps.applications.views import (
    RecruiterApplicationListView,
    RecruiterApplicationDetailView,
    RecruiterApplicationStageMoveView,
    RecruiterApplicationShortlistView,
    RecruiterApplicationRejectView,
    RecruiterApplicationHireView,
    RecruiterApplicationNotesView,
    RecruiterApplicationNoteDetailView,
)

urlpatterns = [
    path("", RecruiterApplicationListView.as_view(), name="recruiter-applications-list"),
    path("<int:id>/", RecruiterApplicationDetailView.as_view(), name="recruiter-application-detail"),
    path("<int:id>/stage/", RecruiterApplicationStageMoveView.as_view(), name="recruiter-application-stage-move"),
    path("<int:id>/shortlist/", RecruiterApplicationShortlistView.as_view(), name="recruiter-application-shortlist"),
    path("<int:id>/reject/", RecruiterApplicationRejectView.as_view(), name="recruiter-application-reject"),
    path("<int:id>/hire/", RecruiterApplicationHireView.as_view(), name="recruiter-application-hire"),
    path("<int:id>/notes/", RecruiterApplicationNotesView.as_view(), name="recruiter-application-notes"),
    path("<int:id>/notes/<int:nid>/", RecruiterApplicationNoteDetailView.as_view(), name="recruiter-application-note-detail"),
]

