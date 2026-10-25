# ODTC Logistics (frontend)

React + MUI (Vite). Talks to the ODTC API at `https://odtc-logistics-api.onrender.com/api/v1`
(change with `VITE_API_URL`, see `.env.example`).

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs dist/ (upload its contents to public_html; public/.htaccess is included)
```

- Booking: search addresses -> quote -> booking (X-Booking-Token) -> Paystack -> /confirmation verifies payment.
- Admin: /admin/login (ADMIN accounts only). Orders, customers, earnings, coverage (service areas) and pricing use the admin API.
- The old `server/` folder is no longer used by the site.

## Rate, VAT and service charge
- Rate per km: `GET /pricing` (public) feeds the home page, about page and footer (`useRate.jsx`).
- Service charge and VAT: `GET /admin/service-charge`, `GET /admin/vat` are shown at checkout (`/book`) and on the confirmation page.
  Admins change them in Dashboard > Pricing (`PATCH /admin/service-charge` `{amount}`, `PATCH /admin/vat` `{rate}`).
- Checkout total = delivery fare + service charge, then VAT on that subtotal (`priceBreakdown` in `src/config.js`).

## Google addresses (booking)
- `GET /guest/locations?q=` returns `{ placeId, address }`; picking one calls `GET /guest/locations/:placeId` (same `sessionToken`) to confirm state/city, then `POST /guest/quotes { pickupId, deliveryId }` (the place IDs).
- Booking now sends `sender` / `recipient` (`sameAsBooker` or name, phone, email) and `packageSize` (`SMALL` | `MEDIUM` | `LARGE`).
- Pickup and delivery one-time codes are emailed after payment; `/track` and the confirmation page can resend them.

## Accounts, couriers, tracking
- `/signin`, `/signup`, `/verify-email` (reads `#token=`), `/account` (customer session, separate from admin).
- Google sign-in: set `VITE_GOOGLE_CLIENT_ID` (and `GOOGLE_CLIENT_ID` on the backend). Button hidden when empty.
- `/courier` (apply), `/courier/desk` (approved couriers confirm pickup/delivery codes).
- `/track` and `/track/:reference` (works on the device that made the booking).
- Admin: Dashboard > Couriers (approve / reject), Coverage is now by state (`type: STATE`).

## One sign-in, three roles
- `/signin` is the only login. After signing in: ADMIN -> `/admin`, COURIER (or a pending courier applicant) -> `/courier/dashboard`, CLIENT -> `/account`.
- `/admin/login` redirects to `/signin`. One session token is used for every role.
- Forgot / reset password: `/forgot-password`, `/reset-password` (reads `#token=`).
- Couriers and admins cannot place bookings (the booking page shows a notice for them).

## Dispatch and courier flow
1. Admin > Dispatch lists paid bookings with no courier (`GET /admin/bookings/unassigned`) and assigns one (`POST /admin/bookings/:id/assignment`), or reassigns (`POST .../reassign`).
2. The courier sees the offer under Job offers (`GET /couriers/assignments`) and accepts (`POST /couriers/assignments/:id/accept`) or declines (`.../decline`).
3. Confirm pickup (`POST /couriers/bookings/:id/confirm-pickup`) ticks the pickup step; confirm delivery ticks the last step and the order shows as Completed.
- `POST .../accept` is not documented in the collection yet (the Accept entry has no URL); it is assumed to mirror `decline`.

## Pricing
- Admin > Pricing: rate per km and minimum fare (`POST /admin/pricing`, versioned history), VAT (`/admin/vat`) and **Base fare** by distance band (`GET/PATCH /admin/base-fares`). "Service charge" no longer exists.
- Quotes show: delivery fare, base fare, VAT, total (the server's `totalFare`).
