# 🚀 ERMS — Enterprise Recruitment & Management System

[![Python](https://img.shields.io/badge/Python-3.12-blue.svg?logo=python&logoColor=white)](https://www.python.org/)
[![Django](https://img.shields.io/badge/Django-5.2-092E20.svg?logo=django&logoColor=white)](https://www.djangoproject.com/)
[![DRF](https://img.shields.io/badge/DRF-3.15-red.svg)](https://www.django-rest-framework.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-Cache-DC382D.svg?logo=redis&logoColor=white)](https://redis.io/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An enterprise-grade, full-stack recruitment platform and Applicant Tracking System (ATS) connecting **Candidates**, **Recruiters (Hiring Companies)**, and **Super Administrators**. ERMS streamlines the end-to-end hiring journey: from identity onboarding and master taxonomy management to candidate profile completion, private resume storage, automated ATS scoring, and recruiter talent discovery.

---

## 📑 Table of Contents

- [Architectural Overview](#-architectural-overview)
- [Key Features by Module](#-key-features-by-module)
  - [Module 1: Authentication & Onboarding](#module-1-authentication--onboarding)
  - [Module 2: User Security & Governance](#module-2-user-security--governance)
  - [Module 3: Master Data & Taxonomies](#module-3-master-data--taxonomies)
  - [Module 4: Candidate Profile, Resumes & ATS](#module-4-candidate-profile-resumes--ats)
  - [Roadmap (Upcoming Modules)](#roadmap-upcoming-modules)
- [Technology Stack](#-technology-stack)
- [Directory Structure](#-directory-structure)
- [Getting Started & Local Setup](#-getting-started--local-setup)
  - [Prerequisites](#prerequisites)
  - [1. Backend Setup](#1-backend-setup)
  - [2. Frontend Setup](#2-frontend-setup)
- [Environment Configuration](#-environment-configuration)
- [API Reference](#-api-reference)
- [Testing](#-testing)
- [Contributing & License](#-contributing--license)

---

## 🏛️ Architectural Overview

ERMS is architected following clean separation of concerns:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React 19 + Vite)                     │
│  Tailwind CSS v4 • Lucide Icons • React Router v7 • Axios Client       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS / REST (JSON & Multipart)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   BACKEND API (Django 5.2 + DRF 3.15)                  │
│  Class-Based Views • Permission Guards (RBAC) • Model Serializers      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
        ┌───────────────────────────┴───────────────────────────┐
        ▼                                                       ▼
┌───────────────────────────────┐               ┌───────────────────────────────┐
│         SERVICE LAYER         │               │     CACHE & PRIVATE DISK      │
│  Business Logic & Rules       │               │  Redis (Rate limits, Taxonomies)
│  ATS Parsing & Scoring Engine │               │  Private Resume Storage       │
└───────────────┬───────────────┘               └───────────────────────────────┘
                │
                ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       DATABASE (PostgreSQL 16)                         │
│  52 Tables (DBML ERD) • Constraints • Composite Indexes • Audit Logs   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🌟 Key Features by Module

### Module 1: Authentication & Onboarding
* **Dual-Persona Registration**: Candidate and Recruiter registration flows with automated company profile instantiation.
* **Cryptographic 2FA / OTP Verification**: 6-digit OTP generation with Redis-backed dispatch cooldowns and rate limits (max 3 sends / 5 attempts).
* **Defensive Login Security**: Account lockout protection (5 consecutive failed attempts $\rightarrow$ 15-minute lock).
* **JWT Token Lifecycle**: Short-lived Access Tokens (15 min) and Refresh Tokens (7 days) with automated rotation and server-side blacklisting on logout.
* **Google OAuth 2.0**: One-click social authentication with automated email identity linkage.
* **Password Reset Workflow**: Secure OTP verification for password reset with active session invalidation.

### Module 2: User Security & Governance
* **User Profile & Avatar Management**: Complete profile editing with secure media avatar uploads.
* **Password Change**: Validates existing password and automatically revokes all other active JWT sessions.
* **Multi-Account Linking**: View and unlink third-party social providers (Google/GitHub).
* **Admin User Governance**: Super Admin console to view, filter, suspend, reactivate, or soft-delete accounts.
* **Centralized Audit Logging**: Comprehensive audit trail capturing actor, IP address, user-agent, action type, and JSON details.

### Module 3: Master Data & Taxonomies
* **Canonical Lookup Taxonomies**: Centralized definitions for Industries, Departments, Job Categories, Experience Levels, Work Modes, Skills, Benefits, and Employment Types.
* **Hierarchical Parent-Child Support**: Support for nested categories and ordering.
* **Skill Alias & Synonym Resolution**: Maps informal abbreviations/synonyms (`JS` $\rightarrow$ `JavaScript`, `ReactJS` $\rightarrow$ `React`) with confidence scoring.
* **Redis Caching Layer**: In-memory caching (`master_data:<category>`) for dropdown endpoints with automated cache invalidation on admin mutation.
* **Admin Management Console**: Dedicated UI to create, update, toggle active status, and batch reorder taxonomy items.
* **Database Seeding**: Management command (`python manage.py seed_master_data`) to populate industry-standard taxonomies.

### Module 4: Candidate Profile, Resumes & ATS
* **Candidate Profile Matrix**: Professional headline, bio, location, seeking status, salary expectations, relocation willingness, and social links.
* **Dynamic Profile Completeness Engine**: 100% progress score evaluating Bio (15%), Location/Seeking (10%), Experience (25%), Education (15%), Skills (20%), and Primary Resume (15%) with missing recommendation prompts.
* **Education & Experience History**: Timeline tracking academic degrees, GPAs, employment history, and date constraints.
* **Master-Data-Backed Skills**: Autocomplete skill selection backed by master taxonomies and synonym resolution.
* **Multi-Resume Management**: Secure storage in private directories (`storage/private/resumes/candidate_<id>/`) with primary resume toggling.
* **Automated ATS Scoring Engine**:
  * Extracts text from PDF (`pypdf`) and DOCX (`python-docx`).
  * 0–100 composite ATS score evaluating formatting, contact information, skill density, impact verbs, and education.
  * Detects 80+ high-impact action verbs and quantifiable metrics.
  * Outputs strengths, weaknesses, matched keywords, and prioritized keyword recommendations.
* **Recruiter Talent Discovery**: Privacy-masked candidate search for recruiters (`"Jane D."`, `"j***@***.com"`) filterable by skills, experience range, and location.

---

## 🔮 Roadmap (Upcoming Modules)

- [ ] **Module 5**: Company Profile, Verification 
- [ ] **Module 6**: Job Requisitions, Publishing & Candidate Matching
- [ ] **Module 7**: Application Tracking System (Multi-Stage Hiring Pipeline)
- [ ] **Module 8**: Interview Scheduling & Multi-Criteria Scorecards
- [ ] **Module 9**: Job Offers, Negotiations & Digital Signatures
- [ ] **Module 10**: Subscription Plans, Stripe Billing & Usage Quotas

---

## 💻 Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend Framework** | Django 5.2, Django REST Framework 3.15 |
| **Authentication** | `djangorestframework-simplejwt`, `google-auth` |
| **Database** | PostgreSQL 16 (`psycopg` 3.2) |
| **Caching & Throttling**| Redis 7.x (`django-redis`) |
| **Resume Parsing** | `pypdf`, `python-docx` |
| **Frontend Framework** | React 19, Vite |
| **Styling** | Tailwind CSS v4, Lucide Icons |
| **State & Routing** | React Router v7, Redux Toolkit, Context API |
| **HTTP Client** | Axios (configured with token refresh interceptors) |

---

## 📂 Directory Structure

```
ERMS/
├── backend/
│   ├── apps/
│   │   ├── accounts/             # Authentication, User Profiles, Security, Audit Logs
│   │   ├── candidates/           # Candidate Profiles, Resumes, ATS Analyzer, Recruiter Search
│   │   ├── companies/            # Company entities and Recruiter links
│   │   └── master_data/          # Taxonomy items, Skill Aliases, Seeding commands
│   ├── config/
│   │   ├── settings/
│   │   │   ├── base.py           # Shared settings (DRF, JWT, DB, Cache, Storage)
│   │   │   ├── dev.py            # Development configurations (CORS, Email console)
│   │   │   └── prod.py           # Production hardening (SSL, SMTP)
│   │   └── urls.py               # Main API URL gateway (/api/v1/...)
│   ├── requirements/
│   │   ├── base.txt              # Core requirements (Django, DRF, SimpleJWT, Redis)
│   │   ├── dev.txt               # Testing & development tooling (pytest)
│   │   └── prod.txt              # Production servers (Gunicorn)
│   ├── shared/                   # Constants, Enums, API Exception handlers
│   ├── storage/private/          # Secure, private file storage (Resumes)
│   ├── manage.py
│   └── pytest.ini
│
├── frontend/
│   ├── src/
│   │   ├── api/                  # Axios API modules (auth, user, candidate, masterData, admin)
│   │   ├── components/           # Reusable UI & Candidate/Admin Modals
│   │   ├── context/              # AuthContext, ToastContext
│   │   ├── layouts/              # CandidateLayout, AdminLayout, RecruiterLayout
│   │   ├── pages/                # Auth, Candidate, Settings, and Admin pages
│   │   ├── utils/                # Image URL resolvers, formatters
│   │   ├── App.jsx               # Routes & Role-Based Route Guards
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
│
└── docs/                         # DBML Schema, API Documentation & Agent Context
```

---

## 🚀 Getting Started & Local Setup

### Prerequisites
* **Python** 3.12+
* **Node.js** 18+ & **npm**
* **PostgreSQL** 14+
* **Redis** (Optional in dev; falls back to in-memory cache)

---

### 1. Backend Setup

```bash
# 1. Navigate to backend directory
cd backend

# 2. Create and activate a Python virtual environment
python -m venv venv

# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# macOS/Linux:
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements/dev.txt

# 4. Configure environment variables
copy .env.example .env
# Edit .env to set your DB credentials and DJANGO_SECRET_KEY

# 5. Run database migrations
python manage.py migrate

# 6. Seed master data taxonomies and skill aliases
python manage.py seed_master_data

# 7. Create a Super Administrator account
python manage.py createsuperuser

# 8. Start the Django development server
python manage.py runserver
```

The backend API will be running at: `http://localhost:8000/`

---

### 2. Frontend Setup

```bash
# 1. Open a new terminal and navigate to frontend directory
cd frontend

# 2. Install npm dependencies
npm install

# 3. Ensure environment variables are configured
# Create .env if not present:
echo VITE_API_URL=http://localhost:8000/api/v1 > .env

# 4. Start Vite development server
npm run dev
```

The frontend application will be running at: `http://localhost:5173/`

---

## ⚙️ Environment Configuration

### Backend (`backend/.env`)

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `DJANGO_SECRET_KEY` | Django cryptographic secret key | *Random string* |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated allowed host headers | `localhost,127.0.0.1` |
| `DB_NAME` | PostgreSQL database name | `erms` |
| `DB_USER` | PostgreSQL user | `postgres` |
| `DB_PASSWORD` | PostgreSQL password | `postgres` |
| `DB_HOST` | Database host | `localhost` |
| `DB_PORT` | Database port | `5432` |
| `REDIS_URL` | Redis connection URL | `redis://127.0.0.1:6379/0` |
| `DEFAULT_FROM_EMAIL` | Default outbound email sender | `no-reply@erms.local` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID for social login | *(Optional)* |

### Frontend (`frontend/.env`)

| Variable | Description | Example |
| :--- | :--- | :--- |
| `VITE_API_URL` | Base URL for backend REST API | `http://localhost:8000/api/v1` |
| `VITE_GOOGLE_CLIENT_ID`| Google Client ID for OAuth buttons | *(Google Cloud credentials)* |

---

## 📡 API Reference

| Endpoint | Method | Role / Auth | Description |
| :--- | :--- | :--- | :--- |
| **Auth** | | | |
| `/api/v1/auth/register/` | `POST` | Public | Register Candidate or Recruiter |
| `/api/v1/auth/verify-otp/` | `POST` | Public | Verify 6-digit OTP & receive JWT |
| `/api/v1/auth/login/` | `POST` | Public | Authenticate with email & password |
| `/api/v1/auth/google/` | `POST` | Public | Google OAuth login / account linking |
| `/api/v1/auth/logout/` | `POST` | Authenticated | Blacklist refresh token & logout |
| **User Profile & Security** | | | |
| `/api/v1/users/me/` | `GET` / `PATCH` | Authenticated | View or edit user profile info |
| `/api/v1/users/me/photo/` | `PUT` / `DELETE`| Authenticated | Upload or delete profile photo |
| `/api/v1/users/me/password/` | `POST` | Authenticated | Change password & revoke sessions |
| **Master Data** | | | |
| `/api/v1/master-data/<category>/` | `GET` | Public | Cached taxonomy items for dropdowns |
| `/api/v1/admin/master-data/` | `GET` / `POST` | Super Admin | Manage master taxonomy records |
| `/api/v1/admin/master-data/reorder/`| `POST` | Super Admin | Batch reorder taxonomy items |
| `/api/v1/admin/skill-aliases/` | `GET` / `POST` | Super Admin | Manage skill synonym mappings |
| **Candidate Profile & Resumes** | | | |
| `/api/v1/candidate/profile/` | `GET` / `PATCH` | Candidate | Candidate profile & completeness score |
| `/api/v1/candidate/education/` | `GET` / `POST` | Candidate | Academic records CRUD |
| `/api/v1/candidate/experience/` | `GET` / `POST` | Candidate | Work experience history CRUD |
| `/api/v1/candidate/skills/` | `GET` / `POST` | Candidate | Master-data-backed skill matrix |
| `/api/v1/candidate/resumes/` | `GET` / `POST` | Candidate | Resume upload & list |
| `/api/v1/candidate/resumes/<id>/analyze/` | `POST` | Candidate | Re-run automated ATS analysis engine |
| `/api/v1/candidate/resumes/<id>/download/`| `GET` | RBAC | Securely stream private resume file |
| **Recruiter Discovery** | | | |
| `/api/v1/recruiter/candidates/` | `GET` | Recruiter/Admin | Privacy-masked candidate talent search |

---

## 🧪 Testing

The backend includes a comprehensive `pytest` suite testing models, services, authentication, permissions, and API views:

```bash
cd backend
pytest -v
```

To run a specific test suite:
```bash
# Test candidate profile & resume operations:
pytest apps/candidates/tests/ -v

# Test authentication & security:
pytest apps/accounts/tests/ -v

# Test master data & caching:
pytest apps/master_data/tests/ -v
```

---

## 📄 License

This project is licensed under the **MIT License**.

