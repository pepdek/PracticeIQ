import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@14"

serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 })

  const sig = req.headers.get("stripe-signature")
  if (!sig) return new Response("Missing Stripe-Signature", { status: 400 })

  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!
  const rawBody = await req.text()

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2023-10-16",
    httpClient: Stripe.createFetchHttpClient(),
  })

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, sig, webhookSecret)
  } catch (err) {
    console.error("Webhook signature verification failed:", err)
    return new Response("Invalid signature", { status: 400 })
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const attorneyId = session.metadata?.attorney_id
        if (!attorneyId) {
          console.error("checkout.session.completed missing attorney_id in metadata")
          break
        }

        // Retrieve the subscription to get its ID
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id

        await supabase
          .from("attorneys")
          .update({
            subscription_status: "active",
            stripe_subscription_id: subscriptionId ?? null,
            subscription_activated_at: new Date().toISOString(),
            subscription_cancelled_at: null,
          })
          .eq("id", attorneyId)

        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        const attorneyId = subscription.metadata?.attorney_id

        if (!attorneyId) {
          // Fall back to looking up by stripe_subscription_id
          const { data } = await supabase
            .from("attorneys")
            .select("id")
            .eq("stripe_subscription_id", subscription.id)
            .single()

          if (data) {
            await supabase
              .from("attorneys")
              .update({
                subscription_status: "cancelled",
                subscription_cancelled_at: new Date().toISOString(),
              })
              .eq("id", data.id)
          } else {
            console.error("customer.subscription.deleted: could not find attorney for sub", subscription.id)
          }
          break
        }

        await supabase
          .from("attorneys")
          .update({
            subscription_status: "cancelled",
            subscription_cancelled_at: new Date().toISOString(),
          })
          .eq("id", attorneyId)

        break
      }

      default:
        // Unhandled event types are silently ignored
        break
    }
  } catch (err) {
    console.error(`Webhook handler error for ${event.type}:`, err)
    return new Response("Handler error", { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  })
})
