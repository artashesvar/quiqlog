'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import BlurEditor from '@/components/editor/BlurEditor'
import AnnotationEditor from '@/components/editor/AnnotationEditor'
import type { Step } from '@/lib/types'

const ZOOM_LEVELS = [1, 1.5, 2] as const

interface StepCardProps {
  step: Step
  stepNumber: number
  onUpdate: (stepId: string, updates: Partial<Step>) => Promise<void>
  onDelete: (stepId: string) => Promise<boolean>
  isReadOnly?: boolean
}

export default function StepCard({ step, stepNumber, onUpdate, onDelete, isReadOnly = false }: StepCardProps) {
  const [title, setTitle] = useState(step.title)
  const [description, setDescription] = useState(step.description)
  const [deleting, setDeleting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [blurEditorOpen, setBlurEditorOpen] = useState(false)
  const [annotationEditorOpen, setAnnotationEditorOpen] = useState(false)
  const [zoomBarOpen, setZoomBarOpen] = useState(false)
  const [savingZoom, setSavingZoom] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Zoom & pan local state (initialized from step's saved values)
  const savedZoom = step.zoom_level ?? 1
  const savedPanX = step.pan_x ?? 0
  const savedPanY = step.pan_y ?? 0
  const [localZoom, setLocalZoom] = useState(savedZoom)
  const [localPanX, setLocalPanX] = useState(savedPanX)
  const [localPanY, setLocalPanY] = useState(savedPanY)

  // Sync local state when step prop changes (e.g. after save)
  useEffect(() => {
    setLocalZoom(step.zoom_level ?? 1)
    setLocalPanX(step.pan_x ?? 0)
    setLocalPanY(step.pan_y ?? 0)
  }, [step.zoom_level, step.pan_x, step.pan_y])

  const hasZoomChanges = localZoom !== savedZoom || localPanX !== savedPanX || localPanY !== savedPanY

  // Pan tracking refs
  const isPanningRef = useRef(false)
  const panStartRef = useRef({ x: 0, y: 0 })
  const panStartValuesRef = useRef({ panX: 0, panY: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [description])

  async function handleTitleBlur() {
    if (title !== step.title) await onUpdate(step.id, { title })
  }

  async function handleDescriptionBlur() {
    if (description !== step.description) await onUpdate(step.id, { description })
  }

  function handleDelete() {
    setConfirmOpen(true)
  }

  function handleClose() {
    if (deleting) return
    setConfirmOpen(false)
    setDeleteError(null)
  }

  async function handleConfirmDelete() {
    setDeleting(true)
    setDeleteError(null)
    const ok = await onDelete(step.id)
    if (!ok) {
      setDeleting(false)
      setDeleteError('Failed to delete step. Please try again.')
      return
    }
    setConfirmOpen(false)
  }

  // Zoom handlers
  function handleZoomChange(level: number) {
    setLocalZoom(level)
    if (level === 1) {
      // Reset pan when going back to 1x
      setLocalPanX(0)
      setLocalPanY(0)
    } else {
      // Clamp current pan to new zoom bounds
      const maxPan = ((level - 1) / (2 * level)) * 100
      setLocalPanX(prev => Math.max(-maxPan, Math.min(maxPan, prev)))
      setLocalPanY(prev => Math.max(-maxPan, Math.min(maxPan, prev)))
    }
  }

  async function handleApplyZoom() {
    setSavingZoom(true)
    await onUpdate(step.id, { zoom_level: localZoom, pan_x: localPanX, pan_y: localPanY })
    setSavingZoom(false)
  }

  function handleResetZoom() {
    setLocalZoom(savedZoom)
    setLocalPanX(savedPanX)
    setLocalPanY(savedPanY)
  }

  // Pan handlers
  const clampPan = useCallback((px: number, py: number, zoom: number) => {
    // Max pan is the percentage of the overflow that can be shifted
    // At scale S, the image is S times wider. The overflow on each side is (S-1)/(2*S) * 100%
    const maxPan = ((zoom - 1) / (2 * zoom)) * 100
    return {
      x: Math.max(-maxPan, Math.min(maxPan, px)),
      y: Math.max(-maxPan, Math.min(maxPan, py)),
    }
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (localZoom <= 1 || isReadOnly) return
    e.preventDefault()
    isPanningRef.current = true
    panStartRef.current = { x: e.clientX, y: e.clientY }
    panStartValuesRef.current = { panX: localPanX, panY: localPanY }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [localZoom, localPanX, localPanY, isReadOnly])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanningRef.current || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    // Convert pixel delta to percentage of container
    const dx = ((e.clientX - panStartRef.current.x) / rect.width) * 100
    const dy = ((e.clientY - panStartRef.current.y) / rect.height) * 100
    const clamped = clampPan(
      panStartValuesRef.current.panX + dx,
      panStartValuesRef.current.panY + dy,
      localZoom
    )
    setLocalPanX(clamped.x)
    setLocalPanY(clamped.y)
  }, [localZoom, clampPan])

  const handlePointerUp = useCallback(() => {
    isPanningRef.current = false
  }, [])

  return (
    <div ref={setNodeRef} style={style}>
      <Card animate className="overflow-hidden">
        {/* Step header with drag handle */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-2">
          {/* Drag handle */}
          {!isReadOnly && (
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-text-muted hover:text-text-secondary transition-colors flex-shrink-0"
              title="Drag to reorder"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="5" cy="4" r="1.5"/>
                <circle cx="11" cy="4" r="1.5"/>
                <circle cx="5" cy="8" r="1.5"/>
                <circle cx="11" cy="8" r="1.5"/>
                <circle cx="5" cy="12" r="1.5"/>
                <circle cx="11" cy="12" r="1.5"/>
              </svg>
            </button>
          )}

          {/* Step number */}
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/15 text-accent text-xs font-semibold flex items-center justify-center">
            {stepNumber}
          </span>

          {/* Inline editable title */}
          <input
            value={title}
            onChange={(e) => { if (!isReadOnly) setTitle(e.target.value) }}
            onBlur={handleTitleBlur}
            readOnly={isReadOnly}
            className={`flex-1 font-heading font-medium text-base text-text-primary bg-transparent border-none outline-none focus:ring-0 placeholder:text-text-muted${isReadOnly ? ' cursor-default select-none' : ''}`}
            placeholder="Step title..."
          />

          {/* Delete */}
          {!isReadOnly && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              loading={deleting}
              className="text-text-muted hover:text-error flex-shrink-0"
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="currentColor">
                <path d="M5.5 1C5.22386 1 5 1.22386 5 1.5C5 1.77614 5.22386 2 5.5 2H9.5C9.77614 2 10 1.77614 10 1.5C10 1.22386 9.77614 1 9.5 1H5.5ZM3 3.5C3 3.22386 3.22386 3 3.5 3H11.5C11.7761 3 12 3.22386 12 3.5C12 3.77614 11.7761 4 11.5 4H3.5C3.22386 4 3 3.77614 3 3.5ZM4 5.5C4 5.22386 4.22386 5 4.5 5H10.5C10.7761 5 11 5.22386 11 5.5V12.5C11 12.7761 10.7761 13 10.5 13H4.5C4.22386 13 4 12.7761 4 12.5V5.5Z"/>
              </svg>
            </Button>
          )}
        </div>

        {/* Screenshot */}
        {step.screenshot_url && (
          <div
            ref={containerRef}
            className={`group/img relative mx-4 mb-3 rounded-md overflow-hidden border border-border transition-shadow duration-300 hover:shadow-soft-lg${localZoom > 1 && !isReadOnly ? ' cursor-grab active:cursor-grabbing' : ''}`}
            onPointerDown={!isReadOnly ? handlePointerDown : undefined}
            onPointerMove={!isReadOnly ? handlePointerMove : undefined}
            onPointerUp={!isReadOnly ? handlePointerUp : undefined}
          >
            <Image
              src={step.screenshot_url}
              alt={`Step ${stepNumber} screenshot`}
              width={800}
              height={450}
              className="w-full h-auto object-cover select-none"
              unoptimized
              draggable={false}
              style={{
                transform: `scale(${localZoom}) translate(${localPanX}%, ${localPanY}%)`,
                transformOrigin: 'center center',
                transition: isPanningRef.current ? 'none' : 'transform 0.2s ease-out',
              }}
            />

            {/* Top-right toolbar: annotate, blur, zoom */}
            {!isReadOnly && (
              <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover/img:opacity-100 transition-all">
                <button
                  onClick={() => setAnnotationEditorOpen(true)}
                  className="p-1.5 rounded-md bg-[#6366F1] text-white hover:bg-[#4F46E5] transition-colors"
                  title="Annotate screenshot"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11.5 2.5a1.414 1.414 0 0 1 2 2L5 13H3v-2L11.5 2.5z" />
                  </svg>
                </button>
                <button
                  onClick={() => setBlurEditorOpen(true)}
                  className="p-1.5 rounded-md bg-[#6366F1] text-white hover:bg-[#4F46E5] transition-colors"
                  title="Blur sensitive areas"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="8" cy="8" r="3" />
                    <circle cx="8" cy="8" r="6" opacity="0.5" />
                    <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" />
                  </svg>
                </button>
                <button
                  onClick={() => setZoomBarOpen(prev => !prev)}
                  className={`p-1.5 rounded-md transition-colors ${zoomBarOpen ? 'bg-[#4F46E5] text-white' : 'bg-[#6366F1] text-white hover:bg-[#4F46E5]'}`}
                  title="Zoom screenshot"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="7" cy="7" r="4" />
                    <path d="M10 10l3 3" />
                    <path d="M5.5 7h3" />
                    <path d="M7 5.5v3" />
                  </svg>
                </button>
              </div>
            )}

            {/* Zoom bar — bottom center, shown when zoom toolbar button is toggled */}
            {!isReadOnly && zoomBarOpen && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-background-secondary/90 backdrop-blur-sm border border-border rounded-md p-0.5 shadow-soft">
                {ZOOM_LEVELS.map(level => (
                  <button
                    key={level}
                    onClick={() => handleZoomChange(level)}
                    className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                      localZoom === level
                        ? 'bg-accent text-white'
                        : 'text-text-secondary hover:text-text-primary hover:bg-background-tertiary'
                    }`}
                  >
                    {level}x
                  </button>
                ))}
              </div>
            )}

            {/* Persistent zoom indicator when zoomed (visible even without hover) */}
            {localZoom > 1 && !zoomBarOpen && (
              <div className="absolute bottom-2 right-2 px-1.5 py-0.5 text-[10px] font-medium bg-accent/80 text-white rounded backdrop-blur-sm">
                {localZoom}x
              </div>
            )}
          </div>
        )}

        {/* Apply / Reset buttons for zoom changes */}
        {!isReadOnly && hasZoomChanges && step.screenshot_url && (
          <div className="flex items-center justify-end gap-2 mx-4 mb-3">
            <button
              onClick={handleResetZoom}
              className="px-2.5 py-1 text-xs font-medium text-text-secondary hover:text-text-primary bg-background-tertiary hover:bg-border rounded-md border border-border transition-colors"
            >
              Reset
            </button>
            <button
              onClick={handleApplyZoom}
              disabled={savingZoom}
              className="px-2.5 py-1 text-xs font-medium text-white bg-accent hover:bg-accent-hover rounded-md shadow-glow transition-colors disabled:opacity-50"
            >
              {savingZoom ? 'Saving...' : 'Apply Zoom'}
            </button>
          </div>
        )}

        {annotationEditorOpen && step.screenshot_url && (
          <AnnotationEditor
            imageUrl={step.screenshot_url}
            guideId={step.guide_id}
            stepId={step.id}
            onSave={async (newUrl) => {
              await onUpdate(step.id, { screenshot_url: newUrl })
              setAnnotationEditorOpen(false)
            }}
            onClose={() => setAnnotationEditorOpen(false)}
          />
        )}
        {blurEditorOpen && step.screenshot_url && (
          <BlurEditor
            imageUrl={step.screenshot_url}
            guideId={step.guide_id}
            stepId={step.id}
            onSave={async (newUrl) => {
              await onUpdate(step.id, { screenshot_url: newUrl })
              setBlurEditorOpen(false)
            }}
            onClose={() => setBlurEditorOpen(false)}
          />
        )}

        {/* Description */}
        {(!isReadOnly || description) && (
          <div className="px-4 pb-4">
            <textarea
              ref={textareaRef}
              value={description}
              onChange={(e) => { if (!isReadOnly) setDescription(e.target.value) }}
              onBlur={handleDescriptionBlur}
              readOnly={isReadOnly}
              placeholder="Add a description (optional)..."
              rows={1}
              className={`w-full resize-none bg-transparent text-sm text-text-secondary placeholder:text-text-muted border-none outline-none focus:ring-0 overflow-hidden${isReadOnly ? ' cursor-default' : ''}`}
            />
          </div>
        )}
      </Card>

      <Dialog open={confirmOpen} onClose={handleClose}>
        <h2 className="font-heading font-semibold text-lg text-text-primary mb-2">
          Delete Step?
        </h2>
        <p className="text-sm text-text-secondary mb-4">
          <strong className="text-text-primary font-semibold">Step {stepNumber}</strong>{' '}
          will be permanently deleted along with its screenshot and description.
          This cannot be undone.
        </p>
        {deleteError && (
          <p className="text-sm text-error mb-4">{deleteError}</p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={handleClose} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={handleConfirmDelete} loading={deleting}>
            Delete
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
