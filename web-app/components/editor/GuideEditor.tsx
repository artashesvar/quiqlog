'use client'

import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Toaster } from 'react-hot-toast'
import GuideHeader from './GuideHeader'
import StepList from './StepList'
import type { Guide, Step } from '@/lib/types'

interface GuideEditorProps {
  guide: Guide & { steps: Step[] }
}

export default function GuideEditor({ guide: initialGuide }: GuideEditorProps) {
  const [guide, setGuide] = useState(initialGuide)
  const [steps, setSteps] = useState<Step[]>(initialGuide.steps ?? [])

  const updateGuide = useCallback(async (updates: Partial<Guide>) => {
    const res = await fetch(`/api/guides/${guide.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!res.ok) {
      toast.error('Failed to update guide')
      return
    }
    const updated = await res.json()
    setGuide((g) => ({ ...g, ...updated }))
    toast.success('Saved')
  }, [guide.id])

  const updateStep = useCallback(async (stepId: string, updates: Partial<Step>) => {
    const res = await fetch(`/api/steps/${stepId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!res.ok) {
      toast.error('Failed to update step')
      return
    }
    const updated = await res.json()
    setSteps((prev) => prev.map((s) => (s.id === stepId ? { ...s, ...updated } : s)))
  }, [])

  const deleteStep = useCallback(async (stepId: string) => {
    const res = await fetch(`/api/steps/${stepId}`, { method: 'DELETE' })
    if (!res.ok) {
      toast.error('Failed to delete step')
      return
    }
    setSteps((prev) => prev.filter((s) => s.id !== stepId))
    toast.success('Step deleted')
  }, [])

  const reorderSteps = useCallback(async (reordered: Step[]) => {
    setSteps(reordered)
    // Persist new order
    await Promise.all(
      reordered.map((step, index) =>
        fetch(`/api/steps/${step.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_index: index }),
        })
      )
    )
  }, [])

  return (
    <>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#161B27',
            color: '#F8FAFC',
            border: '1px solid #2A3147',
            borderRadius: '10px',
          },
        }}
      />
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <GuideHeader guide={guide} onUpdate={updateGuide} />
        <StepList
          steps={steps}
          onUpdate={updateStep}
          onDelete={deleteStep}
          onReorder={reorderSteps}
        />

        {steps.length === 0 && (
          <div className="text-center py-16 rounded-lg border border-dashed border-border">
            <p className="text-text-muted text-sm">
              No steps yet. Use the extension to record your workflow.
            </p>
          </div>
        )}
      </div>
    </>
  )
}
