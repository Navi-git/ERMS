from django.urls import path
from . import user_views

app_name = "users"

urlpatterns = [
    path("me/", user_views.UserProfileView.as_view(), name="user-profile"),
    path("me/photo/", user_views.UserProfilePhotoView.as_view(), name="user-profile-photo"),
    path("me/password/", user_views.UserPasswordChangeView.as_view(), name="user-password-change"),
    path("me/linked-logins/", user_views.UserLinkedLoginsView.as_view(), name="user-linked-logins"),
    path("me/linked-logins/<int:identity_id>/", user_views.UserLinkedLoginsView.as_view(), name="user-linked-logins-detail"),
]

