import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppNav from '@/components/AppNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: sub } = await supabase
    .from('user_subscriptions')
    .select('polar_customer_id, status, current_period_end')
    .eq('user_id', user.id)
    .maybeSingle()

  const hasGracePeriod = sub?.status === 'canceled' &&
    sub?.current_period_end && new Date(sub.current_period_end) > new Date()
  const isPro = sub?.status === 'active' || sub?.status === 'trialing' || !!hasGracePeriod
  const isCanceled = !!hasGracePeriod
  const hasSubscription = !!sub?.polar_customer_id

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppNav
        userEmail={user.email}
        hasSubscription={hasSubscription}
        isPro={isPro}
        isCanceled={isCanceled}
        subscriptionEnd={sub?.current_period_end ?? undefined}
      />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  )
}
