import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"

// ── Types ──────────────────────────────────────────────────────────────────

interface DimensionScore {
  score: number | null
  calculated: boolean
  weight: number
  components: Record<string, number | null>
}

interface DrillDownResponse {
  status: "ready" | "expired" | "not_found"
  score?: {
    composite_score: number
    week_ending_date: string
    score_delta: number | null
    prior_week_score: number | null
  }
  sparkline?: Array<{ week_ending: string; score: number }>
  dimensions?: {
    revenue_capture: DimensionScore
    practice_velocity: DimensionScore
    risk_exposure: DimensionScore
    financial_position: DimensionScore
    reputation_velocity: DimensionScore
  } | null
}

// ── Helpers ────────────────────────────────────────────────────────────────

function scoreStatus(s: number): string {
  if (s >= 85) return "Healthy"
  if (s >= 70) return "Stable"
  if (s >= 55) return "Needs attention"
  return "At risk"
}

function fmt$(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—"
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
}

function fmtPct(factor: number | null | undefined): string {
  if (factor === null || factor === undefined) return "—"
  return `${Math.round(factor * 100)}%`
}

function fmtDate(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

// ── Sparkline ──────────────────────────────────────────────────────────────

function Sparkline({ data }: { data: Array<{ week_ending: string; score: number }> }) {
  if (data.length < 2) return null

  const W = 500
  const H = 70
  const PAD = { top: 8, right: 8, bottom: 8, left: 8 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom

  const xs = data.map((_, i) => PAD.left + (i / (data.length - 1)) * plotW)
  const ys = data.map((d) => PAD.top + (1 - d.score / 100) * plotH)

  const linePath = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x},${ys[i]}`).join(" ")
  const areaPath = `${linePath} L ${xs[xs.length - 1]},${H - PAD.bottom} L ${xs[0]},${H - PAD.bottom} Z`

  const last = data.length - 1

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 70 }}>
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <path d={areaPath} fill="url(#sg)" />
      {/* Line */}
      <path d={linePath} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {/* Dots — past weeks subtle, current week bright */}
      {data.map((_, i) => (
        <circle
          key={i}
          cx={xs[i]}
          cy={ys[i]}
          r={i === last ? 4 : 2.5}
          fill={i === last ? "white" : "rgba(255,255,255,0.35)"}
        />
      ))}
    </svg>
  )
}

// ── Dimension card ─────────────────────────────────────────────────────────

const DIMENSION_META: Record<
  string,
  { label: string; bullets: (c: Record<string, number | null>) => string[] }
> = {
  revenue_capture: {
    label: "Revenue Capture",
    bullets: (c) => [
      `Realization: ${fmtPct(c.realization_factor)}`,
      `Collection: ${fmtPct(c.collection_factor)}`,
      ...(c.ar_over_60_days ? [`AR 60+ days: ${fmt$(c.ar_over_60_days)}`] : []),
      ...((c.ar_penalty_points ?? 0) > 0 ? [`Aging penalty: −${c.ar_penalty_points} pts`] : []),
    ],
  },
  practice_velocity: {
    label: "Practice Velocity",
    bullets: (c) => [
      ...(c.matters_active !== null ? [`Active matters: ${c.matters_active}`] : []),
      `Opened this week: ${c.matters_opened ?? 0}`,
      `Closed this week: ${c.matters_closed ?? 0}`,
    ],
  },
  risk_exposure: {
    label: "Risk Exposure",
    bullets: (c) => [
      `AR 90+ days: ${fmt$(c.ar_90_plus)}`,
      ...(c.trust_balance !== null ? [`Trust balance: ${fmt$(c.trust_balance)}`] : []),
    ],
  },
  financial_position: {
    label: "Financial Position",
    bullets: (c) => [
      `Operating balance: ${fmt$(c.operating_balance)}`,
      ...(c.invoiced_this_week ? [`Invoiced this week: ${fmt$(c.invoiced_this_week)}`] : []),
      ...(c.deposits_total !== null ? [`Deposited this week: ${fmt$(c.deposits_total)}`] : []),
    ],
  },
  reputation_velocity: {
    label: "Reputation Velocity",
    bullets: (c) => [
      `Rating: ${c.star_rating?.toFixed(1) ?? "—"} ★`,
      `New reviews this week: ${c.new_reviews_count ?? 0}`,
      `Total reviews: ${c.total_review_count ?? 0}`,
    ],
  },
}

function DimensionCard({
  dimKey,
  dim,
}: {
  dimKey: string
  dim: DimensionScore
}) {
  const meta = DIMENSION_META[dimKey]
  if (!meta) return null

  const scoreDisplay =
    dim.score !== null ? `${dim.score.toFixed(1)} / ${dim.weight}` : "—"
  const fillPct =
    dim.score !== null ? Math.round((dim.score / dim.weight) * 100) : 0
  const bullets = dim.calculated ? meta.bullets(dim.components) : []

  return (
    <div
      className="rounded-lg p-4"
      style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-white/70 text-sm">{meta.label}</span>
        <span className="text-white text-sm font-medium tabular-nums">{scoreDisplay}</span>
      </div>

      {/* Score bar */}
      <div className="h-1 rounded-full mb-3" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
        {dim.calculated && (
          <div
            className="h-1 rounded-full transition-all"
            style={{ width: `${fillPct}%`, backgroundColor: fillPct >= 75 ? "#6ee7b7" : fillPct >= 50 ? "#fcd34d" : "#f87171" }}
          />
        )}
      </div>

      {dim.calculated ? (
        <ul className="space-y-1">
          {bullets.slice(0, 3).map((b, i) => (
            <li key={i} className="text-white/40 text-xs">{b}</li>
          ))}
        </ul>
      ) : (
        <p className="text-white/25 text-xs italic">Source not connected</p>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

const BG = "#1a3a2a"

export default function ScoreDrillDown() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<DrillDownResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/score-by-token?token=${encodeURIComponent(token)}`
    )
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData({ status: "not_found" }))
      .finally(() => setLoading(false))
  }, [token])

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: BG }}>
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-2 h-2 rounded-full bg-white/30 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
          ))}
        </div>
      </div>
    )
  }

  // ── Expired ──
  if (data?.status === "expired") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8" style={{ backgroundColor: BG }}>
        <p className="text-white/60 text-sm text-center max-w-xs">
          This report has expired. Your next score arrives Sunday.
        </p>
      </div>
    )
  }

  // ── Not found ──
  if (!data || data.status === "not_found" || !data.score) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8" style={{ backgroundColor: BG }}>
        <p className="text-white/60 text-sm text-center max-w-xs">Score not found.</p>
      </div>
    )
  }

  const { score, sparkline, dimensions } = data
  const delta = score.score_delta
  const deltaLabel =
    delta === null ? null
    : delta > 0 ? `↑ ${delta.toFixed(0)} from last week`
    : delta < 0 ? `↓ ${Math.abs(delta).toFixed(0)} from last week`
    : "Unchanged from last week"

  type DimKey = keyof NonNullable<typeof dimensions>
  const dimKeys: DimKey[] = [
    "revenue_capture",
    "practice_velocity",
    "risk_exposure",
    "financial_position",
    "reputation_velocity",
  ]

  return (
    <div className="min-h-screen py-16 px-6" style={{ backgroundColor: BG }}>
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <p className="text-white/50 text-xs tracking-widest uppercase mb-6">
          Practice Health Score · {fmtDate(score.week_ending_date)}
        </p>

        {/* Score + status */}
        <div className="flex items-end gap-4 mb-2">
          <div
            className="text-white tabular-nums"
            style={{ fontFamily: "'DM Serif Display', serif", fontSize: "80px", lineHeight: 1 }}
          >
            {score.composite_score}
          </div>
          <div className="mb-3">
            <span
              className="text-xs px-2 py-1 rounded-full"
              style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}
            >
              {scoreStatus(score.composite_score)}
            </span>
          </div>
        </div>

        {deltaLabel && (
          <p className="text-white/40 text-sm mb-10">{deltaLabel}</p>
        )}

        {/* Sparkline */}
        {sparkline && sparkline.length >= 2 && (
          <div className="mb-10">
            <p className="text-white/30 text-xs mb-3 tracking-wide uppercase">12-week trend</p>
            <Sparkline data={sparkline} />
          </div>
        )}

        {/* Dimension cards */}
        {dimensions && (
          <>
            <p className="text-white/30 text-xs mb-4 tracking-wide uppercase">Score breakdown</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {dimKeys.map((k) => (
                <DimensionCard key={k} dimKey={k} dim={dimensions[k]} />
              ))}
            </div>
          </>
        )}

        <p className="text-white/20 text-xs text-center mt-12">
          PracticeIQ · This report expires 7 days after delivery.
        </p>
      </div>
    </div>
  )
}
