// Practice Health Score calculator.
// Pure functions — no I/O, no Supabase calls, no env reads.
// All weights come from score_config table, passed in by the caller.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WeekSnapshot {
  week_ending: string
  // Clio
  matters_opened?: number
  matters_closed?: number
  matters_active?: number       // total open matters — added to sync-clio v2
  hours_billed?: number
  hours_collected?: number
  invoices_sent_amount?: number
  invoices_paid_amount?: number
  ar_0_30?: number
  ar_31_60?: number
  ar_61_90?: number
  ar_90_plus?: number
  // Plaid
  deposits_total?: number
  operating_balance?: number
  trust_balance?: number
  // Google
  star_rating?: number
  total_review_count?: number
  new_reviews_count?: number
}

export interface ScoreConfig {
  revenue_capture_weight: number
  practice_velocity_weight: number
  risk_exposure_weight: number
  financial_position_weight: number
  reputation_velocity_weight: number
}

// Components are the sub-scores surfaced in the ephemeral drill-down.
// Values are factors (0–1) so the drill-down can render them at any scale.
export interface DimensionScore {
  score: number | null   // points earned out of weight; null = source not connected
  calculated: boolean
  weight: number
  components: Record<string, number | null>
}

export interface ScoreResult {
  composite_score: number   // 0–100, normalized across connected dimensions only
  revenue_capture: DimensionScore
  practice_velocity: DimensionScore
  risk_exposure: DimensionScore
  financial_position: DimensionScore
  reputation_velocity: DimensionScore
}

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

// Composite score is always 0–100 across connected dimensions only.
// If only 3 of 5 dimensions are connected, those 3 proportionally fill 100.
// Raw dimension score = points earned out of that dimension's weight.
export function normalizeScore(dimensions: DimensionScore[]): number {
  const connected = dimensions.filter((d) => d.score !== null)
  if (connected.length === 0) return 0

  const totalWeight = connected.reduce((sum, d) => sum + d.weight, 0)
  const totalEarned = connected.reduce((sum, d) => sum + d.score!, 0)

  return Math.round((totalEarned / totalWeight) * 100)
}

// ---------------------------------------------------------------------------
// Shared helper — map a rate to a multiplier using tiered thresholds
// ---------------------------------------------------------------------------

function tieredFactor(
  rate: number,
  tiers: Array<[threshold: number, factor: number]>
): number {
  // tiers must be sorted descending by threshold
  for (const [threshold, factor] of tiers) {
    if (rate >= threshold) return factor
  }
  return tiers[tiers.length - 1][1]
}

// ---------------------------------------------------------------------------
// Revenue Capture
//
// Sub-components:
//   realization  = hours_collected / hours_billed  (proxy: paid bills / all hours)
//   collection   = invoices_paid_amount / invoices_sent_amount
//   AR penalty   = 2 pts per $5,000 over 60 days (capped at dimension score)
// ---------------------------------------------------------------------------

export function calcRevenueCapture(
  current: WeekSnapshot,
  weight: number
): DimensionScore {
  const hasData =
    current.hours_billed !== undefined ||
    current.invoices_sent_amount !== undefined ||
    current.ar_0_30 !== undefined

  if (!hasData) {
    return { score: null, calculated: false, weight, components: {} }
  }

  // Realization: hours collected / hours billed
  let realizationFactor = 1.0
  if ((current.hours_billed ?? 0) > 0) {
    const rate = (current.hours_collected ?? 0) / current.hours_billed!
    realizationFactor = tieredFactor(rate, [
      [0.9, 1.0],
      [0.8, 0.75],
      [0.7, 0.5],
      [0, 0.25],
    ])
  }

  // Collection: invoiced amount collected
  let collectionFactor = 1.0
  if ((current.invoices_sent_amount ?? 0) > 0) {
    const rate = (current.invoices_paid_amount ?? 0) / current.invoices_sent_amount!
    collectionFactor = tieredFactor(rate, [
      [0.85, 1.0],
      [0.75, 0.75],
      [0.65, 0.5],
      [0, 0.25],
    ])
  }

  const halfWeight = weight / 2
  let score = halfWeight * realizationFactor + halfWeight * collectionFactor

  // AR aging penalty: 2 pts per $5,000 over 60 days
  const arOver60 = (current.ar_61_90 ?? 0) + (current.ar_90_plus ?? 0)
  const arPenalty = Math.min(score, Math.floor(arOver60 / 5_000) * 2)
  score = Math.max(0, score - arPenalty)

  return {
    score,
    calculated: true,
    weight,
    components: {
      realization_factor: realizationFactor,
      collection_factor: collectionFactor,
      ar_over_60_days: arOver60,
      ar_penalty_points: arPenalty,
    },
  }
}

// ---------------------------------------------------------------------------
// Practice Velocity
//
// Component 1 — matter count trend:
//   If matters_active is available: compare to 13-week (90-day) rolling average.
//   Fallback: compare this week's net matter flow to 8-week average net flow.
//
// Component 2 — pipeline direction: opened vs. closed this week.
// ---------------------------------------------------------------------------

