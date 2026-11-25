# Auth API: register, OTP, login, refresh, logout, me

Base path: `/api/v1/auth/`. `register`, `verify-otp`, `resend-otp`, `login` and `token/refresh` are public. `logout` and `me` need `Authorization: Bearer <access>`.

## Error shapes
- Field validation (HTTP 400): `{"email": ["Enter a valid email address."], "password": ["..."]}`
- Business rules: `{"code": "<machine_code>", "message": "<human text>"}`

| HTTP | code | Meaning |
|---|---|---|
| 409 | `email_already_registered` | Verified account exists |
| 409 | `email_not_verified` | Account exists but unverified; frontend sends the user to the OTP screen / resend |
| 400 | `invalid_otp` | Wrong, used, unknown or expired code (deliberately identical) |
| 429 | `otp_attempts_exceeded` | 5 wrong tries on this code; request a new one |
| 429 | `otp_cooldown` | Resend within 60 s |
| 429 | `otp_rate_limited` | More than 5 codes per hour for this email |
| 401 | `invalid_credentials` | Wrong password or unknown email (identical on purpose) |
| 423 | `account_locked` | 5 wrong passwords: locked 15 minutes (`user_security.locked_until`) |
| 403 | `email_not_verified` | Correct password, email not verified: send user to OTP screen |
| 403 | `account_suspended` | Blocked by an admin (`suspended_at` set) |
| 403 | `account_disabled` | Soft-deleted (`is_active = false`) |
| 400 | `invalid_token` | Bad/foreign refresh token on logout |
| 400 | `terms_required` | Google sign-up for a NEW account without `accept_terms: true` |
| 400 | `google_email_unverified` | Google says the email is not verified |
| 401 | `invalid_google_token` | Token failed signature/audience/expiry checks |
| 503 | `google_not_configured` / `google_unavailable` | No `GOOGLE_CLIENT_ID`, or Google unreachable |

## POST /register/
Candidate:
```json
{"email": "jane@example.com", "password": "S3cure-Pass!9", "role": "candidate",
 "full_name": "Jane Doe", "accept_terms": true}
```
Recruiter (company name instead of person name; `full_name` optional, defaults to company name):
```json
{"email": "hr@acme.com", "password": "S3cure-Pass!9", "role": "recruiter",
 "company_name": "Acme Corp", "accept_terms": true}
```
`role` accepts only `candidate` or `recruiter`. Success `201`:
```json
{"user": {"id": 1, "email": "jane@example.com", "full_name": "Jane Doe",
          "role": "candidate", "is_email_verified": false},
 "message": "Verification code sent to your email."}
```
Database effects: `users`, `user_security`, `otp_verifications` (+ `companies` for recruiters, status PENDING, `industry_id` NULL).

## POST /verify-otp/
```json
{"email": "jane@example.com", "code": "482913"}
```
Success `200`: `{"user": {..., "is_email_verified": true}, "message": "Email verified."}`. No tokens are issued; the user then logs in.

## POST /resend-otp/
```json
{"email": "jane@example.com"}
```
Always `200` with a generic message for unknown or already-verified emails (prevents account probing); `429` when throttled.

## POST /login/
```json
{"email": "jane@example.com", "password": "S3cure-Pass!9"}
```
`200`:
```json
{"access": "<jwt, 15 min>", "refresh": "<jwt, 7 days>",
 "user": {"id": 1, "email": "jane@example.com", "full_name": "Jane Doe", "role": "candidate",
          "phone": null, "profile_picture_url": null, "is_email_verified": true,
          "last_login_at": "2026-10-26T10:00:00Z", "company": null}}
```
Recruiters get `"company": {"id": 7, "name": "Acme Corp", "verification_status": "PENDING"}`; the frontend keeps tabs locked until it is approved. Password is checked before account state, so only the account owner learns about blocks. No OTP at login.

## POST /token/refresh/
Body `{"refresh": "<jwt>"}` -> `{"access": "...", "refresh": "..."}`. Refresh tokens rotate: the old one is blacklisted, so store the new one. `401` for invalid/expired/used tokens; `403` `account_suspended` / `account_disabled`.

## POST /logout/  (auth required)
Body `{"refresh": "<jwt>"}` -> `204`. Blacklists the refresh token. The access token cannot be revoked and expires on its own (max 15 min); the frontend must discard it.

## GET /me/  (auth required)
Returns the same `user` object as login. Blocked or deleted users get `401` even with an unexpired access token.

## POST /password-reset/request/
```json
{"email": "jane@example.com"}
```
Always `200` `{"message": "If an account exists for this email, a reset code has been sent."}`. A code is emailed only for verified, active accounts. Throttling (60 s cooldown, 5/hour) is applied silently, so this endpoint reveals nothing about which emails exist.

## POST /password-reset/confirm/
```json
{"email": "jane@example.com", "code": "482913", "new_password": "Brand-New-Pass#42"}
```
`200` `{"message": "Password updated. Please log in."}`; no tokens are issued. Errors: `400` field error on `new_password` (weak password; the code is NOT consumed, so the user can retry), `400 invalid_otp`, `429 otp_attempts_exceeded`.
Side effects: password re-hashed into `users.password_hash`; `user_security.password_last_changed_at` set, `failed_login_count` reset and `locked_until` cleared (a reset unlocks the account); every refresh token blacklisted; access tokens issued before the reset are rejected (`401`, code `password_changed`).

## POST /google/
The browser obtains an **ID token** from Google Identity Services and posts it here.
```json
{"id_token": "<google id token>", "accept_terms": true}
```
`200` for an existing user, `201` for a newly created one; body is the same as login plus `"created": true|false`.
- Known Google account -> signs in as the linked user.
- Existing account with the same email -> Google is linked (`auth_identities`), signed in. If that account was never email-verified, it becomes verified and **its password is disabled**, so a pre-registered attacker password cannot be used.
- Otherwise a new **candidate** is created, email verified, with no password. `accept_terms` must be `true` for new accounts (else `400 terms_required`; the frontend shows the consent and resends). Recruiters register with the form, but an existing recruiter may sign in with Google.
- Suspended or deleted users get `403`.

### Setup
Google Cloud Console > APIs & Services > Credentials > Create OAuth client ID > **Web application**; add `http://localhost:5173` as an authorized JavaScript origin. Put the client ID (no secret needed) in `backend/.env` as `GOOGLE_CLIENT_ID` and in the frontend `.env`.
