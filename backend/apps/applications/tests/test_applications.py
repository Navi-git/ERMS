import pytest
from django.utils import timezone
from apps.accounts.models import User
from apps.companies.models import Company, CompanyVerificationStatus
from apps.candidates.models import CandidateProfile, Resume
from apps.jobs.models import Job, JobStatus, JobStage, JobSkill, StageType
from apps.master_data.models import MasterDataItem
from apps.applications.models import (
    Application,
    ApplicationStatus,
    ApplicationStageProgress,
    ApplicationNote,
    ApplicationMaterial,
)
from apps.applications.services.ats_service import AtsMatchService


@pytest.fixture
def candidate_user(db):
    user = User.objects.create(
        email="candidate.applicant@example.com",
        role="candidate",
        full_name="Alex Applicant",
        is_email_verified=True,
    )
    user.set_password("SecurePass123!")
    user.save()
    return user


@pytest.fixture
def candidate_profile(candidate_user):
    profile, _ = CandidateProfile.objects.get_or_create(user=candidate_user)
    return profile


@pytest.fixture
def candidate_resume(candidate_profile):
    from apps.candidates.models import ResumeAnalysis

    resume = Resume.objects.create(
        candidate=candidate_profile,
        title="Alex_Applicant_CV.pdf",
        file_name="cv.pdf",
        file_path="resumes/cv.pdf",
        file_url="/media/resumes/cv.pdf",
        file_type="application/pdf",
        file_size=102400,
        is_default=True,
    )
    ResumeAnalysis.objects.create(
        resume=resume,
        ats_score=85,
        extracted_text="Experienced frontend developer with React, TypeScript, TailwindCSS and Vite skills.",
    )
    return resume


@pytest.fixture
def recruiter_user(db):
    user = User.objects.create(
        email="recruiter.sarah@example.com",
        role="recruiter",
        full_name="Sarah Recruiter",
        is_email_verified=True,
    )
    user.set_password("SecurePass123!")
    user.save()
    return user


@pytest.fixture
def recruiter_company(recruiter_user):
    return Company.objects.create(
        name="Acme Tech Innovations",
        admin_user=recruiter_user,
        verification_status=CompanyVerificationStatus.APPROVED,
    )


@pytest.fixture
def published_job(recruiter_company, recruiter_user):
    job = Job.objects.create(
        company=recruiter_company,
        created_by=recruiter_user,
        job_title="Senior Frontend Engineer",
        job_status=JobStatus.PUBLISHED,
        published_at=timezone.now(),
    )
    # Configure hiring stages
    JobStage.objects.create(job=job, name="Applied", stage_type=StageType.APPLIED, stage_order=1)
    JobStage.objects.create(job=job, name="Resume Screening", stage_type=StageType.SCREENING, stage_order=2)
    JobStage.objects.create(job=job, name="Technical Interview", stage_type=StageType.INTERVIEW, stage_order=3)
    JobStage.objects.create(job=job, name="Offer", stage_type=StageType.OFFER, stage_order=4)
    JobStage.objects.create(job=job, name="Hired", stage_type=StageType.HIRED, stage_order=5)

    # Required skills
    skill_item = MasterDataItem.objects.create(category="skill", key="react", value="React")
    JobSkill.objects.create(job=job, skill=skill_item, is_required=True)
    return job


@pytest.mark.django_db
def test_candidate_apply_success(api, candidate_user, candidate_resume, published_job):
    api.force_authenticate(user=candidate_user)
    payload = {
        "resume_id": candidate_resume.id,
        "linkedin_url": "https://linkedin.com/in/alexapplicant",
        "portfolio_url": "https://alexapplicant.dev",
        "message_to_hiring_manager": "Excited to apply for this engineering role!",
        "cover_letter": "I have 5+ years of React experience.",
        "materials": [
            {"file_name": "Portfolio.pdf", "file_url": "/media/portfolio.pdf", "file_type": "portfolio"}
        ],
    }

    res = api.post(f"/api/v1/jobs/{published_job.id}/apply/", payload, format="json")
    assert res.status_code == 201
    data = res.data["application"]
    assert data["job_title"] == "Senior Frontend Engineer"
    assert data["application_status"] == "applied"
    assert "ats_match" not in data  # ATS preview strictly hidden from candidate

    app_id = data["id"]
    # Check initial stage progress
    progresses = ApplicationStageProgress.objects.filter(application_id=app_id)
    assert progresses.count() == 1
    assert progresses.first().job_stage.name == "Applied"

    # Materials
    materials = ApplicationMaterial.objects.filter(application_id=app_id)
    assert materials.count() == 1


