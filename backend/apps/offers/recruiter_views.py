import os
from uuid import uuid4
from django.conf import settings
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.views import APIView
from shared.exceptions.api import ApiError
from apps.applications.models import Application
from .models import Offer, OfferAttachment, OfferLetterTemplate, OfferStatus
from .serializers import (
    OfferAttachmentSerializer,
    OfferLetterTemplateSerializer,
    RecruiterOfferSerializer,
)
from .services.offer_service import OfferService, _get_recruiter_company
from .services.letter_generator import (
    DEFAULT_OFFER_TEMPLATE,
    build_template_context,
    render_template_text,
)


class RecruiterApplicationOfferView(APIView):
    """GET /recruiter/applications/{id}/offer/ — Retrieve active or latest offer for an application."""

    def get(self, request, pk):
        company = _get_recruiter_company(request.user)
        try:
            application = Application.objects.select_related("job").get(id=pk, job__company=company)
        except Application.DoesNotExist:
            raise ApiError(code="application_not_found", message="Application not found.", status_code=404)

        # Get latest active or latest offer
        offer = (
            Offer.objects.filter(application=application)
            .select_related("application__candidate__user", "application__job__company", "template", "reports_to_user")
            .prefetch_related("attachments")
            .order_by("-created_at")
            .first()
        )

        if not offer:
            return Response({"offer": None})

        return Response({"offer": RecruiterOfferSerializer(offer).data})


class RecruiterOfferCreateOrUpdateView(APIView):
    """POST /recruiter/applications/{id}/offers/ — Create or update draft offer for application."""

    def post(self, request, pk):
        offer = OfferService.create_or_update_draft(
            recruiter_user=request.user,
            application_id=pk,
            data=request.data,
        )
        return Response(
            {
                "message": "Offer draft saved successfully.",
                "offer": RecruiterOfferSerializer(offer).data,
            },
            status=status.HTTP_201_CREATED if offer.created_at == offer.updated_at else status.HTTP_200_OK,
        )


class RecruiterOfferDetailView(APIView):
    """GET, PATCH, DELETE /recruiter/offers/{id}/ — Inspect, update draft, or discard offer."""

    def get_offer(self, pk, user):
        company = _get_recruiter_company(user)
        try:
            return (
                Offer.objects.select_related(
                    "application__candidate__user",
                    "application__job__company",
                    "template",
                    "reports_to_user",
                )
                .prefetch_related("attachments")
                .get(id=pk, application__job__company=company)
            )
        except Offer.DoesNotExist:
            raise ApiError(code="offer_not_found", message="Offer not found.", status_code=404)

    def get(self, request, pk):
        offer = self.get_offer(pk, request.user)
        return Response({"offer": RecruiterOfferSerializer(offer).data})

    def patch(self, request, pk):
        offer = self.get_offer(pk, request.user)
        if offer.status != OfferStatus.DRAFT:
            raise ApiError(
                code="cannot_edit_sent_offer",
                message="Only draft offers can be modified. Sent offers must be withdrawn.",
                status_code=400,
            )

        updated_offer = OfferService.create_or_update_draft(
            recruiter_user=request.user,
            application_id=offer.application_id,
            data=request.data,
        )
        return Response({
            "message": "Offer draft updated.",
            "offer": RecruiterOfferSerializer(updated_offer).data,
        })

    def delete(self, request, pk):
        offer = self.get_offer(pk, request.user)
        if offer.status != OfferStatus.DRAFT:
            raise ApiError(
                code="cannot_delete_sent_offer",
                message="Only draft offers can be discarded.",
                status_code=400,
            )
        offer.delete()
        return Response({"message": "Offer draft discarded."})


class RecruiterOfferSendView(APIView):
    """POST /recruiter/offers/{id}/send/ — Finalize and dispatch formal offer."""

    def post(self, request, pk):
        offer = OfferService.send_offer(request.user, pk)
        return Response({
            "message": "Formal offer dispatched to candidate.",
            "offer": RecruiterOfferSerializer(offer).data,
        })


class RecruiterOfferWithdrawView(APIView):
    """POST /recruiter/offers/{id}/withdraw/ — Withdraw sent offer."""

    def post(self, request, pk):
        reason = request.data.get("reason", "")
        offer = OfferService.withdraw_offer(request.user, pk, reason=reason)
        return Response({
            "message": "Offer withdrawn.",
            "offer": RecruiterOfferSerializer(offer).data,
        })


