import { NextResponse } from 'next/server'
import { Webhooks } from '@polar-sh/nextjs'
import { createAdminClient } from '@/lib/supabase/server'

const webhookHandler = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET ?? '',

  onSubscriptionCreated: async (payload) => {
    await upsertSubscription(payload.data)
  },

  onSubscriptionUpdated: async (payload) => {
    await upsertSubscription(payload.data)
  },

  onSubscriptionActive: async (payload) => {
    await upsertSubscription(payload.data)
  },

  onSubscriptionCanceled: async (payload) => {
    await upsertSubscription(payload.data)
  },

  onSubscriptionRevoked: async (payload) => {
    await upsertSubscription(payload.data)
  },
})

export const POST = webhookHandler

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function upsertSubscription(subscription: any) {
  const userId = subscription.metadata?.user_id as string | undefined
  if (!userId) {
    console.error(`[Polar] Webhook received without user_id in metadata — subscription: ${subscription.id}, status: ${subscription.status}`)
    return
  }

  const admin = createAdminClient()

  // Map Polar subscription status to our internal status
  const status: 'active' | 'trialing' | 'canceled' | 'inactive' = (() => {
    switch (subscription.status) {
      case 'active':
        return 'active'
      case 'trialing':
        return 'trialing'
      case 'canceled':
        return 'canceled'
      default:
        return 'inactive'
    }
  })()

  const { error } = await admin.from('user_subscriptions').upsert(
    {
      user_id: userId,
      polar_subscription_id: subscription.id,
      polar_customer_id: subscription.customerId ?? subscription.customer_id ?? null,
      status,
      current_period_end: subscription.currentPeriodEnd ?? subscription.current_period_end ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )

  if (error) {
    console.error('[Polar] Failed to upsert subscription:', error)
  } else {
    console.log(`[Polar] Subscription ${subscription.id} → user ${userId} → status: ${status}`)
  }
}

export async function GET() {
  return NextResponse.json({ ok: true })
}
