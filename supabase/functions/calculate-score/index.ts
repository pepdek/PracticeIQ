// calculate-score — computes the Practice Health Score for all active attorneys.
// Triggered by pg_cron every Sunday; also callable manually via POST.
// Tokens are NOT created here — generate-email creates them at send time,
// and first-run-score creates one immediately after onboarding.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import {
  calculateScore,
  pivotSnapshots,
  ScoreConfig,
} from "../_shared/score-calculator.ts"
import { getWeekEnding, toISODate, addDays } from "../_shared/week.ts"

serve(async (req) => {
  const cronSecret = Deno.env.get("CRON_SECRET")
  if (req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response("Unauthorized", { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  // Weights come from DB — never hardcoded here.
  const { data: configRow, error: configError } = await supabase
    .from("score_config")
    .select(
      "revenue_capture_weight, practice_velocity_weight, risk_exposure_weight, financial_position_weight, reputation_velocity_weight"
    )
    .single()

  if (configError || !configRow) {
    return new Response(JSON.stringify({ error: "score_config missing" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }

  const config: ScoreConfig = {
    revenue_capture_weight: Number(configRow.revenue_capture_weight),
    practice_velocity_weight: Number(configRow.practice_velocity_weight),
    risk_exposure_weight: Number(configRow.risk_exposure_weight),
    financial_position_weight: Number(configRow.financial_position_weight),
    reputation_velocity_weight: Number(configRow.reputation_velocity_weight),
  }

  const { data: attorneys, error: attError } = await supabase
    .from("attorneys")
    .select("id")
    .eq("subscription_status", "active")

  if (attError) {
    return new Response(JSON.stringify({ error: attError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }

  const weekEnding = toISODate(getWeekEnding())
  // 13 prior weeks of history for 90-day rolling averages
  const lookbackDate = toISODate(addDays(new Date(weekEnding + "T12:00:00"), -13 * 7))

  const results: Array<{
    id: string
    status: string
    score?: number
    reason?: string
    error?: string
  }> = []

  for (const attorney of attorneys ?? []) {
    try {
      const { data: rows, error: snapError } = await supabase
        .from("weekly_snapshots")
        .select("week_ending_date, source, metric_key, metric_value")
        .eq("attorney_id", attorney.id)
        .gte("week_ending_date", lookbackDate)
        .lte("week_ending_date", weekEnding)

      if (snapError) throw snapError

      if (!rows?.length) {
        results.push({ id: attorney.id, status: "skipped", reason: "no_snapshots" })
        continue
      }

      const allSnaps = pivotSnapshots(rows)
      const current = allSnaps.find((s) => s.week_ending === weekEnding)

      if (!current) {
        results.push({ id: attorney.id, status: "skipped", reason: "no_current_week" })
        continue
      }

      const history = allSnaps.filter((s) => s.week_ending < weekEnding)
      const scoreResult = calculateScore(current, history, config)

      // Look up prior week for delta calculation
      const priorWeekEnding = toISODate(addDays(new Date(weekEnding + "T12:00:00"), -7))
      const { data: priorRow } = await supabase
        .from("practice_scores")
        .select("composite_score")
        .eq("attorney_id", attorney.id)
        .eq("week_ending_date", priorWeekEnding)
        .maybeSingle()

      const priorWeekScore = priorRow ? Number(priorRow.composite_score) : null
      const scoreDelta =
        priorWeekScore !== null ? scoreResult.composite_score - priorWeekScore : null

      const { error: upsertError } = await supabase
        .from("practice_scores")
        .upsert(
          {
            attorney_id: attorney.id,
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

            prior_week_score: priorWeekScore,
            score_delta: scoreDelta,
          },
          { onConflict: "attorney_id,week_ending_date" }
        )

      if (upsertError) throw upsertError

      results.push({
        id: attorney.id,
        status: "ok",
        score: scoreResult.composite_score,
      })
    } catch (err) {
      results.push({ id: attorney.id, status: "error", error: String(err) })
    }
  }

  const ok = results.filter((r) => r.status === "ok").length
  const skipped = results.filter((r) => r.status === "skipped").length
  const errors = results.filter((r) => r.status === "error").length

  return new Response(
    JSON.stringify({ week_ending: weekEnding, ok, skipped, errors, results }),
    { headers: { "Content-Type": "application/json" } }
  )
})
