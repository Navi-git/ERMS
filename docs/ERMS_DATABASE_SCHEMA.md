# ERMS Database Schema

> **Source of truth:** `recruitment_erd_v7(1).dbml` supplied for this ERMS project. This Markdown document is a readable reference generated from that schema. Field definitions, enum values, notes, and declared indexes are retained from the source; this document does not silently redesign the schema.

## Overview

- **Tables:** 52
- **Enums:** 9
- **Database types:** PostgreSQL-oriented types are used in the source, including `bigint`, `timestamptz`, `jsonb`, `decimal`, and `text`.
- **Relationship notation:** `ref: > table.column` indicates a reference to the target table/column; `[pk]` marks a primary key; `[unique]` marks uniqueness; `[not null]` marks a required value; `[default: ...]` specifies a default.

## Table of contents

- [CORE ENTITIES](#core-entities)
  - [`users`](#users)
  - [`auth_identities`](#auth_identities)
  - [`otp_verifications`](#otp_verifications)
  - [`user_security`](#user_security)
- [CANDIDATE PROFILE](#candidate-profile)
  - [`candidate_profiles`](#candidate_profiles)
  - [`resumes`](#resumes)
  - [`resume_analyses`](#resume_analyses)
  - [`education`](#education)
  - [`experience`](#experience)
  - [`candidate_skills`](#candidate_skills)
- [MASTER DATA](#master-data)
  - [`master_data_items`](#master_data_items)
  - [`skill_alias_relations`](#skill_alias_relations)
- [COMPANIES](#companies)
  - [`companies`](#companies)
  - [`company_benefits`](#company_benefits)
  - [`company_talent_tracks`](#company_talent_tracks)
- [JOBS](#jobs)
  - [`jobs`](#jobs)
  - [`job_benefits`](#job_benefits)
  - [`job_skills`](#job_skills)
  - [`job_stages`](#job_stages)
- [APPLICATIONS & SCREENING](#applications--screening)
  - [`applications`](#applications)
  - [`application_stage_progress`](#application_stage_progress)
  - [`application_materials`](#application_materials)
  - [`application_notes`](#application_notes)
- [INTERVIEWS & FEEDBACK](#interviews--feedback)
  - [`interviews`](#interviews)
  - [`interview_participants`](#interview_participants)
  - [`interview_feedback`](#interview_feedback)
  - [`interview_feedback_criteria`](#interview_feedback_criteria)
- [OFFERS](#offers)
  - [`offers`](#offers)
  - [`offer_attachments`](#offer_attachments)
  - [`offer_letter_templates`](#offer_letter_templates)
- [SAVED JOBS & ENGAGEMENT](#saved-jobs--engagement)
  - [`saved_jobs`](#saved_jobs)
- [MESSAGING & NOTIFICATIONS (SIMPLIFIED)](#messaging--notifications-simplified)
  - [`conversations`](#conversations)
  - [`conversation_participants`](#conversation_participants)
  - [`messages`](#messages)
  - [`notifications`](#notifications)
- [COMPANY VERIFICATION (RIGIDIFIED)](#company-verification-rigidified)
  - [`company_verifications`](#company_verifications)
  - [`company_verification_documents`](#company_verification_documents)
- [SUBSCRIPTIONS & BILLING (RIGIDIFIED)](#subscriptions--billing-rigidified)
  - [`subscription_plans`](#subscription_plans)
  - [`company_subscriptions`](#company_subscriptions)
  - [`add_ons`](#add_ons)
  - [`subscription_add_ons`](#subscription_add_ons)
- [PAYMENTS & INVOICING](#payments--invoicing)
  - [`payment_methods`](#payment_methods)
  - [`payments`](#payments)
  - [`invoices`](#invoices)
- [ADMIN & SYSTEM](#admin--system)
  - [`reports`](#reports)
  - [`report_activities`](#report_activities)
  - [`audit_logs`](#audit_logs)
- [CONTENT & HELP](#content--help)
  - [`view_events`](#view_events)
  - [`entity_notes`](#entity_notes)
  - [`help_faqs`](#help_faqs)
  - [`help_questions`](#help_questions)
  - [`company_reviews`](#company_reviews)

## Enumerated types

### `employment_type`

| Allowed value |
|---|
| `enum employment_type {` |
| `full_time` |
| `part_time` |
| `contract` |
| `internship` |

### `job_status`

| Allowed value |
|---|
| `enum job_status {` |
| `draft` |
| `published` |
| `closed` |
| `on_hold` |

### `application_status`

| Allowed value |
|---|
| `enum application_status {` |
| `applied` |
| `reviewing` |
| `shortlisted` |
| `rejected` |
| `interview_scheduled` |
| `offer_sent` |
| `accepted` |
| `declined` |

### `offer_status`

| Allowed value |
|---|
| `enum offer_status {` |
| `draft` |
| `sent` |
| `accepted` |
| `declined` |
| `expired` |

### `notification_type`

| Allowed value |
|---|
| `enum notification_type {` |
| `application_received` |
| `application_status_changed` |
| `interview_scheduled` |
| `interview_rescheduled` |
| `interview_cancelled` |
| `interview_reminder` |
| `offer_sent` |
| `offer_accepted` |
| `offer_declined` |
| `message_received` |
| `subscription_expiring` |
| `payment_failed` |
| `invoice_generated` |
| `system` |

### `subscription_billing_period`

| Allowed value |
|---|
| `enum subscription_billing_period {` |
| `monthly` |
| `annual` |

### `subscription_status`

| Allowed value |
|---|
| `enum subscription_status {` |
| `active` |
| `cancelled` |
| `suspended` |
| `expired` |

### `payment_status`

| Allowed value |
|---|
| `enum payment_status {` |
| `pending` |
| `completed` |
| `failed` |
| `refunded` |

### `invoice_status`

| Allowed value |
|---|
| `enum invoice_status {` |
| `draft` |
| `issued` |
| `paid` |
| `overdue` |
| `cancelled` |

## CORE ENTITIES

### `users`
| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk, increment]` | — |
| `role` | `varchar(30) [not null]` | candidate, recruiter, super_admin |
| `email` | `varchar(255) [unique, not null]` | — |
| `password_hash` | `varchar(255)` | — |
| `full_name` | `varchar(255) [not null]` | — |
| `phone` | `varchar(20)` | — |
| `profile_picture_url` | `varchar(500)` | — |
| `is_active` | `boolean [default: true]` | — |
| `is_email_verified` | `boolean [not null, default: false]` | — |
| `email_verified_at` | `timestamptz` | — |
| `terms_accepted_at` | `timestamptz` | — |
| `terms_version` | `varchar(30)` | — |
| `privacy_accepted_at` | `timestamptz` | — |
| `privacy_version` | `varchar(30)` | — |
| `last_login_at` | `timestamptz` | — |
| `suspended_at` | `timestamptz` | — |
| `suspended_by` | `bigint [ref: > users.id]` | — |
| `created_at` | `timestamptz [not null, default: `now()`]` | — |
| `updated_at` | `timestamptz [not null, default: `now()`]` | — |

**Declared indexes / index keys**

- `email`
- `role`

**Note from source:** Central account for every person.

### `auth_identities`
| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk, increment]` | — |
| `user_id` | `bigint [not null, ref: > users.id]` | — |
| `provider` | `varchar(30) [not null]` | — |
| `provider_user_id` | `varchar(255) [not null]` | — |
| `provider_email` | `varchar(255)` | — |
| `created_at` | `timestamptz [not null]` | — |

**Note from source:** External login providers such as Google.

### `otp_verifications`
| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk, increment]` | — |
| `user_id` | `bigint [ref: > users.id]` | — |
| `destination` | `varchar(255) [not null]` | — |
| `purpose` | `varchar(40) [not null]` | — |
| `otp_code` | `varchar(6) [not null]` | — |
| `expires_at` | `timestamptz [not null]` | — |
| `verified_at` | `timestamptz` | — |
| `created_at` | `timestamptz [not null]` | — |

**Note from source:** For email OTP.

### `user_security`
| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk, increment]` | — |
| `user_id` | `bigint [unique, ref: > users.id]` | — |
| `two_fa_enabled` | `boolean [default: false]` | — |
| `password_last_changed_at` | `timestamptz` | — |
| `failed_login_count` | `int [default: 0]` | — |
| `locked_until` | `timestamptz` | — |
| `updated_at` | `timestamptz [not null]` | — |

**Note from source:** One-to-one security configuration.

## CANDIDATE PROFILE

### `candidate_profiles`
| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk, increment]` | — |
| `user_id` | `bigint [not null, unique, ref: > users.id]` | — |
| `headline` | `varchar(255)` | — |
| `summary` | `text` | — |
| `current_location` | `varchar(255)` | — |
| `seeking_status` | `varchar(50)` | actively_seeking, open_to_offers, not_seeking |
| `expected_salary_min` | `int` | — |
| `expected_salary_max` | `int` | — |
| `currency` | `varchar(3) [default: 'USD']` | — |
| `work_authorization_status` | `varchar(50)` | — |
| `security_clearance` | `varchar(100)` | — |
| `willing_to_relocate` | `boolean [default: false]` | — |
| `linkedin_url` | `text` | — |
| `github_url` | `text` | — |
| `portfolio_url` | `text` | — |
| `created_at` | `timestamptz [not null]` | — |
| `updated_at` | `timestamptz [not null]` | — |

### `resumes`
| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk, increment]` | — |
| `candidate_id` | `bigint [ref: > candidate_profiles.id]` | — |
| `title` | `varchar(255) [not null]` | — |
| `file_name` | `varchar(255) [not null]` | — |
| `file_url` | `varchar(500) [not null]` | — |
| `file_type` | `varchar(100) [not null]` | — |
| `file_size` | `bigint` | — |
| `is_default` | `boolean [default: false]` | — |
| `uploaded_at` | `timestamptz [not null]` | — |
| `updated_at` | `timestamptz [not null]` | — |

### `resume_analyses`
| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk, increment]` | — |
| `resume_id` | `bigint [ref: > resumes.id]` | — |
| `ats_score` | `int` | — |
| `extracted_text` | `text` | — |
| `strengths` | `jsonb` | — |
| `weaknesses` | `jsonb` | — |
| `missing_keywords` | `jsonb` | — |
| `matched_keywords` | `jsonb` | — |
| `analysis_result` | `jsonb` | — |
| `model_version` | `varchar(100)` | — |
| `analyzed_at` | `timestamptz [not null]` | — |

**Note from source:** ATS/AI analysis.

### `education`
| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk, increment]` | — |
| `candidate_id` | `bigint [ref: > candidate_profiles.id]` | — |
| `institution` | `varchar(255) [not null]` | — |
| `degree` | `varchar(150)` | — |
| `field_of_study` | `varchar(150)` | — |
| `start_date` | `date` | — |
| `end_date` | `date` | — |
| `is_currently_studying` | `boolean [default: false]` | — |
| `gpa` | `decimal(3,2)` | — |
| `created_at` | `timestamptz [default: `now()`]` | — |

### `experience`
| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk]` | — |
| `candidate_id` | `bigint [not null, ref: > candidate_profiles.id]` | — |
| `job_title` | `varchar(150) [not null]` | — |
| `company_name` | `varchar(255) [not null]` | — |
| `employment_type` | `employment_type` | — |
| `start_date` | `date [not null]` | — |
| `end_date` | `date` | — |
| `is_current` | `boolean [default: false]` | — |
| `description` | `text` | — |
| `location` | `varchar(255)` | — |
| `created_at` | `timestamptz [default: `now()`]` | — |

### `candidate_skills`
| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk]` | — |
| `candidate_id` | `bigint [not null, ref: > candidate_profiles.id]` | — |
| `skill_id` | `bigint [not null, ref: > master_data_items.id]` | — |
| `proficiency_level` | `varchar(30)` | beginner, intermediate, advanced, expert |
| `years_of_experience` | `decimal(3,1)` | — |
| `created_at` | `timestamptz [default: `now()`]` | — |

**Declared indexes / index keys**

- `(candidate_id, skill_id) [pk]`

## MASTER DATA

### `master_data_items`
| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk]` | — |
| `category` | `varchar(50) [not null]` | industry, job_category, experience_level |
| `key` | `varchar(100) [not null]` | — |
| `value` | `varchar(255) [not null]` | — |
| `description` | `text` | — |
| `display_order` | `int [default: 0]` | — |
| `is_active` | `boolean [default: true]` | — |
| `created_at` | `timestamptz [not null]` | — |
| `updated_at` | `timestamptz [not null]` | — |

**Declared indexes / index keys**

- `(category, key)`

**Note from source:** This is one of the big consolidations. Instead of separate tables for: Industry Department Job Category Experience Level Employment Type Work Mode Skill Benefit we use one managed taxonomy table.

### `skill_alias_relations`
| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk, increment]` | — |
| `source_skill_id` | `bigint [ref: > master_data_items.id]` | — |
| `target_skill_id` | `bigint [ref: > master_data_items.id]` | — |
| `alias_text` | `varchar(150)` | — |
| `confidence_score` | `decimal(5,2)` | — |
| `created_at` | `timestamptz [not null]` | — |

**Note from source:** Handles both: JavaScript → JS React → Frontend Library AWS → Cloud Computing

## COMPANIES

### `companies`
| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk, increment]` | — |
| `name` | `varchar(255) [not null]` | — |
| `description` | `text` | markdown stored in DB |
| `registration_number` | `varchar(100) [unique]` | — |
| `tax_id` | `varchar(100)` | — |
| `industry_id` | `bigint [not null, ref: > master_data_items.id]` | — |
| `email` | `varchar(255)` | — |
| `phone` | `varchar(20)` | — |
| `company_size` | `varchar(50)` | — |
| `founded_year` | `int` | — |
| `logo_url` | `varchar(500)` | — |
| `cover_image_url` | `varchar(500)` | — |
| `website_url` | `varchar(500)` | — |
| `headquarters_address` | `text` | — |
| `city` | `varchar(100)` | — |
| `state` | `varchar(100)` | — |
| `country` | `varchar(100)` | — |
| `postal_code` | `varchar(20)` | — |
| `media` | `jsonb` | — |
| `billing_name` | `varchar(255)` | — |
| `billing_email` | `varchar(255)` | — |
| `billing_address` | `varchar(250)` | — |
| `admin_user_id` | `bigint [ref: > users.id]` | — |
| `verification_status` | `varchar(30) [default: 'PENDING']` | active, suspended, inactive |
| `suspended_at` | `timestamptz` | — |
| `suspended_by` | `bigint [ref: > users.id]` | — |
| `created_at` | `timestamptz [not null]` | — |
| `updated_at` | `timestamptz [not null]` | — |

**Declared indexes / index keys**

- `industry_id`
- `verification_status`
- `created_at`

**Note from source:** status/suspended_at/suspended_by mirror the same pattern on users — added for the Super Admin 'Suspend Company Account' moderation action (Job Module: Admin job report review screen), which had no field to act on. verification_status is separate and unaffected: a company can be VERIFIED but still SUSPENDED for a policy violation. sso_enabled/sso_provider/enforce_2fa: Company Module's Team Management screen displays 'SSO Enforced via Okta · 2FA Mandatory' as an org-wide policy — this is distinct from user_security, which is per-user; entitlement to offer SSO at all still comes from subscription_plan_features, this just stores whether/how a given company has it configured.

### `company_benefits`
| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk, increment]` | — |
| `company_id` | `bigint [ref: > companies.id]` | — |
| `name` | `varchar(100) [not null]` | — |
| `custom_description` | `text` | — |
| `display_order` | `int [default: 0]` | — |
| `is_active` | `boolean [default: true]` | — |
| `created_at` | `timestamptz [not null]` | — |

**Note from source:** A single table for: CompanyBenefit

### `company_talent_tracks`
| Field | Definition | Source comment |
|---|---|---|
| `company_id` | `bigint [ref: > companies.id]` | — |
| `master_data_item_id` | `bigint [ref: > master_data_items.id]` | — |
| `created_at` | `timestamptz [not null]` | — |

**Declared indexes / index keys**

- `(company_id, master_data_item_id) [pk]`

**Note from source:** Company Module's verification flow shows 'Primary Functional Talent Tracks' (e.g. Software Engineering, Product Design, Cloud DevOps) as multi-select tags, repeated on the Super Admin verification review screen as 'Key Focus Areas'. Uses master_data_items (type='talent_track' or similar) rather than free text so tags stay normalized and reusable for the candidate-matching graph the UI copy references. Company-level and ongoing, not tied to a single verification submission — a company's hiring focus can change after it's verified.

## JOBS

### `jobs`
| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk, increment]` | — |
| `company_id` | `bigint [ref: > companies.id]` | — |
| `created_by` | `bigint [ref: > users.id]` | — |
| `job_title` | `varchar(255) [not null]` | — |
| `job_category_id` | `bigint [ref: > master_data_items.id]` | — |
| `department_id` | `bigint [ref: > master_data_items.id]` | — |
| `experience_level_id` | `bigint [ref: > master_data_items.id]` | — |
| `employment_type` | `employment_type` | — |
| `location` | `varchar(255)` | — |
| `work_mode_id` | `bigint [ref: > master_data_items.id]` | — |
| `job_description` | `text [not null]` | — |
| `requirements` | `text` | — |
| `responsibilities` | `text` | — |
| `salary_min` | `decimal(12,2)` | — |
| `salary_max` | `decimal(12,2)` | — |
| `salary_currency` | `char(3) [default: 'USD']` | — |
| `openings` | `int [default: 1]` | — |
| `accepts_cover_letter` | `boolean [default: false]` | — |
| `promote_on_job_boards` | `boolean [default: false]` | — |
| `job_status` | `job_status  [default: 'draft']` | — |
| `application_deadline` | `timestamptz` | — |
| `closed_at` | `timestamptz` | — |
| `filled_at` | `timestamptz` | — |
| `created_at` | `timestamptz [not null]` | — |
| `updated_at` | `timestamptz [not null]` | — |
| `on_hold_reason` | `text` | — |
| `is_draft` | `boolean [default: false]` | — |
| `draft_saved_at` | `timestamptz` | — |
| `published_at` | `timestamptz` | — |

**Declared indexes / index keys**

- `(company_id, job_status)`
- `(created_by, published_at)`

### `job_benefits`
*Source label: : Job Benefits*

| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk, increment]` | — |
| `job_id` | `bigint [ref: > jobs.id]` | — |
| `benefit_name` | `varchar(255) [not null]` | — |
| `custom_description` | `text` | — |
| `is_active` | `boolean [default: true]` | — |
| `created_at` | `timestamptz [not null]` | — |

**Note from source:** A single table for: JobBenefit

### `job_skills`
| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk, increment]` | — |
| `job_id` | `bigint [ref: > jobs.id]` | — |
| `skill_id` | `bigint [ref: > master_data_items.id]` | — |
| `is_required` | `boolean [default: true]` | — |
| `proficiency_level` | `varchar(50)` | — |

**Declared indexes / index keys**

- `(job_id, skill_id) [pk]`

### `job_stages`
| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk, increment]` | — |
| `job_id` | `bigint [ref: > jobs.id]` | — |
| `name` | `varchar(100) [not null]` | — |
| `stage_order` | `int [not null]` | — |
| `description` | `text` | — |
| `is_required` | `boolean [default: true]` | — |
| `is_active` | `boolean [default: true]` | — |
| `created_at` | `timestamptz [not null]` | — |

**Declared indexes / index keys**

- `(job_id, stage_order)`

**Note from source:** Defines the hiring pipeline for each job.

## APPLICATIONS & SCREENING

### `applications`
| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk, increment]` | — |
| `candidate_id` | `bigint [ref: > candidate_profiles.id]` | — |
| `job_id` | `bigint [ref: > jobs.id]` | — |
| `resume_id` | `bigint [ref: > resumes.id]` | — |
| `linkedin_url` | `varchar(500)` | — |
| `portfolio_url` | `varchar(500)` | — |
| `message_to_hiring_manager` | `varchar(255)` | — |
| `application_status` | `application_status [default: 'applied']` | — |
| `applied_at` | `timestamptz [default: `now()`]` | — |
| `cover_letter` | `text` | — |
| `source` | `varchar(50)` | job_boards, referral, direct, agency |
| `referred_by` | `bigint [ref: > users.id]` | — |
| `hiring_notes` | `text` | — |
| `reviewed_at` | `timestamptz` | — |
| `reviewed_by` | `bigint [ref: > users.id]` | — |
| `rejected_at` | `timestamptz` | — |
| `rejection_reason` | `text` | — |
| `offer_extended_at` | `timestamptz` | — |
| `hired_at` | `timestamptz` | — |
| `withdrawn_at` | `timestamptz` | — |
| `created_at` | `timestamptz [not null]` | — |
| `updated_at` | `timestamptz [not null]` | — |

**Declared indexes / index keys**

- `(job_id, candidate_id)`
- `(application_status, applied_at)`
- `source`

**Note from source:** source/referred_by: Offer Module's Company Analytics screen shows a 'Channel Attribution' breakdown (Job Boards, Network & Referrals, Direct Careers Portal, Agency & Headhunters) with no field anywhere to compute it from — source captures the channel, referred_by captures the specific referring user for the referral case.

### `application_stage_progress`
| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk, increment]` | — |
| `application_id` | `bigint [ref: > applications.id]` | — |
| `job_stage_id` | `bigint [ref: > job_stages.id]` | — |
| `started_at` | `timestamptz` | — |
| `completed_at` | `timestamptz` | — |
| `changed_by` | `bigint [ref: > users.id]` | — |
| `notes` | `text` | — |

### `application_materials`
| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk, increment]` | — |
| `application_id` | `bigint [ref: > applications.id]` | — |
| `file_name` | `varchar(255)` | — |
| `file_url` | `varchar(500)` | — |
| `file_type` | `varchar(50)` | — |
| `uploaded_at` | `timestamptz [default: `now()`]` | — |

**Note from source:** For: Portfolio, Cover Letter & Certificate

### `application_notes`
| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk, increment]` | — |
| `application_id` | `bigint [ref: > applications.id]` | — |
| `author_id` | `bigint [ref: > users.id]` | — |
| `note` | `text [not null]` | — |
| `is_internal` | `boolean [default: true]` | — |
| `created_at` | `timestamptz [not null]` | — |
| `updated_at` | `timestamptz [not null]` | — |

## INTERVIEWS & FEEDBACK

### `interviews`
| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk, increment]` | — |
| `application_id` | `bigint [not null, ref: > applications.id]` | — |
| `job_id` | `bigint [not null, ref: > jobs.id]` | — |
| `scheduled_by` | `bigint [not null, ref: > users.id]` | — |
| `job_stage_id` | `bigint [ref: > job_stages.id]` | — |
| `interview_type` | `varchar(50)` | phone, technical, behavioral, final |
| `scheduled_at` | `timestamptz [not null]` | — |
| `duration_minutes` | `int [not null default: 60]` | — |
| `meeting_link` | `varchar(500)` | — |
| `location` | `varchar(255)` | — |
| `interview_status` | `varchar(20)` | scheduled, completed, cancelled |
| `invitation_note` | `text` | — |
| `cancellation_reason` | `text` | — |
| `cancelled_at` | `timestamptz` | — |
| `cancelled_by` | `bigint [ref: > users.id]` | — |
| `feedback_submitted` | `boolean [default: false]` | — |
| `created_at` | `timestamptz [default: `now()`]` | — |
| `updated_at` | `timestamptz [default: `now()`]` | — |

**Declared indexes / index keys**

- `(job_id, scheduled_at)`
- `(application_id, status)`

**Note from source:** cancellation_reason: candidate- or recruiter-facing reason shown when status = CANCELLED / NO_SHOW.

### `interview_participants`
| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk, increment]` | — |
| `interview_id` | `bigint [ref: > interviews.id]` | — |
| `user_id` | `bigint [ref: > users.id]` | — |
| `participant_type` | `varchar(20)` | interviewer, candidate |
| `external_name` | `varchar(150)` | — |
| `external_email` | `varchar(255)` | — |
| `participant_role` | `varchar(30) [not null]` | — |
| `invitation_sent_at` | `timestamptz` | — |
| `response_status` | `varchar(30) [default: 'INVITED']` | INVITED, accepted, declined |
| `joined_at` | `timestamptz` | — |
| `last_nudged_at` | `timestamptz` | — |
| `nudge_count` | `int [default: 0]` | — |
| `created_at` | `timestamptz [default: `now()`]` | — |

**Declared indexes / index keys**

- `(interview_id, participant_type)`

**Note from source:** last_nudged_at / nudge_count: track reminder pings sent to a panelist for an overdue scorecard, backs the Interviews Dashboard 'Scorecard Pending — Nudge panelists' widget.

### `interview_feedback`
| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk, increment]` | — |
| `interview_id` | `bigint [ref: > interviews.id]` | — |
| `submitted_by` | `bigint [not null, ref: > users.id]` | — |
| `on_behalf_of_participant_id` | `bigint [ref: > interview_participants.id]` | — |
| `rating` | `int` | — |
| `technical_score` | `int` | — |
| `communication_score` | `int` | — |
| `overall_score` | `float` | — |
| `recommendation` | `varchar(30)` | strong_yes, yes, maybe, no, strong_no |
| `comments` | `text` | — |
| `submitted_at` | `timestamptz [default: `now()`]` | — |

**Note from source:** submitted_on_behalf_of stays as a display-text snapshot ('Mark Chen (External Advisor - Systems Architect)'); on_behalf_of_participant_id is the FK link to the actual interview_participants row for traceability. rating/technical_score/communication_score remain as a quick-glance summary; the full per-criterion breakdown now lives in interview_feedback_criteria.

### `interview_feedback_criteria`
| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk, increment]` | — |
| `feedback_id` | `bigint [not null, ref: > interview_feedback.id]` | — |
| `criterion_key` | `varchar(60) [not null]` | — |
| `criterion_label` | `varchar(150) [not null]` | — |
| `criterion_description` | `text` | — |
| `benchmark_level` | `varchar(50)` | below_expectations, meets, exceeds |
| `score` | `int [not null]` | — |
| `max_score` | `int [not null, default: 5]` | — |
| `display_order` | `int [default: 0]` | — |
| `created_at` | `timestamptz [not null]` | — |

**Declared indexes / index keys**

- `(feedback_id, criterion_key) [unique]`

**Note from source:** One row per rated competency on a scorecard (e.g. 'Technical System Design & Architecture', 'Product Sense & UX Architecture', 'Cross-functional Communication', 'Problem Solving & Live Critique'). criterion_key is stable per job_stage.stage_type / level so scores are comparable across candidates for the same stage; criterion_label/description/benchmark_level are the human-readable snapshot shown on the scorecard at submission time.

## OFFERS

### `offers`
| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk]` | — |
| `application_id` | `bigint [not null, ref: > applications.id]` | — |
| `created_by` | `bigint [not null, ref: > users.id]` | — |
| `salary` | `int [not null]` | — |
| `currency` | `varchar(3) [default: 'USD']` | — |
| `employment_type` | `employment_type [not null]` | — |
| `start_date` | `date` | — |
| `equity_type` | `varchar(50)` | RSU, ISO, NSO |
| `equity_units` | `int` | — |
| `equity_vesting_schedule` | `text` | — |
| `bonus_type` | `varchar(50)` | performance, signing, referral |
| `bonus_target_percent` | `int` | — |
| `bonus_target_amount` | `int` | — |
| `sign_on_bonus` | `int` | — |
| `sign_on_bonus_terms` | `text` | — |
| `reports_to_user_id` | `bigint [ref: > users.id]` | — |
| `status` | `offer_status [default: 'draft']` | — |
| `sent_at` | `timestamptz` | — |
| `responded_at` | `timestamptz` | — |
| `expiration_date` | `date` | — |
| `offer_document_url` | `text` | — |
| `decline_reason` | `varchar(100)` | — |
| `candidate_feedback` | `text` | — |
| `declined_at` | `timestamptz` | — |
| `created_at` | `timestamptz [default: `now()`]` | — |
| `updated_at` | `timestamptz [default: `now()`]` | — |

**Declared indexes / index keys**

- `(application_id, status)`
- `(created_by, sent_at)`

**Note from source:** Offer Module's Create/View Offer screens show a full compensation package (equity grant + vesting, target bonus, sign-on bonus), a named reporting manager, e-signature status ('DocuSign completed'), and a decline flow that captures both a reason dropdown and free-text feedback — none of which the original salary/currency/employment_type fields could hold.

### `offer_attachments`
| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk, increment]` | — |
| `offer_id` | `bigint [not null, ref: > offers.id]` | — |
| `file_name` | `varchar(255)` | — |
| `file_url` | `varchar(500)` | — |
| `file_type` | `varchar(50)` | — |
| `file_size` | `bigint` | — |
| `description` | `varchar(255)` | — |
| `uploaded_by` | `bigint [ref: > users.id]` | — |
| `uploaded_at` | `timestamptz [not null]` | — |

**Note from source:** Create Offer screen's 'Attachments & Supporting Collateral' section supports multiple supplemental PDFs (benefits handbook, IP agreement, etc.) alongside the single main offer_document_url on `offers` — one row per attached file.

### `offer_letter_templates`
*Source label: : Offer Letter Templates*

| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk]` | — |
| `company_id` | `bigint [not null, ref: > companies.id]` | — |
| `template_name` | `varchar(255) [not null]` | — |
| `body_template` | `text [not null]` | — |
| `variables_schema` | `jsonb` | {candidate_name, salary, start_date, etc.} |
| `version` | `int [default: 1]` | — |
| `is_active` | `boolean [default: true]` | — |
| `created_by` | `bigint [not null, ref: > users.id]` | — |
| `created_at` | `timestamptz [default: `now()`]` | — |

**Declared indexes / index keys**

- `(company_id, is_active)`

## SAVED JOBS & ENGAGEMENT

### `saved_jobs`
| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk]` | — |
| `candidate_id` | `bigint [ref: > candidate_profiles.id]` | — |
| `job_id` | `bigint [ref: > jobs.id]` | — |
| `saved_at` | `timestamptz [not null]` | — |

**Declared indexes / index keys**

- `(candidate_id, job_id) [pk]`

## MESSAGING & NOTIFICATIONS (SIMPLIFIED)

### `conversations`
| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk, increment]` | — |
| `created_at` | `timestamptz [not null]` | — |
| `updated_at` | `timestamptz [not null]` | — |

### `conversation_participants`
| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk]` | — |
| `conversation_id` | `bigint [ref: > conversations.id]` | — |
| `user_id` | `bigint [ref: > users.id]` | — |
| `joined_at` | `timestamptz [not null]` | — |
| `last_read_at` | `timestamptz` | — |
| `is_active` | `boolean [default: true]` | — |

**Declared indexes / index keys**

- `(conversation_id, user_id) [pk]`

### `messages`
| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk, increment]` | — |
| `conversation_id` | `bigint [ref: > conversations.id]` | — |
| `sender_id` | `bigint [ref: > users.id]` | — |
| `content` | `text` | — |
| `message_type` | `varchar(30) [default: 'TEXT']` | — |
| `attachments` | `jsonb` | — |
| `created_at` | `timestamptz [not null]` | — |
| `is_read` | `boolean [default: false]` | — |
| `read_at` | `timestamptz` | — |
| `is_edited` | `boolean [default: false]` | — |
| `edited_at` | `timestamptz` | — |
| `is_deleted` | `boolean [default: false]` | — |
| `deleted_at` | `timestamptz` | — |

### `notifications`
| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk, increment]` | — |
| `user_id` | `bigint [ref: > users.id]` | — |
| `source_type` | `varchar(30) [not null]` | — |
| `source_id` | `bigint` | — |
| `notification_type` | `notification_type [not null]` | — |
| `title` | `varchar(255) [not null]` | — |
| `message` | `text [not null]` | — |
| `redirect_url` | `varchar(500)` | — |
| `sent_at` | `timestamptz` | — |
| `delivered_at` | `timestamptz` | — |
| `is_read` | `boolean [default: false]` | — |
| `read_at` | `timestamptz` | — |
| `failure_reason` | `text` | — |
| `created_at` | `timestamptz [not null]` | — |

**Declared indexes / index keys**

- `(user_id, is_read, created_at)`

**Note from source:** This table handles both ordinary notifications and broadcast delivery.

## COMPANY VERIFICATION (RIGIDIFIED)

### `company_verifications`
| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk, increment]` | — |
| `company_id` | `bigint [ref: > companies.id]` | — |
| `submitted_by` | `bigint [ref: > users.id]` | — |
| `reviewed_by` | `bigint [ref: > users.id]` | — |
| `designated_recruiter_id` | `bigint [ref: > users.id]` | — |
| `status` | `varchar(30) [not null]` | pending, approved, rejected |
| `risk_score` | `decimal(5,2)` | — |
| `risk_level` | `varchar(20)` | — |
| `intended_hiring_min` | `int` | — |
| `intended_hiring_max` | `int` | — |
| `review_history` | `jsonb` | — |
| `internal_notes` | `text` | — |
| `rejection_reason` | `text` | — |
| `submitted_at` | `timestamptz [not null]` | — |
| `reviewed_at` | `timestamptz` | — |

**Note from source:** We consolidate history/internal notes here using JSONB. documents (jsonb) stays as a lightweight index/summary; the authoritative per-file record — checksum, uploader, replace history — now lives in company_verification_documents, since compliance review needs that level of structure. domain_verified_at/domain_verification_method: Verify Your Company screen shows 'Domain Verified — confirmed via DNS handshake', which had no field. designated_recruiter_id: the verification form's 'Designated Lead Recruiter' contact for compliance escalations.

### `company_verification_documents`
| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk, increment]` | — |
| `verification_id` | `bigint [not null, ref: > company_verifications.id]` | — |
| `document_type` | `varchar(50) [not null]` | incorporation, tax_form, business_license |
| `file_url` | `varchar(500) [not null]` | — |
| `original_filename` | `varchar(255) [not null]` | — |
| `file_size` | `bigint` | — |
| `checksum_sha256` | `varchar(64)` | — |
| `status` | `varchar(30) [not null, default: 'PENDING']` | pending, approved, rejected |
| `is_current` | `boolean [not null, default: true]` | — |
| `uploaded_by` | `bigint [ref: > users.id]` | — |
| `uploaded_at` | `timestamptz [not null]` | — |

**Note from source:** One row per compliance document (Certificate of Incorporation, Tax Form W-9/1099, Business License, etc.). Verify Your Company screen shows per-document status (Valid File Attached / Pending Upload), a SHA-256 checksum, uploader, and a 'Replace' action — is_current + a new row on replace preserves the old file for audit rather than overwriting it, matching the 'audited strictly by compliance specialists' language on the screen.

## SUBSCRIPTIONS & BILLING (RIGIDIFIED)

### `subscription_plans`
| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk]` | — |
| `name` | `varchar(100) [not null]` | — |
| `description` | `text` | — |
| `monthly_price` | `int` | — |
| `annual_price` | `int` | — |
| `currency` | `varchar(3)` | — |
| `discount_percent` | `decimal(5,2)` | — |
| `icon` | `varchar(50)` | — |
| `max_job_postings` | `int` | — |
| `max_active_jobs` | `int` | — |
| `max_resume_scans` | `int` | — |
| `chat_enabled` | `boolean` | — |
| `interview_scheduling_enabled` | `boolean` | — |
| `company_profile_verification` | `boolean` | — |
| `priority_support` | `boolean` | — |
| `display_order` | `int` | — |
| `is_active` | `boolean [default: true]` | — |
| `created_at` | `timestamptz` | — |
| `updated_at` | `timestamptz` | — |

### `company_subscriptions`
| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk, increment]` | — |
| `company_id` | `bigint [ref: > companies.id]` | — |
| `plan_id` | `bigint [ref: > subscription_plans.id]` | — |
| `status` | `subscription_status [default: 'active']` | — |
| `billing_period` | `subscription_billing_period` | — |
| `current_period_start_at` | `timestamptz [not null]` | — |
| `current_period_end_at` | `timestamptz [not null]` | — |
| `next_billing_at` | `timestamptz` | — |
| `cancel_at_period_end` | `boolean [default: false]` | — |
| `cancelled_at` | `timestamptz` | — |
| `grace_period_end_at` | `timestamptz` | — |
| `auto_renewal` | `boolean [default: true]` | — |
| `created_at` | `timestamptz [not null]` | — |
| `updated_at` | `timestamptz [not null]` | — |

### `add_ons`
| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk, increment]` | — |
| `name` | `varchar(100) [unique]` | — |
| `description` | `text` | — |
| `price` | `decimal(12,2) [not null]` | — |
| `billing_period` | `subscription_billing_period` | — |
| `is_active` | `boolean [default: true]` | — |

### `subscription_add_ons`
| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk, increment]` | — |
| `subscription_id` | `bigint [ref: > company_subscriptions.id]` | — |
| `addon_id` | `bigint [ref: > add_ons.id]` | — |
| `quantity` | `int [default: 1]` | — |
| `unit_price` | `decimal(12,2) [not null]` | — |
| `start_date` | `timestamptz [not null]` | — |
| `end_date` | `timestamptz` | — |
| `status` | `varchar(30) [not null]` | — |

## PAYMENTS & INVOICING

### `payment_methods`
| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk, increment]` | — |
| `company_id` | `bigint [ref: > companies.id]` | — |
| `provider` | `varchar(50) [not null]` | — |
| `provider_method_id` | `varchar(255) [not null]` | — |
| `type` | `varchar(30) [not null]` | credit_card, bank_transfer |
| `card_brand` | `varchar(50)` | visa, mastercard |
| `card_last4` | `char(4)` | — |
| `card_exp_month` | `smallint` | — |
| `card_exp_year` | `smallint` | — |
| `is_default` | `boolean [default: false]` | — |
| `status` | `payment_status [default: 'pending']` | — |
| `created_at` | `timestamptz [not null]` | — |

**Note from source:** Store gateway references — never raw card data.

### `payments`
| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk, increment]` | — |
| `company_id` | `bigint [ref: > companies.id]` | — |
| `subscription_id` | `bigint [ref: > company_subscriptions.id]` | — |
| `invoice_id` | `bigint [ref: > invoices.id]` | — |
| `payment_method_id` | `bigint [ref: > payment_methods.id]` | — |
| `parent_payment_id` | `bigint [ref: > payments.id]` | — |
| `transaction_type` | `varchar(20) [not null]` | — |
| `billing_cycle_start_date` | `date` | — |
| `billing_cycle_end_date` | `date` | — |
| `amount` | `decimal(12,2) [not null]` | — |
| `currency` | `char(3) [not null]` | — |
| `gateway` | `varchar(50)` | — |
| `gateway_transaction_id` | `varchar(255)` | — |
| `status` | `payment_status [default: 'pending']` | — |
| `failure_reason` | `text` | — |
| `paid_at` | `timestamptz` | — |
| `created_at` | `timestamptz [not null]` | — |

**Declared indexes / index keys**

- `(company_id, status, paid_at)`
- `(subscription_id, paid_at)`

**Note from source:** Refunds are represented as another transaction type.

### `invoices`
| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk, increment]` | — |
| `company_id` | `bigint [ref: > companies.id]` | — |
| `subscription_id` | `bigint [ref: > company_subscriptions.id]` | — |
| `invoice_number` | `varchar(100) [unique]` | — |
| `issue_date` | `date [not null]` | — |
| `due_date` | `date` | — |
| `paid_at` | `timestamptz` | — |
| `subtotal` | `decimal(12,2) [not null]` | — |
| `tax_amount` | `decimal(12,2) [default: 0]` | — |
| `total_amount` | `decimal(12,2) [not null]` | — |
| `currency` | `char(3) [not null]` | — |
| `status` | `invoice_status [default: 'draft']` | draft, issued, paid, overdue, cancelled |
| `line_items` | `jsonb` | {items: [{description, quantity, amount}]} |
| `provider_invoice_id` | `varchar(255)` | — |
| `pdf_url` | `text` | — |
| `created_at` | `timestamptz [not null]` | — |

**Note from source:** Invoices mirror payment cycles. Track items, tax, totals, provider IDs, and PDF URLs.

## ADMIN & SYSTEM

### `reports`
| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk, increment]` | — |
| `reporter_id` | `bigint [ref: > users.id]` | — |
| `target_type` | `varchar(30) [not null]` | — |
| `target_id` | `bigint [not null]` | — |
| `reason` | `varchar(100) [not null]` | — |
| `title` | `varchar(255)` | — |
| `description` | `text` | — |
| `status` | `varchar(30) [not null]` | pending, in_progress, resolved, closed |
| `resolution_action` | `varchar(50)` | — |
| `resolution_note` | `text` | — |
| `created_at` | `timestamptz [not null]` | — |
| `resolved_at` | `timestamptz` | — |

**Note from source:** Generic reporting system.

### `report_activities`
| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk, increment]` | — |
| `report_id` | `bigint [ref: > reports.id]` | — |
| `actor_id` | `bigint [ref: > users.id]` | — |
| `activity_type` | `varchar(30) [not null]` | — |
| `content` | `text` | — |
| `file_url` | `text` | — |
| `metadata` | `jsonb` | — |
| `created_at` | `timestamptz [not null]` | — |

**Note from source:** One table for: moderator notes moderation actions

### `audit_logs`
| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk, increment]` | — |
| `actor_id` | `bigint [ref: > users.id]` | — |
| `actor_type` | `varchar(20) [not null]` | — |
| `action` | `varchar(100) [not null]` | — |
| `entity_type` | `varchar(100)` | — |
| `entity_id` | `bigint` | — |
| `old_values` | `jsonb` | — |
| `new_values` | `jsonb` | — |
| `details` | `jsonb` | — |
| `ip_address` | `inet` | — |
| `user_agent` | `text` | — |
| `request_id` | `varchar(100)` | — |
| `created_at` | `timestamptz [not null]` | — |

## CONTENT & HELP

### `view_events`
| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk]` | — |
| `user_id` | `bigint [ref: > users.id]` | — |
| `entity_type` | `varchar(50)` | job, company, profile |
| `entity_id` | `bigint` | — |
| `viewed_at` | `timestamptz [default: `now()`]` | — |

### `entity_notes`
| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk]` | — |
| `entity_type` | `varchar(50)` | job, application, interview |
| `entity_id` | `bigint` | — |
| `note_text` | `text [not null]` | — |
| `added_by` | `bigint [ref: > users.id]` | — |
| `is_internal` | `boolean [default: true]` | — |
| `created_at` | `timestamptz [default: `now()`]` | — |

### `help_faqs`
| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk, increment]` | — |
| `audience` | `varchar(20) [not null]` | — |
| `category` | `varchar(50)` | — |
| `question` | `text [not null]` | — |
| `answer` | `text [not null]` | — |
| `is_published` | `boolean [default: true]` | — |
| `helpful_yes_count` | `int [not null, default: 0]` | — |
| `helpful_no_count` | `int [not null, default: 0]` | — |
| `created_at` | `timestamptz [not null]` | — |
| `updated_at` | `timestamptz [not null]` | — |

**Note from source:** Admin-curated FAQ entries shown to candidates or companies in the Help Center. helpful_yes_count/helpful_no_count back the 'Was this article helpful?' voting UI shown on both Candidate and Recruiter Help Center screens. Kept as simple counters (not a per-user vote table) since the UI does not require preventing repeat votes or showing who voted — revisit as a separate help_faq_votes table if that changes.

### `help_questions`
| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk, increment]` | — |
| `submitted_by` | `bigint [not null, ref: > users.id]` | — |
| `audience` | `varchar(20) [not null]` | — |
| `question_text` | `text [not null]` | — |
| `status` | `varchar(20)` | open, answered, closed |
| `linked_faq_id` | `bigint [ref: > help_faqs.id]` | — |
| `created_at` | `timestamptz [not null]` | — |

**Note from source:** One-way question submissions from candidates/companies, curated by admin into help_faqs. Not a chat/ticket thread.

### `company_reviews`
| Field | Definition | Source comment |
|---|---|---|
| `id` | `bigint [pk, increment]` | — |
| `candidate_id` | `bigint [not null, ref: > candidate_profiles.id]` | — |
| `company_id` | `bigint [not null, ref: > companies.id]` | — |
| `application_id` | `bigint [not null, ref: > applications.id]` | — |
| `rating` | `smallint [not null]` | — |
| `review_title` | `varchar(150)` | — |
| `review_text` | `text` | — |
| `is_anonymous` | `boolean [default: false]` | — |
| `eligibility_reason` | `varchar(20) [not null]` | — |
| `moderation_status` | `varchar(20) [default: 'PENDING']` | — |
| `created_at` | `timestamptz [not null]` | — |
| `updated_at` | `timestamptz [not null]` | — |

**Note from source:** Candidate-authored rating/review of a company, gated on having received an offer or been hired.

## Source DBML

The original DBML remains the canonical machine-readable ERD source. Keep it alongside this Markdown reference so the schema can be imported into DBML-compatible tools.

```dbml


// ENUMS

enum employment_type {
  full_time
  part_time
  contract
  internship
}

// ==================================================================================
// CORE ENTITIES
// ==================================================================================

// 1. users — Identity & Authentication
Table users {
  id bigint [pk, increment]
  role varchar(30) [not null]  // candidate, recruiter, super_admin
  email varchar(255) [unique, not null]
  password_hash varchar(255)
  full_name varchar(255) [not null]
  phone varchar(20)
  profile_picture_url varchar(500)
  is_active boolean [default: true]
  is_email_verified boolean [not null, default: false]
  email_verified_at timestamptz

  terms_accepted_at timestamptz
  terms_version varchar(30)
  privacy_accepted_at timestamptz
  privacy_version varchar(30)

  last_login_at timestamptz
  suspended_at timestamptz
  suspended_by bigint [ref: > users.id]

  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]

    indexes {
    email
    role
  }
  Note: "Central account for every person."
}


// 2. auth_identities — Identity & Authentication
Table auth_identities {
  id bigint [pk, increment]
  user_id bigint [not null, ref: > users.id]
  provider varchar(30) [not null]
  provider_user_id varchar(255) [not null]
  provider_email varchar(255)
  created_at timestamptz [not null]
  Note: "External login providers such as Google."
}

// 3. otp_verifications — Identity & Authentication
Table otp_verifications {
  id bigint [pk, increment]
  user_id bigint [ref: > users.id]
  destination varchar(255) [not null]
  purpose varchar(40) [not null]

  otp_code varchar(6) [not null]
  expires_at timestamptz [not null]
  verified_at timestamptz
  created_at timestamptz [not null]
  Note: "For email OTP."
}

// 4. user_security — Identity & Authentication
Table user_security {
  id bigint [pk, increment]
  user_id bigint [unique, ref: > users.id]
  two_fa_enabled boolean [default: false]
  password_last_changed_at timestamptz
  failed_login_count int [default: 0]
  locked_until timestamptz
  updated_at timestamptz [not null]
  Note: "One-to-one security configuration."
}

// ==================================================================================
// CANDIDATE PROFILE
// ==================================================================================

// 5. candidate_profiles — Candidate
Table candidate_profiles {
  id bigint [pk, increment]
  user_id bigint [not null, unique, ref: > users.id]
  headline varchar(255)
  summary text
  current_location varchar(255)

  seeking_status varchar(50) // actively_seeking, open_to_offers, not_seeking
  expected_salary_min int
  expected_salary_max int
  currency varchar(3) [default: 'USD']

  work_authorization_status varchar(50)
  security_clearance varchar(100)
  willing_to_relocate boolean [default: false]

  linkedin_url text
  github_url text
  portfolio_url text

  created_at timestamptz [not null]
  updated_at timestamptz [not null]
}

// 6. resumes — Candidate
Table resumes {
  id bigint [pk, increment]
  candidate_id bigint [ref: > candidate_profiles.id]

  title varchar(255) [not null]
  file_name varchar(255) [not null]
  file_url varchar(500) [not null]
  file_type varchar(100) [not null]
  file_size bigint

  is_default boolean [default: false]
  uploaded_at timestamptz [not null]
  updated_at timestamptz [not null]
}

// 7. resume_analyses — Candidate
Table resume_analyses {
  id bigint [pk, increment]
  resume_id bigint [ref: > resumes.id]
  ats_score int
  extracted_text text
  strengths jsonb
  weaknesses jsonb
  missing_keywords jsonb
  matched_keywords jsonb
  analysis_result jsonb
  model_version varchar(100)
  analyzed_at timestamptz [not null]
  Note: "ATS/AI analysis."
}

// 8. education — Candidate
Table education {
  id bigint [pk, increment]
  candidate_id bigint [ref: > candidate_profiles.id]
  institution varchar(255) [not null]
  degree varchar(150)
  field_of_study varchar(150)
  start_date date
  end_date date

  is_currently_studying boolean [default: false]
  gpa decimal(3,2)
  created_at timestamptz [default: `now()`]
}

// 9. experience — Candidate
Table experience {
  id bigint [pk]
  candidate_id bigint [not null, ref: > candidate_profiles.id]
  job_title varchar(150) [not null]
  company_name varchar(255) [not null]
  employment_type employment_type
  start_date date [not null]
  end_date date
  is_current boolean [default: false]
  description text
  location varchar(255)
  created_at timestamptz [default: `now()`]
}

// 10. candidate_skills — Candidate
Table candidate_skills {
  id bigint [pk]
  candidate_id bigint [not null, ref: > candidate_profiles.id]
  skill_id bigint [not null, ref: > master_data_items.id]
  proficiency_level varchar(30) // beginner, intermediate, advanced, expert
  years_of_experience decimal(3,1)
  created_at timestamptz [default: `now()`]
  
  indexes {
    (candidate_id, skill_id) [pk]
  }
}

// ==================================================================================
// MASTER DATA
// ==================================================================================

// 11. master_data_items — Master Data
Table master_data_items {
  id bigint [pk]
  category varchar(50) [not null] // industry, job_category, experience_level
  key varchar(100) [not null]
  value varchar(255) [not null]
  description text

  display_order int [default: 0]
  is_active boolean [default: true]
  created_at timestamptz [not null]
  updated_at timestamptz [not null]
  indexes {
    (category, key)
  }
   Note: "This is one of the big consolidations. Instead of separate tables for: Industry Department Job Category Experience Level Employment Type Work Mode Skill Benefit we use one managed taxonomy table."
}

// 12. skill_alias_relations — Master Data
Table skill_alias_relations {
  id bigint [pk, increment]
  source_skill_id bigint [ref: > master_data_items.id]
  target_skill_id bigint [ref: > master_data_items.id]
  alias_text varchar(150)
  confidence_score decimal(5,2)
  created_at timestamptz [not null]
  Note: "Handles both: JavaScript → JS React → Frontend Library AWS → Cloud Computing"
}

// ==================================================================================
// COMPANIES
// ==================================================================================

// 13. companies — Company / Organization
Table companies {
  id bigint [pk, increment]
  name varchar(255) [not null]
  description text //markdown stored in DB

  registration_number varchar(100) [unique]
  tax_id varchar(100)
  industry_id bigint [not null, ref: > master_data_items.id]
  email varchar(255)
  phone varchar(20)
  company_size varchar(50)
  founded_year int

  logo_url varchar(500)
  cover_image_url  varchar(500)
  website_url varchar(500)

  headquarters_address text
  city varchar(100)
  state varchar(100)
  country varchar(100)
  postal_code varchar(20)

  media jsonb
  billing_name varchar(255)
  billing_email varchar(255)
  billing_address varchar(250)

  
  // Admin & Settings
  admin_user_id bigint [ref: > users.id]
  verification_status varchar(30) [default: 'PENDING'] // active, suspended, inactive
  suspended_at timestamptz
  suspended_by bigint [ref: > users.id]

  created_at timestamptz [not null]
  updated_at timestamptz [not null]

    
  indexes {
    industry_id
    verification_status
    created_at
  }
  Note: "status/suspended_at/suspended_by mirror the same pattern on users — added for the Super Admin 'Suspend Company Account' moderation action (Job Module: Admin job report review screen), which had no field to act on. verification_status is separate and unaffected: a company can be VERIFIED but still SUSPENDED for a policy violation. sso_enabled/sso_provider/enforce_2fa: Company Module's Team Management screen displays 'SSO Enforced via Okta · 2FA Mandatory' as an org-wide policy — this is distinct from user_security, which is per-user; entitlement to offer SSO at all still comes from subscription_plan_features, this just stores whether/how a given company has it configured."
}


// 14. company_benefits
Table company_benefits {
  id bigint [pk, increment]
  company_id bigint [ref: > companies.id]
  name varchar(100) [not null]
  custom_description text
  display_order int [default: 0]
  is_active boolean [default: true]
  created_at timestamptz [not null]
  Note: "A single table for: CompanyBenefit"
}

// 15. company_talent_tracks — Company / Organization
Table company_talent_tracks {
  company_id bigint [ref: > companies.id]
  master_data_item_id bigint [ref: > master_data_items.id]
  created_at timestamptz [not null]

  Indexes {
    (company_id, master_data_item_id) [pk]
  }
  Note: "Company Module's verification flow shows 'Primary Functional Talent Tracks' (e.g. Software Engineering, Product Design, Cloud DevOps) as multi-select tags, repeated on the Super Admin verification review screen as 'Key Focus Areas'. Uses master_data_items (type='talent_track' or similar) rather than free text so tags stay normalized and reusable for the candidate-matching graph the UI copy references. Company-level and ongoing, not tied to a single verification submission — a company's hiring focus can change after it's verified."
}

// ==================================================================================
// JOBS
// ==================================================================================

// 16. jobs — Jobs & Recruitment
Table jobs {
  id bigint [pk, increment]
  company_id bigint [ref: > companies.id]
  created_by bigint [ref: > users.id]

  // Basic Info
  job_title varchar(255) [not null]
  job_category_id bigint [ref: > master_data_items.id]
  department_id bigint [ref: > master_data_items.id]
  experience_level_id bigint [ref: > master_data_items.id]
  employment_type employment_type
  location varchar(255)
  work_mode_id bigint [ref: > master_data_items.id]

  // Details
  job_description text [not null]
  requirements text
  responsibilities text

  // Compensation
  salary_min decimal(12,2)
  salary_max decimal(12,2)
  salary_currency char(3) [default: 'USD']

  openings int [default: 1]
  accepts_cover_letter boolean [default: false]
  promote_on_job_boards boolean [default: false]
  
  // Status
  job_status job_status  [default: 'draft']
  application_deadline timestamptz
  closed_at timestamptz
  filled_at timestamptz
  created_at timestamptz [not null]
  updated_at timestamptz [not null]
  on_hold_reason text

  // Draft Management
  is_draft boolean [default: false]
  draft_saved_at timestamptz
  published_at timestamptz

    
  indexes {
    (company_id, job_status)
    (created_by, published_at)
  }
}

enum job_status {
  draft
  published
  closed
  on_hold
}

// TABLE 17: Job Benefits
Table job_benefits {
  id bigint [pk, increment]
  job_id bigint [ref: > jobs.id]
  benefit_name varchar(255) [not null]
  custom_description text
  is_active boolean [default: true]
  created_at timestamptz [not null]
  Note: "A single table for: JobBenefit"
}

// 18. job_skills — Jobs & Recruitment
Table job_skills {
  id bigint [pk, increment]
  job_id bigint [ref: > jobs.id]
  skill_id bigint [ref: > master_data_items.id]
  is_required boolean [default: true]
  proficiency_level varchar(50)

  Indexes {
    (job_id, skill_id) [pk]
  }
}

// 19. job_stages — Jobs & Recruitment
Table job_stages {
  id bigint [pk, increment]
  job_id bigint [ref: > jobs.id]
  name varchar(100) [not null]
  stage_order int [not null]
  description text
  is_required boolean [default: true]
  is_active boolean [default: true]
  created_at timestamptz [not null]

  indexes {
    (job_id, stage_order)
  }
  Note: "Defines the hiring pipeline for each job."
}

// ==================================================================================
// APPLICATIONS & SCREENING
// ==================================================================================

// 20. applications — Jobs & Recruitment
Table applications {
  id bigint [pk, increment]
  candidate_id bigint [ref: > candidate_profiles.id]
  job_id bigint [ref: > jobs.id]
  resume_id bigint [ref: > resumes.id]
  
  linkedin_url varchar(500)
  portfolio_url varchar(500)
  message_to_hiring_manager varchar(255)

  // Application Details
  application_status application_status [default: 'applied']
  applied_at timestamptz [default: `now()`]
  cover_letter text

  // Channel Attribution (NEW)
  source varchar(50) // job_boards, referral, direct, agency
  referred_by bigint [ref: > users.id]

  // Notes & Updates
  hiring_notes text

  // Timeline
  reviewed_at timestamptz
  reviewed_by bigint [ref: > users.id]
  rejected_at timestamptz
  rejection_reason text
  offer_extended_at timestamptz
  hired_at timestamptz
  withdrawn_at timestamptz
  created_at timestamptz [not null]
  updated_at timestamptz [not null]

  indexes {
    (job_id, candidate_id)
    (application_status, applied_at)
    source
  }
  Note: "source/referred_by: Offer Module's Company Analytics screen shows a 'Channel Attribution' breakdown (Job Boards, Network & Referrals, Direct Careers Portal, Agency & Headhunters) with no field anywhere to compute it from — source captures the channel, referred_by captures the specific referring user for the referral case."
}

enum application_status {
  applied
  reviewing
  shortlisted
  rejected
  interview_scheduled
  offer_sent
  accepted
  declined
}

// 21. application_stage_progress — Jobs & Recruitment
Table application_stage_progress {
  id bigint [pk, increment]
  application_id bigint [ref: > applications.id]
  job_stage_id bigint [ref: > job_stages.id]
  started_at timestamptz
  completed_at timestamptz
  changed_by bigint [ref: > users.id]
  notes text
}

// 22. application_materials — Jobs & Recruitment
Table application_materials {
  id bigint [pk, increment]
  application_id bigint [ref: > applications.id]
  file_name varchar(255)
  file_url varchar(500)
  file_type varchar(50)
  uploaded_at timestamptz [default: `now()`]
  Note: "For: Portfolio, Cover Letter & Certificate"
}

// 23. application_notes — Jobs & Recruitment
Table application_notes {
  id bigint [pk, increment]
  application_id bigint [ref: > applications.id]
  author_id bigint [ref: > users.id]
  note text [not null]
  is_internal boolean [default: true]
  created_at timestamptz [not null]
  updated_at timestamptz [not null]
}

// ==================================================================================
// INTERVIEWS & FEEDBACK
// ==================================================================================


// 24. interviews — Jobs & Recruitment
Table interviews {
  id bigint [pk, increment]
  application_id bigint [not null, ref: > applications.id]
  job_id bigint [not null, ref: > jobs.id]
  scheduled_by bigint [not null, ref: > users.id]
  job_stage_id bigint [ref: > job_stages.id]

  // Interview Details
  interview_type varchar(50) // phone, technical, behavioral, final
  scheduled_at timestamptz [not null]
  duration_minutes int [not null default: 60]
  meeting_link varchar(500)
  location varchar(255)
  interview_status varchar(20) // scheduled, completed, cancelled
  invitation_note text

  // Cancellation Tracking
  cancellation_reason text
  cancelled_at timestamptz
  cancelled_by bigint [ref: > users.id]
  
  feedback_submitted boolean [default: false]
  created_at timestamptz [default: `now()`]
  updated_at timestamptz [default: `now()`]
  
  indexes {
    (job_id, scheduled_at)
    (application_id, status)
  }
  Note: "cancellation_reason: candidate- or recruiter-facing reason shown when status = CANCELLED / NO_SHOW."
}

// 25. interview_participants — Jobs & Recruitment
Table interview_participants {
  id bigint [pk, increment]
  interview_id bigint [ref: > interviews.id]
  user_id bigint [ref: > users.id]
  participant_type varchar(20) // interviewer, candidate

  // For external interviewers
  external_name varchar(150)
  external_email varchar(255)
  participant_role varchar(30) [not null]

  invitation_sent_at timestamptz
  response_status varchar(30) [default: 'INVITED'] // INVITED, accepted, declined
  joined_at timestamptz

  last_nudged_at timestamptz
  nudge_count int [default: 0]
  
  created_at timestamptz [default: `now()`]
  
  indexes {
    (interview_id, participant_type)
  }
  Note: "last_nudged_at / nudge_count: track reminder pings sent to a panelist for an overdue scorecard, backs the Interviews Dashboard 'Scorecard Pending — Nudge panelists' widget."
}

// 26. interview_feedback — Jobs & Recruitment
Table interview_feedback {
  id bigint [pk, increment]
  interview_id bigint [ref: > interviews.id]
  submitted_by bigint [not null, ref: > users.id]
  on_behalf_of_participant_id bigint [ref: > interview_participants.id]

  rating int
  technical_score int
  communication_score int
  overall_score float
  recommendation varchar(30) // strong_yes, yes, maybe, no, strong_no
  comments text
  submitted_at timestamptz [default: `now()`]
  Note: "submitted_on_behalf_of stays as a display-text snapshot ('Mark Chen (External Advisor - Systems Architect)'); on_behalf_of_participant_id is the FK link to the actual interview_participants row for traceability. rating/technical_score/communication_score remain as a quick-glance summary; the full per-criterion breakdown now lives in interview_feedback_criteria."
}

// 27. interview_feedback_criteria — Jobs & Recruitment
Table interview_feedback_criteria {
  id bigint [pk, increment]
  feedback_id bigint [not null, ref: > interview_feedback.id]
  criterion_key varchar(60) [not null]
  criterion_label varchar(150) [not null]
  criterion_description text
  benchmark_level varchar(50) // below_expectations, meets, exceeds
  score int [not null]
  max_score int [not null, default: 5]
  display_order int [default: 0]
  created_at timestamptz [not null]

  Indexes {
    (feedback_id, criterion_key) [unique]
  }
  Note: "One row per rated competency on a scorecard (e.g. 'Technical System Design & Architecture', 'Product Sense & UX Architecture', 'Cross-functional Communication', 'Problem Solving & Live Critique'). criterion_key is stable per job_stage.stage_type / level so scores are comparable across candidates for the same stage; criterion_label/description/benchmark_level are the human-readable snapshot shown on the scorecard at submission time."
}

// ==================================================================================
// OFFERS
// ==================================================================================


// 28. offers — Jobs & Recruitment
Table offers {
  id bigint [pk]
  application_id bigint [not null, ref: > applications.id]
  created_by bigint [not null, ref: > users.id]

  // Compensation (SIMPLIFIED but complete)
  salary int [not null]
  currency varchar(3) [default: 'USD']
  employment_type employment_type [not null]
  start_date date

  // Equity
  equity_type varchar(50) // RSU, ISO, NSO
  equity_units int
  equity_vesting_schedule text

  // Bonus
  bonus_type varchar(50) // performance, signing, referral
  bonus_target_percent int
  bonus_target_amount int

  // Sign-on
  sign_on_bonus int
  sign_on_bonus_terms text

  // Reporting Manager
  reports_to_user_id bigint [ref: > users.id]

  // Status & Dates
  status offer_status [default: 'draft']
  sent_at timestamptz
  responded_at timestamptz
  expiration_date date
  
  offer_document_url text

  // Decline Tracking
  decline_reason varchar(100)
  candidate_feedback text
  declined_at timestamptz

  created_at timestamptz [default: `now()`]
  updated_at timestamptz [default: `now()`]

  indexes {
    (application_id, status)
    (created_by, sent_at)
  }
  Note: "Offer Module's Create/View Offer screens show a full compensation package (equity grant + vesting, target bonus, sign-on bonus), a named reporting manager, e-signature status ('DocuSign completed'), and a decline flow that captures both a reason dropdown and free-text feedback — none of which the original salary/currency/employment_type fields could hold."
}

enum offer_status {
  draft
  sent
  accepted
  declined
  expired
}

// 29. offer_attachments — Jobs & Recruitment
Table offer_attachments {
  id bigint [pk, increment]
  offer_id bigint [not null, ref: > offers.id]
  file_name varchar(255)
  file_url varchar(500)
  file_type varchar(50)
  file_size bigint
  description varchar(255)
  uploaded_by bigint [ref: > users.id]
  uploaded_at timestamptz [not null]
  Note: "Create Offer screen's 'Attachments & Supporting Collateral' section supports multiple supplemental PDFs (benefits handbook, IP agreement, etc.) alongside the single main offer_document_url on `offers` — one row per attached file."
}

// TABLE 30: Offer Letter Templates
Table offer_letter_templates {
  id bigint [pk]
  company_id bigint [not null, ref: > companies.id]
  template_name varchar(255) [not null]
  body_template text [not null]
  variables_schema jsonb // {candidate_name, salary, start_date, etc.}
  version int [default: 1]
  is_active boolean [default: true]
  created_by bigint [not null, ref: > users.id]
  created_at timestamptz [default: `now()`]
  
  indexes {
    (company_id, is_active)
  }
}

// ==================================================================================
// SAVED JOBS & ENGAGEMENT
// ==================================================================================

// 31. saved_jobs — Jobs & Recruitment
Table saved_jobs {
  id bigint [pk]
  candidate_id bigint [ref: > candidate_profiles.id]
  job_id bigint [ref: > jobs.id]
  saved_at timestamptz [not null]

  Indexes {
    (candidate_id, job_id) [pk]
  }
}

// ==================================================================================
// MESSAGING & NOTIFICATIONS (SIMPLIFIED)
// ==================================================================================

// 32. conversations — Chat
Table conversations {
  id bigint [pk, increment]
  created_at timestamptz [not null]
  updated_at timestamptz [not null]
}

// 33. conversation_participants — Chat
Table conversation_participants {
  id bigint [pk]
  conversation_id bigint [ref: > conversations.id]
  user_id bigint [ref: > users.id]
  joined_at timestamptz [not null]
  last_read_at timestamptz
  is_active boolean [default: true]

  Indexes {
    (conversation_id, user_id) [pk]
  }
}

// 34. messages — Chat
Table messages {
  id bigint [pk, increment]
  conversation_id bigint [ref: > conversations.id]
  sender_id bigint [ref: > users.id]
  content text
  message_type varchar(30) [default: 'TEXT']
  attachments jsonb
  created_at timestamptz [not null]
  is_read boolean [default: false]
  read_at timestamptz
  is_edited boolean [default: false]
  edited_at timestamptz
  is_deleted boolean [default: false]
  deleted_at timestamptz
}

// 35. notifications — Notifications
Table notifications {
  id bigint [pk, increment]
  user_id bigint [ref: > users.id]
  source_type varchar(30) [not null]
  source_id bigint
  notification_type notification_type [not null]
  title varchar(255) [not null]
  message text [not null]
  redirect_url varchar(500)
  sent_at timestamptz
  delivered_at timestamptz
  is_read boolean [default: false]
  read_at timestamptz
  failure_reason text
  created_at timestamptz [not null]

  indexes {
    (user_id, is_read, created_at)
  }
  Note: "This table handles both ordinary notifications and broadcast delivery."
}

enum notification_type {

  application_received
  application_status_changed

  interview_scheduled
  interview_rescheduled
  interview_cancelled
  interview_reminder

  offer_sent
  offer_accepted
  offer_declined

  message_received

  subscription_expiring
  payment_failed
  invoice_generated

  system
}

// ==================================================================================
// COMPANY VERIFICATION (RIGIDIFIED)
// ==================================================================================

// 36. company_verifications — Company Verification
Table company_verifications {
  id bigint [pk, increment]
  company_id bigint [ref: > companies.id]
  submitted_by bigint [ref: > users.id]

  reviewed_by bigint [ref: > users.id]
  designated_recruiter_id bigint [ref: > users.id]
  status varchar(30) [not null] // pending, approved, rejected

  risk_score decimal(5,2)
  risk_level varchar(20)
  intended_hiring_min int
  intended_hiring_max int

  review_history jsonb
  internal_notes text
  rejection_reason text

  submitted_at timestamptz [not null]
  reviewed_at timestamptz
  Note: "We consolidate history/internal notes here using JSONB. documents (jsonb) stays as a lightweight index/summary; the authoritative per-file record — checksum, uploader, replace history — now lives in company_verification_documents, since compliance review needs that level of structure. domain_verified_at/domain_verification_method: Verify Your Company screen shows 'Domain Verified — confirmed via DNS handshake', which had no field. designated_recruiter_id: the verification form's 'Designated Lead Recruiter' contact for compliance escalations."
}

// 37. company_verification_documents — Company Verification
Table company_verification_documents {
  id bigint [pk, increment]
  verification_id bigint [not null, ref: > company_verifications.id]
  document_type varchar(50) [not null] // incorporation, tax_form, business_license
  file_url varchar(500) [not null]
  original_filename varchar(255) [not null]
  file_size bigint
  checksum_sha256 varchar(64)
  status varchar(30) [not null, default: 'PENDING'] // pending, approved, rejected
  is_current boolean [not null, default: true]
  uploaded_by bigint [ref: > users.id]
  uploaded_at timestamptz [not null]
  Note: "One row per compliance document (Certificate of Incorporation, Tax Form W-9/1099, Business License, etc.). Verify Your Company screen shows per-document status (Valid File Attached / Pending Upload), a SHA-256 checksum, uploader, and a 'Replace' action — is_current + a new row on replace preserves the old file for audit rather than overwriting it, matching the 'audited strictly by compliance specialists' language on the screen."
}

// ==================================================================================
// SUBSCRIPTIONS & BILLING (RIGIDIFIED)
// ==================================================================================

// 38. subscription_plans — Subscription & Billing
Table subscription_plans {
  id bigint [pk]
  name varchar(100) [not null]
  description text

  monthly_price int
  annual_price int
  currency varchar(3)
  discount_percent decimal(5,2)

  icon varchar(50)

  max_job_postings int
  max_active_jobs int
  max_resume_scans int

  chat_enabled boolean
  interview_scheduling_enabled boolean
  company_profile_verification boolean
  priority_support boolean

  display_order int

  is_active boolean [default: true]
  created_at timestamptz
  updated_at timestamptz
}



// 39. company_subscriptions — Subscription & Billing
Table company_subscriptions {
  id bigint [pk, increment]
  company_id bigint [ref: > companies.id]
  plan_id bigint [ref: > subscription_plans.id]

  status subscription_status [default: 'active']
  billing_period subscription_billing_period
  current_period_start_at timestamptz [not null]
  current_period_end_at timestamptz [not null]

  next_billing_at timestamptz
  cancel_at_period_end boolean [default: false]
  cancelled_at timestamptz
  grace_period_end_at timestamptz
  auto_renewal boolean [default: true]

  created_at timestamptz [not null]
  updated_at timestamptz [not null]
}

enum subscription_billing_period {
  monthly
  annual
}

enum subscription_status {
  active
  cancelled
  suspended
  expired
}

// 40. add_ons — Subscription & Billing
Table add_ons {
  id bigint [pk, increment]
  name varchar(100) [unique]
  description text
  price decimal(12,2) [not null]
  billing_period subscription_billing_period
  is_active boolean [default: true]
}

// 41. subscription_add_ons — Subscription & Billing
Table subscription_add_ons {
  id bigint [pk, increment]
  subscription_id bigint [ref: > company_subscriptions.id]
  addon_id bigint [ref: > add_ons.id]
  quantity int [default: 1]
  unit_price decimal(12,2) [not null]
  start_date timestamptz [not null]
  end_date timestamptz
  status varchar(30) [not null]
}

// ==================================================================================
// PAYMENTS & INVOICING
// ==================================================================================

// 42. payment_methods — Subscription & Billing
Table payment_methods {
  id bigint [pk, increment]
  company_id bigint [ref: > companies.id]
  provider varchar(50) [not null]
  provider_method_id varchar(255) [not null]
  type varchar(30) [not null] // credit_card, bank_transfer

  card_brand varchar(50) // visa, mastercard
  card_last4 char(4)
  card_exp_month smallint
  card_exp_year smallint

  is_default boolean [default: false]
  status payment_status [default: 'pending'] 
  created_at timestamptz [not null]
  Note: "Store gateway references — never raw card data."
}

// 43. payments — Subscription & Billing
Table payments {
  id bigint [pk, increment]
  company_id bigint [ref: > companies.id]
  subscription_id bigint [ref: > company_subscriptions.id]
  invoice_id bigint [ref: > invoices.id]
  payment_method_id bigint [ref: > payment_methods.id]
  parent_payment_id bigint [ref: > payments.id]
  transaction_type varchar(20) [not null]

  // Billing Cycle Context (NEW)
  billing_cycle_start_date date
  billing_cycle_end_date date

  amount decimal(12,2) [not null]
  currency char(3) [not null]
  gateway varchar(50)
  gateway_transaction_id varchar(255)
  status payment_status [default: 'pending']

  failure_reason text
  paid_at timestamptz
  created_at timestamptz [not null]
    
  indexes {
    (company_id, status, paid_at)
    (subscription_id, paid_at)
  }
  Note: "Refunds are represented as another transaction type."
}

enum payment_status {
  pending
  completed
  failed
  refunded
}

// 48. invoices — Subscription & Billing
Table invoices {
  id bigint [pk, increment]
  company_id bigint [ref: > companies.id]
  subscription_id bigint [ref: > company_subscriptions.id]
  invoice_number varchar(100) [unique]

  issue_date date [not null]
  due_date date
  paid_at timestamptz
  

  subtotal decimal(12,2) [not null]
  tax_amount decimal(12,2) [default: 0]
  total_amount decimal(12,2) [not null]
  currency char(3) [not null]

  status invoice_status [default: 'draft'] // draft, issued, paid, overdue, cancelled

  line_items jsonb // {items: [{description, quantity, amount}]}
  provider_invoice_id varchar(255)
  pdf_url text
  created_at timestamptz [not null]
  Note: "Invoices mirror payment cycles. Track items, tax, totals, provider IDs, and PDF URLs."
}

enum invoice_status {
  draft
  issued
  paid
  overdue
  cancelled
}

// ==================================================================================
// ADMIN & SYSTEM
// ==================================================================================

// 49. reports — Reports, Moderation & Audit
Table reports {
  id bigint [pk, increment]
  reporter_id bigint [ref: > users.id]
  target_type varchar(30) [not null]
  target_id bigint [not null]
  reason varchar(100) [not null]
  title varchar(255)
  description text
  status varchar(30) [not null] // pending, in_progress, resolved, closed
  resolution_action varchar(50)
  resolution_note text

  created_at timestamptz [not null]
  resolved_at timestamptz
  Note: "Generic reporting system."
}

// 50. report_activities — Reports, Moderation & Audit
Table report_activities {
  id bigint [pk, increment]
  report_id bigint [ref: > reports.id]
  actor_id bigint [ref: > users.id]
  activity_type varchar(30) [not null]
  content text
  file_url text
  metadata jsonb
  created_at timestamptz [not null]
  Note: "One table for: moderator notes moderation actions"
}

// 51. audit_logs — Reports, Moderation & Audit
Table audit_logs {
  id bigint [pk, increment]
  actor_id bigint [ref: > users.id]
  actor_type varchar(20) [not null]
  action varchar(100) [not null]
  entity_type varchar(100)
  entity_id bigint
  old_values jsonb
  new_values jsonb
  details jsonb
  ip_address inet
  user_agent text
  request_id varchar(100)
  created_at timestamptz [not null]
}


// ==================================================================================
// CONTENT & HELP
// ==================================================================================

// 52. view_events — Analytics
Table view_events {
  id bigint [pk]
  user_id bigint [ref: > users.id]
  entity_type varchar(50) // job, company, profile
  entity_id bigint
  viewed_at timestamptz [default: `now()`]
}

// 53. entity_notes — Platform Admin
Table entity_notes {
  id bigint [pk]
  entity_type varchar(50) // job, application, interview
  entity_id bigint
  note_text text [not null]
  added_by bigint [ref: > users.id]
  is_internal boolean [default: true]
  created_at timestamptz [default: `now()`]
}


// 54. help_faqs — Platform Admin
Table help_faqs {
  id bigint [pk, increment]
  audience varchar(20) [not null]
  category varchar(50)
  question text [not null]
  answer text [not null]
  is_published boolean [default: true]
  helpful_yes_count int [not null, default: 0]
  helpful_no_count int [not null, default: 0]
  created_at timestamptz [not null]
  updated_at timestamptz [not null]
  Note: "Admin-curated FAQ entries shown to candidates or companies in the Help Center. helpful_yes_count/helpful_no_count back the 'Was this article helpful?' voting UI shown on both Candidate and Recruiter Help Center screens. Kept as simple counters (not a per-user vote table) since the UI does not require preventing repeat votes or showing who voted — revisit as a separate help_faq_votes table if that changes."
}

// 55. help_questions — Platform Admin
Table help_questions {
  id bigint [pk, increment]
  submitted_by bigint [not null, ref: > users.id]
  audience varchar(20) [not null]
  question_text text [not null]
  status varchar(20) // open, answered, closed
  linked_faq_id bigint [ref: > help_faqs.id]
  created_at timestamptz [not null]
  Note: "One-way question submissions from candidates/companies, curated by admin into help_faqs. Not a chat/ticket thread."
}

// 56. company_reviews — Candidate Engagement
Table company_reviews {
  id bigint [pk, increment]
  candidate_id bigint [not null, ref: > candidate_profiles.id]
  company_id bigint [not null, ref: > companies.id]
  application_id bigint [not null, ref: > applications.id]
  rating smallint [not null]
  review_title varchar(150)
  review_text text
  is_anonymous boolean [default: false]
  eligibility_reason varchar(20) [not null]
  moderation_status varchar(20) [default: 'PENDING']
  created_at timestamptz [not null]
  updated_at timestamptz [not null]
  Note: "Candidate-authored rating/review of a company, gated on having received an offer or been hired."
}
```