@pytest.mark.django_db
def test_candidate_cannot_apply_twice(api, candidate_user, candidate_resume, published_job):
    api.force_authenticate(user=candidate_user)
    payload = {"resume_id": candidate_resume.id}
    res1 = api.post(f"/api/v1/jobs/{published_job.id}/apply/", payload, format="json")
    assert res1.status_code == 201

    res2 = api.post(f"/api/v1/jobs/{published_job.id}/apply/", payload, format="json")
    assert res2.status_code == 400
    assert res2.data["code"] == "duplicate_application"


@pytest.mark.django_db
def test_job_detail_returns_my_application(api, candidate_user, candidate_resume, published_job):
    api.force_authenticate(user=candidate_user)
    # Before applying
    res1 = api.get(f"/api/v1/jobs/{published_job.id}/")
    assert res1.status_code == 200
    assert res1.data["my_application"] is None
    assert res1.data["applicants_count"] == 0

    # Apply
    api.post(f"/api/v1/jobs/{published_job.id}/apply/", {"resume_id": candidate_resume.id}, format="json")

    # After applying
    res2 = api.get(f"/api/v1/jobs/{published_job.id}/")
    assert res2.status_code == 200
    assert res2.data["my_application"] is not None
    assert res2.data["my_application"]["status"] == "applied"
    assert res2.data["applicants_count"] == 1


@pytest.mark.django_db
def test_candidate_applications_list_and_withdraw(api, candidate_user, candidate_resume, published_job):
    api.force_authenticate(user=candidate_user)
    apply_res = api.post(f"/api/v1/jobs/{published_job.id}/apply/", {"resume_id": candidate_resume.id}, format="json")
    app_id = apply_res.data["application"]["id"]

    # Candidate lists applications
    list_res = api.get("/api/v1/candidate/applications/")
    assert list_res.status_code == 200
    assert len(list_res.data) == 1
    assert list_res.data[0]["id"] == app_id
    assert list_res.data[0]["can_withdraw"] is True

    # Candidate withdraws application
    withdraw_res = api.post(f"/api/v1/candidate/applications/{app_id}/withdraw/")
    assert withdraw_res.status_code == 200
    assert withdraw_res.data["application_status"] == "withdrawn"

    # Verify updated status
    detail_res = api.get(f"/api/v1/candidate/applications/{app_id}/")
    assert detail_res.data["application_status"] == "withdrawn"
    assert detail_res.data["can_withdraw"] is False


@pytest.mark.django_db
def test_recruiter_first_review_and_pipeline(api, candidate_user, recruiter_user, candidate_resume, published_job):
    api.force_authenticate(user=candidate_user)
    apply_res = api.post(f"/api/v1/jobs/{published_job.id}/apply/", {"resume_id": candidate_resume.id}, format="json")
    app_id = apply_res.data["application"]["id"]

    # Recruiter logs in and inspects applications
    api.force_authenticate(user=recruiter_user)

    # All applicants
    all_res = api.get("/api/v1/recruiter/applications/")
    assert all_res.status_code == 200
    assert all_res.data["metrics"]["total_applicants"] == 1

    # Job specific applicants
    job_apps_res = api.get(f"/api/v1/recruiter/jobs/{published_job.id}/applications/")
    assert job_apps_res.status_code == 200
    assert len(job_apps_res.data["applications"]) == 1
    assert "ats_match" in job_apps_res.data["applications"][0]

    # First review on detail view (Decision #5)
    detail_res = api.get(f"/api/v1/recruiter/applications/{app_id}/")
    assert detail_res.status_code == 200
    assert detail_res.data["application_status"] == "reviewing"
    assert detail_res.data["reviewed_at"] is not None

    # Advance stage to Technical Interview
    tech_stage = published_job.stages.get(stage_type=StageType.INTERVIEW)
    stage_res = api.post(
        f"/api/v1/recruiter/applications/{app_id}/stage/",
        {"target_stage_id": tech_stage.id, "notes": "Passed initial screening"},
        format="json",
    )
    assert stage_res.status_code == 200
    assert stage_res.data["application_status"] == "interview_scheduled"


@pytest.mark.django_db
def test_recruiter_reject_shows_reason_to_candidate(api, candidate_user, recruiter_user, candidate_resume, published_job):
    api.force_authenticate(user=candidate_user)
    apply_res = api.post(f"/api/v1/jobs/{published_job.id}/apply/", {"resume_id": candidate_resume.id}, format="json")
    app_id = apply_res.data["application"]["id"]

    # Recruiter rejects
    api.force_authenticate(user=recruiter_user)
    reject_res = api.post(
        f"/api/v1/recruiter/applications/{app_id}/reject/",
        {"rejection_reason": "Role filled internally with another senior candidate."},
        format="json",
    )
    assert reject_res.status_code == 200
    assert reject_res.data["application_status"] == "rejected"

    # Candidate sees rejection reason on their detail page (Decision #7)
    api.force_authenticate(user=candidate_user)
    candidate_view = api.get(f"/api/v1/candidate/applications/{app_id}/")
    assert candidate_view.status_code == 200
    assert candidate_view.data["application_status"] == "rejected"
    assert candidate_view.data["rejection_reason"] == "Role filled internally with another senior candidate."


