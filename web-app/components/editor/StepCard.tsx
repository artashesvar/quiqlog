'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { Step } from '@/lib/types'

interface StepCardProps {
  step: Step
  stepNumber: number
  onUpdate: (stepId: string, updates: Partial<Step>) => Promise<void>
  onDelete: (stepId: string) => Promise<void>
  isReadOnly?: boolean
}

export default function StepCard({ step, stepNumber, onUpdate, onDelete, isReadOnly = false }: StepCardProps) {
  const [title, setTitle] = useState(step.title)
  const [description, setDescription] = useState(step.description)
  const [deleting, setDeleting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  async function handleDelete() {
    if (!confirm('Delete this step?')) return
    setDeleting(true)
    await onDelete(step.id)
  }

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
          <div className="mx-4 mb-3 rounded-md overflow-hidden border border-border transition-shadow duration-300 hover:shadow-soft-lg">
            <Image
              src={step.screenshot_url}
              alt={`Step ${stepNumber} screenshot`}
              width={800}
              height={450}
              className="w-full h-auto object-cover"
              unoptimized
            />
          </div>
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
    </div>
  )
}
