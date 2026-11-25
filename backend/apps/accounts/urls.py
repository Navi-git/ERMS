from django.urls import path

from . import views

app_name = "accounts"

urlpatterns = [
    path("register/", views.RegisterView.as_view(), name="register"),
    path("verify-otp/", views.VerifyOtpView.as_view(), name="verify-otp"),
    path("resend-otp/", views.ResendOtpView.as_view(), name="resend-otp"),
    path("login/", views.LoginView.as_view(), name="login"),
    path("admin/login/", views.SuperAdminLoginView.as_view(), name="admin-login"),
    path("admin/dashboard/stats/", views.AdminDashboardStatsView.as_view(), name="admin-dashboard-stats"),
    path("google/", views.GoogleLoginView.as_view(), name="google-login"),
    path("token/refresh/", views.RefreshView.as_view(), name="token-refresh"),
    path("logout/", views.LogoutView.as_view(), name="logout"),
    path("me/", views.MeView.as_view(), name="me"),
    path("password-reset/request/", views.PasswordResetRequestView.as_view(), name="password-reset-request"),
    path("password-reset/confirm/", views.PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
]
