'use client'

import { useState, useRef, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { Step } from '@/lib/types'

interface TipAlertBlockProps {
  block: Step
  onUpdate: (id: string, updates: Partial<Step>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  isReadOnly?: boolean
}

const config = {
  tip: {
    label: 'Tip',
    badgeClass: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
    borderClass: 'border-l-2 border-l-blue-500/50',
    bodyPlaceholder: 'Write your tip here...',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400 flex-shrink-0">
        <path d="M8 1a5 5 0 0 1 3.5 8.5l-.5.5V12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-2l-.5-.5A5 5 0 0 1 8 1z" />
        <path d="M6 13.5h4" />
        <path d="M6.5 15h3" />
      </svg>
    ),
  },
  alert: {
    label: 'Alert',
    badgeClass: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    borderClass: 'border-l-2 border-l-amber-500/50',
    bodyPlaceholder: 'Write your alert here...',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400 flex-shrink-0">
        <path d="M8 2 L14.5 13.5 H1.5 Z" />
        <path d="M8 6v3.5" />
        <circle cx="8" cy="11.5" r="0.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
} as const

export default function TipAlertBlock({ block, onUpdate, onDelete, isReadOnly = false }: TipAlertBlockProps) {
  const [title, setTitle] = useState(block.title)
  const [description, setDescription] = useState(block.description)
  const [deleting, setDeleting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const type = block.type === 'alert' ? 'alert' : 'tip'
  const { label, badgeClass, borderClass, bodyPlaceholder, icon } = config[type]

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [description])

  async function handleTitleBlur() {
    if (title !== block.title) await onUpdate(block.id, { title })
  }

  async function handleDescriptionBlur() {
    if (description !== block.description) await onUpdate(block.id, { description })
  }

  async function handleDelete() {
    if (!confirm(`Delete this ${label.toLowerCase()} block?`)) return
    setDeleting(true)
    await onDelete(block.id)
  }

  return (
    <div ref={setNodeRef} style={style}>
      <Card animate className={`overflow-hidden ${borderClass}`}>
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

          {/* Type badge */}
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${badgeClass}`}>
            {icon}
            {label}
          </span>

          {/* Editable title */}
          <input
            value={title}
            onChange={(e) => { if (!isReadOnly) setTitle(e.target.value) }}
            onBlur={handleTitleBlur}
            readOnly={isReadOnly}
            className={`flex-1 font-heading font-medium text-base text-text-primary bg-transparent border-none outline-none focus:ring-0 placeholder:text-text-muted${isReadOnly ? ' cursor-default select-none' : ''}`}
            placeholder="Add a title..."
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

        {/* Body text */}
        {(!isReadOnly || description) && (
          <div className="px-4 pb-4">
            <textarea
              ref={textareaRef}
              value={description}
              onChange={(e) => { if (!isReadOnly) setDescription(e.target.value) }}
              onBlur={handleDescriptionBlur}
              readOnly={isReadOnly}
              placeholder={bodyPlaceholder}
              rows={1}
              className={`w-full resize-none bg-transparent text-sm text-text-secondary placeholder:text-text-muted border-none outline-none focus:ring-0 overflow-hidden${isReadOnly ? ' cursor-default' : ''}`}
            />
          </div>
        )}
      </Card>
    </div>
  )
}
