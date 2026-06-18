import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { addDays, getWeekEnding, round2, toISODate } from "../_shared/week.ts"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlaidItemRecord {
  attorney_id: string
  access_token: string
  operating_account_id: string
  trust_account_id: string | null
}

interface PlaidAccount {
  account_id: string
  balances: {
    available: number | null
    current: number | null
  }
}

// Deliberately minimal — we only look at account_id, amount, and date.
// Never access or log transaction.name / transaction.merchant_name.
interface PlaidTransaction {
  account_id: string
  amount: number  // Plaid convention: positive = outflow, negative = inflow (deposit)
  date: string
  pending: boolean
}

// ---------------------------------------------------------------------------
// Plaid API client
// ---------------------------------------------------------------------------

function plaidBaseUrl(): string {
  const env = Deno.env.get("PLAID_ENV") ?? "sandbox"
  // Accepts "sandbox" or "production" (development not used in Phase 0)
  return `https://${env}.plaid.com`
}

async function plaidPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${plaidBaseUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: Deno.env.get("PLAID_CLIENT_ID")!,
      secret: Deno.env.get("PLAID_SECRET")!,
      ...body,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Plaid ${path} → ${res.status}: ${body}`)
  }

  return res.json() as Promise<T>
}

// Plaid /transactions/get paginates via offset + total_transactions.
// We only pull from the operating account to compute deposit totals.
// Trust account: balance only — no transactions fetched.
async function fetchOperatingDeposits(
  accessToken: string,
  operatingAccountId: string,
  startDate: string,
  endDate: string
): Promise<number> {
  let offset = 0
  let totalTransactions = Infinity
  let depositsTotal = 0

  while (offset < totalTransactions) {
    const data = await plaidPost<{
      transactions: PlaidTransaction[]
      total_transactions: number
    }>("/transactions/get", {
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
      options: {
        account_ids: [operatingAccountId],
        count: 500,
        offset,
      },
    })

    totalTransactions = data.total_transactions

    for (const tx of data.transactions) {
      // Negative amount = money coming INTO the account (deposit/credit).
      // We never read tx.name or tx.merchant_name.
      if (tx.amount < 0) {
        depositsTotal += Math.abs(tx.amount)
      }
    }

    offset += data.transactions.length

    // Safety: if Plaid returns 0 transactions in a page, break to avoid infinite loop
    if (data.transactions.length === 0) break
  }

  return round2(depositsTotal)
}

async function fetchAccountBalances(
  accessToken: string,
  accountIds: string[]
): Promise<Map<string, number>> {
  const data = await plaidPost<{ accounts: PlaidAccount[] }>("/accounts/balance/get", {
    access_token: accessToken,
    options: { account_ids: accountIds },
  })

  const balanceMap = new Map<string, number>()
  for (const account of data.accounts) {
    // current balance is more meaningful for law firm reporting than available;
    // available excludes holds and pending debits which can mislead.
    const balance = account.balances.current ?? account.balances.available ?? 0
    balanceMap.set(account.account_id, round2(balance))
  }
  return balanceMap
}

// ---------------------------------------------------------------------------
// Per-attorney sync
// ---------------------------------------------------------------------------

async function syncAttorney(
  supabase: SupabaseClient,
  rec: PlaidItemRecord,
  weekStart: Date,
  weekEnding: Date
): Promise<void> {
  const start = toISODate(weekStart)
  const end = toISODate(weekEnding)

  const metrics: Record<string, number> = {}

  // Deposits: operating account only, inflows only, no descriptions stored or logged
  metrics.deposits_total = await fetchOperatingDeposits(
    rec.access_token,
    rec.operating_account_id,
    start,
    end
  )

  // Balances: fetch both accounts in one call when trust exists
  const accountIds = rec.trust_account_id
    ? [rec.operating_account_id, rec.trust_account_id]
    : [rec.operating_account_id]

  const balances = await fetchAccountBalances(rec.access_token, accountIds)

  metrics.operating_balance = balances.get(rec.operating_account_id) ?? 0

  if (rec.trust_account_id) {
    metrics.trust_balance = balances.get(rec.trust_account_id) ?? 0
  }
  // If no trust account, trust_balance is omitted from this week's snapshot entirely.

  // Write to weekly_snapshots — idempotent: duplicate rows silently ignored
  const rows = Object.entries(metrics).map(([metric_key, metric_value]) => ({
    attorney_id: rec.attorney_id,
    week_ending_date: toISODate(weekEnding),
    source: "plaid",
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

  const body = req.headers.get("content-type")?.includes("application/json")
    ? await req.json().catch(() => ({}))
    : {}
  const singleAttorneyId: string | null = body?.attorney_id ?? null

  const weekEnding = getWeekEnding()
  const weekStart = addDays(weekEnding, -6)

  // Active subscribers with a connected Plaid item
  let query = supabase
    .from("plaid_items")
    .select(
      "attorney_id, access_token, operating_account_id, trust_account_id, attorneys!inner(subscription_status)"
    )
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
    const rec: PlaidItemRecord = {
      attorney_id: row.attorney_id,
      access_token: row.access_token,
      operating_account_id: row.operating_account_id,
      trust_account_id: row.trust_account_id ?? null,
    }
    try {
      await syncAttorney(supabase, rec, weekStart, weekEnding)
      results.push({ attorney_id: rec.attorney_id, status: "ok" })
    } catch (err) {
      // Log attorney_id only — never log account details or transaction data
      console.error(`sync-plaid failed for ${rec.attorney_id}:`, err)
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
