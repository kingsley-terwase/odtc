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
