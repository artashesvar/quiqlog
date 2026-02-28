import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import PDFDocument from 'pdfkit'
import sharp from 'sharp'
import type { Step } from '@/lib/types'

// Margins and layout constants (in PDF points, 72pt = 1 inch)
const MARGIN = 50
const PAGE_WIDTH = 595.28 // A4
const PAGE_HEIGHT = 841.89
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const TITLE_FONT_SIZE = 24
const STEP_TITLE_FONT_SIZE = 14
const BODY_FONT_SIZE = 11
const LINE_HEIGHT = 1.4
const BLOCK_GAP = 24
const IMAGE_MAX_HEIGHT = 340

interface CropInfo {
  buffer: Buffer
  origW: number
  origH: number
  cropLeft: number
  cropTop: number
  cropW: number
  cropH: number
}

/**
 * Crop a screenshot buffer according to the zoom/pan settings used in the editor.
 *
 * The editor renders zoom via CSS `scale(zoom) translate(panX%, panY%)`
 * with overflow: hidden and transformOrigin: center center.
 *
 * The visible region is a 1/zoom-sized window centered on the image,
 * then shifted by the pan offsets (which are percentages of the image dimensions).
 *
 * Always returns a CropInfo with the original dimensions and crop offset so
 * callers can map indicator_x/y percentages into the cropped image.
 */
async function cropScreenshot(
  buffer: Buffer,
  zoomLevel: number,
  panX: number,
  panY: number
): Promise<CropInfo> {
  const metadata = await sharp(buffer).metadata()
  const imgW = metadata.width!
  const imgH = metadata.height!

  if (zoomLevel <= 1) {
    return { buffer, origW: imgW, origH: imgH, cropLeft: 0, cropTop: 0, cropW: imgW, cropH: imgH }
  }

  // Visible region size (in pixels)
  const visW = Math.round(imgW / zoomLevel)
  const visH = Math.round(imgH / zoomLevel)

  // Center of the visible region before panning
  let cx = imgW / 2
  let cy = imgH / 2

  // Pan offsets: translate(panX%, panY%) means shift by that % of the image
  // Negative translate moves the viewport right/down (shows content further right/down)
  cx -= (panX / 100) * imgW
  cy -= (panY / 100) * imgH

  // Top-left corner of the crop region
  let left = Math.round(cx - visW / 2)
  let top = Math.round(cy - visH / 2)

  // Clamp to image bounds
  left = Math.max(0, Math.min(left, imgW - visW))
  top = Math.max(0, Math.min(top, imgH - visH))

  const croppedBuffer = await sharp(buffer)
    .extract({ left, top, width: visW, height: visH })
    .toBuffer()

  return { buffer: croppedBuffer, origW: imgW, origH: imgH, cropLeft: left, cropTop: top, cropW: visW, cropH: visH }
}

/**
 * Replace common Unicode characters that PDFKit's built-in fonts (Latin-1 only)
 * cannot encode, then strip anything else above U+00FF.
 */
function sanitizePdfText(text: string): string {
  return text
    .replace(/\u2013/g, '-')         // en dash
    .replace(/\u2014/g, '--')        // em dash
    .replace(/[\u2018\u2019]/g, "'") // smart single quotes
    .replace(/[\u201C\u201D]/g, '"') // smart double quotes
    .replace(/\u2026/g, '...')       // ellipsis
    .replace(/\u2022/g, '*')         // bullet
    .replace(/\u00A0/g, ' ')         // non-breaking space
    .replace(/[^\x00-\xFF]/g, '')    // strip remaining non-Latin-1
}

/**
 * Estimate the height a block of text will occupy when rendered in the PDF.
 */
function estimateTextHeight(
  doc: PDFKit.PDFDocument,
  text: string,
  fontSize: number,
  maxWidth: number
): number {
  if (!text) return 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prevFontSize = (doc as any)._fontSize as number
  doc.fontSize(fontSize)
  const h = doc.heightOfString(text, { width: maxWidth, lineGap: fontSize * (LINE_HEIGHT - 1) })
  doc.fontSize(prevFontSize)
  return h
}

/**
 * Calculate the display dimensions for an image that fits within CONTENT_WIDTH
 * and IMAGE_MAX_HEIGHT while preserving aspect ratio.
 */
