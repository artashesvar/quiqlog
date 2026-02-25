'use client'

import { useState, useRef, useEffect } from 'react'

interface InsertBlockMenuProps {
  afterIndex: number
  onInsert: (afterIndex: number, type: 'tip' | 'alert') => void
  isReadOnly?: boolean
}

export default function InsertBlockMenu({ afterIndex, onInsert, isReadOnly = false }: InsertBlockMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  if (isReadOnly) return null

  function handleSelect(type: 'tip' | 'alert') {
    setOpen(false)
    onInsert(afterIndex, type)
  }

  return (
    <div ref={ref} className="relative flex items-center justify-center my-1 group/insert">
      {/* Divider line */}
      <div className="absolute inset-x-0 top-1/2 h-px bg-border opacity-30 group-hover/insert:opacity-100 transition-opacity" />

      <button
        onClick={() => setOpen((v) => !v)}
        className="relative z-10 w-6 h-6 rounded-full bg-surface border border-border text-text-muted hover:text-accent hover:border-accent flex items-center justify-center text-sm font-medium transition-all opacity-40 group-hover/insert:opacity-100 focus:opacity-100"
        title="Insert a block"
        aria-label="Insert a block"
      >
        +
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 left-1/2 -translate-x-1/2 w-44 rounded-xl border border-border bg-surface shadow-lg overflow-hidden">
          <button
            onClick={() => handleSelect('tip')}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-text-secondary hover:bg-blue-500/10 hover:text-blue-400 transition-colors text-left"
          >
            {/* Lightbulb icon */}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-blue-400">
              <path d="M8 1a5 5 0 0 1 3.5 8.5l-.5.5V12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-2l-.5-.5A5 5 0 0 1 8 1z" />
              <path d="M6 13.5h4" />
              <path d="M6.5 15h3" />
            </svg>
            Tip
          </button>
          <button
            onClick={() => handleSelect('alert')}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-text-secondary hover:bg-amber-500/10 hover:text-amber-400 transition-colors text-left"
          >
            {/* Warning triangle icon */}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-amber-400">
              <path d="M8 2 L14.5 13.5 H1.5 Z" />
              <path d="M8 6v3.5" />
              <circle cx="8" cy="11.5" r="0.5" fill="currentColor" stroke="none" />
            </svg>
            Alert
          </button>
        </div>
      )}
    </div>
  )
}
