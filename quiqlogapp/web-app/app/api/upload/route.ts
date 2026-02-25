import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { SUPABASE_STORAGE_BUCKET } from '@/lib/constants'
import { nanoid } from 'nanoid'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const guideId = formData.get('guideId') as string | null

  if (!file || !guideId) {
    return NextResponse.json({ error: 'Missing file or guideId' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const path = `${user.id}/${guideId}/${nanoid()}.png`

  const admin = createAdminClient()
  const { error } = await admin.storage
    .from(SUPABASE_STORAGE_BUCKET)
    .upload(path, buffer, {
      contentType: 'image/png',
      upsert: false,
    })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Generate a long-lived signed URL (10 years)
  const { data: signedData } = await admin.storage
    .from(SUPABASE_STORAGE_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 10)

  return NextResponse.json({ url: signedData?.signedUrl, path })
}
