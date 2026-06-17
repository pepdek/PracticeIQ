import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
}

function plaidUrl(path: string): string {
  const env = Deno.env.get("PLAID_ENV") ?? "sandbox"
  return `https://${env}.plaid.com${path}`
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS })
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 })

  const authHeader = req.headers.get("Authorization")
  if (!authHeader) return new Response("Unauthorized", { status: 401 })

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

  let body: {
    public_token: string
    institution_id: string
    institution_name: string
    operating_account_id: string
    trust_account_id?: string
  }
  try {
    body = await req.json()
  } catch {
    return new Response("Invalid JSON", { status: 400 })
  }

  const { public_token, institution_id, institution_name, operating_account_id, trust_account_id } = body
  if (!public_token || !operating_account_id) {
    return new Response("Missing required fields", { status: 400 })
  }

  try {
    // Exchange public token for access token
    const res = await fetch(plaidUrl("/item/public_token/exchange"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: Deno.env.get("PLAID_CLIENT_ID")!,
        secret: Deno.env.get("PLAID_SECRET")!,
        public_token,
      }),
    })

    if (!res.ok) {
      const errBody = await res.text()
      throw new Error(`Plaid token exchange failed (${res.status}): ${errBody}`)
    }

    const data = await res.json()
    // public_token is single-use and short-lived — never log it
    const accessToken: string = data.access_token
    const plaidItemId: string = data.item_id

    const { error } = await supabase.from("plaid_items").upsert(
      {
        attorney_id: user.id,
        plaid_item_id: plaidItemId,
        access_token: accessToken,
        institution_id: institution_id ?? null,
        institution_name: institution_name ?? null,
        operating_account_id,
        trust_account_id: trust_account_id ?? null,
      },
      { onConflict: "attorney_id" }
    )
    if (error) throw new Error(`DB upsert failed: ${error.message}`)

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error(`plaid-exchange-token for ${user.id}:`, err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    )
  }
})
