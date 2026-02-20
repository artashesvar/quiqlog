import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import GuideEditor from '@/components/editor/GuideEditor'
import { FREE_GUIDES_PER_MONTH } from '@/lib/constants'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('guides').select('title').eq('id', id).single()
  return { title: data?.title ?? 'Editor' }
}

export default async function EditorPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch guide + steps and current user in parallel
  const [{ data: guide }, { data: { user } }] = await Promise.all([
    supabase
      .from('guides')
      .select('*, steps(*)')
      .eq('id', id)
      .order('order_index', { referencedTable: 'steps', ascending: true })
      .single(),
    supabase.auth.getUser(),
  ])

  if (!guide || !user) notFound()

  // ── Paywall check ────────────────────────────────────────────────────────────
  let isLocked = false

  // 1. Check if the user has an active subscription
  const { data: sub } = await supabase
    .from('user_subscriptions')
    .select('status, current_period_end')
    .eq('user_id', user.id)
    .single()

  const isSubscribed =
    sub?.status === 'active' ||
    sub?.status === 'trialing' ||
    // Canceled but still within the paid period
    (sub?.status === 'canceled' &&
      sub.current_period_end != null &&
      new Date(sub.current_period_end) > new Date())

  if (!isSubscribed) {
    // 2. Count the chronological rank of this guide within its calendar month.
    //    We count all guides created between the start of the month and this
    //    guide's created_at (inclusive). If the rank exceeds the free limit,
    //    this guide was created after the allowance was exhausted.
    const createdAt = new Date(guide.created_at)
    const monthStart = new Date(
      Date.UTC(createdAt.getUTCFullYear(), createdAt.getUTCMonth(), 1)
    )
    const monthEnd = new Date(
      Date.UTC(createdAt.getUTCFullYear(), createdAt.getUTCMonth() + 1, 1)
    )

    const { count } = await supabase
      .from('guides')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', monthStart.toISOString())
      .lt('created_at', monthEnd.toISOString())
      .lte('created_at', guide.created_at) // include only guides up to this one

    if ((count ?? 0) > FREE_GUIDES_PER_MONTH) {
      isLocked = true
    }
  }
  // ────────────────────────────────────────────────────────────────────────────

  return <GuideEditor guide={guide} isLocked={isLocked} />
}
