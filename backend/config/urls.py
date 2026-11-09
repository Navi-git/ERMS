from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/users/", include("apps.accounts.user_urls")),
    path("api/v1/admin/", include("apps.accounts.admin_urls")),
    path("api/v1/admin/", include("apps.master_data.admin_urls")),
    path("api/v1/admin/", include("apps.companies.admin_urls")),
    path("api/v1/master-data/", include("apps.master_data.urls")),
    path("api/v1/candidate/", include("apps.candidates.urls")),
    path("api/v1/recruiter/", include("apps.candidates.recruiter_urls")),
    path("api/v1/recruiter/company/", include("apps.companies.recruiter_urls")),
    path("api/v1/companies/", include("apps.companies.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
