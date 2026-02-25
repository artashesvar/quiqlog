import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { generateSlug } from '@/lib/utils'
import { SUPABASE_STORAGE_BUCKET } from '@/lib/constants'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('guides')
    .select('*, steps(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .order('order_index', { referencedTable: 'steps', ascending: true })
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(data)
}

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

  if (typeof body.title === 'string') {
    updates.title = body.title
    // Auto-regenerate slug if title changes
    updates.slug = generateSlug(body.title)
  }
  if (typeof body.slug === 'string') updates.slug = body.slug
  if (typeof body.is_public === 'boolean') updates.is_public = body.is_public

  const { data, error } = await supabase
    .from('guides')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
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

  // Delete screenshots from storage first
  const { data: stepFiles } = await supabase
    .from('steps')
    .select('screenshot_url')
    .eq('guide_id', id)

  if (stepFiles?.length) {
    const paths = stepFiles
      .map((s: { screenshot_url: string | null }) => {
        if (!s.screenshot_url) return null
        // Extract storage path from URL
        const match = s.screenshot_url.match(/screenshots\/(.+)$/)
        return match ? match[1] : null
      })
      .filter(Boolean) as string[]

    if (paths.length > 0) {
      await admin.storage.from(SUPABASE_STORAGE_BUCKET).remove(paths)
    }
  }

  const { error } = await supabase
    .from('guides')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return new NextResponse(null, { status: 204 })
}
