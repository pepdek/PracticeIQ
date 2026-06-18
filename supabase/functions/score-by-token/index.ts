// score-by-token — public, no auth required.
// Validates the token, re-derives component details from snapshots,
// and returns everything the drill-down page needs.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import {
  calculateScore,
  pivotSnapshots,
  ScoreConfig,
  ScoreResult,
} from "../_shared/score-calculator.ts"
import { toISODate, addDays } from "../_shared/week.ts"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  })
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS })
  }

  const url = new URL(req.url)
  const token = url.searchParams.get("token")
  if (!token) return json({ status: "not_found" }, 404)

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  // Resolve token → score row
  const { data: tokenRow } = await supabase
    .from("score_tokens")
    .select(
      `id, expires_at, score_id,
       practice_scores (
         id, attorney_id, week_ending_date,
         composite_score, score_delta, prior_week_score,
         revenue_capture_score, revenue_capture_calculated,
         practice_velocity_score, practice_velocity_calculated,
         risk_exposure_score, risk_exposure_calculated,
         financial_position_score, financial_position_calculated,
         reputation_velocity_score, reputation_velocity_calculated
       )`
    )
    .eq("token", token)
    .maybeSingle()

  if (!tokenRow || !tokenRow.practice_scores) {
    return json({ status: "not_found" }, 404)
  }

  if (new Date(tokenRow.expires_at) < new Date()) {
    return json({ status: "expired" })
  }

  // Mark accessed
  await supabase
    .from("score_tokens")
    .update({ accessed_at: new Date().toISOString() })
    .eq("id", tokenRow.id)

  const ps = tokenRow.practice_scores as Record<string, unknown>
  const attorneyId = ps.attorney_id as string
  const weekEnding = ps.week_ending_date as string

  // Read weights
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

  // Fetch snapshots for this week + 13 prior weeks to re-derive components
  const lookbackDate = toISODate(addDays(new Date(weekEnding + "T12:00:00"), -13 * 7))
  const { data: rows } = await supabase
    .from("weekly_snapshots")
    .select("week_ending_date, source, metric_key, metric_value")
    .eq("attorney_id", attorneyId)
    .gte("week_ending_date", lookbackDate)
    .lte("week_ending_date", weekEnding)

  let dimensions: ScoreResult | null = null
  if (rows?.length) {
    const allSnaps = pivotSnapshots(rows)
    const current = allSnaps.find((s) => s.week_ending === weekEnding)
    if (current) {
      const history = allSnaps.filter((s) => s.week_ending < weekEnding)
      dimensions = calculateScore(current, history, config)
    }
  }

  // Fetch last 12 weeks of practice_scores for sparkline (including this week)
  const sparklineStart = toISODate(addDays(new Date(weekEnding + "T12:00:00"), -11 * 7))
  const { data: historyRows } = await supabase
    .from("practice_scores")
    .select("week_ending_date, composite_score")
    .eq("attorney_id", attorneyId)
    .gte("week_ending_date", sparklineStart)
    .lte("week_ending_date", weekEnding)
    .order("week_ending_date", { ascending: true })

  const sparkline = (historyRows ?? []).map((r) => ({
    week_ending: r.week_ending_date as string,
    score: Number(r.composite_score),
  }))

  return json({
    status: "ready",
    score: {
      composite_score: Number(ps.composite_score),
      week_ending_date: weekEnding,
      score_delta: ps.score_delta !== null ? Number(ps.score_delta) : null,
      prior_week_score: ps.prior_week_score !== null ? Number(ps.prior_week_score) : null,
    },
    sparkline,
    dimensions: dimensions
      ? {
          revenue_capture: dimensions.revenue_capture,
          practice_velocity: dimensions.practice_velocity,
          risk_exposure: dimensions.risk_exposure,
          financial_position: dimensions.financial_position,
          reputation_velocity: dimensions.reputation_velocity,
        }
      : null,
  })
})
