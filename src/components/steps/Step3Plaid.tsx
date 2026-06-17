import { useState, useCallback } from "react"
import { usePlaidLink } from "react-plaid-link"
import type { PlaidLinkOnSuccess } from "react-plaid-link"
import { callFunction } from "../../lib/supabase"

interface PlaidAccount {
  id: string
  name: string
  mask: string
  subtype: string
}

export default function Step3Plaid({
  connected,
  onDone,
}: {
  connected: boolean
  onDone: () => void
}) {
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [accounts, setAccounts] = useState<PlaidAccount[]>([])
  const [publicToken, setPublicToken] = useState("")
  const [institutionId, setInstitutionId] = useState("")
  const [institutionName, setInstitutionName] = useState("")
  const [operatingId, setOperatingId] = useState("")
  const [trustId, setTrustId] = useState("")
  const [saving, setSaving] = useState(false)

  const onPlaidSuccess = useCallback<PlaidLinkOnSuccess>(
    (token, metadata) => {
      setPublicToken(token)
      setInstitutionId(metadata.institution?.institution_id ?? "")
      setInstitutionName(metadata.institution?.name ?? "")
      const mapped: PlaidAccount[] = metadata.accounts.map((a) => ({
        id: a.id,
        name: a.name,
        mask: a.mask ?? "",
        subtype: a.subtype ?? "",
      }))
      setAccounts(mapped)
      if (mapped.length > 0) setOperatingId(mapped[0].id)
    },
    []
  )

  const { open: openPlaid, ready: plaidReady } = usePlaidLink({
    token: linkToken ?? "",
    onSuccess: onPlaidSuccess,
    onExit: () => setLoading(false),
  })

  async function fetchLinkToken() {
    setLoading(true)
    setError("")
    try {
      const data = await callFunction<{ link_token: string }>("plaid-create-link-token")
      setLinkToken(data.link_token)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start bank connection")
      setLoading(false)
    }
  }

  // Open Plaid Link once we have a token
  if (linkToken && plaidReady && !accounts.length) {
    openPlaid()
  }

  async function saveAccounts() {
    if (!operatingId) return
    setSaving(true)
    setError("")
    try {
      await callFunction("plaid-exchange-token", {
        public_token: publicToken,
        institution_id: institutionId,
        institution_name: institutionName,
        operating_account_id: operatingId,
        trust_account_id: trustId || undefined,
      })
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save bank connection")
    } finally {
      setSaving(false)
    }
  }

  if (connected) {
    return (
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Bank account connected</h2>
        <p className="text-sm text-gray-500 mb-6">
          PracticeIQ reads deposit totals and account balances only.
        </p>
        <div className="flex items-center gap-2 text-green-600 mb-6">
          <span className="text-lg">✓</span>
          <span className="text-sm font-medium">Bank account connected</span>
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

  // Account designation screen — shown after Plaid Link returns with multiple accounts
  if (accounts.length > 0) {
    const otherAccounts = accounts.filter((a) => a.id !== operatingId)
    return (
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Confirm your accounts</h2>
        <p className="text-sm text-gray-500 mb-6">
          Tell us which account is your operating account. If you have an IOLTA trust account,
          select it below — otherwise leave it blank.
        </p>
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Operating account <span className="text-red-500">*</span>
            </label>
            <select
              value={operatingId}
              onChange={(e) => setOperatingId(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} (···{a.mask})
                </option>
              ))}
            </select>
          </div>
          {otherAccounts.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                IOLTA trust account <span className="text-gray-400">(optional)</span>
              </label>
              <select
                value={trustId}
                onChange={(e) => setTrustId(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">None</option>
                {otherAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} (···{a.mask})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
        <button
          onClick={saveAccounts}
          disabled={!operatingId || saving}
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving…" : "Confirm and continue"}
        </button>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Connect your bank</h2>
      <p className="text-sm text-gray-500 mb-6">
        PracticeIQ reads weekly deposit totals and account balances from your operating and trust
        accounts. No transaction descriptions are ever stored or shown.
      </p>
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      <button
        onClick={fetchLinkToken}
        disabled={loading}
        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "Opening bank connection…" : "Connect bank account"}
      </button>
    </div>
  )
}
