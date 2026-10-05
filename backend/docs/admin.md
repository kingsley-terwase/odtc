# Admin setup and controls

## First admin account

There are no default admin credentials and no public role-promotion API. The first admin must already have a registered, email-verified account.

1. Configure Sendlib in `.env` and start the backend with `npm run dev`.
2. In Postman or another API client, POST `http://127.0.0.1:3000/api/v1/auth/register` with your own email, name and private password (12 to 128 characters). Keep the returned session token private.
3. Find the verification link in your email. Without a frontend, copy its value after `#token=` and POST `{ "token": "COPIED_TOKEN" }` to `/api/v1/auth/verify-email`.
4. From the project terminal run:

```powershell
npm run admin:bootstrap -- your-account@example.com
```

The script promotes only an existing verified account. It refuses to add another administrator once one exists; rerunning for the same first admin is harmless. A transaction-scoped PostgreSQL advisory lock prevents two bootstrap processes from promoting different first admins concurrently. Do not expose this local command as a public HTTP endpoint.

Existing session tokens see updated roles on the next request because authorization reads the current user from the database. Check `GET /api/v1/auth/me` with `Authorization: Bearer YOUR_SESSION_TOKEN`; the role should be `ADMIN`.

Your real admin account has not been created or promoted automatically. Additional admin management is not implemented.

## Pricing

All endpoints below require an authenticated, verified ADMIN account.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/v1/admin/pricing` | Current pricing; 404 until configured |
| POST | `/api/v1/admin/pricing` | Set a new rate and minimum fare |
| GET | `/api/v1/admin/pricing/history` | Most recent 50 pricing versions |

POST example, using illustrative amounts only:

```json
{ "ratePerKm": "50.00", "minimumFare": "500.00" }
```

Amounts are decimal strings in naira, with up to two decimal places. The database stores exact decimals, avoiding binary floating-point money errors. Rate must be greater than zero; minimum fare must be nonnegative. Currency is NGN. No business pricing was seeded automatically.

Each change creates a new PricingPolicy record with a version ID, author and creation time. Previous versions remain unchanged. Guest quotes use the current version and preserve rate, driving distance, minimum and total. Later pricing changes do not alter existing quoted fares.

## Named cities and LGAs

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/v1/admin/service-areas` | Paginated listing |
| POST | `/api/v1/admin/service-areas` | Create a named city or LGA |
| PATCH | `/api/v1/admin/service-areas/:id` | Edit or activate/deactivate an entry |

Example:

```json
{
  "name": "Ikeja",
  "state": "Lagos",
  "countryCode": "NG",
  "type": "LGA"
}
```

The example is not seeded; admins choose actual service areas. Supported types are CITY and LGA. Country codes are uppercase two-letter values. Names and states are trimmed, and repeated spaces are collapsed. Case/spacing-equivalent entries of the same type in the same state/country are rejected with 409 `SERVICE_AREA_EXISTS`.

Listing supports `limit` (1 to 100, default 25), `offset` (default 0) and `active=true|false`. It returns `areas`, `total`, `limit` and `offset`.

Use `{ "active": false }` to deactivate an entry, and `{ "active": true }` to reactivate it. Deactivation preserves the record for future booking references. No public delete endpoint is provided.

These are named administrative areas, not map polygons. Guest quotes match Mapbox pickup and delivery metadata to active areas by name, state and country. Missing metadata is rejected; validate actual city/LGA coverage with real addresses.

## Validation

Type checks, compilation and integration tests cover unauthorized clients, unverified admins, role changes on existing sessions, bootstrap races, decimal pricing versions and service-area validation. Tests use uniquely named temporary accounts and remove only their own records. Bootstrap creation checks are skipped if an existing real admin is present, without changing that account.

## Guest bookings

GET /api/v1/admin/bookings lists bookings for verified administrators, with limit and offset. Guest customers do not need authentication. See [Guest MVP](guest-booking.md).


## Approved subdivisions

Coverage now requires separate active approved subdivisions under active service areas. Parent names and legacy aliases are not used directly for matching. Existing aliases were migrated. See [Subdivision API and matching](../docs/subdivisions.md).
