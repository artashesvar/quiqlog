'use client'

import { useState } from 'react'
import type { Guide } from '@/lib/types'

interface GuideHeaderProps {
  guide: Guide
  onUpdate: (updates: Partial<Guide>) => Promise<void>
}

export default function GuideHeader({ guide, onUpdate }: GuideHeaderProps) {
  const [title, setTitle] = useState(guide.title)
  const [saving, setSaving] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  const displayTitle = isFocused
    ? title
    : title.length > 39
      ? title.slice(0, 39) + '…'
      : title

  async function handleTitleBlur() {
    setIsFocused(false)
    if (title === guide.title) return
    setSaving(true)
    await onUpdate({ title })
    setSaving(false)
  }

  return (
    <div className="flex items-center gap-2">
      <input
        value={displayTitle}
        onChange={(e) => setTitle(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={handleTitleBlur}
        className="flex-1 min-w-0 font-heading font-semibold text-2xl text-text-primary bg-transparent border-none outline-none focus:ring-0 placeholder:text-text-muted"
        placeholder="Guide title..."
      />
      {saving && <span className="text-xs text-text-muted">Saving…</span>}
    </div>
  )
}