class RecruiterOfferPreviewLetterView(APIView):
    """POST /recruiter/applications/{id}/offers/preview-letter/ — Real-time token merge without saving."""

    def post(self, request, pk):
        company = _get_recruiter_company(request.user)
        try:
            application = Application.objects.select_related("job", "candidate__user", "job__company").get(
                id=pk, job__company=company
            )
        except Application.DoesNotExist:
            raise ApiError(code="application_not_found", message="Application not found.", status_code=404)

        # Mock or use draft offer instance
        offer = Offer.objects.filter(application=application, status=OfferStatus.DRAFT).first()
        if not offer:
            offer = Offer(application=application, created_by=request.user)

        # Apply transient data from request payload
        data = request.data
        if "salary" in data and data["salary"]:
            offer.salary = int(data["salary"])
        offer.currency = data.get("currency", offer.currency or "USD")
        offer.pay_frequency = data.get("pay_frequency", offer.pay_frequency)
        offer.start_date = data.get("start_date", offer.start_date)
        offer.expiration_date = data.get("expiration_date", offer.expiration_date)
        offer.equity_type = data.get("equity_type", offer.equity_type)
        offer.equity_units = data.get("equity_units", offer.equity_units)
        offer.equity_vesting_schedule = data.get("equity_vesting_schedule", offer.equity_vesting_schedule)
        offer.bonus_target_percent = data.get("bonus_target_percent", offer.bonus_target_percent)
        offer.bonus_target_amount = data.get("bonus_target_amount", offer.bonus_target_amount)
        offer.sign_on_bonus = data.get("sign_on_bonus", offer.sign_on_bonus)
        offer.reporting_manager_name = data.get("reporting_manager_name", offer.reporting_manager_name)
        offer.reporting_manager_title = data.get("reporting_manager_title", offer.reporting_manager_title)
        offer.work_arrangement = data.get("work_arrangement", offer.work_arrangement)

        template_body = data.get("body_template") or (offer.template.body_template if offer.template else DEFAULT_OFFER_TEMPLATE)
        context = build_template_context(offer)
        rendered_text = render_template_text(template_body, context)

        return Response({
            "rendered_letter": rendered_text,
            "context": context,
        })


class RecruiterOfferAttachmentUploadView(APIView):
    """POST /recruiter/offers/{id}/attachments/ — Upload collateral PDF."""
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request, pk):
        company = _get_recruiter_company(request.user)
        try:
            offer = Offer.objects.get(id=pk, application__job__company=company)
        except Offer.DoesNotExist:
            raise ApiError(code="offer_not_found", message="Offer not found.", status_code=404)

        file_obj = request.FILES.get("file")
        if not file_obj:
            raise ApiError(code="file_required", message="No file was uploaded.", status_code=400)

        attachments_dir = os.path.join(settings.MEDIA_ROOT, "offers", "attachments")
        os.makedirs(attachments_dir, exist_ok=True)
        safe_name = f"{uuid4().hex[:8]}_{file_obj.name}"
        dest_path = os.path.join(attachments_dir, safe_name)

        with open(dest_path, "wb+") as destination:
            for chunk in file_obj.chunks():
                destination.write(chunk)

        file_url = f"{settings.MEDIA_URL.rstrip('/')}/offers/attachments/{safe_name}"

        attachment = OfferAttachment.objects.create(
            offer=offer,
            file_name=file_obj.name,
            file_url=file_url,
            file_type=file_obj.content_type,
            file_size=file_obj.size,
            description=request.data.get("description", ""),
            uploaded_by=request.user,
        )

        return Response(
            {"attachment": OfferAttachmentSerializer(attachment).data},
            status=status.HTTP_201_CREATED,
        )


class RecruiterOfferAttachmentDeleteView(APIView):
    """DELETE /recruiter/offers/attachments/{att_id}/ — Remove attachment."""

    def delete(self, request, att_id):
        company = _get_recruiter_company(request.user)
        try:
            attachment = OfferAttachment.objects.get(id=att_id, offer__application__job__company=company)
        except OfferAttachment.DoesNotExist:
            raise ApiError(code="attachment_not_found", message="Attachment not found.", status_code=404)

        attachment.delete()
        return Response({"message": "Attachment deleted."})


class RecruiterOfferTemplateListCreateView(APIView):
    """GET, POST /recruiter/offer-templates/ — Company letter templates."""

    def get(self, request):
        company = _get_recruiter_company(request.user)
        templates = OfferLetterTemplate.objects.filter(company=company)
        return Response({"templates": OfferLetterTemplateSerializer(templates, many=True).data})

    def post(self, request):
        company = _get_recruiter_company(request.user)
        data = request.data.copy()
        serializer = OfferLetterTemplateSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        template = serializer.save(company=company, created_by=request.user)
        return Response(
            {"template": OfferLetterTemplateSerializer(template).data},
            status=status.HTTP_201_CREATED,
        )


class RecruiterOfferTemplateDetailView(APIView):
    """GET, PATCH, DELETE /recruiter/offer-templates/{id}/"""

    def get_template(self, pk, user):
        company = _get_recruiter_company(user)
        try:
            return OfferLetterTemplate.objects.get(id=pk, company=company)
        except OfferLetterTemplate.DoesNotExist:
            raise ApiError(code="template_not_found", message="Template not found.", status_code=404)

    def get(self, request, pk):
        tpl = self.get_template(pk, request.user)
        return Response({"template": OfferLetterTemplateSerializer(tpl).data})

    def patch(self, request, pk):
        tpl = self.get_template(pk, request.user)
        serializer = OfferLetterTemplateSerializer(tpl, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        # Increment version on modification
        tpl.version += 1
        tpl = serializer.save()
        return Response({"template": OfferLetterTemplateSerializer(tpl).data})

    def delete(self, request, pk):
        tpl = self.get_template(pk, request.user)
        tpl.is_active = False
        tpl.save(update_fields=["is_active"])
        return Response({"message": "Template archived."})


class RecruiterOfferListView(APIView):
    """GET /recruiter/offers/?status= — All offers extended by the recruiter's company."""

    def get(self, request):
        company = _get_recruiter_company(request.user)
        queryset = (
            Offer.objects.filter(application__job__company=company)
            .select_related(
                "application__candidate__user",
                "application__job",
                "template",
                "reports_to_user",
            )
            .prefetch_related("attachments")
            .order_by("-created_at")
        )

        status_param = request.query_params.get("status")
        if status_param:
            queryset = queryset.filter(status=status_param)

        return Response({"offers": RecruiterOfferSerializer(queryset, many=True).data})
