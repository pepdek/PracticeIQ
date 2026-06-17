import { useEffect } from "react"
import { useNavigate } from "react-router-dom"

export default function StripeSuccess() {
  const navigate = useNavigate()

  // Stripe's webhook activates the subscription asynchronously.
  // Give it a moment before redirecting to /account so the status is current.
  useEffect(() => {
    const timer = setTimeout(() => navigate("/account", { replace: true }), 2500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="text-4xl mb-4">✓</div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">You're all set</h1>
        <p className="text-sm text-gray-500">
          Your subscription is active. Your first email will arrive this Sunday at 6pm Pacific.
        </p>
        <p className="text-xs text-gray-400 mt-4">Taking you to your account…</p>
      </div>
    </div>
  )
}
