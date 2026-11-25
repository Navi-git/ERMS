from django.urls import path
from . import views

app_name = "admin_master_data"

urlpatterns = [
    path("master-data/", views.AdminMasterDataListView.as_view(), name="list"),
    path("master-data/reorder/", views.AdminMasterDataReorderView.as_view(), name="reorder"),
    path("master-data/<int:item_id>/", views.AdminMasterDataDetailView.as_view(), name="detail"),
    path("skill-aliases/", views.AdminSkillAliasListView.as_view(), name="alias-list"),
    path("skill-aliases/<int:alias_id>/", views.AdminSkillAliasDetailView.as_view(), name="alias-detail"),
]

