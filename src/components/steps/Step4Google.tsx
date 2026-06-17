import { useState } from "react"

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string
const REDIRECT_URI = import.meta.env.VITE_GOOGLE_REDIRECT_URI as string
const SCOPE = "https://www.googleapis.com/auth/business.manage"

export default function Step4Google({
  connected,
  onDone,
}: {
  connected: boolean
  onDone: () => void
}) {
  const [loading, setLoading] = useState(false)

  function connectGoogle() {
    setLoading(true)
    const state = crypto.randomUUID()
    sessionStorage.setItem("google_oauth_state", state)

    const url = new URL(GOOGLE_AUTH_URL)
    url.searchParams.set("response_type", "code")
    url.searchParams.set("client_id", CLIENT_ID)
    url.searchParams.set("redirect_uri", REDIRECT_URI)
    url.searchParams.set("scope", SCOPE)
    url.searchParams.set("state", state)
    url.searchParams.set("access_type", "offline")  // required for refresh token
    url.searchParams.set("prompt", "consent")        // ensures refresh token is returned
    window.location.href = url.toString()
  }

  if (connected) {
    return (
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Google Business Profile connected</h2>
        <p className="text-sm text-gray-500 mb-6">
          PracticeIQ can now read your star rating and review activity.
        </p>
        <div className="flex items-center gap-2 text-green-600 mb-6">
          <span className="text-lg">✓</span>
          <span className="text-sm font-medium">Google Business Profile connected</span>
        </div>
        <button
          onClick={onDone}
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          Proceed to checkout
        </button>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Connect Google Business Profile</h2>
      <p className="text-sm text-gray-500 mb-6">
        PracticeIQ reads your star rating, total review count, and new review activity each week.
        It never responds to reviews or modifies your listing.
      </p>
      <button
        onClick={connectGoogle}
        disabled={loading}
        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "Redirecting to Google…" : "Connect Google Business Profile"}
      </button>
    </div>
  )
}
