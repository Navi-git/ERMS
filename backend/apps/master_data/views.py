from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsSuperAdmin
from shared.constants.master_data import EmploymentType
from shared.exceptions.api import ApiError

from . import services
from .models import MasterDataItem
from .serializers import (
    MasterDataCreateSerializer,
    MasterDataItemSerializer,
    MasterDataReorderSerializer,
    MasterDataUpdateSerializer,
    SkillAliasCreateSerializer,
    SkillAliasSerializer,
)


class PublicAPIView(APIView):
    """Public endpoints with open access for dropdowns, forms, and search."""
    permission_classes = [AllowAny]
    authentication_classes = []


# -------------------------------------------------------------------------
# Public Views
# -------------------------------------------------------------------------

class PublicMasterDataCategoryView(PublicAPIView):
    def get(self, request, category):
        search = request.query_params.get("search")
        limit = int(request.query_params.get("limit", 100))
        items = services.list_public_master_data(category=category, search=search, limit=limit)
        return Response(items)


class PublicEmploymentTypesView(PublicAPIView):
    def get(self, request):
        items = list(
            MasterDataItem.objects.filter(category="employment_type", is_active=True)
            .order_by("display_order", "value")
            .values("key", "value")
        )
        if items:
            types = [{"key": it["key"], "label": it["value"]} for it in items]
        else:
            types = [{"key": choice.value, "label": choice.label} for choice in EmploymentType]
        return Response(types)


# -------------------------------------------------------------------------
# Admin Views
# -------------------------------------------------------------------------

class AdminMasterDataListView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        category = request.query_params.get("category")
        search = request.query_params.get("search")
        status_param = request.query_params.get("status")

        is_active = None
        if status_param:
            if status_param.lower() == "active":
                is_active = True
            elif status_param.lower() in ["inactive", "disabled"]:
                is_active = False

        data = services.list_admin_master_data(
            category=category,
            search=search,
            is_active=is_active,
        )
        return Response(data)

    def post(self, request):
        serializer = MasterDataCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = services.create_master_data_item(
            **serializer.validated_data,
            admin_user=request.user,
            request=request,
        )
        return Response(
            MasterDataItemSerializer(item).data,
            status=status.HTTP_201_CREATED,
        )


class AdminMasterDataDetailView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request, item_id):
        item = MasterDataItem.objects.filter(id=item_id).first()
        if not item:
            raise ApiError("item_not_found", "Master data item not found.", 404)
        data = MasterDataItemSerializer(item).data
        data["usage_count"] = services.compute_usage_count(item)
        return Response(data)

    def patch(self, request, item_id):
        serializer = MasterDataUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        item = services.update_master_data_item(
            item_id=item_id,
            **serializer.validated_data,
            admin_user=request.user,
            request=request,
        )
        return Response(MasterDataItemSerializer(item).data)

    def delete(self, request, item_id):
        services.delete_master_data_item(
            item_id=item_id,
            admin_user=request.user,
            request=request,
        )
        return Response(
            {"message": "Master data item deleted successfully."},
            status=status.HTTP_200_OK,
        )


class AdminMasterDataReorderView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request):
        category = request.data.get("category") or request.query_params.get("category")
        if not category:
            raise ApiError("category_required", "Category is required to reorder items.", 400)

        serializer = MasterDataReorderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        res = services.reorder_master_data_items(
            category=category,
            items=serializer.validated_data["items"],
            admin_user=request.user,
            request=request,
        )
        return Response(res)


class AdminSkillAliasListView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        aliases = services.list_skill_aliases()
        serializer = SkillAliasSerializer(aliases, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = SkillAliasCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        alias = services.create_skill_alias(
            **serializer.validated_data,
            admin_user=request.user,
            request=request,
        )
        return Response(
            SkillAliasSerializer(alias).data,
            status=status.HTTP_201_CREATED,
        )


class AdminSkillAliasDetailView(APIView):
    permission_classes = [IsSuperAdmin]

    def delete(self, request, alias_id):
        services.delete_skill_alias(
            alias_id=alias_id,
            admin_user=request.user,
            request=request,
        )
        return Response({"message": "Skill alias deleted successfully."})

