'use client'

import { useState } from 'react'
import GuideCard from './GuideCard'
import type { Guide } from '@/lib/types'

interface GuideListProps {
  guides: (Guide & { step_count: number })[]
}

export default function GuideList({ guides: initialGuides }: GuideListProps) {
  const [guides, setGuides] = useState(initialGuides)

  function handleDelete(id: string) {
    setGuides(prev => prev.filter(g => g.id !== id))
  }

  if (guides.length === 0) {
    return (
      <div className="text-center py-20 rounded-lg border border-dashed border-border animate-fade-in">
        <div className="text-5xl mb-4">📖</div>
        <h3 className="font-heading font-semibold text-lg text-text-primary mb-2">
          No guides yet
        </h3>
        <p className="text-text-muted text-sm max-w-xs mx-auto">
          Install the extension and click &ldquo;Start Recording&rdquo; to capture your first guide.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {guides.map((guide, i) => (
        <div key={guide.id} className={`stagger-${Math.min(i + 1, 9)}`}>
          <GuideCard guide={guide} onDelete={handleDelete} />
        </div>
      ))}
    </div>
  )
}
