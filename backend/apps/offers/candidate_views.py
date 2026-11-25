import os
from django.conf import settings
from django.http import FileResponse, Http404
from rest_framework.response import Response
from rest_framework.views import APIView
from shared.exceptions.api import ApiError
from apps.master_data.models import MasterDataItem
from .models import Offer, OfferStatus
from .serializers import CandidateOfferSerializer
from .services.offer_service import OfferService, _get_candidate_profile


class CandidateApplicationOfferView(APIView):
    """GET /candidate/applications/{id}/offer/ — Candidate view of the formal offer."""

    def get(self, request, pk):
        profile = _get_candidate_profile(request.user)

        # Candidate can only see offers that have been SENT, ACCEPTED, DECLINED, EXPIRED, or WITHDRAWN (never draft)
        filter_kwargs = {
            "application_id": pk,
            "status__in": [
                OfferStatus.SENT,
                OfferStatus.ACCEPTED,
                OfferStatus.DECLINED,
                OfferStatus.EXPIRED,
                OfferStatus.WITHDRAWN,
            ],
        }
        if request.user.role == "candidate" and not getattr(request.user, "is_superuser", False):
            filter_kwargs["application__candidate"] = profile

        offer = (
            Offer.objects.filter(**filter_kwargs)
            .select_related(
                "application__job__company",
                "application__job",
                "application__candidate__user",
                "reports_to_user",
                "created_by",
            )
            .prefetch_related("attachments")
            .order_by("-created_at")
            .first()
        )

        if not offer:
            return Response({"offer": None})

        # Dynamic expiration check
        if offer.status == OfferStatus.SENT and offer.is_expired:
            offer.status = OfferStatus.EXPIRED
            offer.save(update_fields=["status", "updated_at"])

        return Response({"offer": CandidateOfferSerializer(offer).data})


class CandidateOfferAcceptView(APIView):
    """POST /candidate/offers/{id}/accept/ — Confirm and accept employment offer."""

    def post(self, request, pk):
        offer = OfferService.accept_offer(request.user, pk)
        return Response({
            "message": "Offer accepted successfully! Welcome to the team.",
            "offer": CandidateOfferSerializer(offer).data,
        })


class CandidateOfferDeclineView(APIView):
    """POST /candidate/offers/{id}/decline/ — Formally decline offer with feedback."""

    def post(self, request, pk):
        decline_reason = request.data.get("decline_reason")
        candidate_feedback = request.data.get("candidate_feedback", "")
        offer = OfferService.decline_offer(
            request.user,
            pk,
            decline_reason=decline_reason,
            candidate_feedback=candidate_feedback,
        )
        return Response({
            "message": "Offer declined. Thank you for your feedback.",
            "offer": CandidateOfferSerializer(offer).data,
        })


class CandidateDeclineReasonsView(APIView):
    """GET /candidate/offers/decline-reasons/ — Options for decline modal."""

    def get(self, request):
        items = MasterDataItem.objects.filter(category="decline_reason", is_active=True).order_by("display_order")
        reasons = [{"key": item.key, "label": item.value} for item in items]
        return Response({"reasons": reasons})


class CandidateOfferDownloadView(APIView):
    """GET /candidate/offers/{id}/download/ — Download offer letter PDF."""

    def get(self, request, pk):
        profile = _get_candidate_profile(request.user)
        try:
            offer = Offer.objects.get(
                id=pk,
                application__candidate=profile,
                status__in=[OfferStatus.SENT, OfferStatus.ACCEPTED, OfferStatus.DECLINED, OfferStatus.EXPIRED],
            )
        except Offer.DoesNotExist:
            raise ApiError(code="offer_not_found", message="Offer document not found.", status_code=404)

        from .services.letter_generator import generate_offer_pdf

        if not offer.offer_document_url:
            offer.offer_document_url = generate_offer_pdf(offer)
            offer.save(update_fields=["offer_document_url"])

        # Resolve media path
        relative_path = offer.offer_document_url.replace(settings.MEDIA_URL, "").lstrip("/")
        full_path = os.path.join(settings.MEDIA_ROOT, relative_path)

        if not os.path.exists(full_path):
            offer.offer_document_url = generate_offer_pdf(offer)
            offer.save(update_fields=["offer_document_url"])
            relative_path = offer.offer_document_url.replace(settings.MEDIA_URL, "").lstrip("/")
            full_path = os.path.join(settings.MEDIA_ROOT, relative_path)

        if not os.path.exists(full_path):
            raise Http404("Document file missing from server storage.")

        return FileResponse(
            open(full_path, "rb"),
            as_attachment=True,
            filename=f"{offer.application.job.company.name}_Offer_Letter_{offer.offer_reference}.pdf",
            content_type="application/pdf",
        )
