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

  try {
    const res = await fetch(plaidUrl("/link/token/create"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: Deno.env.get("PLAID_CLIENT_ID")!,
        secret: Deno.env.get("PLAID_SECRET")!,
        client_name: "PracticeIQ",
        country_codes: ["US"],
        language: "en",
        user: { client_user_id: user.id },
        products: ["transactions"],
        account_filters: {
          depository: { account_subtypes: ["checking", "savings"] },
        },
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Plaid link token creation failed (${res.status}): ${body}`)
    }

    const data = await res.json()
    return new Response(JSON.stringify({ link_token: data.link_token }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error(`plaid-create-link-token for ${user.id}:`, err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    )
  }
})
