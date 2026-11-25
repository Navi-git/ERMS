from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from shared.exceptions.api import ApiError

from . import user_services
from .user_serializers import (
    UserProfileUpdateSerializer,
    UserPasswordChangeSerializer,
)


class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = user_services.get_profile(request.user)
        return Response(profile)

    def patch(self, request):
        serializer = UserProfileUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_profile = user_services.update_profile(
            user=request.user,
            full_name=serializer.validated_data.get("full_name"),
            phone=serializer.validated_data.get("phone"),
            request=request,
        )
        return Response(updated_profile)


class UserProfilePhotoView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def put(self, request):
        photo = request.FILES.get("photo") or request.FILES.get("file")
        if not photo:
            raise ApiError("photo_required", "Please provide a photo file to upload.", 400)

        photo_url = user_services.update_profile_photo(
            user=request.user,
            photo_file=photo,
            request=request,
        )
        return Response({"profile_picture_url": photo_url, "message": "Photo updated successfully."})

    def delete(self, request):
        user_services.delete_profile_photo(user=request.user, request=request)
        return Response({"message": "Profile photo removed successfully."})


class UserPasswordChangeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = UserPasswordChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tokens = user_services.change_password(
            user=request.user,
            current_password=serializer.validated_data.get("current_password"),
            new_password=serializer.validated_data["new_password"],
            request=request,
        )
        return Response({
            "message": "Password changed successfully.",
            **tokens,
        })


class UserLinkedLoginsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        identities = user_services.list_linked_logins(user=request.user)
        return Response(identities)

    def delete(self, request, identity_id):
        user_services.unlink_login(
            user=request.user,
            identity_id=identity_id,
            request=request,
        )
        return Response({"message": "Linked login disconnected successfully."})

