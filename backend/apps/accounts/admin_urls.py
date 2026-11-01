from django.urls import path
from . import admin_views

app_name = "admin-users"

urlpatterns = [
    path("users/", admin_views.AdminUserListView.as_view(), name="admin-user-list"),
    path("users/<int:user_id>/", admin_views.AdminUserDetailView.as_view(), name="admin-user-detail"),
    path("users/<int:user_id>/suspend/", admin_views.AdminUserSuspendView.as_view(), name="admin-user-suspend"),
    path("users/<int:user_id>/reactivate/", admin_views.AdminUserReactivateView.as_view(), name="admin-user-reactivate"),
    path("users/<int:user_id>/restore/", admin_views.AdminUserRestoreView.as_view(), name="admin-user-restore"),
    path("users/<int:user_id>/reset-password/", admin_views.AdminUserSendPasswordResetView.as_view(), name="admin-user-reset-password"),
]

