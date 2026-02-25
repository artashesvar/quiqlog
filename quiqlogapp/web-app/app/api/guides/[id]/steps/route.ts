import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('steps')
    .select('*')
    .eq('guide_id', id)
    .order('order_index', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify guide ownership
  const { data: guide } = await supabase
    .from('guides')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!guide) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()

  // Get current max order_index
  const { data: lastStep } = await supabase
    .from('steps')
    .select('order_index')
    .eq('guide_id', id)
    .order('order_index', { ascending: false })
    .limit(1)
    .single()

  const nextIndex = (lastStep?.order_index ?? -1) + 1

  const { data, error } = await supabase
    .from('steps')
    .insert({
      guide_id: id,
      order_index: body.order_index ?? nextIndex,
      type: ['step', 'tip', 'alert'].includes(body.type) ? body.type : 'step',
      title: body.title ?? '',
      description: body.description ?? '',
      screenshot_url: body.screenshot_url ?? null,
      click_x: body.click_x ?? null,
      click_y: body.click_y ?? null,
      element_label: body.element_label ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}
