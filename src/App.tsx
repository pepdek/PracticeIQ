import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { useSession } from "./hooks/useSession"
import Onboarding from "./pages/Onboarding"
import Account from "./pages/Account"
import AuthCallbackClio from "./pages/AuthCallbackClio"
import AuthCallbackGoogle from "./pages/AuthCallbackGoogle"
import StripeSuccess from "./pages/StripeSuccess"
import FirstRunScore from "./pages/FirstRunScore"
import ScoreDrillDown from "./pages/ScoreDrillDown"
import Landing from "./pages/Landing"

export default function App() {
  const session = useSession()

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/auth/clio" element={<AuthCallbackClio />} />
        <Route path="/auth/google" element={<AuthCallbackGoogle />} />
        <Route path="/stripe/success" element={<StripeSuccess />} />
        <Route
          path="/first-run"
          element={session ? <FirstRunScore /> : session === null ? <Navigate to="/onboarding" replace /> : null}
        />
        <Route
          path="/account"
          element={session ? <Account /> : session === null ? <Navigate to="/onboarding" replace /> : null}
        />
        {/* Root: redirect logged-in users, show Landing for everyone else (including loading) */}
        <Route
          path="/"
          element={session ? <Navigate to="/account" replace /> : <Landing />}
        />
        {/* Public — no auth required, token is the credential */}
        <Route path="/score/:token" element={<ScoreDrillDown />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
