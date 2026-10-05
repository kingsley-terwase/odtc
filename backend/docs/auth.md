# Authentication API

Base path: `/api/v1/auth`. All authentication responses use `Cache-Control: no-store`.

| Method | Path | Body | Result |
| --- | --- | --- | --- |
| POST | `/register` | `email`, `name`, `password` | 201, public user plus session token and expiry |
| POST | `/login` | `email`, `password` | 200, public user plus a new session token and expiry |
| POST | `/google` | `idToken` | 200, public user plus session token and expiry |
| GET | `/me` | None | 200, current public user; requires Bearer token |
| POST | `/logout` | None | 204, deletes current session; requires Bearer token |

Registration example:

```json
{
  "email": "client@example.com",
  "name": "Example Client",
  "password": "A long private passphrase"
}
```

Use the returned `token` in `Authorization: Bearer TOKEN` on authenticated requests. Treat it as a secret. Tokens expire after 24 hours by default; configure `SESSION_TTL_HOURS` between 1 and 720. Logout invalidates the current token, leaving other devices signed in. No refresh token is implemented; sign in again after expiry.

Registration accepts only the documented fields; sending a role is rejected. All new users are CLIENTs. Passwords require 12 to 128 characters and are stored using salted scrypt hashes. Email addresses are trimmed and normalized to lowercase. Passwords are never trimmed. Profiles do not return password hashes or Google identifiers.

The register/login/google endpoints share a limit of 30 requests per IP per 15 minutes. The limiter is in memory for the current single-server setup; a multi-instance deployment will require a shared store. Reverse-proxy trust must be configured for the actual hosting setup before deployment.

## Google sign-in

Set `GOOGLE_CLIENT_ID` in `.env` to your Google OAuth web client ID. The frontend obtains an ID token through Google Identity Services and sends it as `idToken`; this API does not redirect browsers through OAuth. Without that setting, the endpoint returns 503 `GOOGLE_NOT_CONFIGURED`.

Google's official library validates the token's signature, audience, issuer and expiry. The Google subject identifies the account. A Google token with an unverified email is rejected. Gmail and verified Google Workspace emails can have `emailVerifiedAt` set; third-party email addresses remain unverified locally.

Matching an existing password account's email does not automatically link accounts: the endpoint returns 409 `ACCOUNT_EXISTS`. An authenticated account-linking flow is a future feature. Existing Google accounts are found by subject rather than mutable email address.

## Status and tests

The initial migration creates User and Session tables. User and its initial session are written atomically. Raw session tokens are never stored, only SHA-256 hashes. Expired sessions are rejected; periodic removal of expired database rows is deferred.

Email verification and resend are implemented. Password reset, account linking and admin provisioning are not implemented yet. Verified email is required for future booking endpoints; no booking endpoint exists yet.

`npm test` runs checks without making database queries. `npm run test:integration` uses the database in `DATABASE_URL`, creates uniquely named test accounts and removes only those accounts afterward. Google account creation and conflict handling are tested with an injected verified identity; an actual Google-issued token still needs a configured client ID and manual end-to-end verification.

## Email verification

- `POST /api/v1/auth/verify-email`: body `{ "token": "TOKEN_FROM_EMAIL_LINK" }`. No session is required. Returns 200 on success, or 400 `INVALID_VERIFICATION_TOKEN` for expired, replaced or used tokens. It does not sign the user in.
- `POST /api/v1/auth/resend-verification`: requires `Authorization: Bearer SESSION_TOKEN`. No body is required. Sends to the current account's stored email; clients cannot select another recipient.

Registration automatically attempts a verification email. Its 201 response includes `verification.status`: `sent` (provider accepted the email) or `unavailable` (delivery failed; account and session still exist). Google registration attempts email verification only for addresses Google is not authoritative for. Existing Google login does not automatically resend email.

Resend returns `verification.status` of `sent` or `already_verified`. Delivery failure returns 503 `EMAIL_UNAVAILABLE`. A 60-second per-account cooldown is persisted in PostgreSQL, including failed delivery attempts. Resend also has an in-memory IP limit of five requests per hour. Concurrent resends cannot bypass the database cooldown. A resend replaces the old token before attempting delivery; if delivery fails, the old link remains invalid and the user can retry after the cooldown.

Tokens expire in 30 minutes by default, are stored only as hashes and are consumed atomically. Verification clears the hash and expiry, so replay and simultaneous use cannot both succeed. Neither logs nor API responses contain the verification token.

Configure `EMAIL_VERIFICATION_URL`, `VERIFICATION_TTL_MINUTES` and `VERIFICATION_COOLDOWN_SECONDS` in `.env` as needed. The development URL defaults to `http://localhost:5173/verify-email`. Production requires a non-local HTTPS URL. Links carry the token in a fragment: `.../verify-email#token=TOKEN`. The future frontend reads that fragment and POSTs the token to the verification endpoint. Until then, copy the token from the email into your API client; there is no frontend page to open.

Use `requireAuth` followed by `requireVerifiedEmail` on future booking routes. The latter rejects an authenticated unverified account with 403 `EMAIL_NOT_VERIFIED`. Verification updates the existing account; current sessions see the updated status on their next request.

Integration tests mock all email delivery and cover successful verification, expiry, old-link invalidation, cooldown, concurrent resend/verification, replay, already-verified accounts and provider failures.
