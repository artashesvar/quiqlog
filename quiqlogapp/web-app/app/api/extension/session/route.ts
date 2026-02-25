import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { generateSlug, base64ToBuffer } from '@/lib/utils'
import { SUPABASE_STORAGE_BUCKET } from '@/lib/constants'
import { nanoid } from 'nanoid'
import type { RecordedStep } from '@/lib/types'

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
  // Extract Bearer token from Authorization header
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '').trim()

  if (!token) {
    return NextResponse.json({ error: 'No auth token' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Validate token and get user
  const { data: { user }, error: authError } = await admin.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { title, steps }: { title: string; steps: RecordedStep[] } = body

  if (!steps || steps.length === 0) {
    return NextResponse.json({ error: 'No steps provided' }, { status: 400 })
  }

  // Create the guide
  const { data: guide, error: guideError } = await admin
    .from('guides')
    .insert({
      user_id: user.id,
      title: title || steps[0]?.pageTitle || 'New Guide',
      slug: generateSlug(title || steps[0]?.pageTitle || 'guide'),
    })
    .select()
    .single()

  if (guideError || !guide) {
    return NextResponse.json({ error: 'Failed to create guide' }, { status: 500 })
  }

  // Process each step: use pre-uploaded URL or fall back to inline base64
  const stepInserts = await Promise.all(
    steps.map(async (step: RecordedStep, index: number) => {
      let screenshotUrl: string | null = null

      if (step.screenshotUrl) {
        // New flow: screenshot already uploaded by the extension
        screenshotUrl = step.screenshotUrl
      } else if (step.screenshotBase64) {
        // Legacy flow: upload inline base64 (backward compat)
        try {
          const buffer = base64ToBuffer(step.screenshotBase64)
          const path = `${user.id}/${guide.id}/${nanoid()}.png`

          const { error: uploadError } = await admin.storage
            .from(SUPABASE_STORAGE_BUCKET)
            .upload(path, buffer, { contentType: 'image/png' })

          if (!uploadError) {
            const { data: signedData } = await admin.storage
              .from(SUPABASE_STORAGE_BUCKET)
              .createSignedUrl(path, 60 * 60 * 24 * 365 * 10)

            screenshotUrl = signedData?.signedUrl ?? null
          }
        } catch (e) {
          console.error(`[Quiqlog] Failed to upload screenshot for step ${index}:`, e)
        }
      }

      return {
        guide_id: guide.id,
        order_index: index,
        title: step.label ? `Clicked "${step.label}"` : `Step ${index + 1}`,
        description: '',
        screenshot_url: screenshotUrl,
        click_x: step.x,
        click_y: step.y,
        element_label: step.label,
      }
    })
  )

  const { error: stepsError } = await admin.from('steps').insert(stepInserts)

  if (stepsError) {
    console.error('[Quiqlog] Steps insert error:', stepsError)
  }

  return NextResponse.json(
    { guideId: guide.id, slug: guide.slug },
    {
      status: 201,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    }
  )
}
