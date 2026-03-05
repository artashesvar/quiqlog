import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ExtensionCTA from '@/components/dashboard/ExtensionCTA'
import GuideStats from '@/components/dashboard/GuideStats'

export const metadata = { title: 'Home' }

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { count: drafts },
    { count: published },
    { count: recentCount },
  ] = await Promise.all([
    supabase.from('guides').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_public', false),
    supabase.from('guides').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_public', true),
    supabase
      .from('guides')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
  ])

  return (
    <div className="flex flex-col min-h-full">
      <ExtensionCTA />
      <div className="flex-1" />
      <GuideStats
        drafts={drafts ?? 0}
        published={published ?? 0}
        recentCount={recentCount ?? 0}
      />
    </div>
  )
}
