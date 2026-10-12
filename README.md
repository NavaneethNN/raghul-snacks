# Raghul Delights

A mobile-first storefront for traditional millet snacks, built with Next.js App Router, Drizzle ORM, Neon PostgreSQL, and Cashfree Payments.

## Start locally

1. Copy `.env.example` to `.env` and fill in the required credentials (Neon, Cashfree, Brevo SMTP).
2. Install packages with `npm install`.
3. Generate database migrations with `npm run db:generate`.
4. Apply migrations with `npm run db:migrate`.
5. Start the app with `npm run dev`.

## Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `CASHFREE_CLIENT_ID` | Cashfree App ID |
| `CASHFREE_CLIENT_SECRET` | Cashfree Secret Key |
| `CASHFREE_ENVIRONMENT` | `sandbox` or `production` |
| `ADMIN_PASSWORD` | Admin panel login password |
| `ADMIN_SESSION_SECRET` | Secret for signing admin session cookie |
| `CUSTOMER_SESSION_SECRET` | Secret for signing customer session cookie |
| `BREVO_SMTP_KEY` | Brevo SMTP key for transactional emails |
| `BREVO_LOGIN_EMAIL` | Brevo account login email |
| `BREVO_SENDER_EMAIL` | Verified sender email (e.g. orders@yourdomain.com) |
| `BREVO_ADMIN_EMAIL` | Admin email to BCC on every order confirmation |
| `DELIVERY_MODE` | `manual` (default) or `shiprocket` |