export function calcPracticeVelocity(
  current: WeekSnapshot,
  history: WeekSnapshot[],  // prior weeks, newest first
  weight: number
): DimensionScore {
  const hasData =
    current.matters_opened !== undefined ||
    current.matters_active !== undefined

  if (!hasData) {
    return { score: null, calculated: false, weight, components: {} }
  }

  // Component 1: matter count vs. trend
  let matterCountFactor = 1.0

  if (current.matters_active !== undefined) {
    // Use actual active matter count with 90-day rolling average
    const historicActive = history
      .slice(0, 13)
      .map((w) => w.matters_active)
      .filter((v): v is number => v !== undefined)

    if (historicActive.length > 0) {
      const avg90 = historicActive.reduce((s, v) => s + v, 0) / historicActive.length
      if (avg90 > 0) {
        const ratio = current.matters_active / avg90
        matterCountFactor = tieredFactor(ratio, [
          [0.9, 1.0],   // within 10% or above average
          [0.8, 0.75],
          [0.7, 0.5],
          [0, 0.25],
        ])
      }
      // avg90 = 0 means practice is just starting → full points
    }
    // No history (first week) → full points — can't penalize baseline
  } else {
    // Fallback: net flow this week vs. 8-week average net flow
    const historicNetFlows = history
      .slice(0, 8)
      .map((w) => (w.matters_opened ?? 0) - (w.matters_closed ?? 0))

    if (historicNetFlows.length > 0) {
      const avgNetFlow =
        historicNetFlows.reduce((s, v) => s + v, 0) / historicNetFlows.length
      const currentNetFlow =
        (current.matters_opened ?? 0) - (current.matters_closed ?? 0)

      // If trend is flat or declining, any non-negative week is fine
      if (avgNetFlow <= 0 || currentNetFlow >= avgNetFlow) {
        matterCountFactor = 1.0
      } else {
        // Scale penalty proportionally to how far below trend
        const ratio = Math.max(0, currentNetFlow) / Math.max(avgNetFlow, 1)
        matterCountFactor = tieredFactor(ratio, [
          [0.9, 1.0],
          [0.8, 0.75],
          [0.7, 0.5],
          [0, 0.25],
        ])
      }
    }
    // No history → full points
  }

  // Component 2: pipeline direction this week
  const opened = current.matters_opened ?? 0
  const closed = current.matters_closed ?? 0
  let directionFactor: number

  if (opened === 0 && closed === 0) {
    directionFactor = 1.0  // quiet week — not penalized
  } else if (opened >= closed) {
    directionFactor = 1.0  // net positive or neutral
  } else {
    // More closed than opened — proportional penalty, floor at 0.25
    directionFactor = Math.max(0.25, opened / Math.max(closed, 1))
  }

  const halfWeight = weight / 2
  const score = halfWeight * matterCountFactor + halfWeight * directionFactor

  return {
    score,
    calculated: true,
    weight,
    components: {
      matter_count_factor: matterCountFactor,
      direction_factor: directionFactor,
      matters_opened: opened,
      matters_closed: closed,
      matters_active: current.matters_active ?? null,
    },
  }
}

// ---------------------------------------------------------------------------
// Risk Exposure
//
// Phase 0 proxy (full signals require deeper Clio sync in Phase 1):
//   Component 1 — AR 90+ days: unpaid invoices past 90 days signal
//                 collection breakdown and potentially stale matters.
//   Component 2 — Trust balance: if Plaid connected, flag accounts below $500.
//
// If only AR data is available (no Plaid trust): AR carries the full dimension.
// ---------------------------------------------------------------------------

export function calcRiskExposure(
  current: WeekSnapshot,
  weight: number
): DimensionScore {
  const hasClioData =
    current.ar_90_plus !== undefined ||
    current.ar_61_90 !== undefined ||
    current.matters_opened !== undefined

  if (!hasClioData) {
    return { score: null, calculated: false, weight, components: {} }
  }

  // Component 1: AR 90+ days
  const ar90 = current.ar_90_plus ?? 0
  const arFactor =
    ar90 === 0 ? 1.0
    : ar90 < 2_000 ? 0.75
    : ar90 < 10_000 ? 0.5
    : 0.25

  // Component 2: Trust balance (Plaid — optional)
  const hasTrustData = current.trust_balance !== undefined
  const trustFactor: number | null = hasTrustData
    ? current.trust_balance! > 500 ? 1.0
      : current.trust_balance! > 0 ? 0.5
      : 0.25
    : null

  let score: number
  if (trustFactor !== null) {
    // Both components present: equal weight
    score = (weight / 2) * arFactor + (weight / 2) * trustFactor
  } else {
    // AR only
    score = weight * arFactor
  }

  return {
    score,
    calculated: true,
    weight,
    components: {
      ar_risk_factor: arFactor,
      trust_factor: trustFactor,
      ar_90_plus: ar90,
      trust_balance: current.trust_balance ?? null,
    },
  }
}

