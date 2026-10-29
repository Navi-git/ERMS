# ERMS (Enterprise Recruitment Management System) — Project Context & Agent Briefing

> **Last Updated:** Current State (Module 1, Step 2 completed & verified with 38/38 passing tests)
> **Branch:** `feature/auth-fresh-start`

---

## 1. Project Overview & Architecture

### What is ERMS?
**ERMS** is a comprehensive, production-grade recruitment and applicant tracking platform connecting three primary personas:
1. **Candidates**: Create profiles, upload & parse resumes, browse/save jobs, track applications across stages, attend interviews, accept offers.
2. **Recruiters (Companies)**: Post jobs, manage candidate pipelines with customizable hiring stages, conduct interviews, record multi-criteria scorecard evaluations, extend offers, manage team subscriptions.
3. **Super Admins**: System-wide governance, company verification, audit logging, analytics/reports, billing & platform operations.

### Data Architecture Source of Truth
- **ERD Schema**: Defined in [`docs/recruitment_erd_v7.dbml`](file:///c:/BROCAMP%20VS%20CODE/ERMS/docs/recruitment_erd_v7.dbml) and detailed in [`docs/ERMS_DATABASE_SCHEMA.md`](file:///c:/BROCAMP%20VS%20CODE/ERMS/docs/ERMS_DATABASE_SCHEMA.md).
- **Scale**: 52 tables, 9 enums covering Core Entities, Candidate Profiles, Master Data, Companies, Jobs, Applications, Interviews, Offers, Messaging, Verification, and Subscriptions.

---

## 2. Technology Stack & Environment

| Component | Technology | Notes / Details |
|---|---|---|
| **Language** | Python 3.12 | Managed in local virtual environment `backend/venv` |
| **Framework** | Django 5.2.x + DRF 3.15.x | Class-based views, serializers, clean services layer |
| **Authentication** | SimpleJWT 5.3.x (`rest_framework_simplejwt`) | Access tokens (15m), Refresh tokens (7d), blacklist on logout |
| **Database** | PostgreSQL + `psycopg` 3.2 | Schema tables match DBML exactly, `bigint` IDs |
| **Cache & Throttling** | Redis (`django-redis`) / `LocMemCache` | OTP cooldowns, send rate limits, failed attempt counters |
| **Testing** | `pytest` + `pytest-django` | 38 passing tests, isolated in-memory cache, zero Redis dependencies during test runs |
| **Frontend (Target)** | React / Vite | Configured CORS origin: `http://localhost:5173` |

---

## 3. Directory & Codebase Structure

```
ERMS/
├── backend/
│   ├── apps/
│   │   ├── accounts/              # User model, UserSecurity, OtpVerification, AuthIdentity, OTP logic
│   │   ├── companies/             # Company model, verification status, recruiter links
│   │   └── master_data/           # MasterDataItem (taxonomy: industry, job_category, experience_level)
│   ├── config/
│   │   ├── settings/
│   │   │   ├── base.py            # Global settings, DRF configuration, JWT lifetimes, OTP rules
│   │   │   ├── dev.py             # DEBUG=True, console email backend, CORS setup
│   │   │   └── prod.py            # Production hardening, SSL, SMTP
│   │   └── urls.py                # Base routing: /admin/, /api/v1/auth/
│   ├── shared/
│   │   ├── constants/
│   │   │   ├── roles.py           # Role enum: candidate, recruiter, super_admin
│   │   │   └── auth.py            # OtpPurpose, AuthProvider
│   │   └── exceptions/
│   │       └── api.py             # ApiError: standard {"code": "...", "message": "..."} responses
│   ├── requirements/              # base.txt, dev.txt, prod.txt
│   ├── conftest.py                # Pytest fixtures: api client, isolated test cache
│   └── pytest.ini                 # Pytest Django settings config
└── docs/
    ├── AGENT_CONTEXT.md           # This document
    ├── DEVELOPMENT_STATUS.md      # Progress tracker and status table
    ├── auth_api.md                # Public Auth API specification (Step 2)
    ├── ERMS_DATABASE_SCHEMA.md    # Complete markdown breakdown of all 52 tables
    └── recruitment_erd_v7.dbml    # Official DBML schema specification
```

---

## 4. Current Implementation Status

### Module 1: Authentication & Onboarding

| Step | Scope | Status | Notes |
|---|---|---|---|
| **Step 1** | Scaffolding, settings, core models (`users`, `user_security`, `otp_verifications`, `auth_identities`, `companies`, `master_data_items`) | **DONE** | Migrated and verified against PostgreSQL ERD. |
| **Step 2** | Registration (Candidate & Recruiter), OTP verification, OTP resend, Redis throttles | **DONE** | Fully verified; 38/38 unit and integration tests passing. |
| **Step 3** | Login, SimpleJWT token issuance, token refresh, logout (with blacklist), account lockout, `/me` endpoint | **NEXT TASK** | Needs implementation in `apps.accounts`. |
| **Step 4** | Password reset flow (Forgot password OTP -> reset password) | Pending | After Step 3. |
| **Step 5** | Social OAuth (Google / LinkedIn via `auth_identities`) | Pending | After Step 4. |
| **Step 6** | Frontend Auth Views (Login, Signup, OTP Verify) | Pending | Awaiting Figma/UI assets. |

---

## 5. Architectural Conventions & Design Decisions

Any incoming agent **MUST** uphold the following rules:

1. **Schema Fidelity & Approved Exceptions**:
   - `User` model maps to the `users` table (`db_table = "users"`).
   - `password` column is named `password_hash` (`db_column="password_hash"`).
   - `last_login_at` is used instead of Django's default `last_login` (disabled on model).
   - Recruiter accounts register with `company_name`; `full_name` defaults to `company_name` unless specified.
   - `companies.industry_id` is **nullable** at signup so recruiters can register without picking an industry upfront (enforced later at verification submission).
   - Account blocking is implemented via `suspended_at` / `suspended_by`. Soft deletes are handled via `is_active = False`.

2. **Layer Separation**:
   - **Views (`views.py`)**: Thin. Validate input with serializers, invoke services, return DRF `Response`.
   - **Services (`services.py`)**: Fat. All transactions, OTP generation, emails, business rules, and cache counters live here.
   - **Public Endpoints**: Must inherit from `PublicAPIView` (`permission_classes = [AllowAny]`, `authentication_classes = []`) so invalid tokens in request headers do not block access.

3. **API Error Response Format**:
   - Validation errors: standard DRF dict format, e.g. `{"email": ["Enter a valid email address."]}`.
   - Business rule / domain errors: always use `ApiError` from `shared.exceptions.api`, producing:
     ```json
     {
       "code": "invalid_otp",
       "message": "Invalid or expired code."
     }
     ```

4. **OTP & Security Lifecycle**:
   - OTP records are persisted in PostgreSQL table `otp_verifications` for auditability.
   - Transient limits are tracked in Redis/Cache:
     - Resend cooldown: 60 seconds (`otp:cooldown:<purpose>:<email>`).
     - Max sends per hour: 5 requests (`otp:sends:<purpose>:<email>`).
     - Max invalid attempts: 5 tries per code (`otp:attempts:<otp_id>`) before locking the code.
   - Resend endpoint responds silently (generic success) for non-existent or already-verified accounts to prevent user enumeration.

---

## 6. How to Run & Verify

- **Run all tests**:
  ```powershell
  backend\venv\Scripts\pytest.exe backend\apps\accounts\tests
  ```
- **Run Django migrations**:
  ```powershell
  backend\venv\Scripts\python.exe backend\manage.py migrate
  ```
- **Run dev server**:
  ```powershell
  backend\venv\Scripts\python.exe backend\manage.py runserver
  ```
