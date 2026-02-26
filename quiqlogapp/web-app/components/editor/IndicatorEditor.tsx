'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/Button'

interface IndicatorEditorProps {
  imageUrl: string
  initialX: number | null
  initialY: number | null
  onSave: (x: number, y: number) => Promise<void>
  onClose: () => void
}

export default function IndicatorEditor({ imageUrl, initialX, initialY, onSave, onClose }: IndicatorEditorProps) {
  const [x, setX] = useState(initialX ?? 50)
  const [y, setY] = useState(initialY ?? 50)
  const [saving, setSaving] = useState(false)
  const isDragging = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function moveToPointer(e: React.PointerEvent) {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    setX(Math.max(0, Math.min(100, (e.clientX - rect.left) / rect.width * 100)))
    setY(Math.max(0, Math.min(100, (e.clientY - rect.top) / rect.height * 100)))
  }

  function handlePointerDown(e: React.PointerEvent) {
    e.preventDefault()
    isDragging.current = true
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    moveToPointer(e)
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isDragging.current) return
    moveToPointer(e)
  }

  function handlePointerUp() {
    isDragging.current = false
  }

  function handleReset() {
    setX(initialX ?? 50)
    setY(initialY ?? 50)
  }

  async function handleApply() {
    setSaving(true)
    await onSave(x, y)
    setSaving(false)
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <Button variant="secondary" size="sm" onClick={handleReset} disabled={saving}>
          Reset
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" onClick={handleApply} loading={saving}>
          Apply
        </Button>
      </div>

      {/* Image with draggable indicator */}
      <div
        ref={containerRef}
        className="relative rounded-lg border border-border overflow-hidden cursor-crosshair"
        style={{ display: 'inline-block' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Screenshot"
          draggable={false}
          className="block select-none"
          style={{ maxWidth: '90vw', maxHeight: '80vh' }}
        />
        {/* Indicator circle */}
        <div
          style={{
            position: 'absolute',
            left: `${x}%`,
            top: `${y}%`,
            transform: 'translate(-50%, -50%)',
            width: 40,
            height: 40,
            pointerEvents: 'none',
          }}
        >
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: 'rgba(255, 215, 0, 0.35)',
            border: '2.5px solid #FFD700',
          }} />
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: '#FFD700',
          }} />
        </div>
      </div>

      <p className="mt-3 text-xs text-text-muted">
        Click or drag to position the indicator. Press Escape to cancel.
      </p>
    </div>,
    document.body
  )
}
