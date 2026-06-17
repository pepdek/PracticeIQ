import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { addDays, getWeekEnding, round2, toISODate } from "../_shared/week.ts"

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages"
const RESEND_API = "https://api.resend.com/emails"
const FROM_ADDRESS = "hello@practiceiq.co"
const MODEL = "claude-sonnet-4-6"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SnapshotRow {
  week_ending_date: string
  source: string
  metric_key: string
  metric_value: number
}

interface ClioWeek {
  matters_opened?: number
  matters_closed?: number
  hours_billed?: number
  hours_collected?: number
  invoices_sent_count?: number
  invoices_sent_amount?: number
  invoices_paid_count?: number
  invoices_paid_amount?: number
  ar_0_30?: number
  ar_31_60?: number
  ar_61_90?: number
  ar_90_plus?: number
  collection_rate_pct?: number | null  // derived, pre-computed for Claude
}

interface PlaidWeek {
  deposits_total?: number
  operating_balance?: number
  trust_balance?: number
}

interface GoogleWeek {
  star_rating?: number
  total_review_count?: number
  new_reviews_count?: number
}

interface WeekSnapshot {
  week_ending: string
  clio: ClioWeek
  plaid: PlaidWeek
  google: GoogleWeek
}

// ---------------------------------------------------------------------------
// System prompt — matches spec exactly
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a business intelligence analyst for solo and small law firm operators. Your job is to read a week of practice data and write one plain-English email.

Rules:
- Never mention client names
- Never give legal advice
- Never give financial advice
- Never use the word "AI"
- Never exceed 4 lines per section
- Every number in the email must come exactly from the data provided — do not fabricate or estimate any figure
- Every section must end with exactly one action implication: a single sentence starting with a concrete next step for the attorney
- If a data source is missing or null for this week, omit those numbers and note the source was unavailable rather than guessing

Output format — follow this exactly, preserving the header labels:

SUBJECT: Your practice this week — 4 things to know

BILLING & COLLECTIONS
[2–4 lines. Cover hours billed this week, hours collected, collection rate this week vs. 8-week average. End with one action implication.]

CASH POSITION
[2–4 lines. Cover deposits this week, current operating account balance, and the gap between total Clio AR outstanding and actual deposits received. End with one action implication.]

REPUTATION
[2–4 lines. Cover current star rating, new reviews this week, and review velocity trend vs. prior weeks. End with one action implication.]

KEY OBSERVATION
[2–4 lines. Name the single most significant change vs. the prior 8 weeks and state its plain-English business implication. End with one action implication.]

---
Reply to this email with any questions. Data sourced from Clio, Plaid, and Google Business Profile.`

// ---------------------------------------------------------------------------
// Data preparation
// ---------------------------------------------------------------------------

function collectionRatePct(billed?: number, collected?: number): number | null {
  if (!billed || billed === 0) return null
  return round2(((collected ?? 0) / billed) * 100)
}

function pivotSnapshots(rows: SnapshotRow[]): WeekSnapshot[] {
  const byWeek = new Map<string, WeekSnapshot>()

  for (const row of rows) {
    const wk = row.week_ending_date
    if (!byWeek.has(wk)) {
      byWeek.set(wk, { week_ending: wk, clio: {}, plaid: {}, google: {} })
    }
    const snap = byWeek.get(wk)!
    const target = snap[row.source as "clio" | "plaid" | "google"] as Record<string, number>
    target[row.metric_key] = Number(row.metric_value)
  }

  // Compute derived collection_rate_pct per week so Claude doesn't need to
  for (const snap of byWeek.values()) {
    snap.clio.collection_rate_pct = collectionRatePct(
      snap.clio.hours_billed,
      snap.clio.hours_collected
    )
  }

  // Sort newest first
  return Array.from(byWeek.values()).sort((a, b) =>
    b.week_ending.localeCompare(a.week_ending)
  )
}

// 8-week average collection rate: mean of weeks that have both hours fields
function avgCollectionRate(weeks: WeekSnapshot[]): number | null {
  const rates = weeks
    .map((w) => w.clio.collection_rate_pct)
    .filter((r): r is number => r !== null && r !== undefined)
  if (rates.length === 0) return null
  return round2(rates.reduce((s, r) => s + r, 0) / rates.length)
}

function buildUserMessage(
  weeks: WeekSnapshot[],
  weekEnding: string,
  avgCollRate: number | null
): string {
  const current = weeks[0]
  const prior = weeks.slice(1)

  const payload = {
    week_ending: weekEnding,
    eight_week_avg_collection_rate_pct: avgCollRate,
    current_week: current,
    prior_7_weeks: prior,
  }

  return (
    "Generate the weekly practice email using the data below. " +
    "Return only the formatted email — no preamble, no explanation.\n\n" +
    JSON.stringify(payload, null, 2)
  )
}

// ---------------------------------------------------------------------------
// Claude API
// ---------------------------------------------------------------------------

async function callClaude(userMessage: string): Promise<string> {
  const res = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: {
      "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Anthropic API error (${res.status}): ${body}`)
  }

  const data = await res.json()
  const text: string = data.content?.[0]?.text ?? ""
  if (!text) throw new Error("Anthropic returned empty content")
  return text
}

