# Guest booking and payment MVP

Customer login and email verification are not required. Existing authentication endpoints remain available; admin controls require a verified ADMIN session.

## Configuration

Set MAPBOX_ACCESS_TOKEN and PAYSTACK_SECRET_KEY in your local .env. Use a sk_test_ key while testing. Live keys require PAYSTACK_ALLOW_LIVE=true explicitly. Never put provider secrets in frontend code or exported Postman files. PAYSTACK_CALLBACK_URL is optional until the frontend exists.

Configure pricing and active CITY/LGA service areas through admin endpoints first. Both selected locations must match an active approved subdivision under an active parent, with matching state and country. Parent names alone do not grant coverage. Missing or mismatched provider metadata is rejected. Confirm real addresses and Mapbox city/LGA coverage before release; there is no approximate name fallback.

Mapbox temporary autocomplete results are not stored. Selected locations are retrieved with permanent=true for quote storage; your Mapbox account must permit permanent geocoding. Geocoding resolves coordinates; Directions supplies driving distance.

## Request sequence

1. GET /api/v1/guest/locations?q=address (at least three characters). Select correct pickup and delivery mapboxId values, checking state and country.
2. POST /api/v1/guest/quotes with pickupId and deliveryId. Save quote.id and bookingToken privately. Fare is max(driving kilometres times rate, minimum fare), rounded to two naira decimals. Default quote lifetime is 15 minutes, configurable through QUOTE_TTL_MINUTES.
3. POST /api/v1/guest/bookings with quoteId, fullName, phone, email, packageDescription and optional packageSize. Include X-Booking-Token. Package size never affects fare. One quote creates one booking; repeats return the existing booking. Areas are checked again at creation. The stored fare remains unchanged when admin pricing changes.
4. POST /api/v1/guest/bookings/:id/payment with X-Booking-Token. Open the returned authorizationUrl. The server sends the stored amount to Paystack in kobo.
5. POST /api/v1/guest/bookings/:id/verify-payment with the token. Only authoritative Paystack success with matching reference, amount, NGN currency and customer email confirms the booking. GET /api/v1/guest/bookings/:id returns its private status.

Admin GET /api/v1/admin/bookings supports limit and offset. No customer token exposes other bookings. Losing the private token requires admin support for this MVP.

Paystack webhook: POST /api/v1/payments/paystack/webhook. Configure this URL in Paystack when a public HTTPS backend is available. Raw-body SHA512 signature verification precedes payment verification. A callback redirect alone never marks a booking paid.

## Receipts and retries

Confirmed bookings attempt an email receipt. Failed attempts remain in the database and a worker retries every 30 seconds; claims expire after five minutes. SENT means the email provider accepted the request, not confirmed inbox delivery. Receipts use at-least-once delivery: a process crash after provider acceptance can cause a duplicate retry. Payment confirmation is independent of receipt delivery.

Payment initialization uses a stable reference and a database lock to prevent concurrent checkout creation. If Paystack accepts initialization but the response is lost before saving, recovery may need provider/admin investigation; do not generate a second booking to bypass an uncertain charge. Failed-payment replacement, cancellations, refunds, delivery operations and additional payment providers remain follow-up work.

## Testing

Import the regenerated Postman collection and environment. Set booking contact fields locally; search and choose IDs manually. Automated tests mock provider calls and email, but integration tests use temporary records in the local database. They do not send real email or charge a card. Real Mapbox coverage, Paystack test checkout and public webhook delivery still require your provider credentials and live testing.

Provider references: https://docs.mapbox.com/api/search/geocoding/ and https://paystack.com/docs/api/transaction/.

## Approved subdivisions

Coverage now requires separate active approved subdivisions under active service areas. Parent names and legacy aliases are not used directly for matching. Existing aliases were migrated. See [Subdivision API and matching](../docs/subdivisions.md).
