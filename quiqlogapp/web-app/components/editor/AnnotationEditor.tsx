'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/Button'

interface Stroke {
  points: { x: number; y: number }[]
  color: string
  width: number
}

interface AnnotationEditorProps {
  imageUrl: string
  guideId: string
  stepId: string
  onSave: (newUrl: string) => Promise<void>
  onClose: () => void
}

const COLORS = [
  { label: 'Red',    value: '#ef4444' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Yellow', value: '#eab308' },
  { label: 'Green',  value: '#22c55e' },
  { label: 'Blue',   value: '#3b82f6' },
  { label: 'Purple', value: '#a855f7' },
  { label: 'White',  value: '#ffffff' },
  { label: 'Black',  value: '#000000' },
]

const WIDTHS = [
  { label: 'Thin',   value: 2 },
  { label: 'Medium', value: 5 },
  { label: 'Thick',  value: 10 },
]

export default function AnnotationEditor({ imageUrl, guideId, stepId, onSave, onClose }: AnnotationEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const isDrawingRef = useRef(false)
  const currentPointsRef = useRef<{ x: number; y: number }[]>([])

  const [committedStrokes, setCommittedStrokes] = useState<Stroke[]>([])
  const [color, setColor] = useState('#ef4444')
  const [strokeWidth, setStrokeWidth] = useState(5)
  const [saving, setSaving] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  // Map pointer event to canvas pixel coordinates
  const toCanvasCoords = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    }
  }, [])

  // Full redraw from committed strokes
  const redraw = useCallback((strokes: Stroke[]) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const img = imgRef.current
    if (!canvas || !ctx || !img) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0)

    for (const stroke of strokes) {
      if (stroke.points.length < 2) continue
      ctx.save()
      ctx.strokeStyle = stroke.color
      ctx.lineWidth = stroke.width
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
      }
      ctx.stroke()
      ctx.restore()
    }
  }, [])

  // Load image
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

  // Redraw when committed strokes change or image loads
  useEffect(() => {
    if (imageLoaded) redraw(committedStrokes)
  }, [imageLoaded, committedStrokes, redraw])

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    const coords = toCanvasCoords(e)
    isDrawingRef.current = true
    currentPointsRef.current = [coords]
    ;(e.target as HTMLCanvasElement).setPointerCapture(e.pointerId)

    // Start path for incremental drawing
    ctx.save()
    ctx.strokeStyle = color
    ctx.lineWidth = strokeWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(coords.x, coords.y)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    const coords = toCanvasCoords(e)
    currentPointsRef.current.push(coords)

    // Draw only the latest segment — no full redraw
    ctx.lineTo(coords.x, coords.y)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(coords.x, coords.y)
  }

  function handlePointerUp() {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false

    const points = currentPointsRef.current
    currentPointsRef.current = []

    if (points.length >= 2) {
      const newStroke: Stroke = { points, color, width: strokeWidth }
      setCommittedStrokes(prev => [...prev, newStroke])
      // Note: the useEffect above will call redraw with updated strokes
    }
  }

  function handleUndo() {
    setCommittedStrokes(prev => prev.slice(0, -1))
  }

  function handleClearAll() {
    setCommittedStrokes([])
  }

  async function handleSave() {
    const canvas = canvasRef.current
    if (!canvas) return

    // Final clean redraw
    redraw(committedStrokes)

    setSaving(true)
    try {
      const blob = await new Promise<Blob | null>(resolve =>
        canvas.toBlob(resolve, 'image/png')
      )
      if (!blob) throw new Error('Failed to export image')

      const formData = new FormData()
      formData.append('file', blob, `annotated-${stepId}.png`)
      formData.append('guideId', guideId)

      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Upload failed')

      const { url } = await res.json()
      await onSave(url)
    } catch {
      redraw(committedStrokes)
      alert('Failed to save annotation. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Escape to close
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
      <div className="flex flex-wrap items-center gap-3 mb-4 px-4 py-2 bg-background-secondary border border-border rounded-lg">
        {/* Color swatches */}
        <div className="flex items-center gap-1.5">
          {COLORS.map(c => (
            <button
              key={c.value}
              onClick={() => setColor(c.value)}
              title={c.label}
              className="w-5 h-5 rounded-full transition-all focus:outline-none"
              style={{
                backgroundColor: c.value,
                boxShadow: color === c.value
                  ? '0 0 0 2px #ffffff, 0 0 0 3px ' + c.value
                  : '0 0 0 1px rgba(255,255,255,0.2)',
              }}
            />
          ))}
        </div>

        <div className="w-px h-5 bg-border" />

        {/* Stroke width */}
        <div className="flex items-center gap-1">
          {WIDTHS.map(w => (
            <button
              key={w.value}
              onClick={() => setStrokeWidth(w.value)}
              title={w.label}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                strokeWidth === w.value
                  ? 'bg-accent text-white'
                  : 'bg-background-tertiary text-text-muted hover:text-text-primary hover:bg-border'
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-border" />

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleUndo}
            disabled={committedStrokes.length === 0 || saving}
          >
            Undo
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleClearAll}
            disabled={committedStrokes.length === 0 || saving}
          >
            Clear All
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            loading={saving}
            disabled={committedStrokes.length === 0}
          >
            Save Annotation
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative max-w-[90vw] max-h-[75vh] overflow-auto rounded-lg border border-border">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="max-w-[90vw] max-h-[75vh] object-contain cursor-crosshair"
          style={{ display: imageLoaded ? 'block' : 'none' }}
        />
        {!imageLoaded && (
          <div className="flex items-center justify-center w-[400px] h-[300px] text-text-muted text-sm">
            Loading image...
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-text-muted">
        Draw freeform annotations. Press Escape to cancel.
      </p>
    </div>,
    document.body
  )
}
