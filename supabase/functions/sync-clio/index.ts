import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { addDays, getWeekEnding, round2, toISODate } from "../_shared/week.ts"

const CLIO_API = "https://app.clio.com/api/v4"
const CLIO_TOKEN_URL = "https://app.clio.com/oauth/token"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TokenRecord {
  attorney_id: string
  access_token: string
  refresh_token: string | null
  token_expires_at: string | null
}

interface TimEntry {
  quantity: number
  bill: { status: string } | null
}

interface Bill {
  total: number
  balance: number
  issued_at: string
}

// ---------------------------------------------------------------------------
// Token management
// ---------------------------------------------------------------------------

async function refreshClioToken(
  supabase: SupabaseClient,
  rec: TokenRecord
): Promise<string> {
  if (!rec.refresh_token) throw new Error("No Clio refresh token stored")

  const res = await fetch(CLIO_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: rec.refresh_token,
      client_id: Deno.env.get("CLIO_CLIENT_ID")!,
      client_secret: Deno.env.get("CLIO_CLIENT_SECRET")!,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Clio token refresh failed (${res.status}): ${body}`)
  }

  const data = await res.json()
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()

  await supabase
    .from("oauth_tokens")
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token ?? rec.refresh_token,
      token_expires_at: expiresAt,
    })
    .eq("attorney_id", rec.attorney_id)
    .eq("provider", "clio")

  return data.access_token
}

async function getValidToken(
  supabase: SupabaseClient,
  rec: TokenRecord
): Promise<string> {
  if (rec.token_expires_at) {
    const fiveMinMs = 5 * 60 * 1000
    if (Date.now() > new Date(rec.token_expires_at).getTime() - fiveMinMs) {
      return refreshClioToken(supabase, rec)
    }
  }
  return rec.access_token
}

// ---------------------------------------------------------------------------
// Clio API client — handles cursor-based pagination automatically
// ---------------------------------------------------------------------------

async function clioFetchAll<T>(
  token: string,
  path: string,
  params: Record<string, string>
): Promise<T[]> {
  const results: T[] = []

  const base = new URL(`${CLIO_API}${path}`)
  for (const [k, v] of Object.entries(params)) base.searchParams.set(k, v)
  base.searchParams.set("limit", "200")

  // Clio v4 pagination: meta.paging.next is the full URL of the next page,
  // or null when exhausted.
  let nextUrl: string | null = base.toString()

  while (nextUrl) {
    const res = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Clio ${path} → ${res.status}: ${body}`)
    }
    const json = await res.json()
    results.push(...(json.data ?? []))
    nextUrl = json.meta?.paging?.next ?? null
  }

  return results
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
  const start = toISODate(weekStart)
  const end = toISODate(weekEnding)

  const metrics: Record<string, number> = {}

  // --- Matters opened this week ---
  // Clio v4 filter: opened_at[start] / opened_at[end]
  const opened = await clioFetchAll<{ id: number }>(tok, "/matters.json", {
    "opened_at[start]": start,
    "opened_at[end]": end,
    fields: "id",
  })
  metrics.matters_opened = opened.length

  // --- Matters closed this week ---
  // close_date is a date field on the matter; status filter narrows to closed only.
  const closed = await clioFetchAll<{ id: number }>(tok, "/matters.json", {
    status: "closed",
    "close_date[start]": start,
    "close_date[end]": end,
    fields: "id",
  })
  metrics.matters_closed = closed.length

  // --- Time entries this week ---
  // hours_billed  = all time logged this week
  // hours_collected = subset where the associated bill has been paid
  const entries = await clioFetchAll<TimEntry>(tok, "/time_entries.json", {
    "date[start]": start,
    "date[end]": end,
    fields: "id,quantity,bill{id,status}",
  })
  metrics.hours_billed = round2(
    entries.reduce((s, e) => s + (e.quantity ?? 0), 0)
  )
  metrics.hours_collected = round2(
    entries
      .filter((e) => e.bill?.status === "paid")
      .reduce((s, e) => s + (e.quantity ?? 0), 0)
  )

  // --- Invoices issued this week ---
  const issued = await clioFetchAll<{ total: number }>(tok, "/bills.json", {
    "issued_at[start]": start,
    "issued_at[end]": end,
    fields: "id,total",
  })
  metrics.invoices_sent_count = issued.length
  metrics.invoices_sent_amount = round2(
    issued.reduce((s, b) => s + (b.total ?? 0), 0)
  )

  // --- Invoices paid this week ---
  const paidThisWeek = await clioFetchAll<{ total: number }>(tok, "/bills.json", {
    "paid_at[start]": start,
    "paid_at[end]": end,
    fields: "id,total",
  })
  metrics.invoices_paid_count = paidThisWeek.length
  metrics.invoices_paid_amount = round2(
    paidThisWeek.reduce((s, b) => s + (b.total ?? 0), 0)
  )

  // --- AR aging — outstanding balances as of week_ending ---
  // Clio has separate statuses for "sent" (within terms) and "overdue".
  // We fetch both and bucket by days since issued_at.
  const [sentBills, overdueBills] = await Promise.all([
    clioFetchAll<Bill>(tok, "/bills.json", {
      status: "sent",
      fields: "id,balance,issued_at",
    }),
    clioFetchAll<Bill>(tok, "/bills.json", {
      status: "overdue",
      fields: "id,balance,issued_at",
    }),
  ])

  const buckets = { ar_0_30: 0, ar_31_60: 0, ar_61_90: 0, ar_90_plus: 0 }
  for (const bill of [...sentBills, ...overdueBills]) {
    const days = Math.floor(
      (weekEnding.getTime() - new Date(bill.issued_at).getTime()) / 86_400_000
    )
    const balance = bill.balance ?? 0
    if (days <= 30) buckets.ar_0_30 += balance
    else if (days <= 60) buckets.ar_31_60 += balance
    else if (days <= 90) buckets.ar_61_90 += balance
    else buckets.ar_90_plus += balance
  }
  metrics.ar_0_30 = round2(buckets.ar_0_30)
  metrics.ar_31_60 = round2(buckets.ar_31_60)
  metrics.ar_61_90 = round2(buckets.ar_61_90)
  metrics.ar_90_plus = round2(buckets.ar_90_plus)

  // --- Write to weekly_snapshots ---
  // ignoreDuplicates: true makes re-runs idempotent — the unique index on
  // (attorney_id, week_ending_date, source, metric_key) blocks overwrites.
  const rows = Object.entries(metrics).map(([metric_key, metric_value]) => ({
    attorney_id: rec.attorney_id,
    week_ending_date: toISODate(weekEnding),
    source: "clio",
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

  // Optional auth guard — set CRON_SECRET in Edge Function env to enable.
  // The pg_cron caller must pass: Authorization: Bearer <CRON_SECRET>
  const cronSecret = Deno.env.get("CRON_SECRET")
  if (cronSecret && req.headers.get("Authorization") !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  // Optional single-attorney mode — used by first-run-score to avoid syncing all users.
  const body = req.headers.get("content-type")?.includes("application/json")
    ? await req.json().catch(() => ({}))
    : {}
  const singleAttorneyId: string | null = body?.attorney_id ?? null

  const weekEnding = getWeekEnding()
  const weekStart = addDays(weekEnding, -6) // Monday

  // Active subscribers with a connected Clio account
  let query = supabase
    .from("oauth_tokens")
    .select(
      "attorney_id, access_token, refresh_token, token_expires_at, attorneys!inner(subscription_status)"
    )
    .eq("provider", "clio")
    .eq("attorneys.subscription_status", "active")
  if (singleAttorneyId) query = query.eq("attorney_id", singleAttorneyId)
  const { data: rows, error: fetchErr } = await query

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
    }
    try {
      await syncAttorney(supabase, rec, weekStart, weekEnding)
      results.push({ attorney_id: rec.attorney_id, status: "ok" })
    } catch (err) {
      // Log attorney_id only — never log matter/client data
      console.error(`sync-clio failed for ${rec.attorney_id}:`, err)
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
