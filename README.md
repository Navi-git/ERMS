# 🚀 ERMS — Enterprise Recruitment & Management System

[![Python](https://img.shields.io/badge/Python-3.12-blue.svg?logo=python&logoColor=white)](https://www.python.org/)
[![Django](https://img.shields.io/badge/Django-5.2-092E20.svg?logo=django&logoColor=white)](https://www.djangoproject.com/)
[![DRF](https://img.shields.io/badge/DRF-3.15-red.svg)](https://www.django-rest-framework.org/)
[![Channels](https://img.shields.io/badge/Django_Channels-4.1-orange.svg?logo=django&logoColor=white)](https://channels.readthedocs.io/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-Cache_%26_Channels-DC382D.svg?logo=redis&logoColor=white)](https://redis.io/)
[![ReportLab](https://img.shields.io/badge/ReportLab-PDF_Engine-yellow.svg)](https://www.reportlab.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An enterprise-grade, full-stack recruitment platform and Applicant Tracking System (ATS) connecting **Candidates**, **Recruiters (Hiring Companies)**, and **Super Administrators**. 

ERMS streamlines the complete hiring lifecycle: identity onboarding, taxonomy management, candidate profiles, private resume storage, automated ATS scoring, employer branding & verification, custom job requisition pipelines, interview scheduling with scorecards, formal offer formulation with dynamic PDF generation, real-time WebSockets direct messaging, and event-driven notifications.

---

## 📑 Table of Contents

- [🏛️ Architectural Overview](#️-architectural-overview)
- [🌟 Key Features by Module](#-key-features-by-module)
  - [Module 1: Authentication & Onboarding](#module-1-authentication--onboarding)
  - [Module 2: User Security & Governance](#module-2-user-security--governance)
  - [Module 3: Master Data & Taxonomies](#module-3-master-data--taxonomies)
  - [Module 4: Candidate Profile, Resumes & ATS Scoring](#module-4-candidate-profile-resumes--ats-scoring)
  - [Module 5: Company Management, Verification & Branding](#module-5-company-management-verification--branding)
  - [Module 6: Job Requisitions, Publishing & Pipeline Customization](#module-6-job-requisitions-publishing--pipeline-customization)
  - [Module 7: Applicant Tracking System (ATS) & Hiring Pipeline](#module-7-applicant-tracking-system-ats--hiring-pipeline)
  - [Module 8: Interview Scheduling & Multi-Criteria Scorecards](#module-8-interview-scheduling--multi-criteria-scorecards)
  - [Module 9: Offer Formulation, ReportLab PDF & Decision Portal](#module-9-offer-formulation-reportlab-pdf--decision-portal)
  - [Module 10: Real-Time Chat & Direct Messaging](#module-10-real-time-chat--direct-messaging)
  - [Cross-Cutting: Event-Driven Real-Time Notifications](#cross-cutting-event-driven-real-time-notifications)
- [🔮 Roadmap](#-roadmap)
- [💻 Technology Stack](#-technology-stack)
- [📂 Directory Structure](#-directory-structure)
- [🚀 Getting Started & Local Setup](#-getting-started--local-setup)
  - [Prerequisites](#prerequisites)
  - [1. Backend Setup](#1-backend-setup)
  - [2. Frontend Setup](#2-frontend-setup)
- [⚙️ Environment Configuration](#️-environment-configuration)
- [📡 API Reference](#-api-reference)
- [🧪 Testing Suite](#-testing-suite)
- [📄 License](#-license)

---

## 🏛️ Architectural Overview

ERMS is designed with a decoupled, event-driven architecture separating RESTful business services from asynchronous real-time communications:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React 19 + Vite)                      │
│  Tailwind CSS v4 • Lucide Icons • React Router v7 • Axios Client       │
│  Redux Toolkit • Context API • Native WebSocket Reconnection Protocol  │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │ HTTPS / REST (JSON & FormData) │ WSS / WebSocket
                    ▼                                ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   BACKEND ASGI (Django 5.2 + Daphne)                   │
│  Class-Based Views (DRF 3.15)       │  Django Channels (v4.1)          │
│  Permission Guards (RBAC)           │  ChatConsumer & NotificationCon  │
│  Model Serializers & Validators     │  JWT Auth WebSocket Middleware   │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
        ┌───────────┴─────────────────┐              ▼
        ▼                             ▼    ┌───────────────────────────┐
┌───────────────────────────┐         │    │       REDIS 7.x           │
│       SERVICE LAYER       │         │    │  Channels Layer Backend   │
│  Transition Service       │         │    │  Cache (Taxonomies, OTP)  │
│  ATS Parsing & Scoring    │         │    │  Rate Limiting & Counters │
│  Interview & Scorecards   │         │    └───────────────────────────┘
│  Offer Letter & PDF Engine│         │
│  Messaging Domain Service │         ▼
└───────────────┬───────────┘   ┌───────────────────────────┐
                │               │    PRIVATE FILE SYSTEM    │
                │               │  Resumes (Encrypted paths)│
                │               │  Branded Offer Letter PDFs│
                │               │  Chat Attachments & Media │
                ▼               └───────────────────────────┘
┌────────────────────────────────────────────────────────────────────────┐
│                       DATABASE (PostgreSQL 16)                         │
│  Relational Schema • Composite Indexes • Unique Constraints            │
│  ACID Transactions • Soft Deletes • Audit Logs & Timelines             │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🌟 Key Features by Module

### Module 1: Authentication & Onboarding
* **Dual-Persona Registration**: Candidate and Recruiter self-service flows with auto-created company records for recruiters.
* **Cryptographic OTP Verification**: 6-digit OTP verification backed by Redis with rate limiting (max 3 sends / 5 attempts per window).
* **Defensive Login Security**: Account lockout enforcement after 5 consecutive failed attempts with automated 15-minute cool-off.
* **JWT Token Lifecycle**: Short-lived Access Tokens (15 min) and Refresh Tokens (7 days) with automated token rotation and server-side blacklisting on logout.
* **Google OAuth 2.0 Integration**: One-click social login and automatic email identity association.
* **Password Reset Workflow**: Secure password recovery with OTP validation and universal session invalidation.

### Module 2: User Security & Governance
* **Profile & Media Management**: User avatar uploads with server-side validation and secure storage.
* **Credential Rotation**: Password change workflow requiring current credentials and revoking active sessions.
* **Admin User Governance**: Super Administrator dashboard to search, filter, activate, suspend, or soft-delete accounts.
* **Centralized Audit Logging**: Detailed audit records capturing actor, action category, IP address, user agent, and payload diffs.

### Module 3: Master Data & Taxonomies
* **Canonical Lookups**: Standardized taxonomies for Industries, Departments, Job Categories, Experience Levels, Work Arrangements, Skills, Benefits, and Employment Classifications.
* **Skill Alias & Synonym Resolution**: Maps informal aliases (`JS` $\rightarrow$ `JavaScript`, `ReactJS` $\rightarrow$ `React`) with confidence scoring.
* **Redis Caching**: Cached lookup endpoints (`master_data:<category>`) with automatic cache eviction on administrator mutation.
* **Admin Taxonomy Studio**: Web UI for creating, editing, sorting, and batch-reordering taxonomy definitions.
* **Automated Seeding**: Built-in CLI command (`python manage.py seed_master_data`) to populate industry-standard taxonomies.

### Module 4: Candidate Profile, Resumes & ATS Scoring
* **Candidate Matrix**: Professional headline, summary bio, location, seeking status, compensation expectations, relocation preference, and portfolio links.
* **Dynamic Completeness Engine**: 100% progress score evaluating Bio (15%), Location (10%), Experience (25%), Education (15%), Skills (20%), and Primary Resume (15%) with missing field alerts.
* **Multi-Resume Repository**: Multiple resume versions stored in secure directories with primary resume tagging.
* **Automated ATS Scoring Engine**:
  * Text extraction from PDF (`pypdf`) and Word (`python-docx`).
  * 0–100 composite ATS score evaluating structure, contact info, skill density, impact verbs, and education.
  * Detection of 80+ high-impact action verbs and quantifiable achievements.
  * Actionable feedback detailing strengths, weaknesses, missing keywords, and score breakdowns.
* **Recruiter Talent Discovery**: Privacy-masked candidate search for recruiters with filters for skills, experience, and location.

### Module 5: Company Management, Verification & Branding
* **Company Profiles**: Public and recruiter-facing company hubs featuring logos, banners, mission statements, team size, locations, and culture highlights.
* **Official Verification Workflow**:
  * Recruiter document submission (incorporation certificates, tax registrations, utility proofs).
  * Super Admin verification queue to inspect submissions, verify authenticity, and approve, reject, or request changes with notes.
  * Branded "Verified Employer" badges surfaced throughout job posts and offer letters.
* **Company Benefits & Perks**: Configurable perks catalog categorized into health, financial, PTO, and equipment allowances.

### Module 6: Job Requisitions, Publishing & Pipeline Customization
* **Requisition Formulation**: Rich job authoring specifying department, role type, vacancies, compensation ranges, experience requirements, and skill prerequisites.
* **Custom Stage Pipeline Builder**: Configurable multi-stage pipelines per job posting with reorderable stages (Applied, Screening, Technical, Executive, Offer, Hired).
* **Job Posting Lifecycle**: Full control over job states: `DRAFT`, `PUBLISHED`, `PAUSED`, and `CLOSED`.
* **Candidate Job Discovery**: Advanced public job search with full-text querying, category filtering, salary range filtering, and work mode filters (Remote, Hybrid, On-site).
* **Saved Jobs Library**: Candidates can bookmark positions to monitor application deadlines and salary updates.

### Module 7: Applicant Tracking System (ATS) & Hiring Pipeline
* **One-Click Application Flow**: Tailored resume selection, cover note submission, and duplicate prevention.
* **Interactive Kanban Pipeline**: Recruiters can drag-and-drop or select applicant cards to transition candidates between custom stages.
* **Comprehensive Applicant Dossier**: Recruiter view combining candidate profile, parsed resume, ATS score report, timeline history, and notes.
* **Stage Transition Engine**: Validates stage progression, updates application statuses, updates timestamps, and triggers automated candidate notifications.
* **Application Status Tracking**: Real-time status tracker for candidates with milestone timelines and rejection feedback explanations.

### Module 8: Interview Scheduling & Multi-Criteria Scorecards
* **Multi-Round Scheduling**: Coordinate technical, behavioral, and culture-fit rounds with title, format, date, and duration.
* **Video Conference Integration**: Direct support for Google Meet, Zoom, and custom meeting URLs with access instructions.
* **Interview Operations**: Status tracking (`SCHEDULED`, `COMPLETED`, `CANCELLED`, `RESCHEDULED`) with calendar reminders.
* **Multi-Criteria Recruiter Scorecards**:
  * Standardized evaluation criteria (Technical Depth, Problem Solving, Communication, Culture Fit, Leadership).
  * 1–5 rating scales, qualitative observations, overall recommendations (Strong Yes, Yes, Neutral, No, Strong No).
  * Automatically aggregated scorecard metrics surfaced in the applicant dossier.
* **Candidate Interview Center**: Dedicated dashboard for candidates to view scheduled sessions, join video calls, and prepare with round-specific agendas.

### Module 9: Offer Formulation, ReportLab PDF & Decision Portal
* **Offer Formulation Studio**:
  * Comprehensive remuneration parameters: Base salary, pay frequency, sign-on bonus, performance bonus target, and equity package (grant type, units, vesting schedule).
  * Reporting line configuration with custom manager assignment and title details.
  * Timeline milestones: Proposed start date and offer expiration deadline.
* **Corporate Letter PDF Generation**:
  * Pixel-perfect ReportLab PDF rendering with official company letterhead, formatted compensation tables, legal terms, and dual signature blocks.
  * Robust merge token replacement supporting standard and alias tokens (`{candidate_name}`, `{job_title}`, `{salary}`, `{hiring_manager}`, `{start_date}`, etc.) with whitespace and case tolerance.
* **Supplemental Collateral Attachments**: Upload and bind benefits guides, equity plan documents, and IP disclosures directly to the offer dossier.
* **Candidate Offer Decision Portal**:
  * Candidate dashboard presenting remuneration breakdowns, annualized target earnings, and enclosed benefits.
  * Live in-browser letter preview modal and instant PDF download with dynamic token verification.
  * Formal electronic acceptance and decline workflows featuring decline reason tracking and optional candidate feedback.

### Module 10: Real-Time Chat & Direct Messaging
* **Real-Time WebSocket Architecture**: Powered by Django Channels and Redis channel layers for instant, bi-directional message delivery with reconnection handling.
* **Application-Linked Conversations**: Chat threads automatically bound to application dossiers, connecting candidate and recruiter in context.
* **Rich Messaging Capabilities**:
  * Plain text and structured system announcements.
  * File and document attachments (PDFs, images, documents) with size verification and secure downloads.
  * Real-time typing indicators (`typing_indicator` events).
  * Message read receipts and dynamic per-user unread badge counters.
* **Chat Management & Security**: Report chat capability, conversation search, and active participant authorization guards.

### Cross-Cutting: Event-Driven Real-Time Notifications
* **Unified Event Dispatcher**: Centralized notification service triggering on key milestones (Application Received, Stage Advanced, Interview Scheduled, Offer Extended, Offer Responded, Chat Message Received).
* **Dual Delivery Channels**: In-app database persistence and instant real-time WebSocket broadcast to user-specific groups (`user_<id>`).
* **Notification Center**: Dedicated user drawers and management views with unread filters, mark-all-read actions, and deep-link navigation.

---

## 🔮 Roadmap

- [x] **Module 1**: Authentication, Onboarding & Security
- [x] **Module 2**: User Security, Profile & Governance
- [x] **Module 3**: Master Data & Taxonomies
- [x] **Module 4**: Candidate Profile, Resumes & ATS Scoring
- [x] **Module 5**: Company Profiles, Document Verification & Branding
- [x] **Module 6**: Job Requisitions, Publishing & Pipeline Customization
- [x] **Module 7**: Applicant Tracking System (ATS) & Hiring Pipeline
- [x] **Module 8**: Interview Scheduling & Multi-Criteria Scorecards
- [x] **Module 9**: Offer Formulation, ReportLab PDF & Candidate Decision Portal
- [x] **Module 10**: Real-Time Chat & Direct Messaging
- [ ] **Module 11**: Subscription Tiers, Stripe Billing & Recruiter Usage Quotas
- [ ] **Module 12**: Advanced Analytics & Hiring Velocity Dashboards
- [ ] **Module 13**: Native WebRTC Video Interviewing

---

## 💻 Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend Framework** | Django 5.2, Django REST Framework 3.15 |
| **ASGI & WebSockets** | Django Channels 4.1, Daphne 4.1 |
| **Database** | PostgreSQL 16 (`psycopg` 3.2) |
| **Caching & Channels** | Redis 7.x (`django-redis`, `channels-redis`) |
| **PDF Generation** | ReportLab 5.0 |
| **Document Parsing** | `pypdf`, `python-docx` |
| **Authentication** | `djangorestframework-simplejwt`, `google-auth` |
| **Frontend Framework** | React 19, Vite 8 |
| **Styling** | Tailwind CSS v4, Lucide Icons |
| **Routing & State** | React Router v7, Redux Toolkit, Context API |
| **HTTP & Networking** | Axios (configured with automated refresh interceptors), WebSocket API |

---

## 📂 Directory Structure

```
ERMS/
├── backend/
│   ├── apps/
│   │   ├── accounts/             # Authentication, User Profiles, Security, Audit Logs
│   │   ├── applications/         # ATS Pipeline, Stage Transitions, Dossiers
│   │   ├── candidates/           # Profiles, Resumes, ATS Analyzer Engine, Talent Discovery
│   │   ├── companies/            # Company Profiles, Document Verification, Benefits
│   │   ├── interviews/           # Interview Scheduling, Rounds, Multi-Criteria Scorecards
│   │   ├── jobs/                 # Job Requisitions, Pipeline Stages, Saved Jobs
│   │   ├── master_data/          # Taxonomy Items, Skill Aliases, DB Seeding
│   │   ├── messaging/            # Real-Time Chat, Channels Consumers, Attachments
│   │   ├── notifications/        # Event-driven Notifications, WebSocket Broadcasts
│   │   └── offers/               # Offer Formulation Studio, ReportLab PDF, Candidate Portal
│   ├── config/
│   │   ├── settings/
│   │   │   ├── base.py           # Shared settings (DRF, JWT, Channels, DB, Media)
│   │   │   ├── dev.py            # Development configurations (CORS, Email console)
│   │   │   └── prod.py           # Production hardening
│   │   ├── asgi.py               # ASGI Application Router (HTTP + WebSockets)
│   │   ├── urls.py               # Main REST API Gateway (/api/v1/...)
│   │   └── wsgi.py               # WSGI Application fallback
│   ├── media/                    # Media uploads (Avatars, Company Docs, Offers, Chat files)
│   ├── requirements/
│   │   ├── base.txt              # Core requirements (Django, DRF, Channels, Redis, ReportLab)
│   │   ├── dev.txt               # Testing & development tooling (pytest, pytest-django)
│   │   └── prod.txt              # Production deployment servers (Gunicorn, Daphne)
│   ├── shared/                   # Constants, Enums, Roles, Exceptions
│   ├── storage/private/          # Private candidate resume storage
│   ├── manage.py
│   └── pytest.ini
│
├── frontend/
│   ├── src/
│   │   ├── api/                  # Modular Axios API services (auth, jobs, offers, chat, etc.)
│   │   ├── components/           # Reusable UI widgets, Modals, Pipeline components
│   │   │   ├── candidate/        # Candidate Offer & Application modals
│   │   │   ├── chat/             # ChatContainer, ChatThread, AttachmentPreviewModal
│   │   │   ├── recruiter/        # Rejection modals, Stage configurators, Manager modals
│   │   │   └── common/           # Form inputs, Cards, Badges, Loaders
│   │   ├── context/              # AuthContext, ToastContext
│   │   ├── layouts/              # CandidateLayout, RecruiterLayout, AdminLayout
│   │   ├── pages/
│   │   │   ├── admin/            # Verification queue, User/Job governance, Taxonomies
│   │   │   ├── candidate/        # Job search, Applications, Interviews, Offers, Messages
│   │   │   ├── recruiter/        # Pipeline, Formulation studio, Scorecards, Messages
│   │   │   └── auth/             # Login, Register, OTP verification, Password Reset
│   │   ├── utils/                # Date formatters, File size parsers, Image resolvers
│   │   ├── App.jsx               # Route definitions & Role-Based Access Guards
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
│
└── docs/                         # Architecture guidelines, DBML Schemas & PR Descriptions
```

---

## 🚀 Getting Started & Local Setup

### Prerequisites
* **Python** 3.12+
* **Node.js** 18+ & **npm**
* **PostgreSQL** 14+
* **Redis** 6+ (Required for Channels WebSocket layer and caching)

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
# Edit .env to set DB credentials, REDIS_URL, and DJANGO_SECRET_KEY

# 5. Run database migrations
python manage.py migrate

# 6. Seed master data taxonomies and decline reasons
python manage.py seed_master_data

# 7. Create a Super Administrator account
python manage.py createsuperuser

# 8. Start ASGI development server (supports both HTTP and WebSockets)
daphne -b 127.0.0.1 -p 8000 config.asgi:application
# Or use standard runserver (with Channels installed):
python manage.py runserver
```

The backend server will run at: `http://localhost:8000/`

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

The frontend application will be accessible at: `http://localhost:5173/`

---

## ⚙️ Environment Configuration

### Backend (`backend/.env`)

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `DJANGO_SECRET_KEY` | Django cryptographic secret key | *Random secure string* |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated allowed host headers | `localhost,127.0.0.1` |
| `DB_NAME` | PostgreSQL database name | `erms_db` |
| `DB_USER` | PostgreSQL user | `erms_user` |
| `DB_PASSWORD` | PostgreSQL password | `secret_password` |
| `DB_HOST` | Database host | `localhost` |
| `DB_PORT` | Database port | `5432` |
| `REDIS_URL` | Redis connection URL for Cache & Channels | `redis://127.0.0.1:6379/0` |
| `DEFAULT_FROM_EMAIL` | Default outbound notification sender | `no-reply@erms.local` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID for social login | *(Optional)* |

### Frontend (`frontend/.env`)

| Variable | Description | Example |
| :--- | :--- | :--- |
| `VITE_API_URL` | Base URL for backend REST API | `http://localhost:8000/api/v1` |
| `VITE_WS_URL` | Base URL for WebSocket connections | `ws://localhost:8000/ws` |
| `VITE_GOOGLE_CLIENT_ID`| Google Client ID for OAuth login buttons | *(Google Cloud credentials)* |

---

## 📡 API Reference

### Authentication & User Governance
| Endpoint | Method | Role / Auth | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/auth/register/` | `POST` | Public | Register Candidate or Recruiter |
| `/api/v1/auth/verify-otp/` | `POST` | Public | Verify 6-digit OTP & retrieve JWT tokens |
| `/api/v1/auth/login/` | `POST` | Public | Email and password authentication |
| `/api/v1/auth/google/` | `POST` | Public | Google OAuth social login & linking |
| `/api/v1/auth/logout/` | `POST` | Authenticated | Blacklist refresh token & clear session |
| `/api/v1/users/me/` | `GET` / `PATCH` | Authenticated | View or edit profile metadata |
| `/api/v1/users/me/password/` | `POST` | Authenticated | Rotate user password and revoke tokens |
| `/api/v1/admin/users/` | `GET` / `POST` | Super Admin | User directory and status management |

### Company Management & Verification
| Endpoint | Method | Role / Auth | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/recruiter/company/` | `GET` / `PUT` | Recruiter | Manage recruiter company profile |
| `/api/v1/recruiter/company/verify/` | `POST` | Recruiter | Submit official business verification documents |
| `/api/v1/admin/company-verifications/` | `GET` | Super Admin | Review pending company verification requests |
| `/api/v1/admin/company-verifications/<id>/decision/` | `POST` | Super Admin | Approve, reject, or request changes |
| `/api/v1/companies/<id>/` | `GET` | Public | View public company hub and active jobs |

### Job Requisitions & Pipeline Customization
| Endpoint | Method | Role / Auth | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/recruiter/jobs/` | `GET` / `POST` | Recruiter | Requisition formulation & recruiter jobs list |
| `/api/v1/recruiter/jobs/<id>/` | `GET` / `PATCH` | Recruiter | Edit job parameters, status, and stages |
| `/api/v1/recruiter/jobs/<id>/stages/` | `GET` / `PUT` | Recruiter | Configure custom pipeline hiring stages |
| `/api/v1/jobs/` | `GET` | Public | Candidate job discovery and filtering |
| `/api/v1/jobs/<id>/` | `GET` | Public | Public job details and requirements |
| `/api/v1/candidate/saved-jobs/` | `GET` / `POST` | Candidate | Bookmark and view saved job requisitions |

### Applicant Tracking System (ATS)
| Endpoint | Method | Role / Auth | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/candidate/applications/` | `GET` / `POST` | Candidate | Submit application & track progress |
| `/api/v1/candidate/applications/<id>/` | `GET` | Candidate | Candidate view of stage milestones |
| `/api/v1/recruiter/applications/` | `GET` | Recruiter | Applicant pipeline search and overview |
| `/api/v1/recruiter/applications/<id>/` | `GET` | Recruiter | Detailed candidate dossier and scoring |
| `/api/v1/recruiter/applications/<id>/move-stage/` | `POST` | Recruiter | Advance applicant through pipeline stages |
| `/api/v1/recruiter/applications/<id>/reject/` | `POST` | Recruiter | Formally reject with recorded feedback |

### Interview Scheduling & Scorecards
| Endpoint | Method | Role / Auth | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/recruiter/interviews/` | `GET` / `POST` | Recruiter | Schedule interview round & list sessions |
| `/api/v1/recruiter/interviews/<id>/` | `GET` / `PATCH` | Recruiter | Manage interview session details |
| `/api/v1/recruiter/interviews/<id>/scorecard/` | `GET` / `POST` | Recruiter | Submit multi-criteria interview scorecard |
| `/api/v1/candidate/interviews/` | `GET` | Candidate | Candidate interview schedule & meeting links |

### Formal Offers & Letter PDF Generation
| Endpoint | Method | Role / Auth | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/recruiter/applications/<id>/offers/` | `POST` | Recruiter | Formulate or update offer draft |
| `/api/v1/recruiter/applications/<id>/offers/preview-letter/` | `POST` | Recruiter | Live token replacement preview |
| `/api/v1/recruiter/offers/<id>/send/` | `POST` | Recruiter | Dispatch offer, generate ReportLab PDF |
| `/api/v1/recruiter/offers/<id>/withdraw/` | `POST` | Recruiter | Revoke active formal offer |
| `/api/v1/candidate/applications/<id>/offer/` | `GET` | Candidate | Candidate portal offer terms view |
| `/api/v1/candidate/offers/<id>/download/` | `GET` | Candidate | Download official offer letter PDF |
| `/api/v1/candidate/offers/<id>/accept/` | `POST` | Candidate | Formally accept offer |
| `/api/v1/candidate/offers/<id>/decline/` | `POST` | Candidate | Decline offer with structured reasons |

### Real-Time Chat & Direct Messaging
| Endpoint | Method | Role / Auth | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/conversations/` | `GET` / `POST` | Authenticated | List conversations or start thread |
| `/api/v1/conversations/<id>/messages/` | `GET` / `POST` | Authenticated | Message history & send message/files |
| `/api/v1/conversations/<id>/read/` | `POST` | Authenticated | Mark conversation messages as read |
| `/api/v1/conversations/<id>/attachments/<att_id>/` | `GET` | Authenticated | Securely download chat attachments |
| `/api/v1/conversations/<id>/report/` | `POST` | Authenticated | Flag inappropriate conversation |
| `/api/v1/conversations/unread-count/` | `GET` | Authenticated | Get total unread messages count |
| `ws/chat/(conversation_id)/` | `WebSocket` | JWT Auth | Real-time chat stream & typing events |

### Real-Time Notifications
| Endpoint | Method | Role / Auth | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/notifications/` | `GET` | Authenticated | List user notifications with unread counts |
| `/api/v1/notifications/<id>/read/` | `POST` | Authenticated | Mark specific notification as read |
| `/api/v1/notifications/mark-all-read/` | `POST` | Authenticated | Batch mark all notifications read |
| `ws/notifications/` | `WebSocket` | JWT Auth | Real-time notification broadcast stream |

---

## 🧪 Testing Suite

The project maintains test coverage across models, services, permissions, and viewsets using `pytest`:

```bash
# Navigate to backend directory
cd backend

# Run the complete test suite:
pytest -v

# Run specific domain test suites:
pytest apps/offers/tests/ -v           # Offer formulation & PDF generation
pytest apps/messaging/ -v              # Messaging services & REST endpoints
pytest apps/interviews/tests/ -v        # Interview scheduling & scorecards
pytest apps/applications/tests/ -v      # ATS pipeline transitions
pytest apps/jobs/tests/ -v              # Job lifecycle & search
pytest apps/candidates/tests/ -v        # Candidate profile & ATS analyzer
pytest apps/accounts/tests/ -v          # Auth, OTP, and user security
```

To test the frontend build:
```bash
cd frontend
npm run build
```

---

## 📄 License

This project is licensed under the **MIT License**.