function fitImage(imgW: number, imgH: number): { width: number; height: number } {
  let w = CONTENT_WIDTH
  let h = (imgH / imgW) * w
  if (h > IMAGE_MAX_HEIGHT) {
    h = IMAGE_MAX_HEIGHT
    w = (imgW / imgH) * h
  }
  return { width: w, height: h }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // --- Auth ---
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // --- Fetch guide (owner only via RLS + user_id filter) ---
  const { data: guide, error } = await supabase
    .from('guides')
    .select('*, steps(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .order('order_index', { referencedTable: 'steps', ascending: true })
    .single()

  if (error || !guide) {
    return NextResponse.json({ error: 'Guide not found' }, { status: 404 })
  }

  const steps: Step[] = guide.steps ?? []

  try {
  // --- Pre-fetch all screenshot images in parallel ---
  const imageCache = new Map<string, { buffer: Buffer; width: number; height: number; origW: number; origH: number; cropLeft: number; cropTop: number; cropW: number; cropH: number }>()

  await Promise.all(
    steps
      .filter((s) => s.type === 'step' && s.screenshot_url)
      .map(async (s) => {
        try {
          const res = await fetch(s.screenshot_url!)
          if (!res.ok) return
          const rawBuffer = Buffer.from(await res.arrayBuffer())

          // Apply zoom/pan crop (always called to obtain crop metadata for indicator mapping)
          const zoom = s.zoom_level ?? 1
          const cropInfo = await cropScreenshot(rawBuffer, zoom, s.pan_x ?? 0, s.pan_y ?? 0)

          // Convert to PNG for consistent handling in PDFKit
          const pngBuffer = await sharp(cropInfo.buffer).png().toBuffer()
          const meta = await sharp(pngBuffer).metadata()

          imageCache.set(s.id, {
            buffer: pngBuffer,
            width: meta.width!,
            height: meta.height!,
            origW: cropInfo.origW,
            origH: cropInfo.origH,
            cropLeft: cropInfo.cropLeft,
            cropTop: cropInfo.cropTop,
            cropW: cropInfo.cropW,
            cropH: cropInfo.cropH,
          })
        } catch {
          // Skip images that fail to fetch/process
        }
      })
  )

  // --- Build PDF ---
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
    bufferPages: true,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chunks: any[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc.on('data', (chunk: any) => chunks.push(chunk))

  // Helper to get remaining space on the current page
  const remainingHeight = () => PAGE_HEIGHT - MARGIN - doc.y

  // Helper to ensure enough vertical space; if not, add a new page
  const ensureSpace = (needed: number) => {
    if (remainingHeight() < needed) {
      doc.addPage()
    }
  }

  // --- Guide Title ---
  doc.font('Helvetica-Bold').fontSize(TITLE_FONT_SIZE)
  doc.text(sanitizePdfText(guide.title || 'Untitled Guide'), { width: CONTENT_WIDTH })
  doc.moveDown(1.5)

  // --- Render each item ---
  let stepNumber = 0

  for (const item of steps) {
    if (item.type === 'step') {
      stepNumber++

      const title = sanitizePdfText(item.title
        ? `Step ${stepNumber}: ${item.title}`
        : `Step ${stepNumber}`)

      // Estimate total height for this step
      const titleH = estimateTextHeight(doc, title, STEP_TITLE_FONT_SIZE, CONTENT_WIDTH) + 4
      const img = imageCache.get(item.id)
      const imgDims = img ? fitImage(img.width, img.height) : null
      const imgH = imgDims ? imgDims.height + 8 : 0
      const descH = item.description
        ? estimateTextHeight(doc, sanitizePdfText(item.description), BODY_FONT_SIZE, CONTENT_WIDTH) + 4
        : 0
      const totalH = titleH + imgH + descH + BLOCK_GAP

      ensureSpace(totalH)

      // Step title
      doc.font('Helvetica-Bold').fontSize(STEP_TITLE_FONT_SIZE)
      doc.text(title, { width: CONTENT_WIDTH })
      doc.moveDown(0.3)

      // Screenshot
      if (img && imgDims) {
        const imgX = doc.x
        const imgY = doc.y
        const pad = 4

        // Light grey frame around the image
        doc.save()
        doc.lineWidth(1)
        doc.strokeColor('#D1D5DB')
        doc.roundedRect(imgX - pad, imgY - pad, imgDims.width + pad * 2, imgDims.height + pad * 2, 2)
        doc.stroke()
        doc.restore()

        doc.image(img.buffer, imgX, imgY, {
          width: imgDims.width,
          height: imgDims.height,
        })

        // Draw indicator circle if a position is saved and falls within the visible crop region
        if (item.indicator_x !== null && item.indicator_y !== null) {
          // Map percentage of original image → fraction within the crop region
          const px = (item.indicator_x / 100) * img.origW
          const py = (item.indicator_y / 100) * img.origH
          const fx = (px - img.cropLeft) / img.cropW
          const fy = (py - img.cropTop) / img.cropH

          if (fx >= 0 && fx <= 1 && fy >= 0 && fy <= 1) {
            const circleCx = imgX + fx * imgDims.width
            const circleCy = imgY + fy * imgDims.height
            // Scale radius proportionally to the displayed image size
            const scale = imgDims.width / img.cropW
            const outerR = Math.max(5, 20 * scale)
            const innerR = Math.max(2, 5 * scale)

            // Outer circle — semi-transparent fill
            doc.save()
            doc.fillColor('#FFD700').fillOpacity(0.35)
            doc.circle(circleCx, circleCy, outerR).fill()
            doc.restore()

            // Outer circle — solid border
            doc.save()
            doc.strokeColor('#FFD700').lineWidth(2).strokeOpacity(1)
            doc.circle(circleCx, circleCy, outerR).stroke()
            doc.restore()

            // Inner dot — solid gold
            doc.save()
            doc.fillColor('#FFD700').fillOpacity(1)
            doc.circle(circleCx, circleCy, innerR).fill()
            doc.restore()
          }
        }

        doc.y = imgY + imgDims.height + pad * 2
        doc.moveDown(0.5)
      }

      // Description
      if (item.description) {
        doc.font('Helvetica').fontSize(BODY_FONT_SIZE)
        doc.text(sanitizePdfText(item.description), {
          width: CONTENT_WIDTH,
          lineGap: BODY_FONT_SIZE * (LINE_HEIGHT - 1),
        })
      }

      doc.moveDown(1.5)
    } else {
      // Tip or Alert block
      const label = item.type === 'tip' ? 'TIP' : 'ALERT'
      const heading = sanitizePdfText(item.title ? `${label}: ${item.title}` : label)
      const body = sanitizePdfText(item.description || '')

      const headingH = estimateTextHeight(doc, heading, STEP_TITLE_FONT_SIZE, CONTENT_WIDTH - 16) + 4
      const bodyH = body
        ? estimateTextHeight(doc, body, BODY_FONT_SIZE, CONTENT_WIDTH - 16) + 4
        : 0
      const totalH = headingH + bodyH + BLOCK_GAP + 16 // extra for padding + border

      ensureSpace(totalH)

      // Draw a left border line and light background box
      const boxTop = doc.y
      const boxHeight = headingH + bodyH + 16

      // Left border (2pt wide line)
      doc.save()
      doc.lineWidth(2)
      doc.strokeColor('#666666')
      doc.moveTo(MARGIN, boxTop)
      doc.lineTo(MARGIN, boxTop + boxHeight)
      doc.stroke()
      doc.restore()

      // Content indented past the border
      const indentX = MARGIN + 12
      const indentWidth = CONTENT_WIDTH - 12

      doc.font('Helvetica-Bold').fontSize(STEP_TITLE_FONT_SIZE)
      doc.text(heading, indentX, boxTop + 8, { width: indentWidth })

      if (body) {
        doc.font('Helvetica').fontSize(BODY_FONT_SIZE)
        doc.text(body, indentX, doc.y + 2, {
          width: indentWidth,
          lineGap: BODY_FONT_SIZE * (LINE_HEIGHT - 1),
        })
      }

      // Move cursor past the block
      doc.y = boxTop + boxHeight
      doc.x = MARGIN
      doc.moveDown(1.5)
    }
  }

  // --- Finalize ---
  doc.end()

  // Collect all chunks into a single buffer
  const pdfBuffer: Uint8Array = await new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
  })

  // Sanitize filename — must be ASCII only for Content-Disposition header
  const filename = sanitizePdfText(guide.title || 'guide')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, '-')
    .trim() || 'guide'

  return new NextResponse(pdfBuffer as Uint8Array<ArrayBuffer>, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}.pdf"`,
    },
  })

  } catch (err) {
    console.error('[export-pdf] Error generating PDF:', err)
    return NextResponse.json(
      { error: 'Failed to generate PDF', detail: String(err) },
      { status: 500 }
    )
  }
}
