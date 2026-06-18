// generate-email — V2 Practice Health Score format.
// Reads pre-calculated scores from practice_scores (written by calculate-score),
// re-derives component details from weekly_snapshots for Claude's context,
// creates a drill-down token, calls Claude for the email body, sends via Resend,
// and writes observation_text / one_action back to practice_scores.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import {
  calculateScore,
  pivotSnapshots,
  ScoreConfig,
  ScoreResult,
} from "../_shared/score-calculator.ts"
import { addDays, getWeekEnding, toISODate } from "../_shared/week.ts"

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages"
const RESEND_API = "https://api.resend.com/emails"
const FROM_ADDRESS = "hello@practiceiq.co"
const MODEL = "claude-sonnet-4-6"

// ---------------------------------------------------------------------------
// System prompt — V2 score-first format
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You write the weekly Practice Health Score email for solo and small law firm attorneys.

Rules (non-negotiable):
- Never mention client names or case details
- Never give legal or financial advice
- Never use the word "AI"
- Every number in the email must come exactly from the provided data — do not invent or estimate any figure
- Be direct. Short sentences. No filler.

You will receive a JSON object with the attorney's score data. Write the email body only (no subject line). Follow the format below exactly, preserving the section headers.

FORMAT A — when any dimension score is below 18 out of 20:

PRACTICE HEALTH SCORE: {composite_score}  ({delta_symbol}{|delta|} from last week)

What changed:
[2–3 lines. Identify the dimension with the largest drop and explain why using the component data. Be specific — use the exact numbers provided.]

Everything else held steady.
[List the other four dimensions on one line: Name: X/20 · Name: X/20 · Name: X/20 · Name: X/20]

One thing to do this week:
[1–2 sentences. One concrete, specific action based on what the data shows. Never a generic suggestion.]

FORMAT B — when every dimension score is 18 or above:

PRACTICE HEALTH SCORE: {composite_score}

Your practice is running well this week. Nothing needs your attention.
We'll be back next Sunday.

Output the email body only — no preamble, no explanation, nothing before the first line.`

// ---------------------------------------------------------------------------
// Subject line — computed, not written by Claude (guarantees correct score)
// ---------------------------------------------------------------------------

function buildSubject(
  score: number,
  delta: number | null,
  priorScores: number[]
): string {
  let trend: string

  if (delta === null || Math.round(Math.abs(delta)) === 0) {
    trend = "no change this week"
  } else if (delta > 0) {
    const pts = Math.round(delta)
    // If this is the highest score in the history window, say so
    if (priorScores.length >= 4 && score > Math.max(...priorScores)) {
      const weeks = priorScores.length + 1
      const months = Math.round(weeks / 4)
      trend = months >= 2
        ? `your best score in ${months} months`
        : `your best score in ${weeks} weeks`
    } else {
      trend = `up ${pts} point${pts === 1 ? "" : "s"} this week`
    }
  } else {
    const pts = Math.round(Math.abs(delta))
    trend = `down ${pts} point${pts === 1 ? "" : "s"}. Here's why.`
  }

  return `Your Practice Health Score: ${score} — ${trend}`
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
      max_tokens: 800,
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
// Output validation — V2 format
// ---------------------------------------------------------------------------

function validateEmailBody(raw: string): {
  body: string
  observationText: string | null
  oneAction: string | null
} {
  if (!raw.includes("PRACTICE HEALTH SCORE:")) {
    throw new Error('Missing "PRACTICE HEALTH SCORE:" line in Claude output')
  }

  if (/\bAI\b/i.test(raw)) {
    throw new Error('Claude output contains forbidden word "AI"')
  }

  // Extract observation (What changed section)
  const observationMatch = raw.match(
    /What changed:\n([\s\S]*?)(?:\nEverything else held steady|\nOne thing to do|$)/
  )
  const observationText = observationMatch ? observationMatch[1].trim() : null

  // Extract one action
  const actionMatch = raw.match(/One thing to do this week:\n([\s\S]*?)(?:\n\n|$)/)
  const oneAction = actionMatch ? actionMatch[1].trim() : null

  return { body: raw.trim(), observationText, oneAction }
}

