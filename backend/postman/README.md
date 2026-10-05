# ODTC Postman testing

Import both files into Postman:

- `ODTC_Logistics.postman_collection.json`
- `ODTC_Local.postman_environment.json`

Select **ODTC Local** as the active environment. Start the API from the project terminal with `npm run dev`. The default `baseUrl` is `http://127.0.0.1:3000`; change it if your server uses another port.

## First run

1. Set `clientName`, `clientEmail` and `clientPassword` locally in the selected environment. Use an email you control and a private password of 12 to 128 characters. The import contains no credentials.
2. Send **Health check**, then **Register client**. Registration creates a real account and may send an email through Sendlib. For an existing account, use **Login client** instead.
3. A successful registration/login saves `accessToken`, `userId` and `sessionExpiresAt`. Authenticated client requests use that token automatically.
4. Copy the full emailed verification link into `verificationLink`, or copy the value after `#token=` into `verificationToken`. Send **Verify email**. You do not need a working frontend. Successful verification clears the saved link/token.
5. If the email is missing, check `verification.status` from registration. `unavailable` means the account exists but sending failed; check the backend Sendlib configuration. Use **Resend verification email** after the 60-second cooldown. The previous link becomes invalid; use the latest email.
6. Send **Current client profile** to confirm `emailVerifiedAt` is populated.

## First admin

For the verified account you want to promote, run in the project terminal:

```powershell
npm run admin:bootstrap -- your-account@example.com
```

Then set `adminEmail` and `adminPassword` locally and send **Login admin**. This stores `adminAccessToken` separately from the client token. **Current admin profile** checks the ADMIN role and verified email.

If testing permissions after promoting the same account, register a separate CLIENT account and save its token with **Login client**. A promoted account's old client session now has ADMIN privileges too; it cannot serve as the denied-client example.

## Pricing and service areas

- Edit `ratePerKm` and `minimumFare` to your intended naira amounts before **Set pricing - new version**. Values are decimal strings. The imported 50/500 values are illustrative, not an agreed minimum fare. Successful requests save `pricingVersionId`.
- **Current pricing** accepts 404 `PRICING_NOT_CONFIGURED` before the first pricing write. Each write creates a real, retained version.
- Edit `serviceAreaName`, `serviceAreaState`, `serviceAreaCountryCode` and `serviceAreaType` (CITY or LGA) before **Create city or LGA**. Defaults are an editable example.
- Create saves `serviceAreaId`; rename, deactivate and reactivate use it automatically. Set `serviceAreaNewName` before renaming. Recreating an equivalent area returns 409; it is not an upsert.
- `limit` and `offset` control area listing. Default limit is 25; maximum is 100.

## Google and logout

**Google sign-in** needs a real Google Identity Services ID token in `googleIdToken` and a matching backend `GOOGLE_CLIENT_ID`. The request is skipped if the token is blank. A successful request replaces the saved client session; it does not alter the admin token.

Use the **Session cleanup** requests last. They revoke the current session and clear the corresponding saved token. They do not remove accounts, pricing versions or service areas.

## Sending and checks

Send requests individually in the workflow you are testing. This collection is not an unattended full run: email verification and admin promotion require manual steps, registration is not repeatable for the same email, and resend has a cooldown. Requests with missing required variables are skipped and name the missing variables in the Postman console.

Post-response scripts check expected status codes, save tokens/IDs only after success and check selected response fields. Request scripts construct JSON from environment values in the local odtcRequestBody variable, so quotes or backslashes in passwords do not break the body. The Body tab references that variable; edit inputs in the environment.

The permission/validation folder contains deliberate failures with expected 400/401/403 responses. Its client permission request requires a separate CLIENT session. Unverified clients are also rejected by admin controls.

Registration and resend can send real emails; pricing and area writes persist real records. Exported templates have blank credentials. Keep populated credentials and tokens local; do not commit an environment exported after testing.

## Updating as the API grows

Update `scripts/generate-postman.mjs`, then run:

```powershell
npm run postman:generate
```

The generator validates script syntax, variable references and coverage of current auth/admin/service-area route definitions. It does not load `.env` or make HTTP calls. It regenerates blank environment credentials and uses stable collection/environment IDs. When updating your existing Postman workspace, update the collection; preserve your populated local environment rather than replacing it with the blank template.

Mapbox, delivery quotes, bookings, payments and password reset are not implemented and have no requests yet.

## Guest MVP

Use the Guest booking and payment folder without a client session. Configure admin pricing/areas first. Set locationQuery, search each address, and copy the correct mapboxId values into pickupId/deliveryId manually. Then quote, create booking, initialize checkout, pay using the browser authorizationUrl and verify payment. Keep bookingToken private. See ../docs/guest-booking.md for configuration and limits.

## Approved subdivisions

Coverage now requires separate active approved subdivisions under active service areas. Parent names and legacy aliases are not used directly for matching. Existing aliases were migrated. See [Subdivision API and matching](../docs/subdivisions.md).
