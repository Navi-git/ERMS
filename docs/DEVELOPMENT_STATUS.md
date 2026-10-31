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

## Decisions
- ERD change approved: `companies.industry_id` nullable (required again at verification submission).
- Recruiter `users.full_name` defaults to company name.
- Block = `suspended_at/suspended_by`; soft delete = `is_active=false`. No schema change.
- OTP: row in `otp_verifications` + counters in Redis (in-memory cache when REDIS_URL is unset).
- Assumption: registration requires `accept_terms: true` (stores terms/privacy version "1.0").
- ERD omits `increment` on some ids (master_data_items, offers...); auto-increment used.

- Lockout: 5 wrong passwords -> locked 15 min (user_security). Settings: LOGIN_MAX_FAILED_ATTEMPTS, LOGIN_LOCKOUT_MINUTES.
- Limitation: ERD has no company-members table, so only the recruiter in companies.admin_user sees a company.

- Password reset also unlocks the account, blacklists refresh tokens, and rejects older access tokens (iat < password_last_changed_at).

- Google: auto-link by email; new Google accounts are candidates only; unverified password accounts lose their password when linked (pre-hijack defence).
- Pending ERD approval: UNIQUE(provider, provider_user_id) on auth_identities (prevents duplicate links under concurrency).

## Next task
Run `pytest -v` and report. Then live smoke test of the whole backend, then frontend (needs Figma).
