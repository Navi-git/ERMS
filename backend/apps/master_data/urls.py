from django.urls import path
from . import views

app_name = "master_data"

urlpatterns = [
    path("employment-types/", views.PublicEmploymentTypesView.as_view(), name="employment-types"),
    path("<str:category>/", views.PublicMasterDataCategoryView.as_view(), name="category-items"),
]