// ---------------------------------------------------------------------------
// Financial Position
//
// Component 1 — Operating balance vs. 13-week rolling average.
// Component 2 — Collection lag: gap between Clio invoiced and Plaid deposited.
//               Zero-invoice weeks default to full (no lag to measure).
// ---------------------------------------------------------------------------

export function calcFinancialPosition(
  current: WeekSnapshot,
  history: WeekSnapshot[],
  weight: number
): DimensionScore {
  if (current.operating_balance === undefined) {
    return { score: null, calculated: false, weight, components: {} }
  }

  // Component 1: balance vs. rolling average
  const historicBalances = history
    .slice(0, 13)
    .map((w) => w.operating_balance)
    .filter((v): v is number => v !== undefined)

  let balanceFactor = 1.0
  if (historicBalances.length > 0) {
    const avg = historicBalances.reduce((s, v) => s + v, 0) / historicBalances.length
    if (avg > 0) {
      const ratio = current.operating_balance / avg
      balanceFactor = tieredFactor(ratio, [
        [0.9, 1.0],
        [0.8, 0.75],
        [0.7, 0.5],
        [0, 0.25],
      ])
    }
    // avg = 0 (balance was zero) → can't calculate ratio; default full
  }
  // No history → full points (baseline week)

  // Component 2: collection lag (Clio invoiced vs Plaid deposited this week)
  let lagFactor = 1.0
  const invoiced = current.invoices_sent_amount ?? 0
  const deposited = current.deposits_total ?? 0

  if (invoiced > 0) {
    const gap = Math.max(0, invoiced - deposited)
    const gapRatio = gap / invoiced
    lagFactor =
      gapRatio <= 0.1 ? 1.0
      : gapRatio <= 0.2 ? 0.75
      : gapRatio <= 0.3 ? 0.5
      : 0.25
  }

  const halfWeight = weight / 2
  const score = halfWeight * balanceFactor + halfWeight * lagFactor

  return {
    score,
    calculated: true,
    weight,
    components: {
      balance_factor: balanceFactor,
      lag_factor: lagFactor,
      operating_balance: current.operating_balance,
      deposits_total: current.deposits_total ?? null,
      invoiced_this_week: invoiced,
    },
  }
}

// ---------------------------------------------------------------------------
// Reputation Velocity
//
// Component 1 — Average star rating.
// Component 2 — New reviews this week (velocity signal).
// ---------------------------------------------------------------------------

export function calcReputationVelocity(
  current: WeekSnapshot,
  weight: number
): DimensionScore {
  if (current.star_rating === undefined) {
    return { score: null, calculated: false, weight, components: {} }
  }

  const rating = current.star_rating
  const ratingFactor = tieredFactor(rating, [
    [4.5, 1.0],
    [4.0, 0.75],
    [3.5, 0.5],
    [0, 0.25],
  ])

  const newReviews = current.new_reviews_count ?? 0
  const totalReviews = current.total_review_count ?? 0
  const velocityFactor =
    newReviews >= 1 ? 1.0           // any new review this week
    : totalReviews > 10 ? 0.75      // established practice, quiet week
    : 0.5                           // newer practice, no reviews

  const halfWeight = weight / 2
  const score = halfWeight * ratingFactor + halfWeight * velocityFactor

  return {
    score,
    calculated: true,
    weight,
    components: {
      rating_factor: ratingFactor,
      velocity_factor: velocityFactor,
      star_rating: rating,
      new_reviews_count: newReviews,
      total_review_count: totalReviews,
    },
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function calculateScore(
  current: WeekSnapshot,
  history: WeekSnapshot[],  // prior weeks, newest first — used for trend averages
  config: ScoreConfig
): ScoreResult {
  const rc = calcRevenueCapture(current, config.revenue_capture_weight)
  const pv = calcPracticeVelocity(current, history, config.practice_velocity_weight)
  const re = calcRiskExposure(current, config.risk_exposure_weight)
  const fp = calcFinancialPosition(current, history, config.financial_position_weight)
  const rv = calcReputationVelocity(current, config.reputation_velocity_weight)

  const composite = normalizeScore([rc, pv, re, fp, rv])

  return {
    composite_score: composite,
    revenue_capture: rc,
    practice_velocity: pv,
    risk_exposure: re,
    financial_position: fp,
    reputation_velocity: rv,
  }
}

// ---------------------------------------------------------------------------
// Snapshot pivot helper
// Converts flat weekly_snapshots rows into WeekSnapshot objects.
// Used by Edge Functions before calling calculateScore.
// ---------------------------------------------------------------------------

export function pivotSnapshots(
  rows: Array<{
    week_ending_date: string
    source: string
    metric_key: string
    metric_value: number
  }>
): WeekSnapshot[] {
  const byWeek = new Map<string, WeekSnapshot>()

  for (const row of rows) {
    const wk = row.week_ending_date
    if (!byWeek.has(wk)) byWeek.set(wk, { week_ending: wk })
    const snap = byWeek.get(wk)!
    ;(snap as Record<string, unknown>)[row.metric_key] = Number(row.metric_value)
  }

  return Array.from(byWeek.values()).sort((a, b) =>
    b.week_ending.localeCompare(a.week_ending)
  )
}
