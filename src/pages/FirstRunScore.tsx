import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { callFunction } from "../lib/supabase"

interface ScoreResponse {
  status: "ready" | "no_data"
  composite_score?: number
  token?: string
  week_ending?: string
  message?: string
  dimensions?: {
    revenue_capture: { calculated: boolean }
    practice_velocity: { calculated: boolean }
    risk_exposure: { calculated: boolean }
    financial_position: { calculated: boolean }
    reputation_velocity: { calculated: boolean }
  }
}

type PageState = "calculating" | "ready" | "delayed"

export default function FirstRunScore() {
  const navigate = useNavigate()
  const [pageState, setPageState] = useState<PageState>("calculating")
  const [score, setScore] = useState<number | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [weekEnding, setWeekEnding] = useState<string | null>(null)
  const [connectedCount, setConnectedCount] = useState<number>(0)

  useEffect(() => {
    callFunction<ScoreResponse>("first-run-score")
      .then((res) => {
        if (res.status === "ready" && res.composite_score !== undefined && res.token) {
          setScore(res.composite_score)
          setToken(res.token)
          setWeekEnding(res.week_ending ?? null)
          if (res.dimensions) {
            const count = Object.values(res.dimensions).filter((d) => d.calculated).length
            setConnectedCount(count)
          }
          setPageState("ready")
        } else {
          setPageState("delayed")
        }
      })
      .catch(() => setPageState("delayed"))
  }, [])

  const formattedDate = weekEnding
    ? new Date(weekEnding + "T12:00:00").toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null

  // ── Calculating ──────────────────────────────────────────────────────────
  if (pageState === "calculating") {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-8"
        style={{ backgroundColor: "#1a3a2a" }}
      >
        <p className="text-white/60 text-sm tracking-widest uppercase mb-10">
          Calculating your score
        </p>
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-white/40 animate-pulse"
              style={{ animationDelay: `${i * 200}ms` }}
            />
          ))}
        </div>
        <p className="text-white/30 text-xs mt-10 max-w-xs text-center">
          Syncing your data from connected sources — this takes about 15 seconds.
        </p>
      </div>
    )
  }

  // ── Delayed ───────────────────────────────────────────────────────────────
  if (pageState === "delayed") {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-8"
        style={{ backgroundColor: "#1a3a2a" }}
      >
        <p className="text-white/60 text-sm tracking-widest uppercase mb-6">
          Almost there
        </p>
        <p className="text-white text-xl text-center max-w-sm mb-4">
          Your score is being calculated.
        </p>
        <p className="text-white/50 text-sm text-center max-w-xs mb-10">
          It will be ready in your first Sunday email at 6pm Pacific.
        </p>
        <button
          onClick={() => navigate("/account", { replace: true })}
          className="text-white/60 text-sm underline underline-offset-4 hover:text-white transition-colors"
        >
          Go to your account
        </button>
      </div>
    )
  }

  // ── Ready ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8"
      style={{ backgroundColor: "#1a3a2a" }}
    >
      <p className="text-white/60 text-sm tracking-widest uppercase mb-8">
        Practice Health Score
      </p>

      <div
        className="text-white tabular-nums"
        style={{ fontFamily: "'DM Serif Display', serif", fontSize: "96px", lineHeight: 1 }}
      >
        {score}
      </div>

      <p className="text-white/40 text-xs mt-4 tracking-wide">
        out of 100{connectedCount > 0 && connectedCount < 5 && ` · ${connectedCount} of 5 sources connected`}
      </p>

      {formattedDate && (
        <p className="text-white/30 text-xs mt-1">Week ending {formattedDate}</p>
      )}

      {token && (
        <button
          onClick={() => navigate(`/score/${token}`)}
          className="mt-12 text-white/60 text-sm hover:text-white transition-colors flex items-center gap-1"
        >
          View breakdown
          <span aria-hidden>→</span>
        </button>
      )}

      <button
        onClick={() => navigate("/account", { replace: true })}
        className="mt-4 text-white/30 text-xs hover:text-white/60 transition-colors"
      >
        Go to account
      </button>
    </div>
  )
}
