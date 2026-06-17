import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { addDays, getWeekEnding, round2, toISODate } from "../_shared/week.ts"

// Google My Business API v4. Google is migrating some endpoints to newer APIs;
// reviews remain on v4 as of this writing.
const GBP_API = "https://mybusiness.googleapis.com/v4"
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TokenRecord {
  attorney_id: string
  access_token: string
  refresh_token: string | null
  token_expires_at: string | null
  provider_metadata: {
    gbp_account_name?: string   // e.g. "accounts/123456789"
    gbp_location_name?: string  // e.g. "accounts/123456789/locations/987654321"
  }
}

// GBP star ratings are returned as strings, not numbers
const STAR_MAP: Record<string, number> = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
}

// ---------------------------------------------------------------------------
// Token management
// ---------------------------------------------------------------------------

async function refreshGoogleToken(
  supabase: SupabaseClient,
  rec: TokenRecord
): Promise<string> {
  if (!rec.refresh_token) throw new Error("No Google refresh token stored")

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: rec.refresh_token,
      client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Google token refresh failed (${res.status}): ${body}`)
  }

  const data = await res.json()
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()

  // Google doesn't always return a new refresh_token — only store if present
  const update: Record<string, string> = {
    access_token: data.access_token,
    token_expires_at: expiresAt,
  }
  if (data.refresh_token) update.refresh_token = data.refresh_token

  await supabase
    .from("oauth_tokens")
    .update(update)
    .eq("attorney_id", rec.attorney_id)
    .eq("provider", "google")

  return data.access_token
}

async function getValidToken(
  supabase: SupabaseClient,
  rec: TokenRecord
): Promise<string> {
  if (rec.token_expires_at) {
    const fiveMinMs = 5 * 60 * 1000
    if (Date.now() > new Date(rec.token_expires_at).getTime() - fiveMinMs) {
      return refreshGoogleToken(supabase, rec)
    }
  }
  return rec.access_token
}

// ---------------------------------------------------------------------------
// GBP API helpers
// ---------------------------------------------------------------------------

// Resolves the GBP location name by discovering the first account and first
// location. Only called when provider_metadata is missing — e.g. legacy rows
// or first sync after a reconnect that didn't store metadata.
async function discoverLocationName(accessToken: string): Promise<string> {
  const accountsRes = await fetch(`${GBP_API}/accounts`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!accountsRes.ok) {
    throw new Error(`GBP accounts list failed: ${accountsRes.status}`)
  }
  const accountsData = await accountsRes.json()
  const accountName: string = accountsData.accounts?.[0]?.name
  if (!accountName) throw new Error("No Google Business Profile account found")

  const locRes = await fetch(`${GBP_API}/${accountName}/locations?pageSize=1`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!locRes.ok) {
    throw new Error(`GBP locations list failed: ${locRes.status}`)
  }
  const locData = await locRes.json()
  const locationName: string = locData.locations?.[0]?.name
  if (!locationName) throw new Error("No Google Business Profile location found")

  return locationName
}

interface ReviewsPage {
  reviews?: Array<{ starRating: string; createTime: string }>
  averageRating?: number
  totalReviewCount?: number
  nextPageToken?: string
}

// Fetches reviews newest-first, stopping once reviews are older than weekStart.
// Returns aggregate stats + new-review count for the week.
// NEVER reads or stores review comment text.
async function fetchReviewMetrics(
  accessToken: string,
  locationName: string,
  weekStart: Date,
  weekEnding: Date
): Promise<{ starRating: number; totalReviewCount: number; newReviewsCount: number }> {
  let pageToken: string | undefined
  let starRating = 0
  let totalReviewCount = 0
  let newReviewsCount = 0
  let firstPage = true
  let done = false

  while (!done) {
    const url = new URL(`${GBP_API}/${locationName}/reviews`)
    url.searchParams.set("pageSize", "50")
    url.searchParams.set("orderBy", "createTime desc")
    if (pageToken) url.searchParams.set("pageToken", pageToken)

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`GBP reviews fetch failed (${res.status}): ${body}`)
    }

    const page: ReviewsPage = await res.json()

    // averageRating and totalReviewCount are only present on the first page
    if (firstPage) {
      starRating = round2(page.averageRating ?? 0)
      totalReviewCount = page.totalReviewCount ?? 0
      firstPage = false
    }

    for (const review of page.reviews ?? []) {
      const createdAt = new Date(review.createTime)

      // Reviews are newest-first; once we see one before weekStart, we're done
      if (createdAt < weekStart) {
        done = true
        break
      }

      if (createdAt <= weekEnding) {
        newReviewsCount++
      }
    }

    pageToken = page.nextPageToken
    if (!pageToken) done = true
  }

  return { starRating, totalReviewCount, newReviewsCount }
}

// ---------------------------------------------------------------------------
// Per-attorney sync
// ---------------------------------------------------------------------------

async function syncAttorney(
  supabase: SupabaseClient,
  rec: TokenRecord,
  weekStart: Date,
  weekEnding: Date
): Promise<void> {
  const tok = await getValidToken(supabase, rec)

  // Resolve location name from stored metadata, falling back to discovery.
  // If discovered here, write it back so subsequent syncs don't need the roundtrip.
  let locationName = rec.provider_metadata?.gbp_location_name
  if (!locationName) {
    locationName = await discoverLocationName(tok)
    await supabase
      .from("oauth_tokens")
      .update({
        provider_metadata: {
          ...rec.provider_metadata,
          gbp_location_name: locationName,
        },
      })
      .eq("attorney_id", rec.attorney_id)
      .eq("provider", "google")
  }

  const { starRating, totalReviewCount, newReviewsCount } =
    await fetchReviewMetrics(tok, locationName, weekStart, weekEnding)

  const metrics: Record<string, number> = {
    star_rating: starRating,
    total_review_count: totalReviewCount,
    new_reviews_count: newReviewsCount,
  }

  const rows = Object.entries(metrics).map(([metric_key, metric_value]) => ({
    attorney_id: rec.attorney_id,
    week_ending_date: toISODate(weekEnding),
    source: "google",
    metric_key,
    metric_value,
  }))

  const { error } = await supabase
    .from("weekly_snapshots")
    .upsert(rows, {
      onConflict: "attorney_id,week_ending_date,source,metric_key",
      ignoreDuplicates: true,
    })

  if (error) throw new Error(`Snapshot insert error: ${error.message}`)
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  const cronSecret = Deno.env.get("CRON_SECRET")
  if (cronSecret && req.headers.get("Authorization") !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  const weekEnding = getWeekEnding()
  const weekStart = addDays(weekEnding, -6)

  // Active subscribers with a connected Google account
  const { data: rows, error: fetchErr } = await supabase
    .from("oauth_tokens")
    .select(
      "attorney_id, access_token, refresh_token, token_expires_at, provider_metadata, attorneys!inner(subscription_status)"
    )
    .eq("provider", "google")
    .eq("attorneys.subscription_status", "active")

  if (fetchErr) {
    return new Response(JSON.stringify({ error: fetchErr.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }

  const results: Array<{ attorney_id: string; status: string; error?: string }> = []

  for (const row of rows ?? []) {
    const rec: TokenRecord = {
      attorney_id: row.attorney_id,
      access_token: row.access_token,
      refresh_token: row.refresh_token,
      token_expires_at: row.token_expires_at,
      provider_metadata: row.provider_metadata ?? {},
    }
    try {
      await syncAttorney(supabase, rec, weekStart, weekEnding)
      results.push({ attorney_id: rec.attorney_id, status: "ok" })
    } catch (err) {
      console.error(`sync-google failed for ${rec.attorney_id}:`, err)
      results.push({
        attorney_id: rec.attorney_id,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return new Response(
    JSON.stringify({ week_ending: toISODate(weekEnding), results }),
    { headers: { "Content-Type": "application/json" } }
  )
})