// ---------------------------------------------------------------------------
// Resend
// ---------------------------------------------------------------------------

async function sendEmail(to: string, subject: string, body: string): Promise<string> {
  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")!}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_ADDRESS, to, subject, text: body }),
  })

  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`Resend error (${res.status}): ${errBody}`)
  }

  const data = await res.json()
  return data.id as string
}

// ---------------------------------------------------------------------------
// Per-attorney pipeline
// ---------------------------------------------------------------------------

async function processAttorney(
  supabase: SupabaseClient,
  attorneyId: string,
  email: string,
  weekEndStr: string
): Promise<void> {
  // 1. Read this week's pre-calculated score
  const { data: scoreRow, error: scoreErr } = await supabase
    .from("practice_scores")
    .select("*")
    .eq("attorney_id", attorneyId)
    .eq("week_ending_date", weekEndStr)
    .single()

  if (scoreErr || !scoreRow) {
    throw new Error(`No calculated score for ${weekEndStr} — run calculate-score first`)
  }

  // 2. Read prior 12 weeks for trend context in subject line
  const lookback12Start = toISODate(addDays(new Date(weekEndStr + "T12:00:00"), -12 * 7))
  const { data: historyRows } = await supabase
    .from("practice_scores")
    .select("week_ending_date, composite_score")
    .eq("attorney_id", attorneyId)
    .gte("week_ending_date", lookback12Start)
    .lt("week_ending_date", weekEndStr)
    .order("week_ending_date", { ascending: false })

  const priorScores = (historyRows ?? []).map((r) => Number(r.composite_score))

  // 3. Re-derive dimension components from snapshots (needed for Claude's "why")
  const { data: configRow } = await supabase
    .from("score_config")
    .select(
      "revenue_capture_weight, practice_velocity_weight, risk_exposure_weight, financial_position_weight, reputation_velocity_weight"
    )
    .single()

  const config: ScoreConfig = configRow
    ? {
        revenue_capture_weight: Number(configRow.revenue_capture_weight),
        practice_velocity_weight: Number(configRow.practice_velocity_weight),
        risk_exposure_weight: Number(configRow.risk_exposure_weight),
        financial_position_weight: Number(configRow.financial_position_weight),
        reputation_velocity_weight: Number(configRow.reputation_velocity_weight),
      }
    : {
        revenue_capture_weight: 20,
        practice_velocity_weight: 20,
        risk_exposure_weight: 20,
        financial_position_weight: 20,
        reputation_velocity_weight: 20,
      }

  const lookback13Start = toISODate(addDays(new Date(weekEndStr + "T12:00:00"), -13 * 7))
  const { data: snapRows } = await supabase
    .from("weekly_snapshots")
    .select("week_ending_date, source, metric_key, metric_value")
    .eq("attorney_id", attorneyId)
    .gte("week_ending_date", lookback13Start)
    .lte("week_ending_date", weekEndStr)

  let components: ScoreResult | null = null
  if (snapRows?.length) {
    const allSnaps = pivotSnapshots(snapRows)
    const current = allSnaps.find((s) => s.week_ending === weekEndStr)
    if (current) {
      const history = allSnaps.filter((s) => s.week_ending < weekEndStr)
      components = calculateScore(current, history, config)
    }
  }

  // 4. Build the subject line (programmatic — guarantees correct score)
  const compositeScore = Number(scoreRow.composite_score)
  const scoreDelta = scoreRow.score_delta !== null ? Number(scoreRow.score_delta) : null
  const subject = buildSubject(compositeScore, scoreDelta, priorScores)

  // 5. Build Claude prompt with score + component data
  const deltaSymbol = scoreDelta === null ? "" : scoreDelta >= 0 ? "↑" : "↓"
  const deltaAbs = scoreDelta !== null ? Math.abs(scoreDelta).toFixed(1) : null

  const promptData = {
    week_ending: weekEndStr,
    composite_score: compositeScore,
    score_delta: scoreDelta,
    delta_display: deltaAbs ? `${deltaSymbol}${deltaAbs}` : "first week",
    prior_week_score: scoreRow.prior_week_score !== null ? Number(scoreRow.prior_week_score) : null,
    dimensions: {
      revenue_capture: {
        score: scoreRow.revenue_capture_score !== null ? Number(scoreRow.revenue_capture_score) : null,
        prior_score: null,  // not stored — use delta directionally
        weight: config.revenue_capture_weight,
        calculated: scoreRow.revenue_capture_calculated,
        components: components?.revenue_capture.components ?? {},
      },
      practice_velocity: {
        score: scoreRow.practice_velocity_score !== null ? Number(scoreRow.practice_velocity_score) : null,
        weight: config.practice_velocity_weight,
        calculated: scoreRow.practice_velocity_calculated,
        components: components?.practice_velocity.components ?? {},
      },
      risk_exposure: {
        score: scoreRow.risk_exposure_score !== null ? Number(scoreRow.risk_exposure_score) : null,
        weight: config.risk_exposure_weight,
        calculated: scoreRow.risk_exposure_calculated,
        components: components?.risk_exposure.components ?? {},
      },
      financial_position: {
        score: scoreRow.financial_position_score !== null ? Number(scoreRow.financial_position_score) : null,
        weight: config.financial_position_weight,
        calculated: scoreRow.financial_position_calculated,
        components: components?.financial_position.components ?? {},
      },
      reputation_velocity: {
        score: scoreRow.reputation_velocity_score !== null ? Number(scoreRow.reputation_velocity_score) : null,
        weight: config.reputation_velocity_weight,
        calculated: scoreRow.reputation_velocity_calculated,
        components: components?.reputation_velocity.components ?? {},
      },
    },
  }

  const userMessage =
    "Write the weekly email body using the score data below. " +
    "Follow the system prompt format exactly.\n\n" +
    JSON.stringify(promptData, null, 2)

  // 6. Call Claude for body
  const rawBody = await callClaude(userMessage)
  const { body, observationText, oneAction } = validateEmailBody(rawBody)

  // 7. Create drill-down token
  const { data: tokenRow, error: tokenErr } = await supabase
    .from("score_tokens")
    .insert({ attorney_id: attorneyId, score_id: scoreRow.id })
    .select("token")
    .single()

  if (tokenErr || !tokenRow) throw new Error(`Token creation failed: ${tokenErr?.message}`)

  const appUrl = Deno.env.get("APP_URL") ?? "https://iq.lawstack.co"
  const drillDownUrl = `${appUrl}/score/${tokenRow.token}`

  // 8. Append ephemeral URL — Claude doesn't write this line
  const fullBody = `${body}\n\nSee the detail: ${drillDownUrl}  (expires Sunday)`

  // 9. Send
  const resendId = await sendEmail(email, subject, fullBody)

  // 10. Write observation + action back to practice_scores
  await supabase
    .from("practice_scores")
    .update({
      observation_text: observationText,
      one_action: oneAction,
      observation_generated_at: new Date().toISOString(),
    })
    .eq("id", scoreRow.id)

  // 11. Log the send
  await supabase.from("email_log").insert({
    attorney_id: attorneyId,
    week_ending_date: weekEndStr,
    subject,
    resend_message_id: resendId,
  })

  // 12. Update attorney record for /account display
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

  const weekEndStr = toISODate(getWeekEnding())

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
      await processAttorney(supabase, attorney.id, attorney.email, weekEndStr)
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
    JSON.stringify({ week_ending: weekEndStr, sent, failed, results }),
    { headers: { "Content-Type": "application/json" } }
  )
})
