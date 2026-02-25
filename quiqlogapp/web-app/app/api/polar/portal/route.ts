import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { POLAR_API_URL } from '@/lib/constants'

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.POLAR_ACCESS_TOKEN) {
    return NextResponse.json({ error: 'Polar not configured' }, { status: 500 })
  }

  const { data: sub } = await supabase
    .from('user_subscriptions')
    .select('polar_customer_id')
    .eq('user_id', user.id)
    .single()

  if (!sub?.polar_customer_id) {
    return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
  }

  const response = await fetch(`${POLAR_API_URL}/v1/customer-sessions/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.POLAR_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customer_id: sub.polar_customer_id,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error('[Polar] Customer session creation failed:', text)
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 })
  }

  const session = await response.json()
  return NextResponse.json({ url: session.customer_portal_url })
}
