import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { useSession } from "./hooks/useSession"
import Onboarding from "./pages/Onboarding"
import Account from "./pages/Account"
import AuthCallbackClio from "./pages/AuthCallbackClio"
import AuthCallbackGoogle from "./pages/AuthCallbackGoogle"
import StripeSuccess from "./pages/StripeSuccess"

export default function App() {
  const session = useSession()

  // undefined = still loading auth state
  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/auth/clio" element={<AuthCallbackClio />} />
        <Route path="/auth/google" element={<AuthCallbackGoogle />} />
        <Route path="/stripe/success" element={<StripeSuccess />} />
        <Route
          path="/account"
          element={session ? <Account /> : <Navigate to="/onboarding" replace />}
        />
        <Route
          path="/"
          element={
            session ? <Navigate to="/account" replace /> : <Navigate to="/onboarding" replace />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
