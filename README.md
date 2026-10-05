# ODTC Logistics

React + MUI (Vite) frontend with a small Express API.

```bash
npm install
cp .env.example .env     # add PAYSTACK_SECRET_KEY, or leave DEMO_PAYMENTS=true to test
npm run dev              # site on :5173, API on :4000
```

- Fill in phone/WhatsApp/email/address in `src/config.js` (empty items are hidden).
- Fare is calculated on the server (`server/index.js`, `RATE = 50`). The browser only displays it.
- A booking becomes PAID only after the server verifies with Paystack and the amount matches.
- Production: `npm run build && NODE_ENV=production npm start` (Express serves `dist/`). Set `CLIENT_URL` to your live domain.
