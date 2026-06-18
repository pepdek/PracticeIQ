// first-run-score — called immediately after onboarding completes.
// Triggers sync for each connected source (scoped to this attorney only),
// calculates the score, persists it, creates a drill-down token, and returns
// everything the first-run score page needs in a single response.
//
// Response shape:
//   { status: "ready",   composite_score, token, week_ending, dimensions }
//   { status: "no_data", message }  — no sources connected yet

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import {
  calculateScore,
  pivotSnapshots,
  ScoreConfig,
} from "../_shared/score-calculator.ts"
import { getWeekEnding, toISODate, addDays } from "../_shared/week.ts"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS })
  }

  // JWT auth — called by the logged-in frontend after Stripe redirect
  const authHeader = req.headers.get("Authorization")
  if (!authHeader) {
    return new Response("Unauthorized", { status: 401, headers: CORS_HEADERS })
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!
  const cronSecret = Deno.env.get("CRON_SECRET")!

  // Verify the JWT to get the attorney's id
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser()
  if (authError || !user) {
    return new Response("Unauthorized", { status: 401, headers: CORS_HEADERS })
  }
  const attorneyId = user.id

  const supabase = createClient(supabaseUrl, serviceKey)

  // Read weights — never hardcode
  const { data: configRow, error: configError } = await supabase
    .from("score_config")
    .select(
      "revenue_capture_weight, practice_velocity_weight, risk_exposure_weight, financial_position_weight, reputation_velocity_weight"
    )
    .single()

  if (configError || !configRow) {
    return new Response(JSON.stringify({ error: "score_config missing" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    })
  }

  const config: ScoreConfig = {
    revenue_capture_weight: Number(configRow.revenue_capture_weight),
    practice_velocity_weight: Number(configRow.practice_velocity_weight),
    risk_exposure_weight: Number(configRow.risk_exposure_weight),
    financial_position_weight: Number(configRow.financial_position_weight),
    reputation_velocity_weight: Number(configRow.reputation_velocity_weight),
  }

  // Which sources are connected for this attorney?
  const { data: conn } = await supabase
    .from("connection_status")
    .select("clio_connected, plaid_connected, google_connected")
    .eq("attorney_id", attorneyId)
    .single()

  if (!conn?.clio_connected && !conn?.plaid_connected && !conn?.google_connected) {
    return new Response(
      JSON.stringify({
        status: "no_data",
        message: "Connect at least one data source to see your score.",
      }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    )
  }

  // Trigger sync for each connected source, scoped to this attorney.
  // Runs in parallel; we proceed regardless of individual failures — the score
  // will be calculated from whatever data arrived.
  const syncBody = JSON.stringify({ attorney_id: attorneyId })
  const syncHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${cronSecret}`,
  }

  const syncCalls: Promise<Response>[] = []
  if (conn.clio_connected) {
    syncCalls.push(
      fetch(`${supabaseUrl}/functions/v1/sync-clio`, {
        method: "POST",
        headers: syncHeaders,
        body: syncBody,
      })
    )
  }
  if (conn.plaid_connected) {
    syncCalls.push(
      fetch(`${supabaseUrl}/functions/v1/sync-plaid`, {
        method: "POST",
        headers: syncHeaders,
        body: syncBody,
      })
    )
  }
  if (conn.google_connected) {
    syncCalls.push(
      fetch(`${supabaseUrl}/functions/v1/sync-google`, {
        method: "POST",
        headers: syncHeaders,
        body: syncBody,
      })
    )
  }

  await Promise.allSettled(syncCalls)

  // Fetch this week + 13 prior weeks for trend calculations
  const weekEnding = toISODate(getWeekEnding())
  const lookbackDate = toISODate(addDays(new Date(weekEnding + "T12:00:00"), -13 * 7))

  const { data: rows } = await supabase
    .from("weekly_snapshots")
    .select("week_ending_date, source, metric_key, metric_value")
    .eq("attorney_id", attorneyId)
    .gte("week_ending_date", lookbackDate)
    .lte("week_ending_date", weekEnding)

  if (!rows?.length) {
    return new Response(
      JSON.stringify({
        status: "no_data",
        message: "Sources connected but no data synced yet.",
      }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    )
  }

  const allSnaps = pivotSnapshots(rows)
  const current = allSnaps.find((s) => s.week_ending === weekEnding)

  if (!current) {
    return new Response(
      JSON.stringify({
        status: "no_data",
        message: "No data for the current week.",
      }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    )
  }

  const history = allSnaps.filter((s) => s.week_ending < weekEnding)
  const scoreResult = calculateScore(current, history, config)

  // Upsert practice_scores — first run has no prior week, so delta is null
  const { data: scoreRow, error: upsertError } = await supabase
    .from("practice_scores")
    .upsert(
      {
        attorney_id: attorneyId,
        week_ending_date: weekEnding,
        composite_score: scoreResult.composite_score,

        revenue_capture_score: scoreResult.revenue_capture.score,
        revenue_capture_calculated: scoreResult.revenue_capture.calculated,

        practice_velocity_score: scoreResult.practice_velocity.score,
        practice_velocity_calculated: scoreResult.practice_velocity.calculated,

        risk_exposure_score: scoreResult.risk_exposure.score,
        risk_exposure_calculated: scoreResult.risk_exposure.calculated,

        financial_position_score: scoreResult.financial_position.score,
        financial_position_calculated: scoreResult.financial_position.calculated,

        reputation_velocity_score: scoreResult.reputation_velocity.score,
        reputation_velocity_calculated: scoreResult.reputation_velocity.calculated,

        prior_week_score: null,
        score_delta: null,
      },
      { onConflict: "attorney_id,week_ending_date" }
    )
    .select("id")
    .single()

  if (upsertError) {
    return new Response(JSON.stringify({ error: upsertError.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    })
  }

  // Create a drill-down token for the first-run page
  const { data: tokenRow, error: tokenError } = await supabase
    .from("score_tokens")
    .insert({ attorney_id: attorneyId, score_id: scoreRow.id })
    .select("token")
    .single()

  if (tokenError) {
    return new Response(JSON.stringify({ error: tokenError.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    })
  }

  return new Response(
    JSON.stringify({
      status: "ready",
      composite_score: scoreResult.composite_score,
      token: tokenRow.token,
      week_ending: weekEnding,
      dimensions: {
        revenue_capture: { calculated: scoreResult.revenue_capture.calculated },
        practice_velocity: { calculated: scoreResult.practice_velocity.calculated },
        risk_exposure: { calculated: scoreResult.risk_exposure.calculated },
        financial_position: { calculated: scoreResult.financial_position.calculated },
        reputation_velocity: { calculated: scoreResult.reputation_velocity.calculated },
      },
    }),
    { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
  )
})
