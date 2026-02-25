import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { SUPABASE_STORAGE_BUCKET } from '@/lib/constants'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const updates: Record<string, unknown> = {}

  if (typeof body.title === 'string') updates.title = body.title
  if (typeof body.description === 'string') updates.description = body.description
  if (typeof body.order_index === 'number') updates.order_index = body.order_index
  if (typeof body.screenshot_url === 'string') updates.screenshot_url = body.screenshot_url
  if (typeof body.type === 'string' && ['step', 'tip', 'alert'].includes(body.type)) updates.type = body.type
  if (typeof body.zoom_level === 'number') updates.zoom_level = body.zoom_level
  if (typeof body.pan_x === 'number') updates.pan_x = body.pan_x
  if (typeof body.pan_y === 'number') updates.pan_y = body.pan_y

  const { data, error } = await supabase
    .from('steps')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get screenshot URL before deletion
  const { data: step } = await supabase
    .from('steps')
    .select('screenshot_url')
    .eq('id', id)
    .single()

  const { error } = await supabase.from('steps').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Clean up screenshot from storage
  if (step?.screenshot_url) {
    const match = step.screenshot_url.match(/screenshots\/(.+)$/)
    if (match) {
      await admin.storage.from(SUPABASE_STORAGE_BUCKET).remove([match[1]])
    }
  }

  return new NextResponse(null, { status: 204 })
}
