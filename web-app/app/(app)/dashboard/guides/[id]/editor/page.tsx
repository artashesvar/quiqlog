import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import GuideEditor from '@/components/editor/GuideEditor'
import { resolvePaywall } from '@/lib/paywall'

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

  const isLocked = await resolvePaywall(user.id, guide.id, guide.created_at, supabase)

  return <GuideEditor guide={guide} isLocked={isLocked} />
}
