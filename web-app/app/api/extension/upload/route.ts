import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { SUPABASE_STORAGE_BUCKET } from '@/lib/constants'
import { nanoid } from 'nanoid'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '').trim()

  if (!token) {
    return NextResponse.json({ error: 'No auth token' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: { user }, error: authError } = await admin.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const sessionId = formData.get('sessionId') as string | null

  if (!file || !sessionId) {
    return NextResponse.json({ error: 'Missing file or sessionId' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const path = `${user.id}/pending/${sessionId}/${nanoid()}.png`

  const { error: uploadError } = await admin.storage
    .from(SUPABASE_STORAGE_BUCKET)
    .upload(path, buffer, { contentType: 'image/png', upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: signedData } = await admin.storage
    .from(SUPABASE_STORAGE_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 10)

  return NextResponse.json(
    { url: signedData?.signedUrl ?? null, storagePath: path },
    {
      status: 201,
      headers: { 'Access-Control-Allow-Origin': '*' },
    },
  )
}
