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

  const { data: guide } = await supabase
    .from('guides')
    .select('*, steps(*)')
    .eq('id', id)
    .order('order_index', { referencedTable: 'steps', ascending: true })
    .single()

  if (!guide) notFound()

  const isLocked = await resolvePaywall(guide.user_id, guide.id, guide.created_at, supabase)

  return <GuideEditor guide={guide} isLocked={isLocked} />
}

/**
 * Returns true if this guide should be behind the paywall.
 *
 * Rules:
 *  - Users with an active subscription are never locked.
 *  - Guides from previous calendar months are never locked (they were
 *    legitimately within that month's quota when created).
 *  - If this month's guide count exceeds FREE_GUIDES_PER_MONTH and the
 *    current guide is ranked beyond position FREE_GUIDES_PER_MONTH (i.e. it
 *    was one of the "over-limit" guides), it is locked.
 */
async function resolvePaywall(
  userId: string,
  guideId: string,
  guideCreatedAt: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
): Promise<boolean> {
  // 1. Check active subscription — subscribed users are never blocked.
  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('status, current_period_end')
    .eq('user_id', userId)
    .maybeSingle()

  const isSubscribed =
    subscription?.status === 'active' &&
    (!subscription.current_period_end ||
      new Date(subscription.current_period_end) > new Date())

  if (isSubscribed) return false

  // 2. Check if this guide was created in the current calendar month.
  const now = new Date()
  const guideDate = new Date(guideCreatedAt)
  const isCurrentMonth =
    guideDate.getFullYear() === now.getFullYear() &&
    guideDate.getMonth() === now.getMonth()

  if (!isCurrentMonth) return false

  // 3. Fetch all guides created this month, ordered oldest-first.
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const { data: monthlyGuides } = await supabase
    .from('guides')
    .select('id')
    .eq('user_id', userId)
    .gte('created_at', startOfMonth)
    .order('created_at', { ascending: true })

  if (!monthlyGuides || monthlyGuides.length <= FREE_GUIDES_PER_MONTH) return false

  // 4. Lock only guides that fall beyond the free quota (index >= FREE_GUIDES_PER_MONTH).
  const position = monthlyGuides.findIndex((g: { id: string }) => g.id === guideId)
  return position >= FREE_GUIDES_PER_MONTH
}
