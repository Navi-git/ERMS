from datetime import timedelta
import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.companies.models import Company, CompanyVerificationStatus
from apps.candidates.models import CandidateProfile, Resume
from apps.jobs.models import Job, JobStatus, JobStage, StageType, EmploymentType
from apps.applications.models import Application, ApplicationStatus
from apps.offers.models import Offer, OfferStatus, PayFrequency, EquityType, BonusType, WorkArrangement
from apps.offers.services.offer_service import OfferService


@pytest.fixture
def recruiter_user(db):
    return User.objects.create_user(
        email="recruiter.offers@example.com",
        password="Password@123",
        role="recruiter",
        full_name="Sarah Jenkins",
        is_email_verified=True,
    )


@pytest.fixture
def other_recruiter_user(db):
    return User.objects.create_user(
        email="other.recruiter@example.com",
        password="Password@123",
        role="recruiter",
        full_name="Other Recruiter",
        is_email_verified=True,
    )


@pytest.fixture
def candidate_user(db):
    return User.objects.create_user(
        email="candidate.offers@example.com",
        password="Password@123",
        role="candidate",
        full_name="Alex Walker",
        is_email_verified=True,
    )


@pytest.fixture
def company(db, recruiter_user):
    return Company.objects.create(
        admin_user=recruiter_user,
        name="TechGlobal Labs",
        verification_status=CompanyVerificationStatus.APPROVED,
    )


@pytest.fixture
def candidate_profile(db, candidate_user):
    return CandidateProfile.objects.create(
        user=candidate_user,
        headline="Senior Product Designer",
    )


@pytest.fixture
def resume(db, candidate_profile):
    return Resume.objects.create(
        candidate=candidate_profile,
        title="Default Resume",
        file_url="https://example.com/resume.pdf",
        is_default=True,
    )


@pytest.fixture
def job(db, company, recruiter_user):
    j = Job.objects.create(
        company=company,
        created_by=recruiter_user,
        job_title="Senior Product Designer",
        job_status=JobStatus.PUBLISHED,
        employment_type=EmploymentType.FULL_TIME,
        openings=1,
    )
    JobStage.objects.create(job=j, name="Applied", stage_type=StageType.APPLIED, stage_order=1)
    JobStage.objects.create(job=j, name="Interview", stage_type=StageType.INTERVIEW, stage_order=2)
    JobStage.objects.create(job=j, name="Offer", stage_type=StageType.OFFER, stage_order=3)
    JobStage.objects.create(job=j, name="Hired", stage_type=StageType.HIRED, stage_order=4)
    return j


@pytest.fixture
def application(db, candidate_profile, job, resume):
    return Application.objects.create(
        candidate=candidate_profile,
        job=job,
        resume=resume,
        application_status=ApplicationStatus.INTERVIEW_SCHEDULED,
    )


@pytest.mark.django_db
def test_create_and_update_offer_draft(recruiter_user, application):
    client = APIClient()
    client.force_authenticate(user=recruiter_user)

    # 1. Create draft
    payload = {
        "salary": 175000,
        "currency": "USD",
        "employment_type": "full_time",
        "pay_frequency": "semi_monthly",
        "start_date": str((timezone.now() + timedelta(days=14)).date()),
        "equity_type": "ISO",
        "equity_units": 15000,
        "equity_vesting_schedule": "4-year vesting schedule with 1-year standard cliff",
        "bonus_type": "performance",
        "bonus_target_percent": 15,
        "sign_on_bonus": 15000,
        "reporting_manager_name": "Sarah Chen",
        "reporting_manager_title": "VP of Product Design",
        "work_arrangement": "hybrid",
    }
    resp = client.post(f"/api/v1/recruiter/applications/{application.id}/offers/", data=payload, format="json")
    assert resp.status_code in [200, 201]
    data = resp.json()["offer"]
    assert data["salary"] == 175000
    assert data["status"] == "draft"
    assert data["total_target_compensation"] > 175000
    offer_id = data["id"]

    # 2. Get application offer
    resp = client.get(f"/api/v1/recruiter/applications/{application.id}/offer/")
    assert resp.status_code == 200
    assert resp.json()["offer"]["id"] == offer_id

    # 3. Update draft
    update_payload = {"salary": 180000}
    resp = client.patch(f"/api/v1/recruiter/offers/{offer_id}/", data=update_payload, format="json")
    assert resp.status_code == 200
    assert resp.json()["offer"]["salary"] == 180000


@pytest.mark.django_db
def test_preview_letter(recruiter_user, application):
    client = APIClient()
    client.force_authenticate(user=recruiter_user)

    payload = {
        "salary": 175000,
        "currency": "USD",
        "reporting_manager_name": "Sarah Chen, VP of Product Design",
    }
    resp = client.post(f"/api/v1/recruiter/applications/{application.id}/offers/preview-letter/", data=payload, format="json")
    assert resp.status_code == 200
    rendered = resp.json()["rendered_letter"]
    assert "Alex Walker" in rendered
    assert "$175,000 USD" in rendered
    assert "TechGlobal Labs" in rendered


@pytest.mark.django_db
def test_candidate_visibility_gated_on_sent(recruiter_user, candidate_user, application):
    client = APIClient()

    # Create draft
    client.force_authenticate(user=recruiter_user)
    resp = client.post(
        f"/api/v1/recruiter/applications/{application.id}/offers/",
        data={"salary": 175000},
        format="json",
    )
    assert resp.status_code in [200, 201]
    offer_id = resp.json()["offer"]["id"]

    # Candidate should NOT see draft offer
    client.force_authenticate(user=candidate_user)
    resp = client.get(f"/api/v1/candidate/applications/{application.id}/offer/")
    assert resp.status_code == 200
    assert resp.json()["offer"] is None


