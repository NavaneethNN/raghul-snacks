# Raghul Snacks

A mobile-first storefront for traditional millet snacks, built with Next.js App Router, Drizzle ORM, Neon PostgreSQL, and Razorpay.

## Start locally

1. Copy `.env.example` to `.env.local` and provide Neon and Razorpay credentials.
2. Install packages with `npm install`.
3. Generate database migrations with `npm run db:generate`.
4. Apply migrations with `npm run db:migrate`.
5. Start the app with `npm run dev`.

The storefront works with local catalog data before the database is connected. Razorpay checkout requires `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `NEXT_PUBLIC_RAZORPAY_KEY_ID`.
