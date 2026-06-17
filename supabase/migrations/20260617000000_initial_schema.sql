-- PracticeIQ Phase 0 — Initial Schema
-- 2026-06-17
--
-- Metric key reference by source:
--
--   clio:   matters_opened, matters_closed, hours_billed, hours_collected,
--           invoices_sent_count, invoices_sent_amount,
--           invoices_paid_count, invoices_paid_amount,
--           ar_0_30, ar_31_60, ar_61_90, ar_90_plus
--
--   plaid:  deposits_total, operating_balance, trust_balance
--
--   google: star_rating, total_review_count, new_reviews_count

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";


-- ---------------------------------------------------------------------------
-- attorneys
-- Mirrors auth.users 1:1. Created automatically on signup via trigger.
-- ---------------------------------------------------------------------------

create table public.attorneys (
  id                       uuid        primary key references auth.users(id) on delete cascade,
  email                    text        not null,
  subscription_status      text        not null default 'pending'
                             check (subscription_status in ('pending', 'active', 'cancelled')),
  stripe_customer_id       text        unique,
  stripe_subscription_id   text        unique,
  subscription_activated_at timestamptz,
  subscription_cancelled_at timestamptz,
  last_email_sent_at       timestamptz,
  last_email_subject       text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

comment on column public.attorneys.subscription_status is
  'pending = signed up, no active Stripe subscription yet; active = paying; cancelled = Stripe sub deleted, retain data 90 days';


-- ---------------------------------------------------------------------------
-- oauth_tokens
-- One row per (attorney, provider). Tokens encrypted at the application layer
-- (Edge Functions) before insert; never stored in plaintext.
-- ---------------------------------------------------------------------------

create table public.oauth_tokens (
  id               uuid        primary key default gen_random_uuid(),
  attorney_id      uuid        not null references public.attorneys(id) on delete cascade,
  provider         text        not null check (provider in ('clio', 'google')),
  access_token     text        not null,   -- encrypted
  refresh_token    text,                   -- encrypted
  token_expires_at timestamptz,
  scope            text,
  provider_user_id text,                   -- provider's account/user identifier
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (attorney_id, provider)
);


-- ---------------------------------------------------------------------------
-- plaid_items
-- One row per attorney. access_token encrypted before insert.
-- Never store transaction descriptions — only deposit totals and balances
-- go into weekly_snapshots.
-- ---------------------------------------------------------------------------

create table public.plaid_items (
  id                   uuid        primary key default gen_random_uuid(),
  attorney_id          uuid        not null references public.attorneys(id) on delete cascade,
  plaid_item_id        text        not null unique,
  access_token         text        not null,   -- encrypted
  institution_id       text,
  institution_name     text,
  operating_account_id text,
  trust_account_id     text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (attorney_id)
);


-- ---------------------------------------------------------------------------
-- weekly_snapshots
-- Append-only. One row per (attorney, week, source, metric).
-- The unique index enforces the no-overwrite constraint at the DB level.
-- Edge Functions insert; clients may only SELECT their own rows.
-- ---------------------------------------------------------------------------

create table public.weekly_snapshots (
  id               uuid           primary key default gen_random_uuid(),
  attorney_id      uuid           not null references public.attorneys(id) on delete cascade,
  week_ending_date date           not null,
  source           text           not null check (source in ('clio', 'plaid', 'google')),
  metric_key       text           not null,
  metric_value     numeric(15, 4) not null,
  created_at       timestamptz    not null default now()
);

-- Enforces append-only: a second write for the same week+metric fails with a
-- unique violation rather than silently overwriting.
create unique index weekly_snapshots_no_overwrite
  on public.weekly_snapshots (attorney_id, week_ending_date, source, metric_key);

create index weekly_snapshots_attorney_week
  on public.weekly_snapshots (attorney_id, week_ending_date desc);

create index weekly_snapshots_lookback
  on public.weekly_snapshots (attorney_id, source, week_ending_date desc);


-- ---------------------------------------------------------------------------
-- email_log
-- One row per email sent. Lets /account show "last sent" metadata without
-- exposing email body in the UI. Insert via service role only.
-- ---------------------------------------------------------------------------

create table public.email_log (
  id                uuid        primary key default gen_random_uuid(),
  attorney_id       uuid        not null references public.attorneys(id) on delete cascade,
  week_ending_date  date        not null,
  subject           text        not null,
  resend_message_id text,
  sent_at           timestamptz not null default now()
);

create index email_log_attorney_recent
  on public.email_log (attorney_id, sent_at desc);


-- ---------------------------------------------------------------------------
-- updated_at trigger (attorneys, oauth_tokens, plaid_items)
-- ---------------------------------------------------------------------------

create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger attorneys_updated_at
  before update on public.attorneys
  for each row execute function public.handle_updated_at();

create trigger oauth_tokens_updated_at
  before update on public.oauth_tokens
  for each row execute function public.handle_updated_at();

create trigger plaid_items_updated_at
  before update on public.plaid_items
  for each row execute function public.handle_updated_at();


-- ---------------------------------------------------------------------------
-- Auto-create attorney row on Supabase Auth signup
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.attorneys (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ---------------------------------------------------------------------------
-- Connection status view
-- Returns a boolean per provider — never exposes token values to the client.
-- ---------------------------------------------------------------------------

create or replace view public.connection_status as
select
  a.id                                              as attorney_id,
  exists (
    select 1 from public.oauth_tokens t
    where t.attorney_id = a.id and t.provider = 'clio'
  )                                                 as clio_connected,
  exists (
    select 1 from public.plaid_items p
    where p.attorney_id = a.id
  )                                                 as plaid_connected,
  exists (
    select 1 from public.oauth_tokens t
    where t.attorney_id = a.id and t.provider = 'google'
  )                                                 as google_connected
from public.attorneys a;


-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.attorneys        enable row level security;
alter table public.oauth_tokens     enable row level security;
alter table public.plaid_items      enable row level security;
alter table public.weekly_snapshots enable row level security;
alter table public.email_log        enable row level security;

-- attorneys: own row only
create policy "attorneys_select_own" on public.attorneys
  for select using (auth.uid() = id);

create policy "attorneys_update_own" on public.attorneys
  for update using (auth.uid() = id);

-- oauth_tokens: own rows, full CRUD from client (needed for reconnect flows)
create policy "oauth_tokens_select_own" on public.oauth_tokens
  for select using (auth.uid() = attorney_id);

create policy "oauth_tokens_insert_own" on public.oauth_tokens
  for insert with check (auth.uid() = attorney_id);

create policy "oauth_tokens_update_own" on public.oauth_tokens
  for update using (auth.uid() = attorney_id);

create policy "oauth_tokens_delete_own" on public.oauth_tokens
  for delete using (auth.uid() = attorney_id);

-- plaid_items: own row, full CRUD from client (needed for reconnect flows)
create policy "plaid_items_select_own" on public.plaid_items
  for select using (auth.uid() = attorney_id);

create policy "plaid_items_insert_own" on public.plaid_items
  for insert with check (auth.uid() = attorney_id);

create policy "plaid_items_update_own" on public.plaid_items
  for update using (auth.uid() = attorney_id);

create policy "plaid_items_delete_own" on public.plaid_items
  for delete using (auth.uid() = attorney_id);

-- weekly_snapshots: SELECT own only. INSERT/UPDATE via service role (Edge Functions).
create policy "weekly_snapshots_select_own" on public.weekly_snapshots
  for select using (auth.uid() = attorney_id);

-- email_log: SELECT own only. INSERT via service role (Edge Functions).
create policy "email_log_select_own" on public.email_log
  for select using (auth.uid() = attorney_id);
