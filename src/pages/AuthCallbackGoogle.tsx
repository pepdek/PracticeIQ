import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { callFunction } from "../lib/supabase"
import { useSession } from "../hooks/useSession"

export default function AuthCallbackGoogle() {
  const navigate = useNavigate()
  const session = useSession()
  const [error, setError] = useState("")

  useEffect(() => {
    if (session === undefined) return // still loading

    const params = new URLSearchParams(window.location.search)
    const code = params.get("code")
    const state = params.get("state")
    const storedState = sessionStorage.getItem("google_oauth_state")

    if (!code) {
      setError("No authorization code received from Google.")
      return
    }

    if (!state || state !== storedState) {
      setError("OAuth state mismatch. Please try connecting again.")
      return
    }

    sessionStorage.removeItem("google_oauth_state")

    if (!session) {
      navigate("/onboarding", { replace: true })
      return
    }

    callFunction("exchange-oauth-token", {
      provider: "google",
      code,
      redirectUri: import.meta.env.VITE_GOOGLE_REDIRECT_URI as string,
    })
      .then(() => navigate("/onboarding", { replace: true }))
      .catch((err) => setError(err instanceof Error ? err.message : "Token exchange failed"))
  }, [session])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-sm text-center">
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <a href="/onboarding" className="text-indigo-600 text-sm underline">
            Back to onboarding
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500 text-sm">Connecting Google Business Profile…</p>
    </div>
  )
}