// ---------------------------------------------------------------------------
// Output validation
// ---------------------------------------------------------------------------

const REQUIRED_SECTIONS = [
  "BILLING & COLLECTIONS",
  "CASH POSITION",
  "REPUTATION",
  "KEY OBSERVATION",
]

const REQUIRED_FOOTER = "Data sourced from Clio, Plaid, and Google Business Profile."

function validateEmail(raw: string): { subject: string; body: string } {
  const lines = raw.trim().split("\n")

  // Subject must be first non-empty line
  const subjectLine = lines.find((l) => l.startsWith("SUBJECT:"))
  if (!subjectLine) throw new Error('Missing "SUBJECT:" line in Claude output')
  const subject = subjectLine.replace(/^SUBJECT:\s*/, "").trim()

  for (const section of REQUIRED_SECTIONS) {
    if (!raw.includes(section)) {
      throw new Error(`Missing section "${section}" in Claude output`)
    }
  }

  if (!raw.includes(REQUIRED_FOOTER)) {
    throw new Error("Missing required footer in Claude output")
  }

  if (/\bAI\b/i.test(raw)) {
    throw new Error('Claude output contains forbidden word "AI"')
  }

  // Body = everything after the SUBJECT line
  const subjectIndex = lines.indexOf(subjectLine)
  const body = lines
    .slice(subjectIndex + 1)
    .join("\n")
    .trim()

  return { subject, body }
}

// ---------------------------------------------------------------------------
// Resend
// ---------------------------------------------------------------------------

async function sendEmail(
  to: string,
  subject: string,
  body: string
): Promise<string> {
  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")!}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to,
      subject,
      text: body,
    }),
  })

  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`Resend error (${res.status}): ${errBody}`)
  }

  const data = await res.json()
  return data.id as string  // Resend message ID
}

// ---------------------------------------------------------------------------
// Per-attorney pipeline
// ---------------------------------------------------------------------------

async function processAttorney(
  supabase: SupabaseClient,
  attorneyId: string,
  email: string,
  weekEnding: Date
): Promise<void> {
  const weekEndStr = toISODate(weekEnding)
  // Fetch 8 weeks back (7 prior + current)
  const eighthSundayAgo = addDays(weekEnding, -49)

  const { data: rows, error: snapErr } = await supabase
    .from("weekly_snapshots")
    .select("week_ending_date, source, metric_key, metric_value")
    .eq("attorney_id", attorneyId)
    .gte("week_ending_date", toISODate(eighthSundayAgo))
    .lte("week_ending_date", weekEndStr)
    .order("week_ending_date", { ascending: false })

  if (snapErr) throw new Error(`Snapshot fetch error: ${snapErr.message}`)

  const weeks = pivotSnapshots(rows ?? [])

  // Must have at least current week data — skip if syncs all failed
  if (weeks.length === 0 || weeks[0].week_ending !== weekEndStr) {
    throw new Error(`No snapshot data found for week ending ${weekEndStr}`)
  }

  const avgCollRate = avgCollectionRate(weeks)
  const userMessage = buildUserMessage(weeks, weekEndStr, avgCollRate)

  const rawOutput = await callClaude(userMessage)
  const { subject, body } = validateEmail(rawOutput)

  const resendId = await sendEmail(email, subject, body)

  // Log the send
  await supabase.from("email_log").insert({
    attorney_id: attorneyId,
    week_ending_date: weekEndStr,
    subject,
    resend_message_id: resendId,
  })

  // Update attorney record for /account page display
  await supabase
    .from("attorneys")
    .update({
      last_email_sent_at: new Date().toISOString(),
      last_email_subject: subject,
    })
    .eq("id", attorneyId)
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

  // Active subscribers only — cancelled subscriptions must not receive emails
  const { data: attorneys, error: fetchErr } = await supabase
    .from("attorneys")
    .select("id, email")
    .eq("subscription_status", "active")

  if (fetchErr) {
    return new Response(JSON.stringify({ error: fetchErr.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }

  const results: Array<{
    attorney_id: string
    status: string
    subject?: string
    error?: string
  }> = []

  for (const attorney of attorneys ?? []) {
    try {
      await processAttorney(supabase, attorney.id, attorney.email, weekEnding)
      results.push({ attorney_id: attorney.id, status: "sent" })
    } catch (err) {
      console.error(`generate-email failed for ${attorney.id}:`, err)
      results.push({
        attorney_id: attorney.id,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  const sent = results.filter((r) => r.status === "sent").length
  const failed = results.filter((r) => r.status === "error").length

  return new Response(
    JSON.stringify({
      week_ending: toISODate(weekEnding),
      sent,
      failed,
      results,
    }),
    { headers: { "Content-Type": "application/json" } }
  )
})
