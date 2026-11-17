from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsSuperAdmin
from apps.notifications.models import Broadcast, Notification, NotificationType
from apps.notifications.serializers import (
    BroadcastSerializer,
    CreateBroadcastSerializer,
    NotificationSerializer,
)
from apps.notifications.services import notification_service
from shared.exceptions.api import ApiError


class NotificationPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 50


class NotificationListView(APIView):
    """GET /api/v1/notifications/?unread=true&category=applications&page=1"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        queryset = Notification.objects.filter(user=user)

        # Filter by read/unread state
        unread_param = request.query_params.get("unread")
        if unread_param is not None:
            if unread_param.lower() in ("true", "1"):
                queryset = queryset.filter(is_read=False)
            elif unread_param.lower() in ("false", "0"):
                queryset = queryset.filter(is_read=True)

        # Filter by specific notification_type or UI category
        notif_type = request.query_params.get("type")
        category = request.query_params.get("category", "").lower()

        if notif_type:
            queryset = queryset.filter(notification_type=notif_type)
        elif category == "applications":
            queryset = queryset.filter(
                notification_type__in=[
                    NotificationType.APPLICATION_RECEIVED,
                    NotificationType.APPLICATION_STATUS_CHANGED,
                ]
            )
        elif category == "interviews":
            queryset = queryset.filter(
                notification_type__in=[
                    NotificationType.INTERVIEW_SCHEDULED,
                    NotificationType.INTERVIEW_RESCHEDULED,
                    NotificationType.INTERVIEW_CANCELLED,
                    NotificationType.INTERVIEW_REMINDER,
                ]
            )
        elif category == "offers":
            queryset = queryset.filter(
                notification_type__in=[
                    NotificationType.OFFER_SENT,
                    NotificationType.OFFER_ACCEPTED,
                    NotificationType.OFFER_DECLINED,
                    NotificationType.OFFER_WITHDRAWN,
                ]
            )
        elif category == "messages":
            queryset = queryset.filter(notification_type=NotificationType.MESSAGE_RECEIVED)
        elif category == "billing":
            queryset = queryset.filter(
                notification_type__in=[
                    NotificationType.SUBSCRIPTION_EXPIRING,
                    NotificationType.PAYMENT_FAILED,
                    NotificationType.INVOICE_GENERATED,
                ]
            )

        paginator = NotificationPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = NotificationSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class NotificationUnreadCountView(APIView):
    """GET /api/v1/notifications/unread-count/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = notification_service._get_unread_count(request.user)
        return Response({"unread_count": count})


class NotificationMarkReadView(APIView):
    """POST /api/v1/notifications/<id>/read/"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        unread_count = notification_service.mark_as_read(pk, request.user)
        return Response({"status": "success", "unread_count": unread_count})


class NotificationMarkAllReadView(APIView):
    """POST /api/v1/notifications/read-all/"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        notification_service.mark_all_as_read(request.user)
        return Response({"status": "success", "unread_count": 0})


class AdminBroadcastListView(APIView):
    """GET /api/v1/admin/notifications/ & POST /api/v1/admin/notifications/"""
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        today = timezone.now().date()
        total_sent_today = Notification.objects.filter(created_at__date=today).count()
        unread_today = Notification.objects.filter(created_at__date=today, is_read=False).count()

        broadcasts = Broadcast.objects.all().select_related("created_by")
        paginator = NotificationPagination()
        page = paginator.paginate_queryset(broadcasts, request)
        serializer = BroadcastSerializer(page, many=True)

        response_data = {
            "metrics": {
                "total_sent_today": total_sent_today,
                "pending_delivery": unread_today,
                "critical_alerts": 0,
                "delivery_success_rate": 99.8,
            },
            "results": serializer.data,
            "count": paginator.page.paginator.count,
        }
        return Response(response_data)

    def post(self, request):
        serializer = CreateBroadcastSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        broadcast_log = notification_service.broadcast(
            title=data["title"],
            message=data["message"],
            audience=data.get("audience", "all"),
            created_by=request.user,
            notification_type=data.get("notification_type", "system"),
            redirect_url=data.get("redirect_url"),
        )
        return Response(BroadcastSerializer(broadcast_log).data, status=status.HTTP_201_CREATED)