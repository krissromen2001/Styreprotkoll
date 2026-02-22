# Styreprotokoll

Next.js app for innkalling, protokoll, signering and board meeting administration.

## Local Development (Hosted Supabase)

This project can be developed locally (`http://localhost:3000`) while using the same hosted Supabase project as production.

### 1. Install dependencies
```bash
npm install
```

### 2. Create local env file
Create `.env.local` based on `.env.example`.

Important local values:
```env
NEXTAUTH_URL=http://localhost:3000

NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
```

If you use Stripe locally:
```env
STRIPE_BILLING_MODE=payment
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
```

### 3. Start the app
```bash
npm run dev
```

### 4. Supabase Auth redirect settings (critical)
To avoid being redirected to your Vercel URL when logging in with Google from localhost:

Supabase Dashboard -> `Authentication` -> `URL Configuration`

- `Site URL`:
  - production URL (for example `https://styreprotokoll.vercel.app`)
- `Redirect URLs` must include **both**:
  - `http://localhost:3000/auth/callback`
  - `https://styreprotokoll.vercel.app/auth/callback`
  - (and custom domain callback if used)

Google Cloud Console (for Supabase Google provider) should continue using the **Supabase callback**, not your app callback:
- `https://<your-project>.supabase.co/auth/v1/callback`

## Build Checks
Run before pushing:

```bash
npm run lint
npm run build
```

## Database (Drizzle + Supabase Postgres)

Schema lives in:
- `src/lib/db/schema.ts`

Migrations live in:
- `drizzle/`

Useful commands:
```bash
npm run db:generate
npm run db:migrate
npm run db:push
npm run db:studio
```

Note: If `drizzle-kit push` crashes in your environment, apply the SQL manually in Supabase SQL Editor using the migration files in `drizzle/`.

## Deploy to Vercel

### 1. Push code
```bash
git add .
git commit -m "Your message"
git push
```

### 2. Deploy
If your Vercel project is linked:
```bash
vercel deploy --prod
```

### 3. Set Vercel environment variables
At minimum:
- `NEXTAUTH_URL=https://your-domain.vercel.app`
- `NEXTAUTH_SECRET`
- `DATABASE_URL` or `POSTGRES_URL`
- `RESEND_API_KEY`
- Supabase vars:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

If using Stripe:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID`
- `STRIPE_BILLING_MODE`

If using Signicat:
- `SIGNING_PROVIDER`
- `SIGNICAT_*`

### 4. Apply DB schema changes to hosted Supabase
Deploying Vercel does **not** migrate your Supabase database automatically.

For each release with schema changes:
1. Open Supabase SQL Editor
2. Run the SQL from the new file(s) in `drizzle/`
3. Verify tables/columns exist

## Release Checklist

- `npm run lint` passes
- `npm run build` passes
- Vercel env vars are correct (`NEXTAUTH_URL` is not localhost)
- Supabase `Redirect URLs` include both localhost and production callback
- New SQL migrations from `drizzle/` applied to hosted Supabase
- Webhooks updated (Stripe / Signicat) if URLs changed
- Smoke test in production:
  - Google login
  - create meeting
  - send innkalling
  - attachments
  - payment/signing flow (if enabled)

