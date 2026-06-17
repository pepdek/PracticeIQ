# PracticeIQ — Phase 0

Weekly practice intelligence for solo attorneys. One plain-text email every Sunday.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React + Vite + Tailwind, hosted on Netlify |
| Backend / DB | Supabase (Postgres + Edge Functions) |
| Auth | Supabase Auth (email/password) |
| Integrations | Clio OAuth 2.0, Plaid Link, Google Business Profile |
| Email | Resend |
| AI | Anthropic Claude claude-sonnet-4-6 |
| Payments | Stripe Checkout ($99/mo) |

---

## Project layout

```
practiceiq/
├── src/                          React frontend
│   ├── components/steps/         Onboarding step components (1–4)
│   ├── hooks/useSession.ts       Supabase auth state
│   ├── lib/supabase.ts           Supabase client + callFunction helper
│   └── pages/                   Onboarding, Account, callbacks, StripeSuccess
├── supabase/
│   ├── migrations/               Postgres schema (apply in order)
│   └── functions/                Edge Functions (Deno)
│       ├── _shared/week.ts       Date utilities shared across sync functions
│       ├── sync-clio/            Pull Clio data → weekly_snapshots
│       ├── sync-plaid/           Pull Plaid data → weekly_snapshots
│       ├── sync-google/          Pull GBP data → weekly_snapshots
│       ├── generate-email/       Claude → Resend (Sunday 6pm Pacific)
│       ├── exchange-oauth-token/ Clio + Google code exchange
│       ├── plaid-create-link-token/
│       ├── plaid-exchange-token/
│       ├── create-checkout-session/
│       ├── stripe-webhook/
│       └── cancel-subscription/
├── netlify.toml
└── .env.example
```

---

## Setup checklist

### 1. Supabase

1. Create a new Supabase project.
2. Run migrations in order:
   ```
   supabase/migrations/20260617000000_initial_schema.sql
   supabase/migrations/20260617000001_add_provider_metadata.sql
   ```
3. Enable the `pg_net` extension (required for cron → Edge Function HTTP calls):
   **Dashboard → Database → Extensions → pg_net → Enable**
4. Enable `pg_cron`:
   **Dashboard → Database → Extensions → pg_cron → Enable**
5. Set all Edge Function secrets in **Dashboard → Edge Functions → Manage secrets**.
   See `.env.example` for the full list.
6. Deploy Edge Functions:
   ```bash
   supabase functions deploy sync-clio
   supabase functions deploy sync-plaid
   supabase functions deploy sync-google
   supabase functions deploy generate-email
   supabase functions deploy exchange-oauth-token
   supabase functions deploy plaid-create-link-token
   supabase functions deploy plaid-exchange-token
   supabase functions deploy create-checkout-session
   supabase functions deploy stripe-webhook
   supabase functions deploy cancel-subscription
   ```

### 2. Cron schedule

Run the following SQL in **Dashboard → SQL Editor** after deploying functions.
Replace `<ref>` with your Supabase project ref and `<CRON_SECRET>` with your chosen secret.

```sql
-- Syncs fire at 5pm Pacific Sunday (01:00 UTC Monday during PDT)
select cron.schedule('sync-clio',   '0 1 * * 1', $$select net.http_post(url:='https://<ref>.supabase.co/functions/v1/sync-clio',   headers:='{"Authorization":"Bearer <CRON_SECRET>","Content-Type":"application/json"}'::jsonb,body:='{}'::jsonb)$$);
select cron.schedule('sync-plaid',  '0 1 * * 1', $$select net.http_post(url:='https://<ref>.supabase.co/functions/v1/sync-plaid',  headers:='{"Authorization":"Bearer <CRON_SECRET>","Content-Type":"application/json"}'::jsonb,body:='{}'::jsonb)$$);
select cron.schedule('sync-google', '0 1 * * 1', $$select net.http_post(url:='https://<ref>.supabase.co/functions/v1/sync-google', headers:='{"Authorization":"Bearer <CRON_SECRET>","Content-Type":"application/json"}'::jsonb,body:='{}'::jsonb)$$);

-- Email generation fires at 6pm Pacific Sunday (02:00 UTC Monday during PDT)
select cron.schedule('generate-email','0 2 * * 1',$$select net.http_post(url:='https://<ref>.supabase.co/functions/v1/generate-email',headers:='{"Authorization":"Bearer <CRON_SECRET>","Content-Type":"application/json"}'::jsonb,body:='{}'::jsonb)$$);
```

> **DST note:** The cron times above are for Pacific Daylight Time (UTC−7).
> During Pacific Standard Time (UTC−8, Nov–Mar), shift by one hour:
> syncs → `0 2 * * 1`, email → `0 3 * * 1`.

### 3. Stripe

1. Create a recurring price at $99/month in the Stripe Dashboard.
2. Copy the `price_id` → set as `STRIPE_PRICE_ID` in Edge Function secrets.
3. Create a webhook in **Dashboard → Developers → Webhooks**:
   - URL: `https://<ref>.supabase.co/functions/v1/stripe-webhook`
   - Events: `checkout.session.completed`, `customer.subscription.deleted`
4. Copy the signing secret → set as `STRIPE_WEBHOOK_SECRET`.

### 4. Resend

1. Add and verify the domain `practiceiq.co` in Resend.
2. Create an API key → set as `RESEND_API_KEY`.
3. The sender address `hello@practiceiq.co` is hardcoded in `generate-email`.

### 5. Google Cloud Console

1. Create an OAuth 2.0 Client ID (type: Web application).
2. Add to **Authorized redirect URIs**: `https://practiceiq.netlify.app/auth/google`
3. Enable the **My Business Business Information API** and **My Business Account Management API**.

### 6. Clio

Use the existing LawStack OAuth app credentials (`CLIO_CLIENT_ID`, `CLIO_CLIENT_SECRET`).
Ensure `https://practiceiq.netlify.app/auth/clio` is registered as an allowed redirect URI.

### 7. Netlify

1. Connect the repo to Netlify. Build command and publish directory are in `netlify.toml`.
2. Set all `VITE_*` environment variables in **Site settings → Environment variables**.
   See `.env.example` for the frontend-specific vars.

---

## Local development

```bash
npm install
cp .env.example .env.local   # fill in VITE_* values
npm run dev
```

Edge Functions run locally via the Supabase CLI:
```bash
supabase start
supabase functions serve --env-file .env.local
```

---

## Environment variable checklist

### Frontend (Netlify / `.env.local`)
- [ ] `VITE_SUPABASE_URL`
- [ ] `VITE_SUPABASE_ANON_KEY`
- [ ] `VITE_CLIO_CLIENT_ID`
- [ ] `VITE_CLIO_REDIRECT_URI`
- [ ] `VITE_GOOGLE_CLIENT_ID`
- [ ] `VITE_GOOGLE_REDIRECT_URI`

### Edge Functions (Supabase secrets)
- [ ] `CLIO_CLIENT_ID`
- [ ] `CLIO_CLIENT_SECRET`
- [ ] `CLIO_REDIRECT_URI`
- [ ] `PLAID_CLIENT_ID`
- [ ] `PLAID_SECRET`
- [ ] `PLAID_ENV`
- [ ] `GOOGLE_CLIENT_ID`
- [ ] `GOOGLE_CLIENT_SECRET`
- [ ] `GOOGLE_REDIRECT_URI`
- [ ] `ANTHROPIC_API_KEY`
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_PRICE_ID`
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `RESEND_API_KEY`
- [ ] `CRON_SECRET`
