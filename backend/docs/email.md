# Email delivery

ODTC uses Sendlib's HTTP API, following the working transport contract in hotel-ai. No SMTP credentials or additional npm package are needed.

Set these values in your local `.env`:

```env
SENDLIB_API_KEY=your-private-api-key
SENDLIB_FROM_EMAIL=your-approved-odtc-sender@example.com
EMAIL_TIMEOUT_MS=10000
```

Use a sender approved for your Sendlib account. Credentials are not copied from hotel-ai. Configuration may be omitted during unrelated local development; sending fails explicitly until both sender and key are set.

Backend services call `sendTransactionalEmail({ to, subject, html, text })` from `src/lib/email.ts`. Include HTML or plain text, or both. There is no public endpoint for arbitrary email sending.

The helper validates the message, attaches the API key, limits request time and handles failures without exposing provider details. A successful result means Sendlib accepted the request; it does not confirm arrival in the recipient's inbox.

Email tests use an injected mock HTTP transport and send no real email. Registration and resend use this helper for email verification. Booking confirmations will use it when bookings are built. Clients must verify their email before booking. See [Authentication API](auth.md) for verification behavior.

Automatic retries and a durable delivery queue are not implemented yet. Verification delivery failures are surfaced to the client, which can request a resend after the cooldown. We will address those when connecting emails to business workflows so delivery failures do not lose important notifications.
