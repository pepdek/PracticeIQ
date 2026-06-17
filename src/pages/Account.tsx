import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase, callFunction } from "../lib/supabase"
import { useSession } from "../hooks/useSession"

interface AttorneyData {
  email: string
  subscription_status: string
  last_email_sent_at: string | null
  last_email_subject: string | null
}

interface ConnectionStatus {
  clio_connected: boolean
  plaid_connected: boolean
  google_connected: boolean
}

function StatusBadge({ connected }: { connected: boolean }) {
  return connected ? (
    <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5 text-xs font-medium">
      <span>✓</span> Connected
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5 text-xs font-medium">
      Not connected
    </span>
  )
}

export default function Account() {
  const session = useSession()
  const navigate = useNavigate()
  const [attorney, setAttorney] = useState<AttorneyData | null>(null)
  const [connections, setConnections] = useState<ConnectionStatus | null>(null)
  const [unsubscribeLoading, setUnsubscribeLoading] = useState(false)
  const [unsubscribeError, setUnsubscribeError] = useState("")
  const [unsubscribeConfirm, setUnsubscribeConfirm] = useState(false)

  useEffect(() => {
    if (!session) return
    Promise.all([
      supabase
        .from("attorneys")
        .select("email, subscription_status, last_email_sent_at, last_email_subject")
        .eq("id", session.user.id)
        .single()
        .then(({ data }) => setAttorney(data)),
      supabase
        .from("connection_status")
        .select("clio_connected, plaid_connected, google_connected")
        .eq("attorney_id", session.user.id)
        .single()
        .then(({ data }) => setConnections(data)),
    ])
  }, [session])

  async function handleUnsubscribe() {
    setUnsubscribeLoading(true)
    setUnsubscribeError("")
    try {
      await callFunction("cancel-subscription")
      setAttorney((prev) => prev ? { ...prev, subscription_status: "cancelled" } : prev)
      setUnsubscribeConfirm(false)
    } catch (err) {
      setUnsubscribeError(err instanceof Error ? err.message : "Cancellation failed")
    } finally {
      setUnsubscribeLoading(false)
    }
  }

  function reconnectClio() {
    navigate("/onboarding")
  }

  function reconnectPlaid() {
    navigate("/onboarding")
  }

  function reconnectGoogle() {
    navigate("/onboarding")
  }

  if (!attorney || !connections) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading…</p>
      </div>
    )
  }

  const lastSentDate = attorney.last_email_sent_at
    ? new Date(attorney.last_email_sent_at).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-lg mx-auto pt-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">PracticeIQ</h1>
          <p className="text-sm text-gray-500 mt-0.5">{attorney.email}</p>
        </div>

        {/* Connected sources */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-4">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Connected sources
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {[
              { label: "Clio", key: "clio_connected" as const, onReconnect: reconnectClio },
              { label: "Plaid (bank)", key: "plaid_connected" as const, onReconnect: reconnectPlaid },
              { label: "Google Business Profile", key: "google_connected" as const, onReconnect: reconnectGoogle },
            ].map(({ label, key, onReconnect }) => (
              <div key={key} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{label}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge connected={connections[key]} />
                  <button
                    onClick={onReconnect}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Reconnect
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Subscription */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-4">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Subscription
            </h2>
          </div>
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-700">Status</span>
              <span
                className={`text-sm font-medium ${
                  attorney.subscription_status === "active"
                    ? "text-green-700"
                    : "text-gray-500"
                }`}
              >
                {attorney.subscription_status === "active" ? "Active" : "Cancelled"}
              </span>
            </div>
            <p className="text-xs text-gray-400">$99/month · weekly email every Sunday</p>
          </div>
        </div>

        {/* Last email */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-4">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Last email sent
            </h2>
          </div>
          <div className="px-6 py-4">
            {lastSentDate ? (
              <>
                <p className="text-sm text-gray-900 font-medium">{attorney.last_email_subject}</p>
                <p className="text-xs text-gray-400 mt-0.5">{lastSentDate}</p>
              </>
            ) : (
              <p className="text-sm text-gray-400">No emails sent yet. First email arrives this Sunday.</p>
            )}
          </div>
        </div>

        {/* Unsubscribe */}
        {attorney.subscription_status === "active" && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-8">
            <div className="px-6 py-4">
              {!unsubscribeConfirm ? (
                <button
                  onClick={() => setUnsubscribeConfirm(true)}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Cancel subscription
                </button>
              ) : (
                <div>
                  <p className="text-sm text-gray-700 mb-3">
                    This will stop future emails. Your data is retained for 90 days. Are you sure?
                  </p>
                  {unsubscribeError && (
                    <p className="text-sm text-red-600 mb-3">{unsubscribeError}</p>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={handleUnsubscribe}
                      disabled={unsubscribeLoading}
                      className="text-sm bg-red-600 text-white px-4 py-1.5 rounded-md font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      {unsubscribeLoading ? "Cancelling…" : "Yes, cancel"}
                    </button>
                    <button
                      onClick={() => setUnsubscribeConfirm(false)}
                      className="text-sm text-gray-600 hover:text-gray-700 font-medium"
                    >
                      Keep subscription
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
