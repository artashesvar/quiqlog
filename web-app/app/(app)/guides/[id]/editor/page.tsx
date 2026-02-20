import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import GuideEditor from '@/components/editor/GuideEditor'

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

  return <GuideEditor guide={guide} />
}
