import { SupabaseClient } from '@supabase/supabase-js'
import { FREE_GUIDES_PER_MONTH } from '@/lib/constants'

/**
 * Returns true if a guide should be behind the paywall.
 *
 * Rules:
 *  - Users with an active/trialing subscription are never locked.
 *  - Canceled subscriptions still grant access until current_period_end.
 *  - Guides from previous calendar months are never locked.
 *  - If this month's guide count exceeds FREE_GUIDES_PER_MONTH and the
 *    current guide is ranked beyond that position, it is locked.
 */
export async function resolvePaywall(
  userId: string,
  guideId: string,
  guideCreatedAt: string,
  supabase: SupabaseClient
): Promise<boolean> {
  // 1. Check subscription — subscribed users are never blocked.
  const { data: sub } = await supabase
    .from('user_subscriptions')
    .select('status, current_period_end')
    .eq('user_id', userId)
    .maybeSingle()

  const isSubscribed =
    sub?.status === 'active' ||
    sub?.status === 'trialing' ||
    (sub?.status === 'canceled' &&
      sub.current_period_end != null &&
      new Date(sub.current_period_end) > new Date())

  if (isSubscribed) return false

  // 2. Only lock guides created in the current calendar month (UTC).
  const now = new Date()
  const guideDate = new Date(guideCreatedAt)
  const isCurrentMonth =
    guideDate.getUTCFullYear() === now.getUTCFullYear() &&
    guideDate.getUTCMonth() === now.getUTCMonth()

  if (!isCurrentMonth) return false

  // 3. Fetch all guides created this month (UTC), ordered oldest-first.
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()

  const { data: monthlyGuides } = await supabase
    .from('guides')
    .select('id')
    .eq('user_id', userId)
    .gte('created_at', monthStart)
    .order('created_at', { ascending: true })

  if (!monthlyGuides || monthlyGuides.length <= FREE_GUIDES_PER_MONTH) return false

  // 4. Lock only guides ranked beyond the free quota.
  const position = monthlyGuides.findIndex((g: { id: string }) => g.id === guideId)
  return position >= FREE_GUIDES_PER_MONTH
}

/**
 * Returns true if the user is allowed to create a new guide this month.
 * Used by the guide creation API to enforce the limit server-side.
 */
export async function canCreateGuide(
  userId: string,
  supabase: SupabaseClient
): Promise<boolean> {
  // 1. Check subscription
  const { data: sub } = await supabase
    .from('user_subscriptions')
    .select('status, current_period_end')
    .eq('user_id', userId)
    .maybeSingle()

  const isSubscribed =
    sub?.status === 'active' ||
    sub?.status === 'trialing' ||
    (sub?.status === 'canceled' &&
      sub.current_period_end != null &&
      new Date(sub.current_period_end) > new Date())

  if (isSubscribed) return true

  // 2. Count guides created this month (UTC)
  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()

  const { count } = await supabase
    .from('guides')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', monthStart)

  return (count ?? 0) < FREE_GUIDES_PER_MONTH
}
