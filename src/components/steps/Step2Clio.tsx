import { useState } from "react"

const CLIO_AUTH_URL = "https://app.clio.com/oauth/authorize"
const CLIENT_ID = import.meta.env.VITE_CLIO_CLIENT_ID as string
const REDIRECT_URI = import.meta.env.VITE_CLIO_REDIRECT_URI as string
// Read-only scopes for matters, time entries, and bills
const SCOPE = "contacts matters time_entries bills"

export default function Step2Clio({
  connected,
  onDone,
}: {
  connected: boolean
  onDone: () => void
}) {
  const [loading, setLoading] = useState(false)

  function connectClio() {
    setLoading(true)
    // Store a CSRF state token before leaving the page
    const state = crypto.randomUUID()
    sessionStorage.setItem("clio_oauth_state", state)

    const url = new URL(CLIO_AUTH_URL)
    url.searchParams.set("response_type", "code")
    url.searchParams.set("client_id", CLIENT_ID)
    url.searchParams.set("redirect_uri", REDIRECT_URI)
    url.searchParams.set("scope", SCOPE)
    url.searchParams.set("state", state)
    window.location.href = url.toString()
  }

  if (connected) {
    return (
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Clio connected</h2>
        <p className="text-sm text-gray-500 mb-6">
          PracticeIQ can now read your matters, time entries, and invoices.
        </p>
        <div className="flex items-center gap-2 text-green-600 mb-6">
          <span className="text-lg">✓</span>
          <span className="text-sm font-medium">Clio account connected</span>
        </div>
        <button
          onClick={onDone}
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          Continue
        </button>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Connect Clio</h2>
      <p className="text-sm text-gray-500 mb-6">
        PracticeIQ reads your matters, time entries, invoices, and AR aging. It never writes
        to Clio or stores client names.
      </p>
      <button
        onClick={connectClio}
        disabled={loading}
        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "Redirecting to Clio…" : "Connect Clio"}
      </button>
    </div>
  )
}
