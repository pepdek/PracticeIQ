-- PracticeIQ V2 — Practice Health Score tables
-- 2026-06-18
--
-- Adds three tables. Does not touch existing V1 tables.
--   score_config     — dimension weights (one row, never hardcode weights)
--   practice_scores  — one row per attorney per week, append-only
--   score_tokens     — ephemeral drill-down tokens, one per weekly email

-- ---------------------------------------------------------------------------
-- score_config
-- One row. All Edge Functions read weights from here.
-- Writable by service role only; readable by authenticated users.
-- ---------------------------------------------------------------------------

create table public.score_config (
  id                          uuid        primary key default gen_random_uuid(),
  revenue_capture_weight      numeric     not null default 20,
  practice_velocity_weight    numeric     not null default 20,
  risk_exposure_weight        numeric     not null default 20,
  financial_position_weight   numeric     not null default 20,
  reputation_velocity_weight  numeric     not null default 20,
  updated_at                  timestamptz not null default now()
);

-- Seed the single config row immediately
insert into public.score_config default values;

create trigger score_config_updated_at
  before update on public.score_config
  for each row execute function public.handle_updated_at();


-- ---------------------------------------------------------------------------
-- practice_scores
-- Append-only. unique(attorney_id, week_ending_date) enforces one row per week.
-- observation_text and one_action are populated by generate-email, not
-- calculate-score — so they start null and are written in a second pass.
-- ---------------------------------------------------------------------------

create table public.practice_scores (
  id                              uuid           primary key default gen_random_uuid(),
  attorney_id                     uuid           not null references public.attorneys(id) on delete cascade,
  week_ending_date                date           not null,

  -- Raw points earned per dimension (null = source not connected this week)
  revenue_capture_score           numeric(5, 2),
  practice_velocity_score         numeric(5, 2),
  risk_exposure_score             numeric(5, 2),
  financial_position_score        numeric(5, 2),
  reputation_velocity_score       numeric(5, 2),

  -- Which dimensions contributed to this week's composite
  revenue_capture_calculated      boolean        not null default false,
  practice_velocity_calculated    boolean        not null default false,
  risk_exposure_calculated        boolean        not null default false,
  financial_position_calculated   boolean        not null default false,
  reputation_velocity_calculated  boolean        not null default false,

  -- Composite score (0–100), normalized across connected dimensions only
  composite_score                 numeric(5, 2)  not null,

  -- Trend — populated from the prior week's practice_scores row
  prior_week_score                numeric(5, 2),
  score_delta                     numeric(5, 2),  -- composite_score - prior_week_score

  -- Intelligence layer — written by generate-email after Claude inference
  observation_text                text,
  one_action                      text,
  observation_generated_at        timestamptz,

  created_at                      timestamptz    not null default now(),

  unique (attorney_id, week_ending_date)
);

create index practice_scores_attorney_history
  on public.practice_scores (attorney_id, week_ending_date desc);


-- ---------------------------------------------------------------------------
-- score_tokens
-- One token per weekly email. Token-authenticated, no session required.
-- Validation happens in Edge Functions (service role) — RLS only covers
-- the attorney's own token list shown on /account.
-- ---------------------------------------------------------------------------

create table public.score_tokens (
  id           uuid        primary key default gen_random_uuid(),
  attorney_id  uuid        not null references public.attorneys(id) on delete cascade,
  score_id     uuid        not null references public.practice_scores(id) on delete cascade,
  token        text        unique not null default encode(gen_random_bytes(32), 'hex'),
  expires_at   timestamptz not null default now() + interval '7 days',
  accessed_at  timestamptz,
  created_at   timestamptz not null default now()
);

create index score_tokens_token on public.score_tokens (token);
create index score_tokens_attorney on public.score_tokens (attorney_id, created_at desc);


-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.score_config    enable row level security;
alter table public.practice_scores enable row level security;
alter table public.score_tokens    enable row level security;

-- score_config: any authenticated user can read; only service role writes
create policy "score_config_read_authenticated" on public.score_config
  for select using (auth.uid() is not null);

-- practice_scores: own rows only
create policy "practice_scores_select_own" on public.practice_scores
  for select using (auth.uid() = attorney_id);

-- score_tokens: own rows only (for /account "last score" link)
-- Token drill-down (/score/[token]) bypasses RLS via service role Edge Function
create policy "score_tokens_select_own" on public.score_tokens
  for select using (auth.uid() = attorney_id);
