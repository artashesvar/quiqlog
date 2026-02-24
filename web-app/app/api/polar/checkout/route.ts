import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { APP_URL, POLAR_API_URL } from '@/lib/constants'

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.POLAR_ACCESS_TOKEN || !process.env.POLAR_PRODUCT_ID) {
    return NextResponse.json({ error: 'Polar not configured' }, { status: 500 })
  }

  const response = await fetch(`${POLAR_API_URL}/v1/checkouts/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.POLAR_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      product_id: process.env.POLAR_PRODUCT_ID,
      success_url: `${APP_URL}/home?upgraded=true`,
      customer_email: user.email,
      metadata: {
        // Polar will forward this metadata in webhook events so we can
        // identify which Supabase user to update after payment.
        user_id: user.id,
      },
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error('[Polar] Checkout creation failed:', text)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }

  const checkout = await response.json()
  return NextResponse.json({ url: checkout.url })
}
