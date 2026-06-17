// Exchanges an authorization code for Clio or Google tokens.
// Called from the frontend OAuth callback pages.
// Requires a valid Supabase session JWT in the Authorization header.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const CLIO_TOKEN_URL = "https://app.clio.com/oauth/token"
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
const GBP_API = "https://mybusiness.googleapis.com/v4"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS })
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 })

  const authHeader = req.headers.get("Authorization")
  if (!authHeader) return new Response("Unauthorized", { status: 401 })

  // Authenticate the caller — use anon client so the JWT is verified
  const userSupabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  )
  const { data: { user }, error: authErr } = await userSupabase.auth.getUser()
  if (authErr || !user) return new Response("Unauthorized", { status: 401 })

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  let body: { provider: string; code: string; redirectUri: string }
  try {
    body = await req.json()
  } catch {
    return new Response("Invalid JSON", { status: 400 })
  }

  const { provider, code, redirectUri } = body
  if (!provider || !code || !redirectUri) {
    return new Response("Missing required fields", { status: 400 })
  }
  if (!["clio", "google"].includes(provider)) {
    return new Response("Unknown provider", { status: 400 })
  }

  try {
    if (provider === "clio") {
      await exchangeClio(supabase, user.id, code, redirectUri)
    } else {
      await exchangeGoogle(supabase, user.id, code, redirectUri)
    }
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error(`exchange-oauth-token [${provider}] for ${user.id}:`, err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    )
  }
})

async function exchangeClio(
  supabase: ReturnType<typeof createClient>,
  attorneyId: string,
  code: string,
  redirectUri: string
): Promise<void> {
  const res = await fetch(CLIO_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: Deno.env.get("CLIO_CLIENT_ID")!,
      client_secret: Deno.env.get("CLIO_CLIENT_SECRET")!,
      redirect_uri: redirectUri,
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Clio token exchange failed (${res.status}): ${body}`)
  }
  const data = await res.json()
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()

  const { error } = await supabase.from("oauth_tokens").upsert(
    {
      attorney_id: attorneyId,
      provider: "clio",
      access_token: data.access_token,
      refresh_token: data.refresh_token ?? null,
      token_expires_at: expiresAt,
      scope: data.scope ?? null,
    },
    { onConflict: "attorney_id,provider" }
  )
  if (error) throw new Error(`DB upsert failed: ${error.message}`)
}

async function exchangeGoogle(
  supabase: ReturnType<typeof createClient>,
  attorneyId: string,
  code: string,
  redirectUri: string
): Promise<void> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
      redirect_uri: redirectUri,
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Google token exchange failed (${res.status}): ${body}`)
  }
  const data = await res.json()
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()

  // Discover GBP location at connect time so syncs don't need to do it
  let providerMetadata: Record<string, string> = {}
  try {
    const locationName = await discoverGBPLocation(data.access_token)
    providerMetadata = { gbp_location_name: locationName }
  } catch (err) {
    // Non-fatal — sync-google has a fallback discovery path
    console.warn("GBP location discovery failed at connect time:", err)
  }

  const { error } = await supabase.from("oauth_tokens").upsert(
    {
      attorney_id: attorneyId,
      provider: "google",
      access_token: data.access_token,
      refresh_token: data.refresh_token ?? null,
      token_expires_at: expiresAt,
      scope: data.scope ?? null,
      provider_metadata: providerMetadata,
    },
    { onConflict: "attorney_id,provider" }
  )
  if (error) throw new Error(`DB upsert failed: ${error.message}`)
}

async function discoverGBPLocation(accessToken: string): Promise<string> {
  const accountsRes = await fetch(`${GBP_API}/accounts`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!accountsRes.ok) throw new Error(`GBP accounts failed: ${accountsRes.status}`)
  const accountsData = await accountsRes.json()
  const accountName: string | undefined = accountsData.accounts?.[0]?.name
  if (!accountName) throw new Error("No GBP account found")

  const locRes = await fetch(`${GBP_API}/${accountName}/locations?pageSize=1`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!locRes.ok) throw new Error(`GBP locations failed: ${locRes.status}`)
  const locData = await locRes.json()
  const locationName: string | undefined = locData.locations?.[0]?.name
  if (!locationName) throw new Error("No GBP location found")

  return locationName
}
