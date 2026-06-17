import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { callFunction } from "../lib/supabase"
import { useSession } from "../hooks/useSession"

export default function AuthCallbackClio() {
  const navigate = useNavigate()
  const session = useSession()
  const [error, setError] = useState("")

  useEffect(() => {
    if (session === undefined) return // still loading

    const params = new URLSearchParams(window.location.search)
    const code = params.get("code")
    const state = params.get("state")
    const storedState = sessionStorage.getItem("clio_oauth_state")

    if (!code) {
      setError("No authorization code received from Clio.")
      return
    }

    if (!state || state !== storedState) {
      setError("OAuth state mismatch. Please try connecting again.")
      return
    }

    sessionStorage.removeItem("clio_oauth_state")

    if (!session) {
      // Session not ready — redirect to onboarding to re-authenticate
      navigate("/onboarding", { replace: true })
      return
    }

    callFunction("exchange-oauth-token", {
      provider: "clio",
      code,
      redirectUri: import.meta.env.VITE_CLIO_REDIRECT_URI as string,
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
      <p className="text-gray-500 text-sm">Connecting Clio…</p>
    </div>
  )
}
