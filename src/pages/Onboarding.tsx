import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase, callFunction } from "../lib/supabase"
import { useSession } from "../hooks/useSession"
import ProgressBar from "../components/ProgressBar"
import Step1Account from "../components/steps/Step1Account"
import Step2Clio from "../components/steps/Step2Clio"
import Step3Plaid from "../components/steps/Step3Plaid"
import Step4Google from "../components/steps/Step4Google"

interface ConnectionStatus {
  clio_connected: boolean
  plaid_connected: boolean
  google_connected: boolean
}

// Derive the current step from what's connected
function resolveStep(
  hasSession: boolean,
  status: ConnectionStatus | null
): number {
  if (!hasSession) return 0
  if (!status?.clio_connected) return 1
  if (!status?.plaid_connected) return 2
  if (!status?.google_connected) return 3
  return 3 // on step 3 (Google), onDone triggers checkout
}

export default function Onboarding() {
  const session = useSession()
  const navigate = useNavigate()
  const [status, setStatus] = useState<ConnectionStatus | null>(null)
  const [loadingCheckout, setLoadingCheckout] = useState(false)
  const [checkoutError, setCheckoutError] = useState("")

  async function loadStatus() {
    if (!session) return
    const { data } = await supabase
      .from("connection_status")
      .select("clio_connected, plaid_connected, google_connected")
      .eq("attorney_id", session.user.id)
      .single()
    setStatus(data)
  }

  useEffect(() => {
    loadStatus()
  }, [session])

  // Redirect to /account if already subscribed
  useEffect(() => {
    if (!session) return
    supabase
      .from("attorneys")
      .select("subscription_status")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => {
        if (data?.subscription_status === "active") navigate("/account", { replace: true })
      })
  }, [session])

  const step = resolveStep(!!session, status)

  async function handleCheckout() {
    setLoadingCheckout(true)
    setCheckoutError("")
    try {
      const origin = window.location.origin
      const { url } = await callFunction<{ url: string }>("create-checkout-session", {
        successUrl: `${origin}/stripe/success`,
        cancelUrl: `${origin}/onboarding`,
      })
      window.location.href = url
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Could not start checkout")
      setLoadingCheckout(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">PracticeIQ</h1>
          <p className="text-sm text-gray-500 mt-1">Weekly practice intelligence for solo attorneys</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <ProgressBar current={step} />

          {step === 0 && (
            <Step1Account onDone={() => loadStatus()} />
          )}

          {step === 1 && (
            <Step2Clio
              connected={status?.clio_connected ?? false}
              onDone={() => loadStatus()}
            />
          )}

          {step === 2 && (
            <Step3Plaid
              connected={status?.plaid_connected ?? false}
              onDone={() => loadStatus()}
            />
          )}

          {step === 3 && (
            <>
              <Step4Google
                connected={status?.google_connected ?? false}
                onDone={handleCheckout}
              />
              {checkoutError && (
                <p className="mt-3 text-sm text-red-600">{checkoutError}</p>
              )}
              {loadingCheckout && (
                <p className="mt-3 text-sm text-gray-500">Redirecting to checkout…</p>
              )}
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          $99/month · Cancel anytime · First email sends the following Sunday
        </p>
      </div>
    </div>
  )
}