@pytest.mark.django_db
def test_recruiter_notes_crud_author_permissions(api, candidate_user, recruiter_user, candidate_resume, published_job):
    api.force_authenticate(user=candidate_user)
    apply_res = api.post(f"/api/v1/jobs/{published_job.id}/apply/", {"resume_id": candidate_resume.id}, format="json")
    app_id = apply_res.data["application"]["id"]

    # Recruiter creates note
    api.force_authenticate(user=recruiter_user)
    note_res = api.post(
        f"/api/v1/recruiter/applications/{app_id}/notes/",
        {"note": "Strong portfolio, recommended for tech screen."},
        format="json",
    )
    assert note_res.status_code == 201
    note_id = note_res.data["id"]

    # Edit note
    edit_res = api.patch(
        f"/api/v1/recruiter/applications/{app_id}/notes/{note_id}/",
        {"note": "Updated: Strong portfolio and deep React expertise."},
        format="json",
    )
    assert edit_res.status_code == 200
    assert "deep React expertise" in edit_res.data["note"]

    # Delete note
    del_res = api.delete(f"/api/v1/recruiter/applications/{app_id}/notes/{note_id}/")
    assert del_res.status_code == 200
    assert ApplicationNote.objects.filter(id=note_id).count() == 0


@pytest.mark.django_db
def test_company_review_eligibility_gated(api, candidate_user, recruiter_user, candidate_resume, published_job, recruiter_company):
    api.force_authenticate(user=candidate_user)

    # 1. Candidate attempts to review company BEFORE having an offer or being hired -> Blocked (403)
    review_payload = {
        "rating": 5,
        "review_title": "Great culture and work atmosphere",
        "review_text": "Enjoyed the entire recruitment and onboarding interaction very much.",
    }
    blocked_res = api.post(f"/api/v1/companies/{recruiter_company.id}/reviews/", review_payload, format="json")
    assert blocked_res.status_code == 403
    assert "offer letter or have been hired" in blocked_res.data["detail"]

    # 2. Candidate applies
    apply_res = api.post(f"/api/v1/jobs/{published_job.id}/apply/", {"resume_id": candidate_resume.id}, format="json")
    app_id = apply_res.data["application"]["id"]

    # Still blocked while just "applied"
    blocked_res2 = api.post(f"/api/v1/companies/{recruiter_company.id}/reviews/", review_payload, format="json")
    assert blocked_res2.status_code == 403

    # 3. Recruiter hires candidate
    api.force_authenticate(user=recruiter_user)
    api.post(f"/api/v1/recruiter/applications/{app_id}/hire/")

    # 4. Now candidate can write a review!
    api.force_authenticate(user=candidate_user)
    allowed_res = api.post(f"/api/v1/companies/{recruiter_company.id}/reviews/", review_payload, format="json")
    assert allowed_res.status_code == 201
    assert allowed_res.data["rating"] == 5


@pytest.mark.django_db
def test_recruiter_job_overview_with_hired_applicant(api, candidate_user, recruiter_user, candidate_resume, published_job):
    # 1. Candidate applies
    api.force_authenticate(user=candidate_user)
    apply_res = api.post(f"/api/v1/jobs/{published_job.id}/apply/", {"resume_id": candidate_resume.id}, format="json")
    assert apply_res.status_code == 201
    app_id = apply_res.data["application"]["id"]

    # 2. Recruiter hires applicant
    api.force_authenticate(user=recruiter_user)
    hire_res = api.post(f"/api/v1/recruiter/applications/{app_id}/hire/")
    assert hire_res.status_code == 200

    # 3. Recruiter loads job overview (must be 200 OK without 500 error)
    overview_res = api.get(f"/api/v1/recruiter/jobs/{published_job.id}/overview/")
    assert overview_res.status_code == 200
    data = overview_res.data
    assert "metrics" in data
    assert data["metrics"]["total_applications"] == 1
    assert isinstance(data["metrics"]["average_ats_score"], int)
    assert len(data["stages_summary"]) == 5
    # Hired stage has count 1
    hired_stage_summary = next(s for s in data["stages_summary"] if s["stage_type"] == StageType.HIRED)
    assert hired_stage_summary["count"] == 1
