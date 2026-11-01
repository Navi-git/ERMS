from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from . import admin_services
from . import services
from .permissions import IsSuperAdmin
from .user_serializers import (
    AdminCreateSuperAdminSerializer,
    AdminSuspendUserSerializer,
)


class AdminUserListView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        search = request.query_params.get("search")
        role = request.query_params.get("role")
        user_status = request.query_params.get("status")
        ordering = request.query_params.get("ordering", "-created_at")
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 10))

        data = admin_services.list_users(
            search=search,
            role=role,
            status=user_status,
            ordering=ordering,
            page=page,
            page_size=page_size,
        )
        return Response(data)

    def post(self, request):
        serializer = AdminCreateSuperAdminSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_admin = admin_services.create_super_admin(
            admin_user=request.user,
            email=serializer.validated_data["email"],
            password=serializer.validated_data["password"],
            full_name=serializer.validated_data["full_name"],
            request=request,
        )
        return Response(
            {
                "id": new_admin.id,
                "email": new_admin.email,
                "full_name": new_admin.full_name,
                "role": new_admin.role,
                "message": "Super Administrator created successfully.",
            },
            status=status.HTTP_201_CREATED,
        )


class AdminUserDetailView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request, user_id):
        detail = admin_services.get_user_detail(user_id=user_id)
        return Response(detail)

    def delete(self, request, user_id):
        res = admin_services.soft_delete_user(
            admin_user=request.user,
            user_id=user_id,
            request=request,
        )
        return Response(res)


class AdminUserSuspendView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request, user_id):
        serializer = AdminSuspendUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        res = admin_services.suspend_user(
            admin_user=request.user,
            user_id=user_id,
            reason=serializer.validated_data["reason"],
            request=request,
        )
        return Response(res)


class AdminUserReactivateView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request, user_id):
        res = admin_services.reactivate_user(
            admin_user=request.user,
            user_id=user_id,
            request=request,
        )
        return Response(res)


class AdminUserRestoreView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request, user_id):
        res = admin_services.restore_user(
            admin_user=request.user,
            user_id=user_id,
            request=request,
        )
        return Response(res)


class AdminUserSendPasswordResetView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request, user_id):
        detail = admin_services.get_user_detail(user_id=user_id)
        target_email = detail["user"]["email"]
        services.request_password_reset(email=target_email)
        return Response({"message": f"Password reset email sent to {target_email}."})

