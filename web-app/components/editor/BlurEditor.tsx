'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/Button'

interface BlurRegion {
  x: number
  y: number
  w: number
  h: number
}

interface BlurEditorProps {
  imageUrl: string
  guideId: string
  stepId: string
  onSave: (newUrl: string) => Promise<void>
  onClose: () => void
}

export default function BlurEditor({ imageUrl, guideId, stepId, onSave, onClose }: BlurEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [regions, setRegions] = useState<BlurRegion[]>([])
  const [drawing, setDrawing] = useState(false)
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null)
  const [currentRect, setCurrentRect] = useState<BlurRegion | null>(null)
  const [saving, setSaving] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  // Convert mouse event to canvas coordinates
  const toCanvasCoords = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }, [])

  // Redraw the canvas with all blur regions
  const redraw = useCallback((extraRect?: BlurRegion | null, showOutlines = true) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const img = imgRef.current
    if (!canvas || !ctx || !img) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0)

    const allRects = extraRect ? [...regions, extraRect] : regions

    // Apply blur to each region
    for (const r of allRects) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(r.x, r.y, r.w, r.h)
      ctx.clip()
      ctx.filter = 'blur(20px)'
      ctx.drawImage(img, 0, 0)
      ctx.restore()
    }

    // Draw outlines for visual feedback
    if (showOutlines) {
      for (const r of allRects) {
        ctx.save()
        ctx.strokeStyle = '#6366F1'
        ctx.lineWidth = 2
        ctx.setLineDash([6, 3])
        ctx.strokeRect(r.x, r.y, r.w, r.h)
        ctx.setLineDash([])
        ctx.restore()
      }
    }
  }, [regions])

  // Load image into canvas
  useEffect(() => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imgRef.current = img
      const canvas = canvasRef.current
      if (canvas) {
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        setImageLoaded(true)
      }
    }
    img.src = imageUrl
  }, [imageUrl])

  // Redraw when regions change or image loads
  useEffect(() => {
    if (imageLoaded) redraw()
  }, [imageLoaded, regions, redraw])

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const coords = toCanvasCoords(e)
    setDrawing(true)
    setStartPoint(coords)
    setCurrentRect(null)
    ;(e.target as HTMLCanvasElement).setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing || !startPoint) return
    const coords = toCanvasCoords(e)
    const rect: BlurRegion = {
      x: Math.min(startPoint.x, coords.x),
      y: Math.min(startPoint.y, coords.y),
      w: Math.abs(coords.x - startPoint.x),
      h: Math.abs(coords.y - startPoint.y),
    }
    setCurrentRect(rect)
    redraw(rect)
  }

  function handlePointerUp() {
    if (!drawing) return
    setDrawing(false)
    setStartPoint(null)
    if (currentRect && currentRect.w > 5 && currentRect.h > 5) {
      setRegions(prev => [...prev, currentRect])
    }
    setCurrentRect(null)
  }

  function handleUndo() {
    setRegions(prev => prev.slice(0, -1))
  }

  async function handleSave() {
    const canvas = canvasRef.current
    if (!canvas) return

    // Final redraw without outlines
    redraw(null, false)

    setSaving(true)
    try {
      const blob = await new Promise<Blob | null>(resolve =>
        canvas.toBlob(resolve, 'image/png')
      )
      if (!blob) throw new Error('Failed to export image')

      const formData = new FormData()
      formData.append('file', blob, `blurred-${stepId}.png`)
      formData.append('guideId', guideId)

      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Upload failed')

      const { url } = await res.json()
      await onSave(url)
    } catch {
      // Re-draw with outlines on failure
      redraw()
      alert('Failed to save blurred image. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Close on Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleUndo}
          disabled={regions.length === 0 || saving}
        >
          Undo
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          loading={saving}
          disabled={regions.length === 0}
        >
          Apply Blur
        </Button>
      </div>

      {/* Canvas */}
      <div className="relative max-w-[90vw] max-h-[80vh] overflow-auto rounded-lg border border-border">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="max-w-[90vw] max-h-[80vh] object-contain cursor-crosshair"
          style={{ display: imageLoaded ? 'block' : 'none' }}
        />
        {!imageLoaded && (
          <div className="flex items-center justify-center w-[400px] h-[300px] text-text-muted">
            Loading image...
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-text-muted">
        Draw rectangles over areas you want to blur. Press Escape to cancel.
      </p>
    </div>,
    document.body
  )
}
