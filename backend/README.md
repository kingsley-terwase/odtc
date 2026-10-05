# ODTC Logistics API

Node.js, Express and TypeScript backend with PostgreSQL connected through Prisma ORM 7. Guest booking, Mapbox driving quotes and Paystack payment are implemented. Existing authentication remains available; admin access requires login.

## Local development

Requires Node.js 22.12 or newer on the 22.x line, or Node.js 24.x, plus PostgreSQL.

1. Run `npm install`.
2. Copy `.env.example` to `.env` if it does not exist, then set `DATABASE_URL` to your local PostgreSQL connection string. Never commit `.env`.
3. Run `npm run db:generate`, then `npm run db:check` to verify the database connection.
4. Run `npm run dev`. The API verifies the database connection before it starts listening.

Health endpoint: `GET http://127.0.0.1:3000/api/v1/health`. This checks the API process only, not database or external provider readiness.

Run `npm run typecheck`, `npm test`, and `npm run build` for verification. Run `npm start` after building.

The server binds to localhost by default. Set `HOST=0.0.0.0` when the deployment environment requires it. Set `CORS_ORIGINS` to the allowed frontend origins when the frontend is defined.

## Agreed feature scope

- Guest bookings require no customer account. Email/password and Google authentication remain available for existing flows; admins log in.
- Client-provided pickup and delivery addresses.
- Mapbox selected, with live coverage validation pending; geocoding plus driving-route distance.
- Admin-managed parent service areas with explicitly approved subdivisions, kilometre rate and minimum fare.
- Fare: maximum of distance times rate and minimum fare. Preserve quoted distance, rate, minimum and final amount per booking.
- Paystack initially; extensible payment providers with an admin-managed default and client selection.
- Email confirmation initially; extensible notification channels.

Booking fields, delivery statuses, quote expiry, cancellations and refunds will be agreed as those features are developed. The initial authentication migration creates User and Session tables. See [Authentication API](docs/auth.md) for endpoints, Google configuration, testing and remaining authentication features. See [Guest booking and payment](docs/guest-booking.md) for the MVP API and provider configuration.

## Database commands

- `npm run db:generate`: generate the TypeScript Prisma client from the schema.
- `npm run db:validate`: validate the Prisma schema.
- `npm run db:check`: run a read-only `SELECT 1` through Prisma and close the connection.
- `npm run db:migrate -- --name descriptive_name`: create and apply a local development migration when models are added. Requires a shadow database or permission to create one.
- `npm run db:deploy`: apply committed migrations in deployment.

A migration is a versioned database structure change. The shared Prisma client uses the PostgreSQL driver adapter and one connection pool per process. Server shutdown closes the pool after HTTP requests finish.

Database passwords containing URL-reserved characters must be percent-encoded in `DATABASE_URL`. Prisma CLI config loads `.env` separately from runtime app config. Generation does not modify database tables.

## Dependency audit follow-up

At setup, npm reported four high-severity findings through Prisma 7.10 CLI dependencies (`deepmerge-ts` and `mysql2`, with findings propagated to their parents). `npm audit --omit=dev` also includes them because Prisma Client declares Prisma CLI as an optional peer. These findings remain unresolved; review patched compatible releases before deployment. Do not apply `npm audit fix --force` blindly: its proposed fix downgrades Prisma to version 6 and changes the integration.

To check the compiled client after a build, run `node scripts/check-compiled-database.mjs`.

## Email provider

Sendlib sends verification emails and paid-booking receipts. See [Email configuration](docs/email.md). Tests use mocked HTTP responses and send no real emails.

## Admin controls

Secure first-admin bootstrap, versioned NGN pricing and named city/LGA management are implemented. See [Admin setup and API](docs/admin.md) to register, verify and promote your first admin account. No default admin or pricing values are seeded.

## Postman

Import the collection and local environment from postman/. See [Postman testing guide](postman/README.md). Regenerate the templates with npm run postman:generate as endpoints grow.

Approved subdivisions are separate records with individual activation and optional Mapbox area IDs. See [Subdivision API](docs/subdivisions.md). Existing alias approvals have been migrated; parent names alone no longer grant coverage.
