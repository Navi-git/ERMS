# ERMS Development Status

## Module 1: Authentication & Onboarding

| Step | Scope | Status |
|---|---|---|
| 1 | Scaffold, settings, accounts models (users, user_security, otp_verifications, auth_identities) | DONE: migrated, 14/14 tests passed (verified by owner) |
| 2 | Register (candidate + recruiter), verify OTP, resend OTP, Redis counters | DONE: tests passed (71/71 total, verified by owner) |
| 3 | Login, JWT refresh, logout, /me, lockout | DONE: tests passed (verified by owner) |
| 4 | Password reset (request + confirm, sessions revoked) | DONE: tests passed (86/86 total, verified by owner) |
| 5 | Google OAuth | Not started |
DONE: tests passed (102/102, verified by owner)
| 6 | Frontend (needs Figma designs) | Not started |

## Module 6: Jobs (Backend & Frontend)

| Step | Scope | Status |
|---|---|---|
| 1 | ERD models (`jobs`, `job_benefits`, `job_skills`, `job_stages`, `saved_jobs`, `reports`, `view_events`, `entity_notes`) | DONE: migrated to PostgreSQL with indexes |
| 2 | Recruiter Job Lifecycle & Sub-resources (draft, publish, hold, resume, close, stages, skills, benefits, overview) | DONE: fully tested (21 tests passing) |
| 3 | Public & Candidate Search, Detail, and Saved Jobs (`/jobs`, `/jobs/:id`, `/candidate/saved-jobs`) | DONE: fully tested & frontend verified |
| 4 | Super Admin Job Directory & Moderation (`/admin/jobs`, `/admin/jobs/:id`) | DONE: fully tested & frontend verified |
| 5 | Candidate Portal Frontend (Browse, Details, Saved Jobs, Modals) | DONE: Vite production build passed |
| 6 | Recruiter Portal Frontend (Job Postings, Drafts with readiness indicators, Post/Edit Job Wizard, Pipeline Stages Modal, Custom Benefits Modal, Overview) | DONE: Vite production build passed |
| 7 | Super Admin Portal Frontend (Job Directory with tabs & metrics, Detail Inspection, Moderation Actions, Internal Notes) | DONE: Vite production build passed |

## Module 7: Applications & Screening (Backend & Frontend)

| Step | Scope | Status |
|---|---|---|
| 1 | ERD models (`applications`, `application_stage_progress`, `application_materials`, `application_notes`) | DONE: migrated to PostgreSQL with unique constraint `(job, candidate)` & indexes |
| 2 | Dynamic ATS Match & Semantic Alignment Service (`AtsMatchService`) | DONE: on-the-fly match percentage, matching/missing skills calculated without storing score column |
| 3 | State Transition Service & Fixed Matrix (`ApplicationTransitionService`) | DONE: atomic apply, stage moves, shortlist, reject with reason, withdraw, and hire |
| 4 | Company Review Gating | DONE: verified candidate rule enforced (only candidates with `hired_at`, `offer_extended_at`, or status `offer_sent`/`accepted` can submit reviews) |
| 5 | Candidate Application API (`/candidate/applications/`, `/jobs/<id>/apply/`) | DONE: multi-step apply without candidate ATS score preview, progress timeline, materials upload, withdraw |
| 6 | Recruiter Applications & Pipeline API (`/recruiter/applications/`, `/recruiter/jobs/<id>/applications/`) | DONE: live dossier, ATS breakdown, stage advancement, team notes CRUD, reject reason modal |
| 7 | Candidate Portal Frontend (Apply Modal, Submitted Success Modal, My Applications Hub, Application Detail View) | DONE: Vite production build passed |
| 8 | Recruiter Portal Frontend (Job Pipeline Kanban Board, All Applicants Hub, Screening & Candidate Dossier, Resume Viewer Modal, Rejection Reason Modal) | DONE: Vite production build passed |

## Module 8: Notifications & Broadcasts (Backend & Frontend)

| Step | Scope | Status |
|---|---|---|
| 1 | ERD models (`notifications` Table 35 with `(user, is_read, created_at)` index, and `broadcasts` table) | DONE: migrated to PostgreSQL with indexes |
| 2 | Real-time Architecture (Django Channels, Daphne ASGI server, Redis channel layers & InMemory fallback) | DONE: fully configured and tested |
| 3 | WebSocket JWT Authentication & Consumer (`JwtAuthMiddleware`, `NotificationConsumer` with personal & broadcast groups) | DONE: live WebSocket sync verified |
| 4 | Transaction-safe Service Layer (`notification_service`: `notify`, `notify_many`, `notify_company_recruiter`, `broadcast`, `mark_as_read`, `mark_all_as_read`) | DONE: `transaction.on_commit` dispatching & safe URL checks |
| 5 | Cross-Module Event Hooks (`ApplicationTransitionService`: apply, stage moves, shortlist, reject, hire emit live notifications) | DONE: verified with integration tests |
| 6 | REST APIs (`/api/v1/notifications/`, `unread-count/`, `read/`, `read-all/`, `admin/broadcasts/`) | DONE: all 7 test cases passed (184/189 total suite passing) |
| 7 | Global Bell Flyout (`NotificationDropdown.jsx` with unread count badge, Live Sync indicator, quick tabs, read-and-redirect) | DONE: integrated across Candidate, Recruiter, and Admin layouts |
| 8 | Candidate Portal Hub (`CandidateNotificationsPage.jsx` matching Figma Screen 1) | DONE: Vite production build passed |
| 9 | Recruiter Portal Hub (`RecruiterNotificationsPage.jsx` matching Figma Screen 2) | DONE: Vite production build passed |
| 10 | Super Admin Portal Hub & Broadcast Modal (`AdminNotificationsPage.jsx` & `CreateBroadcastModal.jsx` matching Figma Screen 3 & 4) | DONE: Vite production build passed |

## Next task
Module 9: Interviews & Scheduling (Interview scheduling, panel assignment, candidate self-scheduling, scorecard evaluation, calendar integration).