@pytest.mark.django_db
def test_send_and_accept_offer_flow(recruiter_user, candidate_user, application):
    recruiter_client = APIClient()
    recruiter_client.force_authenticate(user=recruiter_user)

    candidate_client = APIClient()
    candidate_client.force_authenticate(user=candidate_user)

    # 1. Create draft
    create_resp = recruiter_client.post(
        f"/api/v1/recruiter/applications/{application.id}/offers/",
        data={
            "salary": 175000,
            "currency": "USD",
            "start_date": str((timezone.now() + timedelta(days=20)).date()),
            "expiration_date": str((timezone.now() + timedelta(days=7)).date()),
        },
        format="json",
    )
    offer_id = create_resp.json()["offer"]["id"]

    # 2. Send offer
    send_resp = recruiter_client.post(f"/api/v1/recruiter/offers/{offer_id}/send/")
    assert send_resp.status_code == 200
    offer_data = send_resp.json()["offer"]
    assert offer_data["status"] == "sent"
    assert offer_data["offer_document_url"] is not None
    assert offer_data["sent_at"] is not None

    application.refresh_from_db()
    assert application.application_status == ApplicationStatus.OFFER_SENT
    assert application.offer_extended_at is not None

    # 3. Candidate can now view offer
    cand_resp = candidate_client.get(f"/api/v1/candidate/applications/{application.id}/offer/")
    assert cand_resp.status_code == 200
    assert cand_resp.json()["offer"]["id"] == offer_id
    assert cand_resp.json()["offer"]["company_name"] == "TechGlobal Labs"
    assert len(cand_resp.json()["offer"]["benefits"]) > 0

    # 4. Candidate accepts offer
    accept_resp = candidate_client.post(f"/api/v1/candidate/offers/{offer_id}/accept/")
    assert accept_resp.status_code == 200
    assert accept_resp.json()["offer"]["status"] == "accepted"

    application.refresh_from_db()
    assert application.application_status == ApplicationStatus.ACCEPTED
    assert application.hired_at is not None


@pytest.mark.django_db
def test_decline_offer_flow(recruiter_user, candidate_user, application):
    recruiter_client = APIClient()
    recruiter_client.force_authenticate(user=recruiter_user)

    candidate_client = APIClient()
    candidate_client.force_authenticate(user=candidate_user)

    # Create & send
    create_resp = recruiter_client.post(
        f"/api/v1/recruiter/applications/{application.id}/offers/",
        data={"salary": 150000, "expiration_date": str((timezone.now() + timedelta(days=5)).date())},
        format="json",
    )
    offer_id = create_resp.json()["offer"]["id"]
    recruiter_client.post(f"/api/v1/recruiter/offers/{offer_id}/send/")

    # Candidate declines
    payload = {
        "decline_reason": "Accepted another offer",
        "candidate_feedback": "Decided to pursue a remote opportunity.",
    }
    decline_resp = candidate_client.post(f"/api/v1/candidate/offers/{offer_id}/decline/", data=payload, format="json")
    assert decline_resp.status_code == 200
    assert decline_resp.json()["offer"]["status"] == "declined"
    assert decline_resp.json()["offer"]["decline_reason"] == "Accepted another offer"

    application.refresh_from_db()
    assert application.application_status == ApplicationStatus.DECLINED


@pytest.mark.django_db
def test_withdraw_offer_flow(recruiter_user, application):
    recruiter_client = APIClient()
    recruiter_client.force_authenticate(user=recruiter_user)

    # Create & send
    create_resp = recruiter_client.post(
        f"/api/v1/recruiter/applications/{application.id}/offers/",
        data={"salary": 160000, "expiration_date": str((timezone.now() + timedelta(days=5)).date())},
        format="json",
    )
    offer_id = create_resp.json()["offer"]["id"]
    recruiter_client.post(f"/api/v1/recruiter/offers/{offer_id}/send/")

    # Withdraw
    withdraw_resp = recruiter_client.post(
        f"/api/v1/recruiter/offers/{offer_id}/withdraw/",
        data={"reason": "Position requirements changed."},
        format="json",
    )
    assert withdraw_resp.status_code == 200
    assert withdraw_resp.json()["offer"]["status"] == "withdrawn"
    assert withdraw_resp.json()["offer"]["withdrawn_reason"] == "Position requirements changed."

    application.refresh_from_db()
    assert application.application_status == ApplicationStatus.INTERVIEW_SCHEDULED


@pytest.mark.django_db
def test_expired_offer_cannot_be_accepted(recruiter_user, candidate_user, application):
    recruiter_client = APIClient()
    recruiter_client.force_authenticate(user=recruiter_user)

    candidate_client = APIClient()
    candidate_client.force_authenticate(user=candidate_user)

    # Create offer with future expiration to allow sending
    create_resp = recruiter_client.post(
        f"/api/v1/recruiter/applications/{application.id}/offers/",
        data={"salary": 170000, "expiration_date": str((timezone.now() + timedelta(days=2)).date())},
        format="json",
    )
    offer_id = create_resp.json()["offer"]["id"]
    recruiter_client.post(f"/api/v1/recruiter/offers/{offer_id}/send/")

    # Manually backdate expiration date
    offer = Offer.objects.get(id=offer_id)
    offer.expiration_date = (timezone.now() - timedelta(days=1)).date()
    offer.save(update_fields=["expiration_date"])

    # Attempt to accept should fail
    resp = candidate_client.post(f"/api/v1/candidate/offers/{offer_id}/accept/")
    assert resp.status_code == 400
    assert resp.json()["code"] == "offer_expired"
