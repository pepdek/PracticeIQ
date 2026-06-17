import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@14"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
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

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2023-10-16",
    httpClient: Stripe.createFetchHttpClient(),
  })

  try {
    const { data: attorney, error: fetchErr } = await supabase
      .from("attorneys")
      .select("stripe_subscription_id, subscription_status")
      .eq("id", user.id)
      .single()

    if (fetchErr || !attorney) throw new Error("Attorney record not found")
    if (attorney.subscription_status === "cancelled") {
      return new Response(JSON.stringify({ success: true, already_cancelled: true }), {
        headers: { ...CORS, "Content-Type": "application/json" },
      })
    }
    if (!attorney.stripe_subscription_id) {
      throw new Error("No active Stripe subscription found")
    }

    // Cancel at period end — the customer keeps access until the billing cycle ends.
    // The customer.subscription.deleted webhook fires when Stripe actually terminates it.
    await stripe.subscriptions.update(attorney.stripe_subscription_id, {
      cancel_at_period_end: true,
    })

    // Mark as cancelled immediately in our DB so email sends stop.
    // Data is retained per the 90-day policy.
    await supabase
      .from("attorneys")
      .update({
        subscription_status: "cancelled",
        subscription_cancelled_at: new Date().toISOString(),
      })
      .eq("id", user.id)

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error(`cancel-subscription for ${user.id}:`, err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    )
  }
})
