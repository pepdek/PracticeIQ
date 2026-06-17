-- Adds provider_metadata jsonb to oauth_tokens for storing provider-specific
-- identifiers resolved at connect time.
--
-- For Google Business Profile this stores:
--   { "gbp_account_name": "accounts/123", "gbp_location_name": "accounts/123/locations/456" }
--
-- Populated by the Google OAuth callback in the frontend onboarding flow.
-- Read by sync-google at run time — avoids re-discovering account/location
-- on every weekly sync.

alter table public.oauth_tokens
  add column if not exists provider_metadata jsonb not null default '{}';
